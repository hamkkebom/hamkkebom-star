import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;

        const conversation = await prisma.conversation.findUnique({
            where: { id },
            include: {
                star: { select: { id: true, name: true, avatarUrl: true } },
                admin: { select: { id: true, name: true, avatarUrl: true } },
                messages: {
                    orderBy: { createdAt: "asc" },
                    include: {
                        sender: { select: { id: true, name: true, avatarUrl: true } },
                    },
                },
            },
        });

        if (!conversation) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // 권한 확인 (참여자만)
        const isParticipant = user.role === "ADMIN" ||
            conversation.starId === user.id ||
            conversation.adminId === user.id;

        if (!isParticipant) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 상대방 메시지 읽음 처리
        await prisma.message.updateMany({
            where: {
                conversationId: id,
                senderId: { not: user.id },
                isRead: false,
            },
            data: { isRead: true, readAt: new Date() },
        });

        return NextResponse.json({ data: conversation });
    } catch (error) {
        console.error("[conversations/[id] GET]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
