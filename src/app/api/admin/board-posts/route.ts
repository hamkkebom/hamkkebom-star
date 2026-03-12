import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { BoardType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const validBoardTypes = new Set(Object.values(BoardType));

/** GET /api/admin/board-posts — 관리자 게시글 목록 (필터/페이지네이션) */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const boardType = url.searchParams.get("boardType");
  const isHidden = url.searchParams.get("isHidden");
  const isPinned = url.searchParams.get("isPinned");
  const isNotice = url.searchParams.get("isNotice");
  const isFeatured = url.searchParams.get("isFeatured");
  const search = url.searchParams.get("search");
  const authorId = url.searchParams.get("authorId");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")),
  );

  const where: Record<string, unknown> = {};
  if (boardType && validBoardTypes.has(boardType as BoardType)) {
    where.boardType = boardType;
  }
  if (isHidden !== null) where.isHidden = isHidden === "true";
  if (isPinned !== null) where.isPinned = isPinned === "true";
  if (isNotice !== null) where.isNotice = isNotice === "true";
  if (isFeatured !== null) where.isFeatured = isFeatured === "true";
  if (search) where.title = { contains: search, mode: "insensitive" };
  if (authorId) where.authorId = authorId;
  if (dateFrom || dateTo) {
    const createdAt: Record<string, unknown> = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom);
    if (dateTo) createdAt.lte = new Date(dateTo);
    where.createdAt = createdAt;
  }

  const [posts, total, hiddenCount, pinnedCount, noticeCount, featuredCount, todayCount] =
    await Promise.all([
      prisma.boardPost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
              bookmarks: true,
            },
          },
        },
      }),
      prisma.boardPost.count({ where }),
      prisma.boardPost.count({ where: { isHidden: true } }),
      prisma.boardPost.count({ where: { isPinned: true } }),
      prisma.boardPost.count({ where: { isNotice: true } }),
      prisma.boardPost.count({ where: { isFeatured: true } }),
      prisma.boardPost.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

  return NextResponse.json({
    data: posts,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      statusCounts: {
        total: await prisma.boardPost.count(),
        hidden: hiddenCount,
        pinned: pinnedCount,
        notice: noticeCount,
        featured: featuredCount,
        todayCount,
      },
    },
  });
}
