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

        const sections = await prisma.guideSection.findMany({
            where: { isPublished: true, ...roleFilter },
            orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
        });

        const grouped: Record<string, typeof sections> = {};
        sections.forEach((s) => {
            if (!grouped[s.category]) grouped[s.category] = [];
            grouped[s.category].push(s);
        });

        return NextResponse.json({ data: grouped, total: sections.length });
    } catch (error) {
        console.error("[guide GET]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
