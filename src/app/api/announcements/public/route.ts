import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/announcements/public
 * 비로그인도 접근 가능한 공개 공지사항 (최신 5건)
 */
export async function GET() {
    try {
        const announcements = await prisma.announcement.findMany({
            where: { isActive: true },
            orderBy: [
                { priority: "desc" },
                { createdAt: "desc" },
            ],
            take: 5,
            select: {
                id: true,
                title: true,
                priority: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ data: announcements }, {
            headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
        });
    } catch (error) {
        console.error("[announcements/public GET]", error);
        return NextResponse.json({ data: [] });
    }
}
