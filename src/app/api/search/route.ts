import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/search?q=검색어 — 통합 검색 (영상 + 게시글 + 스타) */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 1) {
        return NextResponse.json({ videos: [], posts: [], stars: [] });
    }

    const [videos, posts, stars] = await Promise.all([
        prisma.video.findMany({
            where: {
                status: { in: ["APPROVED", "FINAL"] },
                owner: { showVideosPublicly: true },
                OR: [
                    { title: { contains: q, mode: "insensitive" } },
                    { owner: { chineseName: { contains: q, mode: "insensitive" } } },
                    { owner: { name: { contains: q, mode: "insensitive" } } },
                ],
            },
            take: 10,
            orderBy: { viewCount: "desc" },
            select: {
                id: true,
                title: true,
                viewCount: true,
                createdAt: true,
                owner: { select: { id: true, name: true, chineseName: true } },
                category: { select: { name: true } },
            },
        }),
        prisma.boardPost.findMany({
            where: {
                isHidden: false,
                OR: [
                    { title: { contains: q, mode: "insensitive" } },
                    { content: { contains: q, mode: "insensitive" } },
                ],
            },
            take: 10,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                boardType: true,
                viewCount: true,
                createdAt: true,
                author: { select: { name: true, chineseName: true } },
                _count: { select: { comments: true, likes: true } },
            },
        }),
        prisma.user.findMany({
            where: {
                role: "STAR",
                isApproved: true,
                OR: [
                    { chineseName: { contains: q, mode: "insensitive" } },
                    { name: { contains: q, mode: "insensitive" } },
                ],
            },
            take: 10,
            select: {
                id: true,
                name: true,
                chineseName: true,
                avatarUrl: true,
                _count: { select: { videos: true, followers: true } },
            },
        }),
    ]);

    return NextResponse.json({ videos, posts, stars });
}
