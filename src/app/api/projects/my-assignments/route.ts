import { NextResponse } from "next/server";
import { AssignmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { resolveSignedThumbnail } from "@/lib/thumbnail";
export const dynamic = "force-dynamic";

const assignmentStatuses = new Set(Object.values(AssignmentStatus));

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
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "10") || 10));
  const status = searchParams.get("status");

  if (status && status !== "ALL" && !assignmentStatuses.has(status as AssignmentStatus)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 상태값입니다." } },
      { status: 400 }
    );
  }

  const where = {
    starId: user.id,
    ...(status && status !== "ALL" ? { status: status as AssignmentStatus } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.projectAssignment.findMany({
      where,
      include: {
        request: {
          include: {
            _count: {
              select: {
                assignments: true,
              },
            },
          },
        },
        submissions: {
          select: {
            id: true,
            version: true,
            versionTitle: true,
            status: true,
            thumbnailUrl: true,
            streamUid: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.projectAssignment.count({ where }),
  ]);

  // ── 각 submission의 썸네일을 signed URL로 변환 ──
  const BATCH_SIZE = 5;
  const finalRows = await Promise.all(
    rows.map(async (row) => {
      if (!row.submissions || row.submissions.length === 0) return row;

      const signedSubs = [];
      for (let i = 0; i < row.submissions.length; i += BATCH_SIZE) {
        const batch = row.submissions.slice(i, i + BATCH_SIZE);
        const resolved = await Promise.all(
          batch.map(async (sub) => {
            // 커스텀 썸네일이 있으면 CF Stream 폴백 금지 (streamUid=null 전달)
            const hasCustom = sub.thumbnailUrl !== null;
            const signedUrl = await resolveSignedThumbnail(
              sub.thumbnailUrl,
              hasCustom ? null : sub.streamUid,
            );
            return {
              ...sub,
              thumbnailUrl: signedUrl,
            };
          })
        );
        signedSubs.push(...resolved);
      }

      return { ...row, submissions: signedSubs };
    })
  );

  return NextResponse.json({
    data: finalRows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
