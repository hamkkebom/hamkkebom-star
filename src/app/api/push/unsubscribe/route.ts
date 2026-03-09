import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * POST /api/push/unsubscribe
 * 푸시 알림 구독을 해제합니다.
 */
export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { endpoint } = await request.json();

        if (!endpoint) {
            return NextResponse.json(
                { error: "Endpoint is required" },
                { status: 400 }
            );
        }

        await prisma.pushSubscription.deleteMany({
            where: {
                endpoint,
                userId: user.id,
            },
        });

        return NextResponse.json({ message: "구독이 해제되었습니다." });
    } catch (error) {
        console.error("[Push Unsubscribe Error]", error);
        return NextResponse.json(
            { error: "구독 해제에 실패했습니다." },
            { status: 500 }
        );
    }
}
