import { NextResponse } from "next/server";
import { RequestStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

const requestStatuses = new Set(Object.values(RequestStatus));

export async function GET(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "ADMIN" && user.role !== "STAR") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "접근 권한이 없습니다." } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "12") || 12));
  const statusParam = searchParams.get("status");
  const search = searchParams.get("search")?.trim();

  if (statusParam && statusParam !== "ALL" && !requestStatuses.has(statusParam as RequestStatus)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 상태값입니다." } },
      { status: 400 }
    );
  }

  const where = {
    ...(statusParam && statusParam !== "ALL" ? { status: statusParam as RequestStatus } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { requirements: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.projectRequest.findMany({
      where,
      include: {
        _count: {
          select: {
            assignments: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.projectRequest.count({ where }),
  ]);

  return NextResponse.json({
    data: rows.map((row) => ({
      ...row,
      currentAssignees: row._count.assignments,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
