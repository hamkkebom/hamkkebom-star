import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/announcements
 * 활성 공지사항 목록 조회 (모든 유저)
 *
 * POST /api/announcements
 * 새 공지사항 작성 (ADMIN 전용)
 */
export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";

    const announcements = await prisma.announcement.findMany({
        where: { isActive: true },
        orderBy: [
            { priority: "desc" },
            { createdAt: "desc" },
        ],
        include: {
            author: { select: { name: true, avatarUrl: true } },
            reads: {
                where: { userId: user.id },
                select: { readAt: true },
            },
        },
    });

    const result = announcements.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content.slice(0, 120),
        priority: a.priority,
        isRead: a.reads.length > 0,
        author: a.author,
        createdAt: a.createdAt,
    }));

    const filtered = filter === "unread"
        ? result.filter((a) => !a.isRead)
        : filter === "important"
            ? result.filter((a) => a.priority === "HIGH" || a.priority === "URGENT")
            : result;

    const unreadCount = result.filter((a) => !a.isRead).length;

    return NextResponse.json({ data: filtered, unreadCount });
}

export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, content, priority } = await request.json();

    if (!title || !content) {
        return NextResponse.json(
            { error: "제목과 내용은 필수입니다." },
            { status: 400 }
        );
    }

    const announcement = await prisma.announcement.create({
        data: {
            title,
            content,
            priority: priority || "NORMAL",
            authorId: user.id,
        },
    });

    return NextResponse.json(announcement, { status: 201 });
}
