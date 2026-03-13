import { NextResponse } from "next/server";
import { AssignmentStatus, RequestStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

const requestStatuses = new Set(Object.values(RequestStatus));

const SORT_OPTIONS: Record<string, object> = {
  created: { createdAt: "desc" },
  deadline: { deadline: "asc" },
  budget: { estimatedBudget: "desc" },
  title: { title: "asc" },
};

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
  const sortParam = searchParams.get("sort") ?? "created";
  const includeCounts = searchParams.get("counts") === "true";
  const includePendingApprovals = searchParams.get("pendingApprovals") === "true";

  const isAppliedFilter = statusParam === "APPLIED";

  if (statusParam && statusParam !== "ALL" && !isAppliedFilter && !requestStatuses.has(statusParam as RequestStatus)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 상태값입니다." } },
      { status: 400 }
    );
  }

  try {

  const where = {
    ...(statusParam && statusParam !== "ALL" && !isAppliedFilter
      ? { status: statusParam as RequestStatus }
      : {}),
    // OPEN 필터 시 마감일 지난 프로젝트 제외
    ...(statusParam === "OPEN"
      ? { deadline: { gte: new Date() } }
      : {}),
    ...(isAppliedFilter && user.role === "STAR"
      ? { assignments: { some: { starId: user.id, status: { notIn: [AssignmentStatus.REJECTED, AssignmentStatus.CANCELLED] } } } }
      : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { requirements: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const isStar = user.role === "STAR";
  const isAdmin = user.role === "ADMIN";
  const orderBy = SORT_OPTIONS[sortParam] ?? SORT_OPTIONS.created;

  const queries: [Promise<unknown[]>, Promise<number>, ...Promise<unknown>[]] = [
    prisma.projectRequest.findMany({
      where,
      include: {
        _count: {
          select: {
            assignments: { where: { status: { in: [AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS, AssignmentStatus.SUBMITTED, AssignmentStatus.COMPLETED] } } },
          },
        },
        ...(includePendingApprovals && isAdmin
          ? {
              assignments: {
                where: { status: AssignmentStatus.PENDING_APPROVAL },
                select: { id: true },
              },
            }
          : {}),
        ...(isStar
          ? {
              assignments: {
                where: { starId: user.id },
                select: { status: true },
                take: 1,
              },
            }
          : {}),
      },
      orderBy: [orderBy],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.projectRequest.count({ where }),
  ];

  // Status counts for KPI (no additional filter applied — always count all)
  let statusCounts: Record<string, number> | undefined;
  if (includeCounts && isAdmin) {
    const countRows = await prisma.projectRequest.groupBy({
      by: ["status"],
      _count: { status: true },
    });
    statusCounts = Object.fromEntries(
      countRows.map((r) => [r.status, r._count.status])
    );

    // Also count total pending approvals
    const pendingTotal = await prisma.projectAssignment.count({
      where: { status: AssignmentStatus.PENDING_APPROVAL },
    });
    statusCounts.PENDING_APPROVAL = pendingTotal;
  }

  const [rows, total] = (await Promise.all(queries)) as [unknown[], number];
  const typedRows = rows as Array<{
    id: string;
    _count: { assignments: number };
    assignments?: { status: string; id?: string }[];
    [key: string]: unknown;
  }>;

  return NextResponse.json({
    data: typedRows.map((row) => {
      const myAssignments = "assignments" in row && Array.isArray(row.assignments)
        ? row.assignments
        : [];

      if (isStar) {
        const myAssignment = myAssignments[0];
        return {
          ...row,
          currentAssignees: row._count.assignments,
          myAssignmentStatus: myAssignment?.status ?? null,
        };
      }

      // ADMIN: include pendingApprovals count
      const pendingCount = includePendingApprovals
        ? myAssignments.length
        : undefined;

      const { assignments: _assignments, ...rest } = row;
      return {
        ...rest,
        currentAssignees: row._count.assignments,
        ...(pendingCount !== undefined ? { pendingApprovals: pendingCount } : {}),
      };
    }),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    ...(statusCounts ? { statusCounts } : {}),
  });

  } catch (error) {
    console.error("[board] 프로젝트 요청 조회 실패:", error);
    console.error("[board] 프로젝트 요청 조회 실패:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "프로젝트 목록을 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
