import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const fromParam = searchParams.get("from");
        const toParam = searchParams.get("to");

        const now = new Date();
        let from: Date;
        let to: Date;

        if (fromParam || toParam) {
            const parsedFrom = fromParam ? new Date(fromParam) : null;
            const parsedTo = toParam ? new Date(toParam) : null;

            if (
                (parsedFrom && isNaN(parsedFrom.getTime())) ||
                (parsedTo && isNaN(parsedTo.getTime()))
            ) {
                return NextResponse.json(
                    { error: { code: "BAD_REQUEST", message: "유효하지 않은 날짜 형식입니다." } },
                    { status: 400 }
                );
            }

            from = parsedFrom ?? startOfMonth(now);
            to = parsedTo ?? now;

            if (from >= to) {
                return NextResponse.json(
                    { error: { code: "BAD_REQUEST", message: "시작일은 종료일보다 이전이어야 합니다." } },
                    { status: 400 }
                );
            }

            const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays > 365) {
                return NextResponse.json(
                    { error: { code: "BAD_REQUEST", message: "최대 365일 범위까지 조회할 수 있습니다." } },
                    { status: 400 }
                );
            }
        } else {
            from = startOfMonth(now);
            to = now;
        }

        // Fetch feedbacks in the period with submission creation time for turnaround calculation
        const completedFeedbacks = await prisma.feedback.findMany({
            where: {
                createdAt: { gte: from, lte: to },
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
