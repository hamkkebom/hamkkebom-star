import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/faq/public
 * 비로그인 접근 가능한 공개 FAQ (ALL 대상, 카테고리별 상위 3건)
 */
export async function GET() {
    try {
        const items = await prisma.faqItem.findMany({
            where: {
                isPublished: true,
                targetRole: "ALL",
            },
            orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
            take: 10,
            select: {
                id: true,
                question: true,
                answer: true,
                category: true,
            },
        });

        return NextResponse.json({ data: items }, {
            headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
        });
    } catch (error) {
        console.error("[faq/public GET]", error);
        return NextResponse.json({ data: [] });
    }
}
