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

        // 접수된 Submission (Demand)
        const submissions = await prisma.submission.findMany({
            where: { createdAt: { gte: startDate } },
            select: { createdAt: true },
            orderBy: { createdAt: "asc" },
        });

        // 처리된 Submission (Supply - APPROVED or REJECTED)
        const processed = await prisma.submission.findMany({
            where: {
                updatedAt: { gte: startDate },
                status: { in: ["APPROVED", "REJECTED"] },
            },
            select: { updatedAt: true },
            orderBy: { updatedAt: "asc" },
        });

        const trendMap: Record<string, { date: string; submissions: number; processed: number }> = {};

        const addToBucket = (date: Date, type: "submissions" | "processed") => {
            const key = format(date, formatStr);
            if (!trendMap[key]) {
                trendMap[key] = { date: key, submissions: 0, processed: 0 };
            }
            trendMap[key][type]++;
        };

        submissions.forEach((v) => addToBucket(v.createdAt, "submissions"));
        processed.forEach((v) => addToBucket(v.updatedAt, "processed"));

        const sortedData = Object.values(trendMap).sort((a, b) =>
            a.date.localeCompare(b.date)
        );

        return NextResponse.json(sortedData);
    } catch (error) {
        console.error("Error fetching operational trends:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
