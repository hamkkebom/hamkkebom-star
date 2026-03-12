import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** GET /api/users/me/following — 내가 팔로우하는 유저 목록 */
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
        where: { followerId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          following: {
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
      prisma.follow.count({ where: { followerId: user.id } }),
    ]);

    const data = follows.map((follow) => ({
      id: follow.following.id,
      name: follow.following.name,
      avatarUrl: follow.following.avatarUrl,
      role: follow.following.role,
      videoCount: follow.following._count.videos,
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
    console.error("[GET /api/users/me/following]", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "팔로잉 목록을 불러오는데 실패했습니다.",
        },
      },
      { status: 500 }
    );
  }
}
