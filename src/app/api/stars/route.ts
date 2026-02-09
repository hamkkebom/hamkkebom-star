import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VideoStatus } from "@/generated/prisma/client";

/**
 * GET /api/stars — 공개 STAR 목록
 * 인증 없이 접근 가능
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));
  const search = searchParams.get("search")?.trim();

  const where = {
    role: "STAR" as const,
    // Only show stars that have at least one approved video
    videos: { some: { status: { in: [VideoStatus.APPROVED, VideoStatus.FINAL] } } },
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        portfolio: {
          select: {
            bio: true,
            showreel: true,
          },
        },
        _count: {
          select: {
            videos: {
              where: { status: { in: [VideoStatus.APPROVED, VideoStatus.FINAL] } },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      avatarUrl: row.avatarUrl,
      bio: row.portfolio?.bio ?? null,
      showreel: row.portfolio?.showreel ?? null,
      videoCount: row._count.videos,
      createdAt: row.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
