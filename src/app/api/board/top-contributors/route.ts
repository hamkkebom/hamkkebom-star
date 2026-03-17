import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 1. 최근 7일 동안 작성된 Post와 Comment 가져오기
    const recentPosts = await prisma.boardPost.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, isHidden: false },
      select: { authorId: true, likeCount: true }
    });

    const recentComments = await prisma.boardComment.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, isHidden: false },
      select: { authorId: true, likeCount: true }
    });

    // 2. 유저별 점수 집계 로직
    // Score = PostCount * 5 + CommentCount * 2 + Likes Received * 3
    const scoreMap: Record<string, { postCount: number; commentCount: number; likeReceived: number; score: number; userId: string }> = {};

    recentPosts.forEach(post => {
      if (!scoreMap[post.authorId]) {
        scoreMap[post.authorId] = { postCount: 0, commentCount: 0, likeReceived: 0, score: 0, userId: post.authorId };
      }
      scoreMap[post.authorId].postCount += 1;
      scoreMap[post.authorId].likeReceived += post.likeCount;
      scoreMap[post.authorId].score += (5 + post.likeCount * 3);
    });

    recentComments.forEach(comment => {
      if (!scoreMap[comment.authorId]) {
        scoreMap[comment.authorId] = { postCount: 0, commentCount: 0, likeReceived: 0, score: 0, userId: comment.authorId };
      }
      scoreMap[comment.authorId].commentCount += 1;
      scoreMap[comment.authorId].likeReceived += comment.likeCount;
      scoreMap[comment.authorId].score += (2 + comment.likeCount * 3);
    });

    // 3. 점수 기준 TOP 3 추출
    const sortedScores = Object.values(scoreMap)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    if (sortedScores.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 4. 유저 정보 매핑
    const userIds = sortedScores.map(s => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, chineseName: true, avatarUrl: true }
    });

    const userDict = Object.fromEntries(users.map(u => [u.id, u]));

    const responseData = sortedScores.map((s, idx) => ({
      rank: idx + 1,
      user: userDict[s.userId],
      postCount: s.postCount,
      commentCount: s.commentCount,
      likeReceived: s.likeReceived,
      score: s.score
    })).filter(s => s.user !== undefined);

    return NextResponse.json({ data: responseData });
  } catch (error) {
    console.error("Failed to fetch top contributors:", error);
    return NextResponse.json({ error: "Failed to fetch top contributors" }, { status: 500 });
  }
}
