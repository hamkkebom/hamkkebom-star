import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { subDays, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    try {
        const startDate = subDays(new Date(), days);

        const submissions = await prisma.submission.findMany({
            where: { createdAt: { gte: startDate } },
            select: { createdAt: true, status: true },
            orderBy: { createdAt: "asc" }
        });

        const timelineMap = new Map();
        for (let i = days; i >= 0; i--) {
            const d = subDays(new Date(), i);
            const dateKey = format(d, "MM-dd");
            timelineMap.set(dateKey, { date: dateKey, submitted: 0, approved: 0 });
        }

        submissions.forEach(sub => {
            const dateKey = format(sub.createdAt, "MM-dd");
            if (timelineMap.has(dateKey)) {
                const entry = timelineMap.get(dateKey);
                entry.submitted += 1;
                if (sub.status === "APPROVED") {
                    entry.approved += 1;
                }
            }
        });

        return NextResponse.json({ timeline: Array.from(timelineMap.values()) });
    } catch (error) {
        console.error("Trends API Error:", error);
        return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 });
    }
}
