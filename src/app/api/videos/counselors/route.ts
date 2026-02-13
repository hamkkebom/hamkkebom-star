import { NextResponse } from "next/server";
import { VideoStatus, CounselorStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/videos/counselors
 * 공개 영상(APPROVED/FINAL)에 연결된 상담사 목록 반환
 */
export async function GET() {
  const counselors = await prisma.counselor.findMany({
    where: {
      status: CounselorStatus.ACTIVE,
      videos: {
        some: {
          status: { in: [VideoStatus.APPROVED, VideoStatus.FINAL] },
        },
      },
    },
    select: {
      id: true,
      displayName: true,
      imageUrl: true,
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
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json(
    {
      data: counselors.map((c) => ({
        id: c.id,
        displayName: c.displayName,
        imageUrl: c.imageUrl,
        videoCount: c._count.videos,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
