import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { BoardType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const validBoardTypes = new Set(Object.values(BoardType));

/** GET /api/board/posts — 게시글 목록 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const boardType = searchParams.get("boardType");
    const sort = searchParams.get("sort") || "latest";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(30, Number(searchParams.get("pageSize") || "20"));
    const q = searchParams.get("q")?.trim();

    const where: any = { isHidden: false };

    if (boardType && validBoardTypes.has(boardType as BoardType)) {
        where.boardType = boardType;
    }

    if (q) {
        where.OR = [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
        ];
    }

    const orderBy = sort === "popular"
        ? [{ likeCount: "desc" as const }, { createdAt: "desc" as const }]
        : sort === "comments"
            ? [{ comments: { _count: "desc" as const } }, { createdAt: "desc" as const }]
            : [{ isPinned: "desc" as const }, { createdAt: "desc" as const }];

    const [posts, total] = await Promise.all([
        prisma.boardPost.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
                author: { select: { id: true, name: true, chineseName: true, avatarUrl: true, role: true } },
                _count: { select: { comments: true, likes: true } },
            },
        }),
        prisma.boardPost.count({ where }),
    ]);

    return NextResponse.json({
        data: posts,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
}

/** POST /api/board/posts — 게시글 작성 */
export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, content, boardType, tags, videoId } = await request.json();

    if (!title?.trim() || !content?.trim()) {
        return NextResponse.json({ error: "제목과 내용을 입력해주세요." }, { status: 400 });
    }

    const post = await prisma.boardPost.create({
        data: {
            title: title.trim(),
            content: content.trim(),
            boardType: boardType && validBoardTypes.has(boardType) ? boardType : "FREE",
            tags: tags || [],
            videoId: videoId || null,
            authorId: user.id,
            isNotice: user.role === "ADMIN" && boardType === "NOTICE",
        },
        include: {
            author: { select: { id: true, name: true, chineseName: true, avatarUrl: true, role: true } },
        },
    });

    return NextResponse.json(post, { status: 201 });
}
