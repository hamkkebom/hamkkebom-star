import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** GET /api/admin/board-comments — 관리자 게시판 댓글 목록 (필터/페이지네이션) */
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
  const isHidden = url.searchParams.get("isHidden");
  const postId = url.searchParams.get("postId");
  const authorId = url.searchParams.get("authorId");
  const search = url.searchParams.get("search");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")),
  );

  const where: Record<string, unknown> = {};
  if (isHidden !== null) where.isHidden = isHidden === "true";
  if (postId) where.postId = postId;
  if (authorId) where.authorId = authorId;
  if (search) where.content = { contains: search, mode: "insensitive" };
  if (dateFrom || dateTo) {
    const createdAt: Record<string, unknown> = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom);
    if (dateTo) createdAt.lte = new Date(dateTo);
    where.createdAt = createdAt;
  }

  const [comments, total] = await Promise.all([
    prisma.boardComment.findMany({
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
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            boardType: true,
          },
        },
      },
    }),
    prisma.boardComment.count({ where }),
  ]);

  return NextResponse.json({
    data: comments,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
