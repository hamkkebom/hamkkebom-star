import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 태그를 가진 최근 게시글 조회
    const posts = await prisma.boardPost.findMany({
      where: {
        isHidden: false,
        createdAt: { gte: thirtyDaysAgo },
        tags: { isEmpty: false }
      },
      select: {
        tags: true
      }
    });

    // 메모리에서 태그 카운팅 연산 (Prisma Array count groupBy가 원활하지 않은 경우 대응)
    const tagCounts: Record<string, number> = {};
    for (const post of posts) {
      if (post.tags && Array.isArray(post.tags)) {
        for (const tag of post.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }

    // 객체를 배열로 변환 후 정렬
    const trendingTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({ data: trendingTags });
  } catch (error) {
    console.error("Failed to fetch trending tags:", error);
    return NextResponse.json({ error: "Failed to fetch trending tags" }, { status: 500 });
  }
}
