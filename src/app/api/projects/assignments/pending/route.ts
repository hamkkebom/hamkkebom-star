import { NextResponse } from "next/server";
import { AssignmentStatus } from "@/generated/prisma/client";
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

  const where = {
    status: AssignmentStatus.PENDING_APPROVAL,
  };

  try {
    const [rows, total] = await Promise.all([
      prisma.projectAssignment.findMany({
        where,
        include: {
          star: {
            select: {
              id: true,
              name: true,
              chineseName: true,
              email: true,
              avatarUrl: true,
            },
          },
          request: {
            select: {
              id: true,
              title: true,
              deadline: true,
              maxAssignees: true,
              categories: true,
              status: true,
              _count: {
                select: {
                  assignments: {
                    where: {
                      status: {
                        in: [
                          AssignmentStatus.ACCEPTED,
                          AssignmentStatus.IN_PROGRESS,
                          AssignmentStatus.SUBMITTED,
                          AssignmentStatus.COMPLETED,
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.projectAssignment.count({ where }),
    ]);

    return NextResponse.json({
      data: rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || String(error) } },
      { status: 500 }
    );
  }
}
