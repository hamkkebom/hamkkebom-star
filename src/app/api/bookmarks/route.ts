import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

/**
 * GET /api/bookmarks — 내 북마크 목록
 * POST /api/bookmarks — 북마크 추가 { requestId }
 * DELETE /api/bookmarks?requestId=xxx — 북마크 삭제
 */

export async function GET() {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookmarks = await prisma.projectBookmark.findMany({
        where: { userId: user.id },
        select: { requestId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: bookmarks });
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { requestId } = await req.json();
    if (!requestId) {
        return NextResponse.json({ error: "requestId is required" }, { status: 400 });
    }

    // upsert to avoid duplicates
    const bookmark = await prisma.projectBookmark.upsert({
        where: { userId_requestId: { userId: user.id, requestId } },
        update: {},
        create: { userId: user.id, requestId },
    });

    return NextResponse.json({ data: bookmark });
}

export async function DELETE(req: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const requestId = url.searchParams.get("requestId");
    if (!requestId) {
        return NextResponse.json({ error: "requestId is required" }, { status: 400 });
    }

    await prisma.projectBookmark.deleteMany({
        where: { userId: user.id, requestId },
    });

    return NextResponse.json({ message: "deleted" });
}
