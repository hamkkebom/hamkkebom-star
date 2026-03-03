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
        const statusGroups = await prisma.settlement.groupBy({
            by: ['status'],
            _sum: { totalAmount: true }
        });

        const data = statusGroups.map(g => ({
            name: g.status,
            value: Number(g._sum.totalAmount || 0)
        }));

        return NextResponse.json({ data });

    } catch (error) {
        console.error("Donut API Error:", error);
        return NextResponse.json({ error: "Failed to fetch donut data" }, { status: 500 });
    }
}
