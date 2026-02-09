import { NextResponse } from "next/server";
import { SubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

const submissionStatuses = new Set(Object.values(SubmissionStatus));

export async function GET(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "STAR") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "STAR만 접근할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));
  const assignmentId = searchParams.get("assignmentId")?.trim();
  const status = searchParams.get("status");

  if (status && status !== "ALL" && !submissionStatuses.has(status as SubmissionStatus)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 상태값입니다." } },
      { status: 400 }
    );
  }

  const where = {
    starId: user.id,
    ...(assignmentId ? { assignmentId } : {}),
    ...(status && status !== "ALL" ? { status: status as SubmissionStatus } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: {
        assignment: {
          include: {
            request: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        _count: {
          select: {
            feedbacks: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.submission.count({ where }),
  ]);

  return NextResponse.json({
    data: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
