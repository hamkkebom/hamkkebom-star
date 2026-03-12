import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addSignedThumbnails } from "@/lib/thumbnail";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const counselor = await prisma.counselor.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        category: true,
        imageUrl: true,
        hashtags: true,
        specialties: true,
        introduction: true,
        career: true,
        landingPageUrl: true,
        announcements: true,
        status: true,
      },
    });

    if (!counselor || counselor.status !== "ACTIVE") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "전문가를 찾을 수 없거나 비활성화된 상태입니다." } },
        { status: 404 }
      );
    }

    const videos = await prisma.video.findMany({
      where: {
        counselorId: id,
        status: { in: ["APPROVED", "FINAL"] },
      },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        streamUid: true,
        viewCount: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
    });

    const totalVideos = await prisma.video.count({
      where: {
        counselorId: id,
        status: { in: ["APPROVED", "FINAL"] },
      },
    });

    // Remove status from the response to match requirements
    const { status: _status, ...counselorData } = counselor;

    const signedVideos = await addSignedThumbnails(videos);

    return NextResponse.json({
      data: {
        counselor: counselorData,
        videos: signedVideos,
        totalVideos,
      },
    });
  } catch (error) {
    console.error("[GET /api/counselors/[id]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "전문가 정보를 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
