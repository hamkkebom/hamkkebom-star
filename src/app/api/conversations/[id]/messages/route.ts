import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const { content } = await request.json();

        if (!content?.trim()) {
            return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
        }

        const conversation = await prisma.conversation.findUnique({
            where: { id },
        });

        if (!conversation) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // ADMIN이 처음 답변하면 adminId 배정
        const updateData: Record<string, unknown> = {
            lastMessage: content.slice(0, 100),
            lastMessageAt: new Date(),
        };

        if (user.role === "ADMIN" && !conversation.adminId) {
            updateData.adminId = user.id;
        }

        const [message] = await prisma.$transaction([
            prisma.message.create({
                data: {
                    conversationId: id,
                    senderId: user.id,
                    content,
                },
                include: {
                    sender: { select: { id: true, name: true, avatarUrl: true } },
                },
            }),
            prisma.conversation.update({
                where: { id },
                data: updateData,
            }),
        ]);

        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        console.error("[conversations/[id]/messages POST]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
