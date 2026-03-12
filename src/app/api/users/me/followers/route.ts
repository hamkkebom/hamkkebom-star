import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** GET /api/users/me/followers — 나를 팔로우하는 유저 목록 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20"))
    );
    const skip = (page - 1) * pageSize;

    const [follows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              role: true,
              _count: { select: { videos: true } },
            },
          },
        },
      }),
      prisma.follow.count({ where: { followingId: user.id } }),
    ]);

    // 맞팔로우 여부 확인: 내가 팔로우하고 있는지 체크
    const followerIds = follows.map((f) => f.follower.id);
    const myFollows = await prisma.follow.findMany({
      where: {
        followerId: user.id,
        followingId: { in: followerIds },
      },
      select: { followingId: true },
    });
    const followingBackSet = new Set(myFollows.map((f) => f.followingId));

    const data = follows.map((follow) => ({
      id: follow.follower.id,
      name: follow.follower.name,
      avatarUrl: follow.follower.avatarUrl,
      role: follow.follower.role,
      videoCount: follow.follower._count.videos,
      isFollowingBack: followingBackSet.has(follow.follower.id),
      followedAt: follow.createdAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[GET /api/users/me/followers]", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "팔로워 목록을 불러오는데 실패했습니다.",
        },
      },
      { status: 500 }
    );
  }
}
