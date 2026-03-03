import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const video = await prisma.video.update({
            where: { id },
            data: {
                viewCount: {
                    increment: 1,
                },
            },
        });

        return NextResponse.json({ success: true, viewCount: video.viewCount });
    } catch (error) {
        console.error("[VIDEO_VIEW]", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}
