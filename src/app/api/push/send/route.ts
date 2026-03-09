import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import webpush from "web-push";

export const dynamic = "force-dynamic";

// VAPID 설정 (lazy initialization - 빌드 타임에 실행되지 않도록)
let vapidInitialized = false;

function ensureVapidConfigured() {
    if (vapidInitialized) return true;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (privateKey && publicKey && subject) {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        vapidInitialized = true;
        return true;
    }
    return false;
}

/**
 * POST /api/push/send
 * 특정 사용자에게 푸시 알림을 발송합니다.
 * Admin 전용 또는 시스템 내부 호출용.
 * 
 * Body:
 * - userId: string (대상 사용자 ID)
 * - userIds: string[] (복수 사용자)
 * - role: "STAR" | "ADMIN" (역할 기반 전체 발송)
 * - title: string
 * - body: string
 * - url: string (알림 클릭 시 이동할 URL)
 */
export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ensureVapidConfigured()) {
        return NextResponse.json(
            { error: "VAPID 키가 설정되지 않았습니다." },
            { status: 500 }
        );
    }

    try {
        const { userId, userIds, role, title, body: notifBody, url } = await request.json();

        if (!title || !notifBody) {
            return NextResponse.json(
                { error: "title과 body는 필수입니다." },
                { status: 400 }
            );
        }

        // 대상 구독 조회
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: Record<string, any> = {};
        if (userId) {
            whereClause.userId = userId;
        } else if (userIds && Array.isArray(userIds)) {
            whereClause.userId = { in: userIds };
        } else if (role) {
            whereClause.user = { role };
        } else {
            return NextResponse.json(
                { error: "userId, userIds, 또는 role 중 하나가 필요합니다." },
                { status: 400 }
            );
        }

        const subscriptions = await prisma.pushSubscription.findMany({
            where: whereClause,
            select: {
                id: true,
                endpoint: true,
                p256dh: true,
                auth: true,
            },
        });

        if (subscriptions.length === 0) {
            return NextResponse.json({
                message: "구독된 디바이스가 없습니다.",
                sent: 0,
                failed: 0,
            });
        }

        const payload = JSON.stringify({ title, body: notifBody, url: url || "/" });
        let sent = 0;
        let failed = 0;
        const failedIds: string[] = [];

        await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    await webpush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: { p256dh: sub.p256dh, auth: sub.auth },
                        },
                        payload
                    );
                    sent++;
                } catch (error: unknown) {
                    failed++;
                    // 410 Gone 또는 404 → 구독 만료됨 → 삭제
                    const webPushError = error as { statusCode?: number };
                    if (webPushError?.statusCode === 410 || webPushError?.statusCode === 404) {
                        failedIds.push(sub.id);
                    }
                }
            })
        );

        // 만료된 구독 정리
        if (failedIds.length > 0) {
            await prisma.pushSubscription.deleteMany({
                where: { id: { in: failedIds } },
            });
        }

        return NextResponse.json({
            message: `${sent}개 디바이스에 전송 완료.`,
            sent,
            failed,
            expired: failedIds.length,
        });
    } catch (error) {
        console.error("[Push Send Error]", error);
        return NextResponse.json(
            { error: "알림 발송에 실패했습니다." },
            { status: 500 }
        );
    }
}
