import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveSignedThumbnail } from "@/lib/thumbnail";
export const dynamic = "force-dynamic";

/**
 * GET /api/portfolio/[userId]
 *
 * 공개 포트폴리오 데이터 반환 (인증 불필요)
 */
type Params = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, { params }: Params) {
    const { userId } = await params;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            chineseName: true,
            avatarUrl: true,
            role: true,
        },
    });

    if (!user || user.role !== "STAR") {
        return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "포트폴리오를 찾을 수 없습니다." } },
            { status: 404 }
        );
    }

    const portfolio = await prisma.portfolio.findUnique({
        where: { userId },
        include: {
            items: {
                orderBy: { sortOrder: "asc" },
            },
        },
    });

    // 승인된 영상 목록
    const approvedVideos = await prisma.video.findMany({
        where: {
            ownerId: userId,
            status: "APPROVED",
        },
        select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            streamUid: true,
            viewCount: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
    });

    // 썸네일 서명 처리
    const signedVideos = await Promise.all(
        approvedVideos.map(async (v) => ({
            ...v,
            signedThumbnailUrl: await resolveSignedThumbnail(v.thumbnailUrl, v.streamUid),
        })),
    );

    // 포트폴리오 항목 썸네일 서명 처리
    const signedItems = portfolio?.items
        ? await Promise.all(
            portfolio.items.map(async (item) => ({
                ...item,
                signedThumbnailUrl: await resolveSignedThumbnail(
                    item.thumbnailUrl,
                    null, // portfolio items don't have streamUid
                ),
            })),
        )
        : [];

    return NextResponse.json({
        data: {
            user: {
                id: user.id,
                name: user.name,
                chineseName: user.chineseName,
                avatarUrl: user.avatarUrl,
            },
            portfolio: portfolio
                ? {
                    bio: portfolio.bio,
                    showreel: portfolio.showreel,
                    website: portfolio.website,
                    socialLinks: portfolio.socialLinks,
                    items: signedItems,
                }
                : null,
            videos: signedVideos,
        },
    });
}
