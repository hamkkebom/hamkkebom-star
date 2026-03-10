import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** POST /api/videos/[id]/bookmark — 북마크 토글 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: videoId } = await params;

    const existing = await prisma.videoBookmark.findUnique({
        where: { userId_videoId: { userId: user.id, videoId } },
    });

    if (existing) {
        await prisma.videoBookmark.delete({ where: { id: existing.id } });
        return NextResponse.json({ bookmarked: false });
    } else {
        await prisma.videoBookmark.create({ data: { userId: user.id, videoId } });
        return NextResponse.json({ bookmarked: true });
    }
}
