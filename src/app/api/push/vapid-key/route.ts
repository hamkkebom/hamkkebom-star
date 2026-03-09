import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/push/vapid-key
 * 클라이언트에 VAPID 공개키를 반환합니다.
 */
export async function GET() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
        return NextResponse.json(
            { error: "VAPID public key not configured" },
            { status: 500 }
        );
    }

    return NextResponse.json({ publicKey: vapidPublicKey });
}
