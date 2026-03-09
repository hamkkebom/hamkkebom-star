import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * POST /api/push/subscribe
 * 푸시 알림 구독을 등록합니다.
 */
export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { endpoint, keys } = body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return NextResponse.json(
                { error: "Invalid subscription data" },
                { status: 400 }
            );
        }

        // 기존 구독이 있으면 업데이트, 없으면 생성
        const subscription = await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: {
                p256dh: keys.p256dh,
                auth: keys.auth,
                userId: user.id,
                userAgent: body.userAgent || null,
            },
            create: {
                userId: user.id,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                userAgent: body.userAgent || null,
            },
        });

        return NextResponse.json({
            message: "구독이 등록되었습니다.",
            id: subscription.id
        });
    } catch (error) {
        console.error("[Push Subscribe Error]", error);
        return NextResponse.json(
            { error: "구독 등록에 실패했습니다." },
            { status: 500 }
        );
    }
}
