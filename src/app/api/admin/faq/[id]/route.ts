import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        const updated = await prisma.faqItem.update({
            where: { id },
            data: {
                ...(body.question !== undefined && { question: body.question }),
                ...(body.answer !== undefined && { answer: body.answer }),
                ...(body.category !== undefined && { category: body.category }),
                ...(body.targetRole !== undefined && { targetRole: body.targetRole }),
                ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
                ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("[admin/faq/[id] PUT]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await prisma.faqItem.delete({ where: { id } });

        return NextResponse.json({ message: "삭제되었습니다." });
    } catch (error) {
        console.error("[admin/faq/[id] DELETE]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
