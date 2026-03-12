import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { BoardType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const validBoardTypes = new Set(Object.values(BoardType));

/** GET /api/board/posts — 게시글 목록 (offset + cursor 페이지네이션) */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const boardType = searchParams.get("boardType");
    const sort = searchParams.get("sort") || "latest";
    const pageSize = Math.min(30, Number(searchParams.get("pageSize") || "20"));
    const q = searchParams.get("q")?.trim();
    const cursor = searchParams.get("cursor");

    const where: Record<string, unknown> = { isHidden: false };

    if (boardType && validBoardTypes.has(boardType as BoardType)) {
        where.boardType = boardType;
    }

    if (q) {
        where.OR = [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
        ];
    }

    const includeClause = {
        author: { select: { id: true, name: true, chineseName: true, avatarUrl: true, role: true } },
        _count: { select: { comments: true, likes: true } },
    } as const;

    // --- Cursor-based pagination (for infinite scroll) ---
    if (cursor) {
        const separatorIdx = cursor.lastIndexOf("_");
        const cursorDate = separatorIdx > 0 ? cursor.slice(0, separatorIdx) : null;
        const cursorId = separatorIdx > 0 ? cursor.slice(separatorIdx + 1) : null;

        if (cursorDate && cursorId) {
            const parsedDate = new Date(cursorDate);
            where.OR = where.OR
                ? {
                      AND: [
                          { OR: where.OR },
                          {
                              OR: [
                                  { createdAt: { lt: parsedDate } },
                                  { createdAt: parsedDate, id: { lt: cursorId } },
                              ],
                          },
                      ],
                  }
                : {
                      OR: [
                          { createdAt: { lt: parsedDate } },
                          { createdAt: parsedDate, id: { lt: cursorId } },
                      ],
                  };
        }

        const posts = await prisma.boardPost.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: pageSize + 1,
            include: includeClause,
        });

        const hasMore = posts.length > pageSize;
        const items = hasMore ? posts.slice(0, pageSize) : posts;
        const lastItem = items[items.length - 1];
        const nextCursor =
            hasMore && lastItem
                ? `${lastItem.createdAt.toISOString()}_${lastItem.id}`
                : null;

        return NextResponse.json({ data: items, nextCursor, pageSize });
    }

    // --- Offset-based pagination (default) ---
    const page = Math.max(1, Number(searchParams.get("page") || "1"));

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
            include: includeClause,
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

    const { title, content, contentJson, boardType, tags, videoId } = await request.json();

    if (!title?.trim() || !content?.trim()) {
        return NextResponse.json({ error: "제목과 내용을 입력해주세요." }, { status: 400 });
    }

    const post = await prisma.boardPost.create({
        data: {
            title: title.trim(),
            content: content.trim(),
            contentJson: contentJson ?? undefined,
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
