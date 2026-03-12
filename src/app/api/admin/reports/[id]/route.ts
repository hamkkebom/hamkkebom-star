import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { ReportStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

/** GET /api/admin/reports/[id] — 신고 상세 (대상 콘텐츠 + 관련 신고 + 제재 이력) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 },
    );
  }

  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
        },
      },
    },
  });

  if (!report) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "신고를 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  // Load target content based on targetType
  let targetContent: Record<string, unknown> | null = null;

  if (report.targetType === "POST") {
    targetContent = await prisma.boardPost.findUnique({
      where: { id: report.targetId },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
      },
    });
  } else if (report.targetType === "COMMENT") {
    // Try BoardComment first, then VideoComment
    const boardComment = await prisma.boardComment.findUnique({
      where: { id: report.targetId },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
      },
    });
    if (boardComment) {
      targetContent = { ...boardComment, commentSource: "board" };
    } else {
      const videoComment = await prisma.videoComment.findUnique({
        where: { id: report.targetId },
        include: {
          author: {
            select: { id: true, name: true, email: true, avatarUrl: true, role: true },
          },
        },
      });
      if (videoComment) {
        targetContent = { ...videoComment, commentSource: "video" };
      }
    }
  } else if (report.targetType === "VIDEO") {
    targetContent = await prisma.video.findUnique({
      where: { id: report.targetId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
      },
    });
  } else if (report.targetType === "USER") {
    targetContent = await prisma.user.findUnique({
      where: { id: report.targetId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        isBanned: true,
        suspendedUntil: true,
        warningCount: true,
        createdAt: true,
      },
    });
  }

  // Related reports (same targetType + targetId, excluding current)
  const relatedReports = await prisma.report.findMany({
    where: {
      targetType: report.targetType,
      targetId: report.targetId,
      id: { not: report.id },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      reporter: {
        select: { id: true, name: true },
      },
    },
  });

  // Get reported user's sanction count (determine userId from target)
  let reportedUserId: string | null = null;
  if (report.targetType === "USER") {
    reportedUserId = report.targetId;
  } else if (targetContent && "authorId" in targetContent) {
    reportedUserId = targetContent.authorId as string;
  } else if (targetContent && "ownerId" in targetContent) {
    reportedUserId = targetContent.ownerId as string;
  }

  let sanctionsCount = 0;
  if (reportedUserId) {
    sanctionsCount = await prisma.userSanction.count({
      where: { userId: reportedUserId },
    });
  }

  return NextResponse.json({
    data: {
      ...report,
      targetContent,
      relatedReports,
      reportedUserId,
      sanctionsCount,
    },
  });
}

const validStatuses: ReportStatus[] = ["UNDER_REVIEW", "ESCALATED"];

/** PATCH /api/admin/reports/[id] — 신고 상태 변경 (단순 전환) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 },
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 },
    );
  }

  const { status } = body as { status?: string };

  if (!status || !validStatuses.includes(status as ReportStatus)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "유효하지 않은 상태입니다. UNDER_REVIEW 또는 ESCALATED만 가능합니다.",
        },
      },
      { status: 400 },
    );
  }

  const existing = await prisma.report.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "신고를 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  const updateData: Record<string, unknown> = { status };
  if (status === "UNDER_REVIEW") {
    updateData.assignedTo = user.id;
  }

  const report = await prisma.report.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ data: report });
}
