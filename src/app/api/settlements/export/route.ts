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

    // 정산 데이터 가져오기 — 카테고리별 영상 수 집계 위해 video.category 포함
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
                include: {
                    submission: {
                        select: {
                            video: {
                                select: {
                                    category: { select: { name: true } },
                                },
                            },
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    if (settlements.length === 0) {
        return NextResponse.json({ error: "정산 데이터가 없습니다." }, { status: 404 });
    }

    // 전체 카테고리 목록 (영상이 0건인 카테고리도 표시하기 위해 별도 조회)
    const allCategories = await prisma.category.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

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

    // ── 지급상세내역 헤더 정리 + 컬럼 너비 자동 조정 ────────────────
    // 템플릿 헤더에 줄바꿈(\n)이나 richText로 박혀 있어 좁은 셀에서 잘려 보이던 문제.
    // 우선 헤더를 plain text + bold 단일 라인으로 정리해 가독성을 확보.
    const HEADER_LABELS: Record<number, string> = {
        2: "No.",
        3: "성함",
        4: "연락처",
        5: "주민번호",
        6: "시작일",
        7: "총지급금액",
        8: "소득세 (3%)",
        9: "지방소득세 (0.3%)",
        10: "세금 합계",
        11: "실지급액",
        12: "납품 영상수",
        13: "작품료",
        14: "AI툴 지원비",
        15: "은행",
        16: "지급계좌",
        17: "이메일주소",
    };
    for (const [colStr, label] of Object.entries(HEADER_LABELS)) {
        const colNum = Number(colStr);
        const headerCell = ws.getRow(HEADER_ROW).getCell(colNum);
        const prevStyle = headerCell.style;
        headerCell.value = label;
        headerCell.style = {
            ...prevStyle,
            font: { ...(prevStyle.font ?? {}), bold: true, name: "Malgun Gothic", size: 10 },
            alignment: {
                ...(prevStyle.alignment ?? {}),
                horizontal: "center",
                vertical: "middle",
                wrapText: false, // 단일 라인 — 컬럼 너비로 맞춤
            },
        };
    }

    // 너비 계산: 헤더(Row 4) + 데이터 행 모두 스캔. 한글 1자 ≈ 2 ASCII 폭.
    // formula 셀은 .result 사용, richText는 fragment text 합침, \n은 공백 처리.
    const colVisualWidth = (v: unknown): number => {
        if (v === null || v === undefined) return 0;
        let s: string;
        if (typeof v === "number") {
            s = v.toLocaleString();
        } else if (v instanceof Date) {
            s = v.toLocaleDateString();
        } else if (typeof v === "object") {
            const obj = v as Record<string, unknown>;
            // formula 셀: { formula, result }
            if ("result" in obj) return colVisualWidth(obj.result);
            // richText: { richText: [{text}, ...] }
            const rt = (obj as { richText?: { text?: string }[] }).richText;
            if (Array.isArray(rt)) {
                s = rt.map((r) => r.text ?? "").join("");
            } else {
                s = String(v);
            }
        } else {
            s = String(v);
        }
        // 줄바꿈은 공백으로 대체 — wrap 없이 단일 라인 가정한 폭 산정
        s = s.replace(/\r?\n/g, " ");
        let w = 0;
        for (const ch of s) {
            // 한글/한자/전각: 폭 ~2, ASCII: ~1
            w += /[ㄱ-힝一-鿿＀-￯]/.test(ch) ? 2 : 1;
        }
        return w;
    };
    const dataLastRow = ws.rowCount;
    for (let c = 2; c <= 17; c++) {            // B~Q
        let maxW = 0;
        for (let r = HEADER_ROW; r <= dataLastRow; r++) {
            const w = colVisualWidth(ws.getRow(r).getCell(c).value);
            if (w > maxW) maxW = w;
        }
        // 헤더 가독성 위해 최소 8, 최대 32. 한글 헤더는 width=ASCII단위×0.95 정도 필요.
        const width = Math.min(32, Math.max(8, Math.ceil(maxW * 0.95) + 2));
        ws.getColumn(c).width = width;
    }
    // 헤더 행 높이를 살짝 키워 읽기 편하게
    ws.getRow(HEADER_ROW).height = 22;

    // ── 영상제작비 품의서 시트 요약 테이블 동적 채우기 ──────────────────
    const formWs = wb.getWorksheet('영상제작비 품의서');
    if (formWs) {
        // 품의일자(C5)를 다운로드 시점 기준 오늘 날짜로 갱신 (템플릿엔 2026-01-07로 박혀 있음)
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const dateCell = formWs.getCell('C5');
        const prevStyle = dateCell.style;
        dateCell.value = todayStr;
        dateCell.style = prevStyle; // 기존 스타일(가운데 정렬, 폰트 등) 보존

        // 템플릿에 박혀 있던 정적 PNG 두 개(지급인원 표 + 활용 가능 영상)를 모두 제거.
        // 그 자리에 동적 셀 표(지급인원 + 카테고리별 영상 수)로 대체.
        const media = (formWs as unknown as { _media?: Array<{ range?: { tl?: { row?: number } } }> })._media;
        if (Array.isArray(media)) {
            for (let i = media.length - 1; i >= 0; i--) {
                const tlRow = media[i]?.range?.tl?.row;
                if (typeof tlRow === 'number' && tlRow >= 14 && tlRow < 30) {
                    media.splice(i, 1);
                }
            }
        }

        // ⚠ 카테고리 표가 row 27/28을 덮을 수 있으므로, 그 자리에 박혀 있던
        // "붙임" 텍스트를 미리 캡처해 두고 표 작성 후 안전한 row로 복원한다.
        type SavedCell = { value: ExcelJS.CellValue; style: Partial<ExcelJS.Style> };
        const savedNote1: SavedCell = { value: formWs.getCell('C27').value, style: formWs.getCell('C27').style };
        const savedNote2: SavedCell = { value: formWs.getCell('C28').value, style: formWs.getCell('C28').style };
        // 미리 비워서 카테고리 셀 작성 시 잔재 충돌 없도록
        formWs.getCell('C27').value = null;
        formWs.getCell('C28').value = null;

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
        // 원본 PNG(지급인원 표)의 살구색 헤더 — Excel "주황 강조 2 80% 흐리게"
        const salmonFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCD5B4' } };
        const whiteFill: ExcelJS.Fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        const centerMid = { horizontal: 'center' as const, vertical: 'middle' as const, shrinkToFit: true };
        const rightMid  = { horizontal: 'right'  as const, vertical: 'middle' as const, shrinkToFit: true };

        // 표 영역(B~H)을 균일하게 — 기본 C(19.25)가 과하게 넓어 라벨 정렬이 어긋남.
        // 모두 10으로 통일하면 인접 빈 셀로 오버플로우되어 다른 행도 깨지지 않음.
        for (const colLetter of ['B', 'C', 'D', 'E', 'F', 'G', 'H']) {
            formWs.getColumn(colLetter).width = 10;
        }

        // 헤더 행 (Row 16) — cell.style 통째 할당 (exceljs 쿼크: 개별 prop 할당 시 인접 행과 fill이 섞임)
        const labels = ['지급인원', '납품영상수', '총 작품료', 'AI툴 지원료', '총 지급액', '총 세금', '실지급액'];
        const hRow = formWs.getRow(16);
        labels.forEach((label, i) => {
            const c = hRow.getCell(2 + i); // B~H
            c.value = label;
            c.style = {
                fill: salmonFill,
                border,
                font: { bold: true, size: 10, name: 'Malgun Gothic', color: { argb: 'FF000000' } },
                alignment: centerMid,
            };
        });
        hRow.height = 24;
        hRow.commit();

        // 값 행 (Row 17)
        const vals = [grandPeople, grandVideos, grandWorkFee, grandAiFee, grandTotal, grandTax, grandNet];
        const vRow = formWs.getRow(17);
        vals.forEach((val, i) => {
            const c = vRow.getCell(2 + i);
            c.value = val;
            c.style = {
                fill: whiteFill,
                border,
                font: { bold: i === 6, size: 10, name: 'Malgun Gothic', color: { argb: 'FF000000' } },
                alignment: i < 2 ? centerMid : rightMid,
                numFmt: i >= 2 ? '#,##0' : undefined,
            };
        });
        vRow.height = 22;
        vRow.commit();

        // ── 활용 가능 영상 PNG 제거 자리에 "카테고리별 영상 수" 표 ────────
        // 1) 정산 항목에서 video.category.name별 카운트 집계
        type ItemWithCat = {
            itemType: string;
            submission?: { video?: { category?: { name: string } | null } | null } | null;
        };
        const categoryCounts = new Map<string, number>();
        for (const settlement of settlements) {
            for (const item of settlement.items as ItemWithCat[]) {
                if (item.itemType === 'AI_TOOL_SUPPORT') continue; // 영상이 아닌 항목은 제외
                const catName = item.submission?.video?.category?.name ?? '미분류';
                categoryCounts.set(catName, (categoryCounts.get(catName) ?? 0) + 1);
            }
        }

        // 2) 표시할 항목 = 실제로 영상이 있는 카테고리만 + 미분류(있을 때만)
        // 0건 카테고리까지 모두 표시하면 양식이 길어져 하단 텍스트(붙임 등)가 밀리는
        // 문제가 있어 실값이 있는 항목만 노출하도록 필터링.
        const categoryEntries: Array<{ name: string; count: number }> = allCategories
            .map((c) => ({ name: c.name, count: categoryCounts.get(c.name) ?? 0 }))
            .filter((e) => e.count > 0);
        if (categoryCounts.has('미분류')) {
            categoryEntries.push({ name: '미분류', count: categoryCounts.get('미분류') ?? 0 });
        }
        const totalCount = categoryEntries.reduce((s, e) => s + e.count, 0);

        // 3) 표 영역: 제목(R19, B-I 병합) + 카테고리 행(2개씩, R20부터) + 합계 행
        // 양식 하단 "붙임" / 회사명 텍스트가 row 27/28/33 에 있으므로,
        // 카테고리가 많아 충돌하면 그 텍스트를 아래로 이동시켜 자리 확보.
        const TABLE_START = 19;
        formWs.mergeCells(TABLE_START, 2, TABLE_START, 9); // B19:I19
        const titleCell = formWs.getCell(TABLE_START, 2);
        titleCell.value = '카테고리별 영상 수';
        titleCell.style = {
            fill: salmonFill,
            border,
            font: { bold: true, size: 11, name: 'Malgun Gothic', color: { argb: 'FF000000' } },
            alignment: { horizontal: 'center', vertical: 'middle' },
        };
        formWs.getRow(TABLE_START).height = 24;

        const leftAlignMid = { horizontal: 'left' as const, vertical: 'middle' as const, indent: 1, shrinkToFit: true };
        const numAlignMid  = { horizontal: 'right' as const, vertical: 'middle' as const, indent: 1 };

        const ROWS_NEEDED = Math.ceil(categoryEntries.length / 2);
        for (let i = 0; i < categoryEntries.length; i += 2) {
            const r = TABLE_START + 1 + Math.floor(i / 2);
            const left = categoryEntries[i];
            const right = categoryEntries[i + 1];

            // 좌측 항목: B-C 병합(이름) + D(카운트)
            formWs.mergeCells(r, 2, r, 3);
            const ln = formWs.getCell(r, 2);
            ln.value = left.name;
            ln.style = {
                fill: whiteFill, border,
                font: { size: 10, name: 'Malgun Gothic', color: { argb: 'FF000000' } },
                alignment: leftAlignMid,
            };
            const lc = formWs.getCell(r, 4);
            lc.value = left.count;
            lc.style = {
                fill: whiteFill, border,
                font: { size: 10, name: 'Malgun Gothic', bold: true, color: { argb: 'FF000000' } },
                alignment: numAlignMid,
                numFmt: '#,##0',
            };

            // 우측 항목: E-F 병합(이름) + G(카운트). 짝이 없으면 빈 셀(테두리만 유지)
            formWs.mergeCells(r, 5, r, 6);
            const rn = formWs.getCell(r, 5);
            const rc = formWs.getCell(r, 7);
            if (right) {
                rn.value = right.name;
                rn.style = {
                    fill: whiteFill, border,
                    font: { size: 10, name: 'Malgun Gothic', color: { argb: 'FF000000' } },
                    alignment: leftAlignMid,
                };
                rc.value = right.count;
                rc.style = {
                    fill: whiteFill, border,
                    font: { size: 10, name: 'Malgun Gothic', bold: true, color: { argb: 'FF000000' } },
                    alignment: numAlignMid,
                    numFmt: '#,##0',
                };
            } else {
                rn.value = '';
                rn.style = { fill: whiteFill, border };
                rc.value = '';
                rc.style = { fill: whiteFill, border };
            }
            // H/I 컬럼은 표 외부 — 아무 처리 안 함
            formWs.getRow(r).height = 20;
        }

        // 합계 행
        const sumRow = TABLE_START + 1 + ROWS_NEEDED;
        formWs.mergeCells(sumRow, 2, sumRow, 6); // B-F
        const sumLabel = formWs.getCell(sumRow, 2);
        sumLabel.value = '총 영상 수';
        sumLabel.style = {
            fill: salmonFill, border,
            font: { bold: true, size: 10, name: 'Malgun Gothic', color: { argb: 'FF000000' } },
            alignment: { horizontal: 'center', vertical: 'middle' },
        };
        formWs.mergeCells(sumRow, 7, sumRow, 9); // G-I
        const sumValue = formWs.getCell(sumRow, 7);
        sumValue.value = totalCount;
        sumValue.style = {
            fill: whiteFill, border,
            font: { bold: true, size: 10, name: 'Malgun Gothic', color: { argb: 'FF000000' } },
            alignment: numAlignMid,
            numFmt: '#,##0"건"',
        };
        formWs.getRow(sumRow).height = 22;

        // 4) 사전에 저장해 둔 "붙임" 텍스트를 표 아래 안전한 row 로 복원
        const noteToRow = sumRow + 2;
        const noteToRow2 = sumRow + 3;
        if (savedNote1.value) {
            const dst = formWs.getCell(`C${noteToRow}`);
            dst.value = savedNote1.value;
            dst.style = savedNote1.style;
        }
        if (savedNote2.value) {
            const dst = formWs.getCell(`C${noteToRow2}`);
            dst.value = savedNote2.value;
            dst.style = savedNote2.style;
        }

        // 인쇄 영역 — "붙임" + 회사명(B33) 까지 모두 포함되도록 확장
        const printAreaEnd = Math.max(34, noteToRow2 + 6);
        formWs.pageSetup.printArea = `A1:I${printAreaEnd}`;
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
