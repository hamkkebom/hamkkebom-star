import { NextResponse } from "next/server";
import { VideoStatus, VideoSubject } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";
import { extractR2Key, getPresignedGetUrl } from "@/lib/cloudflare/r2-upload";

const videoStatuses = new Set(Object.values(VideoStatus));
const videoSubjects = new Set(Object.values(VideoSubject));

export async function GET(request: Request) {
  // 비로그인도 APPROVED/FINAL 영상 조회 가능 (공개 API)
  const user = await getAuthUser().catch(() => null);

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));
  const categoryId = searchParams.get("categoryId")?.trim();
  const ownerId = searchParams.get("ownerId")?.trim();
  const counselorId = searchParams.get("counselorId")?.trim();
  const sort = searchParams.get("sort") ?? "latest";
  const statusParam = searchParams.get("status");
  const videoSubjectParam = searchParams.get("videoSubject")?.trim();
  const durationMinParam = searchParams.get("durationMin");
  const durationMaxParam = searchParams.get("durationMax");

  if (sort !== "latest" && sort !== "oldest") {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 정렬 값입니다." } },
      { status: 400 }
    );
  }

  if (statusParam && !videoStatuses.has(statusParam as VideoStatus)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 상태값입니다." } },
      { status: 400 }
    );
  }

  if (videoSubjectParam && !videoSubjects.has(videoSubjectParam as VideoSubject)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 영상주체 값입니다." } },
      { status: 400 }
    );
  }

  // 인증된 ADMIN만 상태 필터 가능, 그 외는 APPROVED/FINAL만
  const statusFilter =
    user?.role === "ADMIN" && statusParam
      ? { status: statusParam as VideoStatus }
      : { status: { in: [VideoStatus.APPROVED, VideoStatus.FINAL] } };

  // 재생시간 필터 (technicalSpec.duration 기반)
  const durationMin = durationMinParam ? Number(durationMinParam) : undefined;
  const durationMax = durationMaxParam ? Number(durationMaxParam) : undefined;
  const durationFilter =
    durationMin !== undefined || durationMax !== undefined
      ? {
        technicalSpec: {
          duration: {
            ...(durationMin !== undefined ? { gte: durationMin } : {}),
            ...(durationMax !== undefined ? { lte: durationMax } : {}),
          },
        },
      }
      : {};

  const where = {
    ...(categoryId ? { categoryId } : {}),
    ...(ownerId ? { ownerId } : {}),
    ...(counselorId ? { counselorId } : {}),
    ...(videoSubjectParam ? { videoSubject: videoSubjectParam as VideoSubject } : {}),
    ...durationFilter,
    ...statusFilter,
  };

  const [rows, total] = await Promise.all([
    prisma.video.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            chineseName: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        counselor: {
          select: {
            id: true,
            displayName: true,
          },
        },
        technicalSpec: {
          select: {
            duration: true,
          },
        },
        _count: {
          select: {
            eventLogs: true,
          },
        },
      },
      orderBy: [{ createdAt: sort === "oldest" ? "asc" : "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.video.count({ where }),
  ]);

  const rowsWithThumbnails = await Promise.all(
    rows.map(async (row) => {
      let finalThumbnailUrl: string | null = null;

      // 1순위: Video.thumbnailUrl이 R2 URL이면 → presigned GET URL
      if (row.thumbnailUrl) {
        const r2Key = extractR2Key(row.thumbnailUrl);
        if (r2Key) {
          try {
            finalThumbnailUrl = await getPresignedGetUrl(r2Key);
          } catch {
            // R2 실패 시 fallback
          }
        }
      }

      // 2순위: Cloudflare Stream 서명 썸네일
      if (!finalThumbnailUrl && row.streamUid) {
        try {
          const token = await getSignedPlaybackToken(row.streamUid);
          if (token) {
            finalThumbnailUrl = `https://videodelivery.net/${token}/thumbnails/thumbnail.jpg?time=1s&width=640`;
          }
        } catch {
          // ignore
        }
      }

      return { ...row, signedThumbnailUrl: finalThumbnailUrl };
    })
  );

  return NextResponse.json(
    {
      data: rowsWithThumbnails,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
