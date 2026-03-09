import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const isAdmin = user.role === "ADMIN";

        const conversations = await prisma.conversation.findMany({
            where: isAdmin
                ? { isArchived: false }
                : { starId: user.id, isArchived: false },
            orderBy: { lastMessageAt: "desc" },
            include: {
                star: { select: { id: true, name: true, avatarUrl: true } },
                admin: { select: { id: true, name: true, avatarUrl: true } },
                _count: {
                    select: {
                        messages: { where: { isRead: false, senderId: { not: user.id } } },
                    },
                },
            },
        });

        const result = conversations.map((c) => ({
            id: c.id,
            subject: c.subject,
            lastMessage: c.lastMessage,
            lastMessageAt: c.lastMessageAt,
            unreadCount: c._count.messages,
            star: c.star,
            admin: c.admin,
            createdAt: c.createdAt,
        }));

        return NextResponse.json({ data: result });
    } catch (error) {
        console.error("[conversations GET]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { subject, message } = await request.json();

        if (!message?.trim()) {
            return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
        }

        const conversation = await prisma.conversation.create({
            data: {
                starId: user.id,
                subject: subject || null,
                lastMessage: message.slice(0, 100),
                lastMessageAt: new Date(),
                messages: {
                    create: {
                        senderId: user.id,
                        content: message,
                    },
                },
            },
        });

        return NextResponse.json(conversation, { status: 201 });
    } catch (error) {
        console.error("[conversations POST]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
