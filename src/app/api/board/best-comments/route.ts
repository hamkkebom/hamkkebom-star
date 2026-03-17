import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const bestComments = await prisma.boardComment.findMany({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
        isHidden: false,
        likeCount: { gt: 0 } // 최소 1개 이상 좋아요
      },
      orderBy: [
        { likeCount: "desc" },
        { createdAt: "desc" }
      ],
      take: 3,
      select: {
        id: true,
        content: true,
        likeCount: true,
        author: {
          select: { name: true, avatarUrl: true }
        },
        post: {
          select: { id: true, title: true }
        }
      }
    });

    return NextResponse.json({ data: bestComments });
  } catch (error) {
    console.error("Failed to fetch best comments:", error);
    return NextResponse.json({ error: "Failed to fetch best comments" }, { status: 500 });
  }
}
