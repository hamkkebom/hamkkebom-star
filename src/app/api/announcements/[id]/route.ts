import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/announcements/[id]
 * 공지사항 수정 (ADMIN 전용)
 *
 * DELETE /api/announcements/[id]
 * 공지사항 삭제 (ADMIN 전용)
 */
export async function GET(_request: NextRequest, { params }: Params) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const announcement = await prisma.announcement.findUnique({
        where: { id },
        include: { author: { select: { name: true, avatarUrl: true } } },
    });

    if (!announcement || !announcement.isActive) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 읽음 처리
    await prisma.announcementRead.upsert({
        where: { announcementId_userId: { announcementId: id, userId: user.id } },
        create: { announcementId: id, userId: user.id },
        update: {},
    });

    return NextResponse.json({ data: announcement });
}

export async function PATCH(request: NextRequest, { params }: Params) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updated = await prisma.announcement.update({
        where: { id },
        data: {
            ...(body.title !== undefined && { title: body.title }),
            ...(body.content !== undefined && { content: body.content }),
            ...(body.priority !== undefined && { priority: body.priority }),
            ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
    });

    return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.announcement.delete({
        where: { id },
    });

    return NextResponse.json({ message: "삭제되었습니다." });
}
