import { NextResponse } from "next/server";
import { VideoStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/videos/owners
 * 공개 영상(APPROVED/FINAL)을 보유한 STAR 목록 반환
 */
export async function GET() {
  const owners = await prisma.user.findMany({
    where: {
      videos: {
        some: {
          status: { in: [VideoStatus.APPROVED, VideoStatus.FINAL] },
        },
      },
    },
    select: {
      id: true,
      name: true,
      chineseName: true,
      _count: {
        select: {
          videos: {
            where: {
              status: { in: [VideoStatus.APPROVED, VideoStatus.FINAL] },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    {
      data: owners.map((o) => ({
        id: o.id,
        name: o.name,
        chineseName: o.chineseName,
        videoCount: o._count.videos,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
