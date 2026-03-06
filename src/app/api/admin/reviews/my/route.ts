import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";
import { extractR2Key, getPresignedGetUrl } from "@/lib/cloudflare/r2-upload";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const requester = await prisma.user.findUnique({
            where: { authId: user.id },
            select: { id: true, role: true },
        });

        if (!requester || requester.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 담당하는 STAR의 모든 제출 조회 (상태 무관 - 전체/완료된 내역도 볼 수 있도록)
        const submissions = await prisma.submission.findMany({
            where: {
                star: {
                    managerId: requester.id
                }
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
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                        chineseName: true,
                    }
                },
                video: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        thumbnailUrl: true,
                        streamUid: true,
                    }
                },
                assignment: {
                    select: {
                        request: {
                            select: { title: true }
                        }
                    }
                },
                _count: {
                    select: { feedbacks: true }
                },
            },
            orderBy: { createdAt: "asc" },
        });

        // 각 submission의 서명된 썸네일 URL 생성 (submissions/my와 동일 로직)
        const submissionsWithThumbnails = await Promise.all(
            submissions.map(async (row) => {
                let signedThumbnailUrl: string | null = null;

                // 1순위: Submission.thumbnailUrl (스타가 직접 업로드한 썸네일)
                if (row.thumbnailUrl) {
                    const r2Key = extractR2Key(row.thumbnailUrl);
                    if (r2Key) {
                        try {
                            signedThumbnailUrl = await getPresignedGetUrl(r2Key);
                        } catch {
                            // R2 실패 시 fallback
                        }
                    }
                }

                // 2순위: Video.thumbnailUrl (승인 후 Video에 복사된 URL)
                if (!signedThumbnailUrl) {
                    const videoThumbUrl = row.video?.thumbnailUrl;
                    if (videoThumbUrl) {
                        const r2Key = extractR2Key(videoThumbUrl);
                        if (r2Key) {
                            try {
                                signedThumbnailUrl = await getPresignedGetUrl(r2Key);
                            } catch {
                                // ignore
                            }
                        }
                    }
                }

                // 3순위: Cloudflare Stream 자동 생성 썸네일
                if (!signedThumbnailUrl) {
                    const uid = row.streamUid || row.video?.streamUid;
                    if (uid) {
                        try {
                            const token = await getSignedPlaybackToken(uid);
                            if (token) {
                                signedThumbnailUrl = `https://videodelivery.net/${token}/thumbnails/thumbnail.jpg?time=1s&width=640`;
                            }
                        } catch {
                            // ignore
                        }
                    }
                }

                return { ...row, signedThumbnailUrl };
            })
        );

        return NextResponse.json({ data: submissionsWithThumbnails });

    } catch (err) {
        console.error("Fetch My Reviews Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
