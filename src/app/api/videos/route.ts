import { NextResponse } from "next/server";
import { VideoStatus, VideoSubject, SubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

const videoStatuses = new Set(Object.values(VideoStatus));
const videoSubjects = new Set(Object.values(VideoSubject));
const submissionStatuses = new Set(Object.values(SubmissionStatus));

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
  const submissionStatusParam = searchParams.get("submissionStatus")?.trim();

  if (sort !== "latest" && sort !== "oldest" && sort !== "popular") {
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

  const dateFilter: Record<string, unknown> = {};
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) {
      createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setUTCHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    dateFilter.createdAt = createdAt;
  }

  // submissionStatus 필터: 최신 제출물의 상태 기준으로 영상 필터링
  const submissionStatusFilter =
    user?.role === "ADMIN" && submissionStatusParam && submissionStatuses.has(submissionStatusParam as SubmissionStatus)
      ? { submissions: { some: { status: submissionStatusParam as SubmissionStatus } } }
      : {};

  const where: Record<string, unknown> = {
    ...(categoryId ? { categoryId } : {}),
    ...(ownerId ? { ownerId } : {}),
    ...ownerFilter,
    ...queryFilter,
    ...dateFilter,
    ...(counselorId ? { counselorId } : {}),
    ...(videoSubjectParam ? { videoSubject: videoSubjectParam as VideoSubject } : {}),
    ...durationFilter,
    ...statusFilter,
    ...submissionStatusFilter,
  };

  // 상태별 카운트 (필터 무관, ADMIN만 전체 상태 카운트 / 비로그인은 공개 상태만)
  const statusCountWhere: Record<string, unknown> = { ...where };
  delete statusCountWhere.status; // 상태 필터 제외한 나머지 조건으로 카운트

  const [rows, total, statusCountsRaw] = await Promise.all([
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
          select: { id: true, thumbnailUrl: true, status: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            eventLogs: true,
          },
        },
      },
      orderBy: sort === "popular" ? [{ viewCount: "desc" }, { createdAt: "desc" }] : [{ createdAt: sort === "oldest" ? "asc" : "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.video.count({ where }),
    prisma.video.groupBy({
      by: ["status"],
      where: statusCountWhere,
      _count: true,
    }),
  ]);

  // ── 썸네일 URL 생성 (외부 API 호출 없이 공개 CDN URL 직접 사용) ──
  const rowsWithThumbnails = rows.map((row) => {
    // streamUid가 있으면 CF Stream 공개 CDN 썸네일 직접 사용 (서명 불필요)
    // 클라이언트 VideoCard도 동일한 URL을 getStaticThumb()으로 생성 가능
    let finalThumbnailUrl: string | null = null;

    if (row.streamUid) {
      finalThumbnailUrl = `https://videodelivery.net/${row.streamUid}/thumbnails/thumbnail.jpg?time=1s&width=480&height=270&fit=crop`;
    } else if (row.thumbnailUrl) {
      // R2가 아닌 외부 URL (airtable 등)은 그대로 사용
      finalThumbnailUrl = row.thumbnailUrl;
    }

    const latestSubmission = row.submissions?.[0] ?? null;
    const { submissions: _submissions, ...restRow } = row;

    return {
      ...restRow,
      signedThumbnailUrl: finalThumbnailUrl,
      submissionId: latestSubmission?.id ?? null,
      latestSubmissionStatus: latestSubmission?.status ?? null,
    };
  });

  // 상태별 카운트를 { DRAFT: 0, PENDING: 5, ... } 형태로 변환
  const statusCounts: Record<string, number> = {};
  for (const row of statusCountsRaw) {
    statusCounts[row.status] = row._count;
  }

  // 제출물 상태별 카운트 (ADMIN만, submissionStatus 필터 제외한 조건으로)
  let submissionStatusCounts: Record<string, number> | undefined;
  if (user?.role === "ADMIN") {
    const baseWhere: Record<string, unknown> = { ...where };
    delete baseWhere.submissions; // submissionStatus 필터 제외
    const subCounts = await prisma.submission.groupBy({
      by: ["status"],
      where: {
        video: baseWhere,
        // 최신 제출물만 카운트하기 위해 video 연결된 것만
        videoId: { not: null },
      },
      _count: true,
    });
    submissionStatusCounts = {};
    for (const sc of subCounts) {
      submissionStatusCounts[sc.status] = (submissionStatusCounts[sc.status] ?? 0) + sc._count;
    }
  }

  return NextResponse.json(
    {
      data: rowsWithThumbnails,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      statusCounts,
      ...(submissionStatusCounts ? { submissionStatusCounts } : {}),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
