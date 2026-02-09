import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createRequestSchema } from "@/lib/validations/project-request";

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
      { error: { code: "FORBIDDEN", message: "관리자만 요청을 생성할 수 있습니다." } },
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

  const parsed = createRequestSchema.safeParse(body);

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

  const created = await prisma.projectRequest.create({
    data: {
      title: parsed.data.title.trim(),
      categories: parsed.data.categories.map((category) => category.trim()),
      deadline: new Date(parsed.data.deadline),
      assignmentType: parsed.data.assignmentType,
      maxAssignees: parsed.data.maxAssignees,
      estimatedBudget: parsed.data.estimatedBudget,
      requirements: parsed.data.requirements?.trim() ? parsed.data.requirements.trim() : null,
      referenceUrls: parsed.data.referenceUrls ?? [],
      createdById: user.id,
    },
    include: {
      _count: {
        select: {
          assignments: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
      data: {
        ...created,
        currentAssignees: created._count.assignments,
      },
    },
    { status: 201 }
  );
}
