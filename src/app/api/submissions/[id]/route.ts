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

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      star: { select: { id: true, name: true, email: true, avatarUrl: true } },
      assignment: {
        include: {
          request: { select: { id: true, title: true, deadline: true } },
        },
      },
      video: { select: { id: true, title: true, streamUid: true } },
      feedbacks: {
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { feedbacks: true } },
    },
  });

  if (!submission) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  // STAR는 본인 제출물만 조회 가능
  if (user.role === "STAR" && submission.starId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인 제출물만 조회할 수 있습니다." } },
      { status: 403 }
    );
  }

  return NextResponse.json({ data: submission });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const existing = await prisma.submission.findUnique({
    where: { id },
    select: { starId: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  if (user.role === "STAR" && existing.starId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인 제출물만 수정할 수 있습니다." } },
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

  const allowedFields = ["versionTitle", "streamUid", "r2Key", "duration", "thumbnailUrl", "status"];
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.submission.update({
    where: { id },
    data,
    include: {
      star: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const existing = await prisma.submission.findUnique({
    where: { id },
    select: { starId: true, status: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  // 권한 확인: 본인 소유여야 함
  // (ADMIN은 삭제 가능하도록 할 수도 있지만, 요구사항은 STAR의 관리 기능이므로 본인 확인)
  if (user.role === "STAR" && existing.starId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인 제출물만 삭제할 수 있습니다." } },
      { status: 403 }
    );
  }

  // 상태 확인: PENDING 상태만 삭제 가능
  if (existing.status !== "PENDING") {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "대기중(Pending) 상태인 영상만 삭제할 수 있습니다.",
        },
      },
      { status: 400 }
    );
  }

  // 삭제 실행
  await prisma.submission.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
