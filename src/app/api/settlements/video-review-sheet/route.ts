import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import ExcelJS from "exceljs";
export const dynamic = "force-dynamic";

/**
 * POST /api/settlements/video-review-sheet
 *
 * 아카이브 정산에 포함된 영상 목록을 점검용 시트로 다운로드합니다.
 * 컬럼: No. | Star명 | 영상 제목 | 금액(원) | 링크 | 비고
 */
export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { settlementIds } = body as { settlementIds?: unknown };
    if (!Array.isArray(settlementIds) || settlementIds.length === 0) {
        return NextResponse.json({ error: "정산 ID를 선택해주세요." }, { status: 400 });
    }

    const settlements = await prisma.settlement.findMany({
        where: { id: { in: settlementIds as string[] } },
        include: {
            star: { select: { id: true, name: true, chineseName: true } },
            items: {
                where: { itemType: { not: "AI_TOOL_SUPPORT" } },
                orderBy: { createdAt: "asc" },
                include: {
                    submission: {
                        select: {
                            id: true,
                            video: { select: { id: true, title: true } },
                        },
                    },
                },
            },
        },
        orderBy: { startDate: "asc" },
    });

    if (settlements.length === 0) {
        return NextResponse.json({ error: "정산 데이터가 없습니다." }, { status: 404 });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

    // ── 워크북 / 시트 설정 ───────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = "함께봄스타 관리자";
    wb.created = new Date();

    const ws = wb.addWorksheet("영상 점검 시트");
    ws.pageSetup.paperSize = 9; // A4
    ws.pageSetup.orientation = "landscape";
    ws.pageSetup.fitToPage = true;
    ws.pageSetup.fitToWidth = 1;
    ws.pageSetup.fitToHeight = 0;

    // 컬럼 너비
    ws.columns = [
        { key: "no",     width: 6  },
        { key: "star",   width: 16 },
        { key: "title",  width: 38 },
        { key: "amount", width: 14 },
        { key: "link",   width: 72 },
        { key: "note",   width: 22 },
    ];

    // ── 스타일 상수 ──────────────────────────────────────────────────
    const thin = { style: "thin" as const, color: { argb: "FFB8B8B8" } };
    const border = { top: thin, left: thin, bottom: thin, right: thin };

    const blueFill:      ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
    const whiteFill:     ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
    const stripeFill:    ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F1" } };
    const starGroupFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };

    const baseFont = { name: "Malgun Gothic", size: 10 } as const;

    // ── 헤더 행 ─────────────────────────────────────────────────────
    const HEADERS = ["No.", "Star명", "영상 제목", "금액(원)", "링크", "비고"];
    const hRow = ws.addRow(HEADERS);
    hRow.height = 24;
    hRow.eachCell((cell) => {
        cell.style = {
            fill: blueFill,
            border,
            font: { ...baseFont, bold: true, color: { argb: "FFFFFFFF" } },
            alignment: { horizontal: "center", vertical: "middle" },
        };
    });

    // ── 데이터 행 ────────────────────────────────────────────────────
    let seq = 0;
    let globalRowIdx = 0; // 줄무늬용 (Star 그룹 구분과 별개)

    for (const settlement of settlements) {
        const starName = settlement.star.chineseName || settlement.star.name;

        const videoItems = settlement.items.filter((item) => item.submission?.video);

        if (videoItems.length === 0) continue;

        // Star 그룹 구분: 짝/홀 정산 단위로 배경 교차
        const groupFill = globalRowIdx % 2 === 0 ? whiteFill : starGroupFill;

        for (const item of videoItems) {
            seq++;
            const video = item.submission!.video!;
            const videoUrl = appUrl ? `${appUrl}/videos/${video.id}` : `/videos/${video.id}`;
            const isStripe = seq % 2 === 0;
            const rowFill  = isStripe ? stripeFill : groupFill;

            const dRow = ws.addRow([
                seq,
                starName,
                video.title ?? "",
                Number(item.finalAmount),
                videoUrl,
                "",
            ]);
            dRow.height = 20;

            dRow.eachCell({ includeEmpty: true }, (cell, col) => {
                const isAmountCol = col === 4;
                const isLinkCol   = col === 5;
                cell.style = {
                    fill: rowFill,
                    border,
                    font: isLinkCol
                        ? { ...baseFont, color: { argb: "FF0563C1" }, underline: true }
                        : { ...baseFont, color: { argb: "FF000000" } },
                    alignment: {
                        vertical: "middle",
                        horizontal: col === 1 || col === 2 ? "center" : isAmountCol ? "right" : "left",
                        shrinkToFit: !isLinkCol,
                    },
                    numFmt: isAmountCol ? "#,##0" : undefined,
                };
            });

            // 링크 셀: hyperlink 객체로 교체
            const linkCell = dRow.getCell(5);
            linkCell.value = { text: videoUrl, hyperlink: videoUrl };
        }

        globalRowIdx++;
    }

    // 데이터가 한 건도 없는 경우
    if (seq === 0) {
        return NextResponse.json({ error: "점검할 영상 항목이 없습니다." }, { status: 404 });
    }

    // ── 합계 행 ──────────────────────────────────────────────────────
    const summaryFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
    const totalRow = ws.addRow(["", `총 ${seq}건`, "", { formula: `SUM(D2:D${seq + 1})` }, "", ""]);
    totalRow.height = 22;
    totalRow.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.style = {
            fill: summaryFill,
            border,
            font: { ...baseFont, bold: true, color: { argb: "FFFFFFFF" } },
            alignment: { horizontal: col === 4 ? "right" : "center", vertical: "middle" },
            numFmt: col === 4 ? "#,##0" : undefined,
        };
    });

    // ── 파일명 및 응답 ───────────────────────────────────────────────
    const today = new Date();
    const yy = String(today.getFullYear()).slice(2);
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fileName = `${yy}.${mm}.${dd} 영상 점검 시트.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        },
    });
}
