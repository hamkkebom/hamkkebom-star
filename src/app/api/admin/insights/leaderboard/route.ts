import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const earners = await prisma.settlement.groupBy({
            by: ['starId'],
            _sum: { totalAmount: true },
            orderBy: { _sum: { totalAmount: 'desc' } },
            take: 5
        });

        const starIds = earners.map(e => e.starId);
        const users = await prisma.user.findMany({
            where: { id: { in: starIds } },
            select: { id: true, name: true, chineseName: true, avatarUrl: true }
        });

        const topEarners = earners.map((e, index) => {
            const u = users.find(x => x.id === e.starId);
            return {
                id: e.starId,
                name: u?.chineseName || u?.name || "Unknown",
                image: u?.avatarUrl,
                amount: Number(e._sum.totalAmount || 0),
                rank: index + 1
            };
        });

        return NextResponse.json({ topEarners });

    } catch (error) {
        console.error("Leaderboard API Error:", error);
        return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }
}
