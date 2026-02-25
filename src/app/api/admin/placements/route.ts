import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

// 매체 목록 로드 (특정 비디오 기준)
export async function GET(request: Request) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    try {
        const whereClause = videoId ? { videoId } : {};
        const placements = await prisma.mediaPlacement.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ data: placements });
    } catch (error) {
        console.error("Error fetching media placements:", error);
        return NextResponse.json({ error: "Failed to fetch placements" }, { status: 500 });
    }
}

// 새로운 매체 등록 또는 업데이트
export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { videoId, medium, url, externalId, note, status = "ACTIVE" } = body;

        if (!videoId || !medium) {
            return NextResponse.json({ error: "videoId and medium are required" }, { status: 400 });
        }

        // 이미 해당 매체에 등록되어 있는지 확인
        const existing = await prisma.mediaPlacement.findFirst({
            where: { videoId, medium }
        });

        if (existing) {
            // 기존 건 업데이트
            const updated = await prisma.mediaPlacement.update({
                where: { id: existing.id },
                data: { url, externalId, note, status, updatedAt: new Date() }
            });
            return NextResponse.json({ data: updated });
        } else {
            // 신규 생성
            const created = await prisma.mediaPlacement.create({
                data: {
                    videoId,
                    medium, // 'YOUTUBE', 'INSTAGRAM', 'TIKTOK'
                    url,
                    externalId,
                    note,
                    status
                }
            });
            return NextResponse.json({ data: created });
        }

    } catch (error) {
        console.error("Error saving media placement:", error);
        return NextResponse.json({ error: "Failed to save placement" }, { status: 500 });
    }
}

// 매체 할당 삭제 (토글 오프 느낌)
export async function DELETE(request: Request) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    try {
        await prisma.mediaPlacement.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting media placement:", error);
        return NextResponse.json({ error: "Failed to delete placement" }, { status: 500 });
    }
}
