import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const isAdmin = user.role === "ADMIN";

        const count = await prisma.message.count({
            where: {
                isRead: false,
                senderId: { not: user.id },
                conversation: isAdmin
                    ? { isArchived: false }
                    : { starId: user.id, isArchived: false },
            },
        });

        return NextResponse.json({ unreadCount: count });
    } catch (error) {
        console.error("[conversations/unread GET]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
