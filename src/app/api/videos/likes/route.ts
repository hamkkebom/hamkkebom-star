import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { resolveSignedThumbnail } from "@/lib/thumbnail";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));

    const [total, likes] = await Promise.all([
      prisma.videoLike.count({
        where: { userId: user.id },
      }),
      prisma.videoLike.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          video: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              technicalSpec: {
                select: {
                  duration: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Transform to match VideoCard expected format
    const data = await Promise.all(likes.map(async (l) => {
      const v = l.video;
      const signedThumbnailUrl = await resolveSignedThumbnail(v.thumbnailUrl, v.streamUid);
      return {
        id: v.id,
        title: v.title,
        thumbnailUrl: signedThumbnailUrl || v.thumbnailUrl,
        streamUid: v.streamUid,
        duration: v.technicalSpec?.duration || null,
        ownerName: v.owner.name,
        categoryName: v.category?.name || null,
        createdAt: v.createdAt.toISOString(),
        viewCount: v.viewCount,
        likedAt: l.createdAt.toISOString(),
      };
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[GET /api/videos/likes]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "좋아요한 영상 목록을 불러오는데 실패했습니다." } },
      { status: 500 }
    );
  }
}
