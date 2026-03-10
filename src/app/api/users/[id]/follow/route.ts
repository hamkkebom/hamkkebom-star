import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** POST /api/users/[id]/follow — 팔로우/언팔로우 토글 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: targetId } = await params;

    if (user.id === targetId) {
        return NextResponse.json({ error: "자기 자신을 팔로우할 수 없습니다." }, { status: 400 });
    }

    const existing = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: user.id, followingId: targetId } },
    });

    if (existing) {
        await prisma.follow.delete({ where: { id: existing.id } });
        return NextResponse.json({ following: false });
    } else {
        await prisma.follow.create({ data: { followerId: user.id, followingId: targetId } });
        return NextResponse.json({ following: true });
    }
}

/** GET /api/users/[id]/follow — 팔로우 상태 + 팔로워/팔로잉 수 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: targetId } = await params;
    const user = await getAuthUser().catch(() => null);

    const [followerCount, followingCount, isFollowing] = await Promise.all([
        prisma.follow.count({ where: { followingId: targetId } }),
        prisma.follow.count({ where: { followerId: targetId } }),
        user ? prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: user.id, followingId: targetId } },
        }) : null,
    ]);

    return NextResponse.json({
        followerCount,
        followingCount,
        isFollowing: !!isFollowing,
    });
}
