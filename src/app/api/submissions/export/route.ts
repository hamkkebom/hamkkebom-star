import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

/**
 * GET /api/submissions/export?startDate=&endDate=&status=
 *
 * 제출물 목록 CSV 내보내기 (관리자 전용)
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const status = url.searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (startDate) where.createdAt = { ...(where.createdAt as object ?? {}), gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...(where.createdAt as object ?? {}), lte: new Date(endDate + "T23:59:59.999Z") };
    if (status && status !== "ALL") where.status = status;

    const submissions = await prisma.submission.findMany({
        where,
        select: {
            id: true,
            versionTitle: true,
            version: true,
            status: true,
            createdAt: true,
            reviewedAt: true,
            star: { select: { name: true, email: true } },
            video: { select: { title: true } },
            assignment: { select: { request: { select: { title: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
    });

    // CSV 생성
    const BOM = "\uFEFF"; // UTF-8 BOM for Excel
    const headers = ["ID", "STAR이름", "STAR이메일", "프로젝트", "영상제목", "버전제목", "버전", "상태", "제출일", "심사일"];
    const rows = submissions.map((s) => [
        s.id,
        s.star.name,
        s.star.email,
        s.assignment?.request?.title ?? "",
        s.video?.title ?? "",
        s.versionTitle ?? "",
        s.version,
        s.status,
        new Date(s.createdAt).toLocaleDateString("ko-KR"),
        s.reviewedAt ? new Date(s.reviewedAt).toLocaleDateString("ko-KR") : "",
    ]);

    const csv = BOM + [headers, ...rows].map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="submissions_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
    });
}
