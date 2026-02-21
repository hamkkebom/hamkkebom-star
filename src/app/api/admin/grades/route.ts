import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createGradeSchema } from "@/lib/validations/grade";

export async function GET() {
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

  try {
    const errors: string[] = [];

    // 1) grades 조회
    let grades: unknown[] = [];
    try {
      grades = await prisma.pricingGrade.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          users: {
            where: { role: "STAR" },
            select: {
              id: true,
              name: true,
              chineseName: true,
              avatarUrl: true,
              baseRate: true,
              isApproved: true,
              _count: {
                select: {
                  assignments: true,
                  submissions: true,
                  videos: true,
                },
              },
            },
            orderBy: { name: "asc" },
          },
        },
      });
    } catch (e) {
      errors.push(`[grades] ${e instanceof Error ? e.message : String(e)}`);
    }

    // 2) unassigned 조회
    let unassigned: unknown[] = [];
    try {
      unassigned = await prisma.user.findMany({
        where: { role: "STAR", gradeId: null },
        select: {
          id: true,
          name: true,
          chineseName: true,
          avatarUrl: true,
          baseRate: true,
          isApproved: true,
          _count: {
            select: {
              assignments: true,
              submissions: true,
              videos: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    } catch (e) {
      errors.push(`[unassigned] ${e instanceof Error ? e.message : String(e)}`);
    }

    return NextResponse.json({
      data: { grades, unassigned },
      _debug: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "알 수 없는 오류",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const parsed = createGradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const maxSortOrder = await prisma.pricingGrade.aggregate({
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    const grade = await prisma.pricingGrade.create({
      data: {
        name: parsed.data.name,
        baseRate: parsed.data.baseRate,
        color: parsed.data.color,
        sortOrder: parsed.data.sortOrder ?? nextSortOrder,
      },
    });

    return NextResponse.json({ data: grade }, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "이미 존재하는 등급 이름입니다." } },
        { status: 409 }
      );
    }
    throw error;
  }
}
