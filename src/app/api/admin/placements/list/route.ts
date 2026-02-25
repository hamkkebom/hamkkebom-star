import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

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
        const whereClause: any = {};
        if (medium && medium !== "ALL") {
            whereClause.medium = medium;
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

        // Stats calculation (Optional to do it here, but helps UI)
        const stats = await prisma.mediaPlacement.groupBy({
            by: ['medium'],
            _count: true,
        });

        const statsMap = stats.reduce((acc, curr) => {
            acc[curr.medium as string] = curr._count;
            return acc;
        }, {} as Record<string, number>);
        statsMap.ALL = total;

        return NextResponse.json({
            data: placements,
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
