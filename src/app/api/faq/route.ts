import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export async function GET() {
    try {
        let user = null;
        try {
            user = await getAuthUser();
        } catch {
            // 비인증 사용자 — 공개 콘텐츠만 표시
        }

        const roleFilter = !user
            ? { targetRole: "ALL" }
            : user.role === "ADMIN"
                ? {}
                : { targetRole: { in: ["ALL", user.role] } };

        const items = await prisma.faqItem.findMany({
            where: { isPublished: true, ...roleFilter },
            orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
        });

        // 카테고리별 그룹핑
        const grouped: Record<string, typeof items> = {};
        items.forEach((item) => {
            if (!grouped[item.category]) grouped[item.category] = [];
            grouped[item.category].push(item);
        });

        return NextResponse.json({ data: grouped, total: items.length });
    } catch (error) {
        console.error("[faq GET]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
