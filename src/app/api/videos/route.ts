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
  const ownerNameParam = searchParams.get("ownerName")?.trim();
  const counselorId = searchParams.get("counselorId")?.trim();
  const sort = searchParams.get("sort") ?? "latest";
  const statusParam = searchParams.get("status");
  const videoSubjectParam = searchParams.get("videoSubject")?.trim();
  const durationMinParam = searchParams.get("durationMin");
  const durationMaxParam = searchParams.get("durationMax");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const q = searchParams.get("q")?.trim(); // Global search query

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

  const ownerFilter = ownerNameParam
    ? {
      owner: {
        OR: [
          { chineseName: { contains: ownerNameParam, mode: "insensitive" } },
          { name: { contains: ownerNameParam, mode: "insensitive" } },
        ],
      },
    }
    : {};

  const queryFilter = q ? {
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { owner: { chineseName: { contains: q, mode: "insensitive" } } },
      { owner: { name: { contains: q, mode: "insensitive" } } }
    ]
  } : {};

  const dateFilter: any = {};
  if (dateFrom || dateTo) {
    dateFilter.createdAt = {};
    if (dateFrom) {
      dateFilter.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setUTCHours(23, 59, 59, 999);
      dateFilter.createdAt.lte = end;
    }
  }

  const where: any = {
    ...(categoryId ? { categoryId } : {}),
    ...(ownerId ? { ownerId } : {}),
    ...ownerFilter,
    ...queryFilter,
    ...dateFilter,
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
        submissions: {
          select: { id: true },
          orderBy: { createdAt: "desc" },
          take: 1,
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

      // 가장 최신 제출물 ID
      const latestSubmissionId = row.submissions?.[0]?.id ?? null;

      // 필요 없는 submissions 배열은 제외하고 필요한 값만 반환
      const { submissions, ...restRow } = row;

      return {
        ...restRow,
        signedThumbnailUrl: finalThumbnailUrl,
        submissionId: latestSubmissionId
      };
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
