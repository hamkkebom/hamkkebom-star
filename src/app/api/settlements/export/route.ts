import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import ExcelJS from "exceljs";
import path from "path";
export const dynamic = "force-dynamic";

/**
 * POST /api/settlements/export
 * 
 * 기존 "25.12 Ai 영상제작비.xlsx" 템플릿의 "지급상세내역" 시트에
 * 정산 데이터를 정확히 동일한 양식으로 채워서 반환합니다.
 *
 * 템플릿 컬럼 매핑 (Row 4 헤더):
 *   B: 번호(No.)
 *   C: 성함
 *   D: 연락처
 *   E: 주민번호
 *   F: 시작일
 *   G: 총지급금액
 *   H: 소득세 (3%)
 *   I: 지방소득세 (0.3%)
 *   J: 세금 (합계)
 *   K: 실지급액
 *   L: 납품 영상수
 *   M: 작품료
 *   N: AI 툴 지원비
 *   O: 은행
 *   P: 지급계좌
 *   Q: 이메일주소
 */
export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { settlementIds } = await request.json();
    if (!Array.isArray(settlementIds) || settlementIds.length === 0) {
        return NextResponse.json({ error: "정산 ID를 선택해주세요." }, { status: 400 });
    }

    // 정산 데이터 가져오기
    const settlements = await prisma.settlement.findMany({
        where: { id: { in: settlementIds } },
        include: {
            star: {
                select: {
                    id: true, name: true, chineseName: true, phone: true,
                    idNumber: true, bankName: true, bankAccount: true,
                    email: true, aiToolSupportFee: true,
                },
            },
            items: {
                orderBy: { createdAt: "asc" },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    if (settlements.length === 0) {
        return NextResponse.json({ error: "정산 데이터가 없습니다." }, { status: 404 });
    }

    // 기존 템플릿 파일 로드
    const templatePath = path.join(process.cwd(), "public", "25.12 Ai 영상제작비.xlsx");
    const wb = new ExcelJS.Workbook();

    try {
        await wb.xlsx.readFile(templatePath);
    } catch {
        return NextResponse.json({ error: "템플릿 파일을 찾을 수 없습니다." }, { status: 500 });
    }

    // "지급상세내역" 시트 찾기
    const ws = wb.getWorksheet("지급상세내역");
    if (!ws) {
        return NextResponse.json({ error: "지급상세내역 시트를 찾을 수 없습니다." }, { status: 500 });
    }

    // 헤더 행: Row 4 (고정)
    const HEADER_ROW = 4;
    const DATA_START = HEADER_ROW + 1; // Row 5부터 데이터

    // 기존 데이터 행의 스타일을 Row 5에서 복사
    const templateRow = ws.getRow(DATA_START);
    const templateStyles: Partial<ExcelJS.Style>[] = [];
    for (let c = 1; c <= 20; c++) {
        const cell = templateRow.getCell(c);
        templateStyles[c] = {
            font: cell.font ? { ...cell.font } : undefined,
            alignment: cell.alignment ? { ...cell.alignment } : undefined,
            border: cell.border ? { ...cell.border } : undefined,
            fill: cell.fill ? { ...cell.fill } : undefined,
            numFmt: cell.numFmt || undefined,
        };
    }
    const templateHeight = templateRow.height;

    // 기존 데이터 행 삭제 (Row 5 이후 전부)
    const totalRows = ws.rowCount;
    for (let r = totalRows; r >= DATA_START; r--) {
        ws.spliceRows(r, 1);
    }

    // 새 데이터 채우기
    settlements.forEach((settlement, idx) => {
        const star = settlement.star;
        const items = settlement.items;
        const totalAmount = Number(settlement.totalAmount);

        // 세금 계산 (3.3%)
        const incomeTax = Math.floor(totalAmount * 0.03);     // 소득세 3%
        const localTax = Math.floor(totalAmount * 0.003);     // 지방소득세 0.3%
        const totalTax = incomeTax + localTax;
        const netAmount = totalAmount - totalTax;

        // 작품료 / AI 툴 지원비 분리
        const workFeeItems = items.filter(i => i.itemType !== "AI_TOOL_SUPPORT");
        const aiFeeItems = items.filter(i => i.itemType === "AI_TOOL_SUPPORT");
        const workFeeTotal = workFeeItems.reduce((s, i) => s + Number(i.finalAmount), 0);
        const aiFeeTotal = aiFeeItems.reduce((s, i) => s + Number(i.finalAmount), 0);
        const videoCount = workFeeItems.length;

        // 시작일
        const startDate = new Date(settlement.startDate);
        const dateStr = `${startDate.getFullYear()}.${String(startDate.getMonth() + 1).padStart(2, "0")}.${String(startDate.getDate()).padStart(2, "0")}`;

        // 데이터 행 삽입
        const rowNum = DATA_START + idx;
        const row = ws.getRow(rowNum);

        // 값 설정 (B~Q 컬럼 = 2~17)
        row.getCell(2).value = idx + 1;                           // B: 번호
        row.getCell(3).value = star.name;                         // C: 성함
        row.getCell(4).value = star.phone || "";                  // D: 연락처
        row.getCell(5).value = star.idNumber || "";               // E: 주민번호
        row.getCell(6).value = dateStr;                           // F: 시작일
        row.getCell(7).value = totalAmount;                       // G: 총지급금액
        row.getCell(8).value = incomeTax;                         // H: 소득세
        row.getCell(9).value = localTax;                          // I: 지방소득세
        row.getCell(10).value = totalTax;                         // J: 세금
        row.getCell(11).value = netAmount;                        // K: 실지급액
        row.getCell(12).value = videoCount;                       // L: 납품 영상수
        row.getCell(13).value = workFeeTotal;                     // M: 작품료
        row.getCell(14).value = aiFeeTotal > 0 ? aiFeeTotal : ""; // N: AI 툴 지원비
        row.getCell(15).value = star.bankName || "";              // O: 은행
        row.getCell(16).value = star.bankAccount || "";           // P: 지급계좌
        row.getCell(17).value = star.email || "";                 // Q: 이메일주소

        // 템플릿 스타일 적용
        for (let c = 1; c <= 17; c++) {
            const style = templateStyles[c];
            if (style) {
                const cell = row.getCell(c);
                if (style.font) cell.font = style.font;
                if (style.alignment) cell.alignment = style.alignment;
                if (style.border) cell.border = style.border;
                if (style.fill) cell.fill = style.fill;
                if (style.numFmt) cell.numFmt = style.numFmt;
            }
        }

        // 숫자 컬럼 포맷
        [7, 8, 9, 10, 11, 13].forEach(c => {
            row.getCell(c).numFmt = "#,##0";
        });
        if (aiFeeTotal > 0) {
            row.getCell(14).numFmt = "#,##0";
        }

        if (templateHeight) row.height = templateHeight;
        row.commit();
    });

    // ── 영상제작비 품의서 시트 요약 테이블 동적 채우기 ──────────────────
    const formWs = wb.getWorksheet('영상제작비 품의서');
    if (formWs) {
        // 템플릿에 정적 이미지(지급인원 요약 표 그림)가 Row 16 위치에 박혀 있어
        // 동적으로 쓰는 셀과 겹쳐 "위에도 아래에도" 보이는 문제 발생.
        // 해당 그림만 제거하고, 아래쪽 "활용 가능 영상" 그림은 그대로 둔다.
        const media = (formWs as unknown as { _media?: Array<{ range?: { tl?: { row?: number } } }> })._media;
        if (Array.isArray(media)) {
            for (let i = media.length - 1; i >= 0; i--) {
                const tlRow = media[i]?.range?.tl?.row;
                if (typeof tlRow === 'number' && tlRow >= 14 && tlRow < 19) {
                    media.splice(i, 1);
                }
            }
        }

        const grandPeople = settlements.length;
        let grandVideos = 0, grandWorkFee = 0, grandAiFee = 0;
        let grandTotal = 0, grandTax = 0, grandNet = 0;

        settlements.forEach((s) => {
            const amt = Number(s.totalAmount);
            const workItems = s.items.filter(i => i.itemType !== 'AI_TOOL_SUPPORT');
            const aiItems   = s.items.filter(i => i.itemType === 'AI_TOOL_SUPPORT');
            const incomeTax = Math.floor(amt * 0.03);
            const localTax  = Math.floor(amt * 0.003);
            grandVideos  += workItems.length;
            grandWorkFee += workItems.reduce((acc, i) => acc + Number(i.finalAmount), 0);
            grandAiFee   += aiItems.reduce((acc, i) => acc + Number(i.finalAmount), 0);
            grandTotal   += amt;
            grandTax     += incomeTax + localTax;
            grandNet     += amt - (incomeTax + localTax);
        });

        const thin = { style: 'thin' as const };
        const border = { top: thin, left: thin, bottom: thin, right: thin };
        const salmonFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCD5B4' } };
        const whiteFill: ExcelJS.Fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        const centerMid = { horizontal: 'center' as const, vertical: 'middle' as const };
        const rightMid  = { horizontal: 'right'  as const, vertical: 'middle' as const };

        // 헤더 행 (Row 16)
        const labels = ['지급인원', '납품영상수', '총 작품료', 'AI툴 지원료', '총 지급액', '총 세금', '실지급액'];
        const emptyBorder: Partial<ExcelJS.Borders> = {};
        const noFill: ExcelJS.Fill = { type: 'pattern', pattern: 'none' };
        const hRow = formWs.getRow(16);
        // 행 전체를 비워서 잔여 셀이 겹치지 않게 함
        for (let c = 1; c <= 20; c++) {
            const cell = hRow.getCell(c);
            cell.value = null;
            cell.border = emptyBorder;
            cell.fill = noFill;
        }
        labels.forEach((label, i) => {
            const c = hRow.getCell(2 + i); // B~H
            c.value = label;
            c.border = border;
            c.fill = salmonFill;
            c.font = { bold: true, size: 10, name: 'Malgun Gothic' };
            c.alignment = centerMid;
        });
        hRow.height = 22;
        hRow.commit();

        // 값 행 (Row 17)
        const vals = [grandPeople, grandVideos, grandWorkFee, grandAiFee, grandTotal, grandTax, grandNet];
        const vRow = formWs.getRow(17);
        for (let c = 1; c <= 20; c++) {
            const cell = vRow.getCell(c);
            cell.value = null;
            cell.border = emptyBorder;
            cell.fill = noFill;
        }
        vals.forEach((val, i) => {
            const c = vRow.getCell(2 + i);
            c.value = val;
            c.border = border;
            c.fill = whiteFill;
            c.font = { bold: i === 6, size: 10, name: 'Malgun Gothic' };
            c.alignment = i < 2 ? centerMid : rightMid;
            if (i >= 2) c.numFmt = '#,##0';
        });
        vRow.height = 22;
        vRow.commit();

        // 인쇄 영역 고정 — 양식 밖으로 튀어나오지 않도록
        formWs.pageSetup.printArea = 'A1:I34';
        formWs.pageSetup.fitToPage = true;
        formWs.pageSetup.fitToWidth = 1;
        formWs.pageSetup.fitToHeight = 1;
    }

    // 파일명 생성: YY.MM AI 영상제작비.xlsx
    const firstDate = new Date(settlements[0].startDate);
    const yy = String(firstDate.getFullYear()).slice(2);
    const mm = String(firstDate.getMonth() + 1).padStart(2, "0");
    const fileName = `${yy}.${mm} AI 영상제작비.xlsx`;

    // 버퍼 생성 및 반환
    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        },
    });
}
