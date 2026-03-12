import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addSignedThumbnails } from "@/lib/thumbnail";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            videos: {
              where: {
                status: { in: ["APPROVED", "FINAL"] },
              },
            },
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "카테고리를 찾을 수 없습니다." } },
        { status: 404 }
      );
    }

    const rawVideos = await prisma.video.findMany({
      where: {
        categoryId: category.id,
        status: { in: ["APPROVED", "FINAL"] },
      },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        streamUid: true,
        viewCount: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
      orderBy: {
        viewCount: "desc",
      },
      take: 6,
    });

    const videos = await addSignedThumbnails(rawVideos);

    // Get top creators in this category
    const topCreatorsData = await prisma.video.groupBy({
      by: ["ownerId"],
      where: {
        categoryId: category.id,
        status: { in: ["APPROVED", "FINAL"] },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 4,
    });

    const creatorIds = topCreatorsData.map((c) => c.ownerId);
    
    const creators = await prisma.user.findMany({
      where: {
        id: { in: creatorIds },
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        role: true,
      },
    });

    // Sort creators to match the grouped order
    const sortedCreators = creatorIds
      .map((id) => creators.find((c) => c.id === id))
      .filter(Boolean);

    return NextResponse.json({
      data: {
        category,
        videos,
        creators: sortedCreators,
        totalVideos: category._count.videos,
      },
    });
  } catch (error) {
    console.error("[GET /api/categories/[slug]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "카테고리 정보를 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
