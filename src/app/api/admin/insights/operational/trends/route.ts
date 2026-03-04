import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const interval = searchParams.get("interval") || "month";
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

        // Keep interval for bucketing format ONLY
        let formatStr: string;
        switch (interval) {
            case "week":
                formatStr = "MM/dd";
                break;
            case "day":
                formatStr = "HH:mm";
                break;
            case "month":
            default: {
                // Auto-determine based on range if no interval provided
                const rangeDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
                formatStr = rangeDays > 30 ? "yyyy/MM" : "MM/dd";
                break;
            }
        }

        // 접수된 Submission (Demand)
        const submissions = await prisma.submission.findMany({
            where: { createdAt: { gte: from, lte: to } },
            select: { createdAt: true },
            orderBy: { createdAt: "asc" },
        });

        // 처리된 Submission (Supply - APPROVED or REJECTED)
        const processed = await prisma.submission.findMany({
            where: {
                updatedAt: { gte: from, lte: to },
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
