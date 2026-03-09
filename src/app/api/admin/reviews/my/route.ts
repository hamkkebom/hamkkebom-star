import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";
import { extractR2Key, getPresignedGetUrl } from "@/lib/cloudflare/r2-upload";

export const dynamic = "force-dynamic";

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

/**
 * 썸네일 URL을 생성합니다.
 * 캐시 히트 → 즉시 반환 (0ms)
 * 캐시 미스 → R2 presigned / CF Stream 토큰 (외부 호출 1회)
 */
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

    let url: string | null = null;

    // 1순위: Submission 썸네일
    if (subThumbUrl) {
        const r2Key = extractR2Key(subThumbUrl);
        if (r2Key) {
            try { url = await getPresignedGetUrl(r2Key); } catch { /* ignore */ }
        }
    }

    // 2순위: Video 썸네일
    if (!url && videoThumbUrl) {
        const r2Key = extractR2Key(videoThumbUrl);
        if (r2Key) {
            try { url = await getPresignedGetUrl(r2Key); } catch { /* ignore */ }
        }
    }

    // 3순위: CF Stream 자동 썸네일
    if (!url) {
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

export async function GET(_req: NextRequest) {
    try {
        // ✅ getAuthUser() 사용 — React cache() 활용, 중복 외부 호출 방지
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 날짜 범위 필터
        const url = new URL(_req.url);
        const startDateParam = url.searchParams.get("startDate");
        const endDateParam = url.searchParams.get("endDate");

        const dateFilter: Record<string, unknown> = {};
        if (startDateParam) dateFilter.gte = new Date(startDateParam + "T00:00:00.000Z");
        if (endDateParam) dateFilter.lte = new Date(endDateParam + "T23:59:59.999Z");

        const submissions = await prisma.submission.findMany({
            where: {
                star: { managerId: user.id },
                ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
            },
            select: {
                id: true,
                version: true,
                versionTitle: true,
                status: true,
                createdAt: true,
                streamUid: true,
                thumbnailUrl: true,
                star: {
                    select: {
                        id: true, name: true, email: true,
                        avatarUrl: true, chineseName: true,
                    },
                },
                video: {
                    select: {
                        id: true, title: true, description: true,
                        thumbnailUrl: true, streamUid: true,
                    },
                },
                assignment: {
                    select: {
                        request: { select: { title: true } },
                    },
                },
                _count: { select: { feedbacks: true } },
                lockedBy: true,
                lockedAt: true,
            },
            orderBy: { createdAt: "asc" },
        });

        // ✅ 썸네일 생성 — 최대 5개씩 병렬 처리 (외부 API 과부하 방지)
        const BATCH_SIZE = 5;
        const results = [...submissions];
        const allThumbnails: (string | null)[] = new Array(results.length).fill(null);

        for (let i = 0; i < results.length; i += BATCH_SIZE) {
            const batch = results.slice(i, i + BATCH_SIZE);
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
            thumbs.forEach((t, j) => { allThumbnails[i + j] = t; });
        }

        const submissionsWithThumbnails = results.map((row, idx) => ({
            ...row,
            signedThumbnailUrl: allThumbnails[idx],
        }));

        return NextResponse.json({ data: submissionsWithThumbnails });
    } catch (err) {
        console.error("Fetch My Reviews Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
