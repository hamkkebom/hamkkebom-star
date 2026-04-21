import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { resolveSignedThumbnail } from "@/lib/thumbnail";
export const dynamic = "force-dynamic";

export async function GET(_request: Request) {
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

            // 커스텀 썸네일 우선순위: Submission > Video > CF Stream (커스텀 없을 때만)
            const subThumbUrl = latestSub.thumbnailUrl;
            const videoThumbUrl = latestSub.video?.thumbnailUrl ?? null;
            const customThumb = subThumbUrl ?? videoThumbUrl;
            const hasCustom = customThumb !== null;
            const uid = hasCustom ? null : (latestSub.streamUid ?? latestSub.video?.streamUid ?? null);

            const signedThumbnailUrl = await resolveSignedThumbnail(customThumb, uid);

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
