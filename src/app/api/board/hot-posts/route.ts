import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // hotScore 로컬 캐싱 전략 적용
    const posts = await prisma.boardPost.findMany({
      where: {
        isHidden: false,
        // 최근 7일 내의 게시글만 인기글 후보로
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: [
        { hotScore: "desc" },
        { createdAt: "desc" }
      ],
      take: 5,
      select: {
        id: true,
        title: true,
        likeCount: true,
        commentCount: true,
        viewCount: true,
        hotScore: true,
        createdAt: true
      }
    });

    // 임시로 rank와 rankChange 반환 (실무에서는 스냅샷 테이블과 조인 필요)
    const hotPosts = posts.map((post, index) => ({
      rank: index + 1,
      rankChange: ["up", "down", "same", "new"][Math.floor(Math.random() * 4)], // TODO: 실제 랭킹 변동 로직
      post
    }));

    return NextResponse.json({ data: hotPosts });
  } catch (error) {
    console.error("Failed to fetch hot posts:", error);
    return NextResponse.json({ error: "Failed to fetch hot posts" }, { status: 500 });
  }
}
