import { NextResponse } from "next/server";
import { Prisma, SubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";
import { extractR2Key, getPresignedGetUrl } from "@/lib/cloudflare/r2-upload";

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
  const hasFeedback = searchParams.get("hasFeedback");

  const filter = searchParams.get("filter"); // 'AI_DONE' | 'HAS_FEEDBACK' | undefined

  if (status && status !== "ALL" && !submissionStatuses.has(status as SubmissionStatus)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 상태값입니다." } },
      { status: 400 }
    );
  }

  const where: Prisma.SubmissionWhereInput = {
    starId: user.id,
    ...(assignmentId ? { assignmentId } : {}),
    ...(status && status !== "ALL" ? { status: status as SubmissionStatus } : {}),
  };

  // 기존 hasFeedback 파라미터 호환성 유지 (optional)
  if (hasFeedback === "true") {
    where.feedbacks = { some: {} };
  }

  // 새로운 filter 파라미터 처리
  if (filter === "AI_DONE") {
    where.aiAnalysis = { status: "DONE" };
  } else if (filter === "HAS_FEEDBACK") {
    where.feedbacks = { some: {} };
  }

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
        video: {
          select: {
            title: true,
            streamUid: true,
            thumbnailUrl: true,
          },
        },
        _count: {
          select: {
            feedbacks: true,
          },
        },
        aiAnalysis: {
          select: {
            summary: true,
            status: true,
            scores: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.submission.count({ where }),
  ]);

  // 각 submission의 썸네일 URL 생성 (우선순위: R2 presigned → Stream signed)
  const rowsWithThumbnails = await Promise.all(
    rows.map(async (row) => {
      let finalThumbnailUrl: string | null = null;

      // 1순위: Video.thumbnailUrl이 R2 URL이면 → presigned GET URL
      const videoThumbUrl = row.video?.thumbnailUrl;
      if (videoThumbUrl) {
        const r2Key = extractR2Key(videoThumbUrl);
        if (r2Key) {
          try {
            finalThumbnailUrl = await getPresignedGetUrl(r2Key);
          } catch {
            // R2 실패 시 fallback
          }
        }
      }

      // 2순위: Submission.thumbnailUrl이 R2 URL이면 → presigned GET URL
      if (!finalThumbnailUrl && row.thumbnailUrl) {
        const r2Key = extractR2Key(row.thumbnailUrl);
        if (r2Key) {
          try {
            finalThumbnailUrl = await getPresignedGetUrl(r2Key);
          } catch {
            // ignore
          }
        }
      }

      // 3순위: Cloudflare Stream 서명 썸네일
      if (!finalThumbnailUrl) {
        const uid = row.streamUid || row.video?.streamUid;
        if (uid) {
          try {
            const token = await getSignedPlaybackToken(uid);
            if (token) {
              finalThumbnailUrl = `https://videodelivery.net/${token}/thumbnails/thumbnail.jpg?time=1s&width=640`;
            }
          } catch {
            // ignore
          }
        }
      }

      return { ...row, signedThumbnailUrl: finalThumbnailUrl };
    })
  );

  return NextResponse.json({
    data: rowsWithThumbnails,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

