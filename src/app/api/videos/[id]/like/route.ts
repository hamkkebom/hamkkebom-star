import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
            { status: 401 }
        );
    }

    const { id: videoId } = await params;

    try {
        // 1. 영상 존재 여부 확인
        const video = await prisma.video.findUnique({
            where: { id: videoId },
            select: { id: true },
        });

        if (!video) {
            return NextResponse.json(
                { error: { code: "NOT_FOUND", message: "영상을 찾을 수 없습니다." } },
                { status: 404 }
            );
        }

        // 2. 기존 좋아요 여부 확인
        const existingLike = await prisma.videoLike.findUnique({
            where: {
                userId_videoId: {
                    userId: user.id,
                    videoId,
                },
            },
        });

        let hasLiked = false;

        // 3. 좋아요 토글 (추가 또는 제거)
        if (existingLike) {
            // 이미 좋아요 한 경우 -> 제거 (Unlike)
            await prisma.videoLike.delete({
                where: { id: existingLike.id },
            });
            hasLiked = false;
        } else {
            // 좋아요 하지 않은 경우 -> 추가 (Like)
            await prisma.videoLike.create({
                data: {
                    userId: user.id,
                    videoId,
                },
            });
            hasLiked = true;
        }

        // 4. 최신 좋아요 총 개수 조회
        const likeCount = await prisma.videoLike.count({
            where: { videoId },
        });

        return NextResponse.json({
            data: {
                hasLiked,
                likeCount,
            }
        });

    } catch (error) {
        console.error("Failed to toggle like:", error);
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "좋아요 처리 중 오류가 발생했습니다." } },
            { status: 500 }
        );
    }
}
