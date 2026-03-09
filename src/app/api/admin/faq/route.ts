import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const items = await prisma.faqItem.findMany({
            orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
        });

        return NextResponse.json({ data: items });
    } catch (error) {
        console.error("[admin/faq GET]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { question, answer, category, targetRole } = await request.json();

        if (!question || !answer) {
            return NextResponse.json({ error: "질문과 답변은 필수입니다." }, { status: 400 });
        }

        const maxOrder = await prisma.faqItem.aggregate({
            where: { category: category || "일반" },
            _max: { sortOrder: true },
        });

        const item = await prisma.faqItem.create({
            data: {
                question,
                answer,
                category: category || "일반",
                targetRole: targetRole || "ALL",
                sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
            },
        });

        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        console.error("[admin/faq POST]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
