import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));
  const search = searchParams.get("search")?.trim();

  const where = {
    role: "STAR" as const,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        chineseName: true,
        phone: true,
        avatarUrl: true,
        baseRate: true,
        gradeId: true,
        grade: {
          select: {
            id: true,
            name: true,
            color: true,
            baseRate: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignments: true,
            submissions: true,
            videos: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    data: rows.map((row) => ({
      ...row,
      assignmentCount: row._count.assignments,
      submissionCount: row._count.submissions,
      videoCount: row._count.videos,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
