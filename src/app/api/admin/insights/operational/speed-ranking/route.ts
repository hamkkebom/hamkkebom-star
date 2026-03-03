import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth } from "date-fns";

export async function GET() {
    try {
        const startOfCurrentMonth = startOfMonth(new Date());

        // Fetch feedbacks this month with submission creation time for turnaround calculation
        const completedFeedbacks = await prisma.feedback.findMany({
            where: {
                createdAt: { gte: startOfCurrentMonth },
            },
            include: {
                author: {
                    select: { id: true, name: true, avatarUrl: true },
                },
                submission: {
                    select: { createdAt: true },
                },
            },
        });

        // Group by author and calculate average time
        const userStatsMap: Record<string, {
            id: string;
            name: string;
            image: string | null;
            totalHours: number;
            count: number;
        }> = {};

        completedFeedbacks.forEach((fb) => {
            const authorId = fb.authorId;
            if (!authorId || !fb.submission) return;

            const diffMs = fb.createdAt.getTime() - fb.submission.createdAt.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            if (!userStatsMap[authorId]) {
                userStatsMap[authorId] = {
                    id: authorId,
                    name: fb.author?.name || "Unknown",
                    image: fb.author?.avatarUrl || null,
                    totalHours: 0,
                    count: 0,
                };
            }

            userStatsMap[authorId].totalHours += diffHours;
            userStatsMap[authorId].count += 1;
        });

        // Get total feedback count for each qualifying author
        const leaderboard = Object.values(userStatsMap)
            .filter((stat) => stat.count >= 3)
            .map((stat) => ({
                id: stat.id,
                name: stat.name,
                image: stat.image,
                avgTimeHours: Number((stat.totalHours / stat.count).toFixed(1)),
                totalFeedbacks: stat.count,
            }))
            .sort((a, b) => a.avgTimeHours - b.avgTimeHours)
            .slice(0, 5);

        return NextResponse.json(leaderboard);
    } catch (error) {
        console.error("Error fetching operational speed ranking:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
