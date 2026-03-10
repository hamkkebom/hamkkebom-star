import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "12") || 12));
    const medium = searchParams.get("medium")?.trim();

    const where: any = {
      status: { in: ["ACTIVE", "COMPLETED"] },
    };

    if (medium && medium !== "전체") {
      where.medium = medium;
    }

    const [total, placements, statsRaw] = await Promise.all([
      prisma.mediaPlacement.count({ where }),
      prisma.mediaPlacement.findMany({
        where,
        orderBy: { startDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          medium: true,
          placementType: true,
          campaignName: true,
          channel: true,
          startDate: true,
          url: true,
          videoId: true,
          video: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
      prisma.mediaPlacement.groupBy({
        by: ["medium"],
        where: { status: { in: ["ACTIVE", "COMPLETED"] } },
        _count: { id: true },
      }),
    ]);

    const stats = {
      total: statsRaw.reduce((acc, curr) => acc + curr._count.id, 0),
      youtube: statsRaw.find((s) => s.medium.toLowerCase() === "youtube")?._count.id || 0,
      instagram: statsRaw.find((s) => s.medium.toLowerCase() === "instagram")?._count.id || 0,
      tiktok: statsRaw.find((s) => s.medium.toLowerCase() === "tiktok")?._count.id || 0,
      other: 0,
    };
    
    stats.other = stats.total - stats.youtube - stats.instagram - stats.tiktok;

    return NextResponse.json({
      data: placements,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats,
    });
  } catch (error) {
    console.error("[GET /api/placements/public]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "매체 집행 목록을 불러오는데 실패했습니다." } },
      { status: 500 }
    );
  }
}
