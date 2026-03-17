import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 승인된 영상 중 조회수가 가장 높은 영상 또는 랜덤으로 1개를 가져옵니다.
    // 임시로 가장 높은 조회수 영상을 가져오되, 실무에서는 랜덤 정렬 등 로직 조정 가능
    const videos = await prisma.video.findMany({
      where: {
        status: "APPROVED",
      },
      orderBy: {
        viewCount: "desc"
      },
      take: 3,
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        viewCount: true,
        owner: {
          select: { name: true }
        },
        _count: {
          select: { likes: true }
        }
      }
    });

    if (videos.length === 0) {
      return NextResponse.json({ data: null });
    }

    // 1개는 메인, 나머지 2개는 서브 텍스트 링크용으로 1묶음 반환
    const [mainVideo, ...subVideos] = videos;

    return NextResponse.json({ data: { mainVideo, subVideos } });
  } catch (error) {
    console.error("Failed to fetch featured video:", error);
    return NextResponse.json({ error: "Failed to fetch featured video" }, { status: 500 });
  }
}
