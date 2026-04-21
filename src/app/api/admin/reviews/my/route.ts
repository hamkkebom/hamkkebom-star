import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { resolveSignedThumbnail } from "@/lib/thumbnail";

export const dynamic = "force-dynamic";

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

        // ✅ 썸네일 생성 — 커스텀 썸네일 우선, CF Stream 폴백은 커스텀 없을 때만
        // 최대 5개씩 병렬 처리 (외부 API 과부하 방지)
        const BATCH_SIZE = 5;
        const results = [...submissions];
        const allThumbnails: (string | null)[] = new Array(results.length).fill(null);

        for (let i = 0; i < results.length; i += BATCH_SIZE) {
            const batch = results.slice(i, i + BATCH_SIZE);
            const thumbs = await Promise.all(
                batch.map((row) => {
                    // 1순위: Submission 커스텀 썸네일
                    // 2순위: Video 커스텀 썸네일
                    // 3순위: 커스텀 없을 때만 CF Stream (streamUid 전달)
                    const customThumb = row.thumbnailUrl ?? row.video?.thumbnailUrl ?? null;
                    const hasCustom = customThumb !== null;
                    const streamUid = hasCustom ? null : (row.streamUid ?? row.video?.streamUid ?? null);
                    return resolveSignedThumbnail(customThumb, streamUid);
                })
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
