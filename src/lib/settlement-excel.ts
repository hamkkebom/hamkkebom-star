"use client";

/**
 * 정산 데이터를 기존 엑셀 템플릿 양식에 맞춰 다운로드합니다.
 * 서버 API에서 public/25.12 Ai 영상제작비.xlsx 템플릿을 로드하여
 * 정산 데이터를 채운 후 파일을 반환합니다.
 */
export async function downloadSettlementsExcel(settlementIds: string[]) {
    const res = await fetch("/api/settlements/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementIds }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "엑셀 다운로드에 실패했습니다.");
    }

    // Content-Disposition에서 파일명 추출
    const disposition = res.headers.get("Content-Disposition") || "";
    let fileName = "정산.xlsx";
    const match = disposition.match(/filename\*?=(?:UTF-8'')?(.+)/i);
    if (match) {
        fileName = decodeURIComponent(match[1]);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
