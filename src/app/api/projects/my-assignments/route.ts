import { NextResponse } from "next/server";
import { AssignmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { extractR2Key, getPresignedGetUrl } from "@/lib/cloudflare/r2-upload";
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";
export const dynamic = "force-dynamic";

const assignmentStatuses = new Set(Object.values(AssignmentStatus));

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
  thumbUrl: string | null,
  streamUid: string | null
): Promise<string | null> {
  const cacheKey = `assign-sub-thumb:${submissionId}`;
  const cached = getCachedThumbnail(cacheKey);
  if (cached) return cached;

  let url: string | null = null;

  // 1. R2 presigned URL
  if (thumbUrl) {
    const r2Key = extractR2Key(thumbUrl);
    if (r2Key) {
      try { url = await getPresignedGetUrl(r2Key); } catch { /* ignore */ }
    }
  }

  // 2. CF Stream signed thumbnail fallback
  if (!url && streamUid) {
    try {
      const token = await getSignedPlaybackToken(streamUid);
      if (token) {
        url = `https://videodelivery.net/${token}/thumbnails/thumbnail.jpg?time=1s&width=640`;
      }
    } catch { /* ignore */ }
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
            const signedUrl = await resolveThumbnail(
              sub.id,
              sub.thumbnailUrl,
              sub.streamUid
            );
            return {
              ...sub,
              thumbnailUrl: signedUrl || sub.thumbnailUrl,
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
