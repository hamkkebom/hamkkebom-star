import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth } from "date-fns";

export async function GET() {
    try {
        const startOfCurrentMonth = startOfMonth(new Date());

        // Fetch settlements with their items → submissions for video data
        const settlements = await prisma.settlement.findMany({
            where: {
                createdAt: { gte: startOfCurrentMonth },
            },
            include: {
                star: {
                    select: { id: true, name: true, avatarUrl: true },
                },
                items: {
                    include: {
                        submission: {
                            select: {
                                id: true,
                                versionTitle: true,
                                thumbnailUrl: true,
                            },
                        },
                    },
                },
            },
        });

        // Aggregate by STAR
        const starMap: Record<string, { id: string; name: string; image: string | null; totalAmount: number; videoCount: number }> = {};
        // Aggregate by Submission (as proxy for Video)
        const videoMap: Record<string, { id: string; title: string; thumbnail: string | null; totalAmount: number; starName: string }> = {};

        settlements.forEach((s) => {
            const amount = Number(s.totalAmount) || 0;

            // STAR aggregation
            if (s.star) {
                if (!starMap[s.star.id]) {
                    starMap[s.star.id] = {
                        id: s.star.id,
                        name: s.star.name || "Unknown",
                        image: s.star.avatarUrl || null,
                        totalAmount: 0,
                        videoCount: 0,
                    };
                }
                starMap[s.star.id].totalAmount += amount;
                starMap[s.star.id].videoCount += s.items.length;
            }

            // Video (Submission) aggregation from items
            s.items.forEach((item) => {
                if (item.submission) {
                    const subId = item.submission.id;
                    const itemAmount = Number(item.finalAmount) || 0;
                    if (!videoMap[subId]) {
                        videoMap[subId] = {
                            id: subId,
                            title: item.submission.versionTitle || "Untitled",
                            thumbnail: item.submission.thumbnailUrl || null,
                            totalAmount: 0,
                            starName: s.star?.name || "Unknown",
                        };
                    }
                    videoMap[subId].totalAmount += itemAmount;
                }
            });
        });

        const topStars = Object.values(starMap)
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 5);

        const topVideos = Object.values(videoMap)
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 5);

        return NextResponse.json({ topStars, topVideos });
    } catch (error) {
        console.error("Error fetching financial leaderboard:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
