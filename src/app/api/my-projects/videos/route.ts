import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";
import { extractR2Key, getPresignedGetUrl } from "@/lib/cloudflare/r2-upload";

export async function GET(request: Request) {
    const user = await getAuthUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch Assignments that have at least one submission
    //    (or we could fetch all assignments)
    const assignments = await prisma.projectAssignment.findMany({
        where: {
            starId: user.id,
            submissions: { some: {} }, // Only those with submissions
        },
        include: {
            request: {
                select: { title: true, categories: true },
            },
            submissions: {
                orderBy: { versionSlot: "desc" }, // Latest first
                take: 1, // Only need the latest for the card
                include: {
                    video: { select: { thumbnailUrl: true, streamUid: true } },
                    _count: { select: { feedbacks: true } }
                }
            },
            _count: {
                select: { submissions: true }
            }
        },
        orderBy: { updatedAt: "desc" },
    });

    // 2. Process thumbnails for the latest submission of each assignment
    const data = await Promise.all(
        assignments.map(async (assignment) => {
            const latestSub = assignment.submissions[0];
            if (!latestSub) return null;

            let signedThumbnailUrl: string | null = null;

            // Try Video R2 -> Submission R2 -> Stream
            const videoThumbUrl = latestSub.video?.thumbnailUrl;
            const subThumbUrl = latestSub.thumbnailUrl;
            const uid = latestSub.streamUid || latestSub.video?.streamUid;

            if (videoThumbUrl) {
                const r2Key = extractR2Key(videoThumbUrl);
                if (r2Key) try { signedThumbnailUrl = await getPresignedGetUrl(r2Key); } catch { }
            }
            if (!signedThumbnailUrl && subThumbUrl) {
                const r2Key = extractR2Key(subThumbUrl);
                if (r2Key) try { signedThumbnailUrl = await getPresignedGetUrl(r2Key); } catch { }
            }
            if (!signedThumbnailUrl && uid) {
                try {
                    const token = await getSignedPlaybackToken(uid);
                    if (token) signedThumbnailUrl = `https://videodelivery.net/${token}/thumbnails/thumbnail.jpg?time=1s&width=640`;
                } catch { }
            }

            return {
                assignmentId: assignment.id,
                projectTitle: assignment.request.title,
                categories: assignment.request.categories,
                latestSubmission: {
                    id: latestSub.id,
                    version: latestSub.version,
                    status: latestSub.status,
                    createdAt: latestSub.createdAt,
                    thumbnailUrl: signedThumbnailUrl,
                    feedbackCount: latestSub._count.feedbacks
                },
                totalVersions: assignment._count.submissions
            };
        })
    );

    return NextResponse.json({ data: data.filter(Boolean) });
}
