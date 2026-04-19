import { NextResponse } from "next/server";
import { Prisma, SubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";
import { extractR2Key, getPresignedGetUrl } from "@/lib/cloudflare/r2-upload";
export const dynamic = "force-dynamic";

const submissionStatuses = new Set(Object.values(SubmissionStatus));

// ── 썸네일 URL 메모리 캐시 (TTL 50분) ──
const thumbnailCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = 50 * 60 * 1000;

function getCachedThumbnail(key: string): string | null {
  const cached = thumbnailCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  if (cached) thumbnailCache.delete(key);
  return null;
}

function setCachedThumbnail(key: string, url: string): void {
  thumbnailCache.set(key, { url, expiresAt: Date.now() + CACHE_TTL_MS });
  if (thumbnailCache.size > 500) {
    const firstKey = thumbnailCache.keys().next().value;
    if (firstKey) thumbnailCache.delete(firstKey);
  }
}

async function resolveThumbnail(
  submissionId: string,
  subThumbUrl: string | null,
  videoThumbUrl: string | null,
  streamUid: string | null,
  videoStreamUid: string | null
): Promise<string | null> {
  const cacheKey = `sub-thumb:${submissionId}`;
  const cached = getCachedThumbnail(cacheKey);
  if (cached) return cached;

  // 유저가 커스텀 썸네일을 올렸는지 여부 (Submission.thumbnailUrl 또는 Video.thumbnailUrl)
  const hasCustomThumbnail = !!(subThumbUrl || videoThumbUrl);
  let url: string | null = null;

  // 1순위: Submission의 커스텀 썸네일 (유저가 업로드한 R2 URL)
  if (subThumbUrl) {
    const r2Key = extractR2Key(subThumbUrl);
    if (r2Key) {
      try {
        url = await getPresignedGetUrl(r2Key);
      } catch (err) {
        console.error(`[submissions/my] Submission 썸네일 presign 실패 (${submissionId}):`, err);
      }
    } else {
      console.warn(`[submissions/my] Submission 썸네일 R2 키 추출 실패 (${submissionId}): ${subThumbUrl}`);
    }
  }

  // 2순위: Video의 썸네일 (버전 간 공유, 또는 Video에만 저장된 경우)
  if (!url && videoThumbUrl) {
    const r2Key = extractR2Key(videoThumbUrl);
    if (r2Key) {
      try {
        url = await getPresignedGetUrl(r2Key);
      } catch (err) {
        console.error(`[submissions/my] Video 썸네일 presign 실패 (${submissionId}):`, err);
      }
    }
  }

  // 3순위: CF Stream 자동 썸네일
  // ⚠️ 유저가 커스텀 썸네일을 업로드한 경우에는 절대 CF Stream으로 폴백하지 않음.
  //    (CF Stream 자동 썸네일 = 영상 1초 지점 프레임 = "화면 캡쳐본"처럼 보임)
  //    커스텀 썸네일이 있는데 presign만 실패한 거면 null 반환 → UI 플레이스홀더 표시.
  if (!url && !hasCustomThumbnail) {
    const uid = streamUid || videoStreamUid;
    if (uid) {
      try {
        const token = await getSignedPlaybackToken(uid);
        if (token) {
          url = `https://videodelivery.net/${token}/thumbnails/thumbnail.jpg?time=1s&width=640`;
        }
      } catch { /* ignore */ }
    }
  }

  if (url) setCachedThumbnail(cacheKey, url);
  return url;
}

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
  const filter = searchParams.get("filter");

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

  if (hasFeedback === "true") {
    where.feedbacks = { some: {} };
  }

  if (filter === "AI_DONE") {
    where.aiAnalysis = { status: "DONE" };
  } else if (filter === "HAS_FEEDBACK") {
    where.feedbacks = { some: {} };
  } else if (filter === "UNREAD") {
    where.feedbacks = { some: { seenByStarAt: null } };
  }

  // ✅ 메인 쿼리 + count 병렬 실행
  const [rows, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: {
        assignment: {
          include: {
            request: {
              select: { id: true, title: true },
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
          select: { feedbacks: true },
        },
        aiAnalysis: {
          select: { summary: true, status: true, scores: true },
        },
        feedbacks: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            content: true,
            type: true,
            priority: true,
            status: true,
            annotation: true,
            author: { select: { name: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.submission.count({ where }),
  ]);

  // ✅ 썸네일 + unread 카운트 병렬 실행
  const submissionIds = rows.map((r) => r.id);

  const [allThumbnails, pendingCounts] = await Promise.all([
    // 썸네일: 5건씩 배치 병렬 처리
    (async () => {
      const BATCH_SIZE = 5;
      const results: (string | null)[] = new Array(rows.length).fill(null);
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const thumbs = await Promise.all(
          batch.map((row) =>
            resolveThumbnail(
              row.id,
              row.thumbnailUrl,
              row.video?.thumbnailUrl ?? null,
              row.streamUid,
              row.video?.streamUid ?? null
            )
          )
        );
        thumbs.forEach((t, j) => { results[i + j] = t; });
      }
      return results;
    })(),
    // unread 카운트
    submissionIds.length > 0
      ? prisma.feedback.groupBy({
        by: ["submissionId"],
        where: {
          submissionId: { in: submissionIds },
          seenByStarAt: null,
        },
        _count: { id: true },
      })
      : Promise.resolve([]),
  ]);

  const pendingMap = new Map(pendingCounts.map((p) => [p.submissionId, p._count.id]));

  const finalRows = rows.map((row, idx) => ({
    ...row,
    signedThumbnailUrl: allThumbnails[idx],
    latestFeedback: row.feedbacks?.[0] ?? null,
    unreadFeedbackCount: pendingMap.get(row.id) ?? 0,
    feedbacks: undefined,
  }));

  return NextResponse.json({
    data: finalRows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
