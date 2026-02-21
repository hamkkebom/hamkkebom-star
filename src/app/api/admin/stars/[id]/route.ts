import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
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

  const { id } = await params;

  const star = await prisma.user.findFirst({
    where: { id, role: "STAR" },
    select: {
      id: true,
      email: true,
      name: true,
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
      externalId: true,
      chineseName: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          assignments: true,
          submissions: true,
          videos: true,
          settlements: true,
        },
      },
    },
  });

  if (!star) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "STAR를 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  // 최근 프로젝트 이력
  const recentAssignments = await prisma.projectAssignment.findMany({
    where: { starId: id },
    include: {
      request: { select: { id: true, title: true, deadline: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // 최근 정산
  const recentSettlements = await prisma.settlement.findMany({
    where: { starId: id },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 6,
  });

  return NextResponse.json({
    data: {
      ...star,
      assignmentCount: star._count.assignments,
      submissionCount: star._count.submissions,
      videoCount: star._count.videos,
      settlementCount: star._count.settlements,
      recentAssignments,
      recentSettlements,
    },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 수정할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const allowedFields = ["baseRate", "name", "phone", "gradeId"];
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) data[key] = body[key];
  }

  if ("gradeId" in data && data.gradeId) {
    const grade = await prisma.pricingGrade.findUnique({
      where: { id: data.gradeId as string },
    });
    if (!grade) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "등급을 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    data.baseRate = grade.baseRate;
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        baseRate: true,
        gradeId: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "STAR를 찾을 수 없습니다." } },
      { status: 404 }
    );
  }
}
