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

  const { id } = await params;

  const row = await prisma.projectRequest.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignments: {
        include: {
          star: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      },
      _count: { select: { assignments: true } },
    },
  });

  if (!row) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "요청을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: { ...row, currentAssignees: row._count.assignments },
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

  const allowedFields = [
    "title", "categories", "deadline", "assignmentType",
    "maxAssignees", "estimatedBudget", "requirements", "referenceUrls", "status",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      data[key] = key === "deadline" ? new Date(body[key] as string) : body[key];
    }
  }

  try {
    const updated = await prisma.projectRequest.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { assignments: true } },
      },
    });

    return NextResponse.json({
      data: { ...updated, currentAssignees: updated._count.assignments },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "요청을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 삭제할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    await prisma.projectRequest.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "요청을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }
}
