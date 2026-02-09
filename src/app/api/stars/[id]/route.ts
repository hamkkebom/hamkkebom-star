import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/stars/:id — 공개 STAR 프로필 + 영상 목록
 * 인증 없이 접근 가능
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      portfolio: {
        select: {
          bio: true,
          showreel: true,
          website: true,
          socialLinks: true,
          items: {
            select: {
              id: true,
              title: true,
              description: true,
              thumbnailUrl: true,
              videoUrl: true,
            },
            orderBy: { sortOrder: "asc" },
            take: 20,
          },
        },
      },
      videos: {
        where: { status: { in: ["APPROVED", "FINAL"] } },
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          streamUid: true,
          createdAt: true,
          category: { select: { id: true, name: true, slug: true } },
          technicalSpec: { select: { duration: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      _count: {
        select: {
          videos: {
            where: { status: { in: ["APPROVED", "FINAL"] } },
          },
        },
      },
    },
  });

  if (!user || user.role !== "STAR") {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "스타를 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      bio: user.portfolio?.bio ?? null,
      showreel: user.portfolio?.showreel ?? null,
      website: user.portfolio?.website ?? null,
      socialLinks: user.portfolio?.socialLinks ?? null,
      portfolioItems: user.portfolio?.items ?? [],
      videos: user.videos.map((v) => ({
        ...v,
        owner: { name: user.name },
      })),
      videoCount: user._count.videos,
    },
  });
}
