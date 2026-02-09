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

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      submission: { select: { id: true, starId: true, versionTitle: true } },
    },
  });

  if (!feedback) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "피드백을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  if (user.role === "STAR" && feedback.submission.starId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인 제출물의 피드백만 조회할 수 있습니다." } },
      { status: 403 }
    );
  }

  return NextResponse.json({ data: feedback });
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

  const existing = await prisma.feedback.findUnique({
    where: { id },
    select: { authorId: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "피드백을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  if (existing.authorId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인이 작성한 피드백만 수정할 수 있습니다." } },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const allowedFields = ["type", "priority", "status", "content", "startTime", "endTime", "annotation"];
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.feedback.update({
    where: { id },
    data,
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ data: updated });
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

  const existing = await prisma.feedback.findUnique({
    where: { id },
    select: { authorId: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "피드백을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  if (existing.authorId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인이 작성한 피드백만 삭제할 수 있습니다." } },
      { status: 403 }
    );
  }

  await prisma.feedback.delete({ where: { id } });
  return NextResponse.json({ data: { success: true } });
}
