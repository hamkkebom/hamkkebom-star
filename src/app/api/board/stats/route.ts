import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalMembers, todayPosts, todayComments, totalPosts, firstPost] = await Promise.all([
      prisma.user.count({ where: { role: "STAR" } }),
      prisma.boardPost.count({ where: { createdAt: { gte: today }, isHidden: false } }),
      prisma.boardComment.count({ where: { createdAt: { gte: today }, isHidden: false } }),
      prisma.boardPost.count({ where: { isHidden: false } }),
      prisma.boardPost.findFirst({
        where: { isHidden: false },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true }
      })
    ]);

    // Calculate approx 'today active users' by grouping unique authors of today's posts & comments
    // (For simple stats, using a Prisma aggregation or fetching id list is fine)
    const [activePostAuthors, activeCommentAuthors] = await Promise.all([
      prisma.boardPost.findMany({
        where: { createdAt: { gte: today }, isHidden: false },
        select: { authorId: true },
        distinct: ["authorId"]
      }),
      prisma.boardComment.findMany({
        where: { createdAt: { gte: today }, isHidden: false },
        select: { authorId: true },
        distinct: ["authorId"]
      })
    ]);

    const activeUserSet = new Set([
      ...activePostAuthors.map(p => p.authorId), 
      ...activeCommentAuthors.map(c => c.authorId)
    ]);

    return NextResponse.json({
      data: {
        totalMembers,
        todayActiveUsers: activeUserSet.size,
        todayPosts,
        todayComments,
        totalPosts,
        foundedAt: firstPost?.createdAt || new Date()
      }
    });
  } catch (error) {
    console.error("Failed to fetch community stats:", error);
    return NextResponse.json({ error: "Failed to fetch community stats" }, { status: 500 });
  }
}
