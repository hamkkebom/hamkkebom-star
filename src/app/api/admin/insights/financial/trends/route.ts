import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays, subMonths, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const interval = searchParams.get("interval") || "month";
        const now = new Date();

        let startDate: Date;
        let formatStr: string;

        switch (interval) {
            case "week":
                startDate = subDays(now, 7);
                formatStr = "MM/dd";
                break;
            case "day":
                startDate = subDays(now, 1);
                formatStr = "HH:mm";
                break;
            case "month":
            default:
                startDate = subMonths(now, 1);
                formatStr = "MM/dd";
                break;
        }

        const settlements = await prisma.settlement.findMany({
            where: { createdAt: { gte: startDate } },
            select: { createdAt: true, totalAmount: true, status: true },
            orderBy: { createdAt: "asc" },
        });

        const trendMap: Record<string, { date: string; total: number; paid: number }> = {};

        settlements.forEach((s) => {
            const key = format(s.createdAt, formatStr);
            if (!trendMap[key]) {
                trendMap[key] = { date: key, total: 0, paid: 0 };
            }
            trendMap[key].total += Number(s.totalAmount) || 0;
            if (s.status === "COMPLETED") {
                trendMap[key].paid += Number(s.totalAmount) || 0;
            }
        });

        const sortedData = Object.values(trendMap).sort((a, b) =>
            a.date.localeCompare(b.date)
        );

        return NextResponse.json(sortedData);
    } catch (error) {
        console.error("Error fetching financial trends:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
