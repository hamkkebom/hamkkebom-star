import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthUser({ skipApprovalCheck: true });
    
    if (!user) {
      return NextResponse.json({ data: null, message: "Unauthorized" }, { status: 401 });
    }

    const bookmarks = await prisma.boardPostBookmark.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5,
      include: {
        post: {
          select: {
            id: true,
            title: true,
            boardType: true,
            author: { select: { name: true } },
            commentCount: true,
            viewCount: true,
          }
        }
      }
    });

    return NextResponse.json({ data: bookmarks });
  } catch (error) {
    console.error("Failed to fetch sidebar bookmarks:", error);
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}
