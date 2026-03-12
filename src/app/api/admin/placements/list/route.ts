import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { resolveSignedThumbnail } from "@/lib/thumbnail";
export const dynamic = "force-dynamic";

const VALID_MEDIUMS = ["YOUTUBE", "INSTAGRAM", "TIKTOK"];

export async function GET(request: Request) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const medium = searchParams.get("medium"); // "ALL", "YOUTUBE", "INSTAGRAM", "TIKTOK"
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "30", 10);

    try {
        const whereClause: Record<string, unknown> = {};
        if (medium && medium !== "ALL") {
            whereClause.medium = medium;
        } else {
            // "ALL" 또는 미지정: 유효한 매체만 필터 (잘못된 medium 값 제외)
            whereClause.medium = { in: VALID_MEDIUMS };
        }

        const [placements, total] = await Promise.all([
            prisma.mediaPlacement.findMany({
                where: whereClause,
                include: {
                    video: {
                        select: {
                            title: true,
                            thumbnailUrl: true,
                            owner: {
                                select: {
                                    name: true,
                                    chineseName: true,
                                    avatarUrl: true,
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.mediaPlacement.count({ where: whereClause })
        ]);

        // Stats calculation — 유효한 매체만 카운트
        const stats = await prisma.mediaPlacement.groupBy({
            by: ['medium'],
            where: { medium: { in: VALID_MEDIUMS } },
            _count: true,
        });

        const statsMap = stats.reduce((acc, curr) => {
            acc[curr.medium as string] = curr._count;
            return acc;
        }, {} as Record<string, number>);
        // ALL = 유효 매체 합산 (잘못된 medium 제외)
        statsMap.ALL = Object.values(statsMap).reduce((sum, n) => sum + n, 0);

        // 썸네일 서명 처리 (placement.video.thumbnailUrl)
        const signedPlacements = await Promise.all(
            placements.map(async (p) => ({
                ...p,
                video: p.video
                    ? {
                        ...p.video,
                        signedThumbnailUrl: await resolveSignedThumbnail(
                            p.video.thumbnailUrl,
                            null,
                        ),
                    }
                    : p.video,
            })),
        );

        return NextResponse.json({
            data: signedPlacements,
            stats: statsMap,
            meta: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        });
    } catch (error) {
        console.error("Error fetching admin placements:", error);
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
}
