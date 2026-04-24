import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { VideoStatus, VideoSubject, SubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { addSignedThumbnails } from "@/lib/thumbnail";
export const dynamic = "force-dynamic";

const videoStatuses = new Set(Object.values(VideoStatus));
const videoSubjects = new Set(Object.values(VideoSubject));
const submissionStatuses = new Set(Object.values(SubmissionStatus));

export async function GET(request: Request) {
  // Fast path: 세션 쿠키 없으면 Supabase auth 호출 스킵 (~100-300ms 절약)
  const cookieStore = await cookies();
  const hasSession = cookieStore.getAll().some(c => c.name.includes("sb-"));
  const user = hasSession ? await getAuthUser().catch(() => null) : null;

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
  const includeVersions = searchParams.get("includeVersions") === "true";

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

  // 비관리자: showVideosPublicly=false 계정의 영상은 공개 페이지에서 숨김
  if (user?.role !== "ADMIN") {
    where.AND = [...(Array.isArray(where.AND) ? (where.AND as unknown[]) : []), { owner: { showVideosPublicly: true } }];
  }

  // 버전 그룹핑: root submission(parentId가 null)을 가진 Video만 표시
  // bumped 버전의 Video가 메인 리스트에 중복 노출되는 것을 방지
  if (includeVersions) {
    where.submissions = {
      ...(typeof where.submissions === "object" && where.submissions !== null ? where.submissions : {}),
      some: {
        ...((typeof where.submissions === "object" && where.submissions !== null && "some" in where.submissions)
          ? (where.submissions as Record<string, unknown>).some as Record<string, unknown>
          : {}),
        parentId: null,
      },
    };
  }

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
          select: {
            id: true,
            parentId: true,
            thumbnailUrl: true,
            status: true,
            version: true,
            versionSlot: true,
            versionTitle: true,
            createdAt: true,
            _count: { select: { feedbacks: true } },
          },
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

  // ── 버전 체인 조회 (parentId 기반) ──
  type ChainChild = {
    id: string; parentId: string | null; version: string; versionSlot: number;
    versionTitle: string | null; status: string;
    createdAt: Date; thumbnailUrl: string | null; streamUid: string | null;
    _count: { feedbacks: number };
    video: {
      id: string; title: string; thumbnailUrl: string | null;
      streamUid: string | null; status: string;
    } | null;
  };
  const childrenByRoot: Map<string, ChainChild[]> = new Map();

  if (includeVersions) {
    // 각 row의 root submission ID 수집 (parentId가 null인 submission = root)
    const rootSubIds = rows
      .map((r) => r.submissions.find((s) => !s.parentId)?.id)
      .filter((id): id is string => !!id);

    if (rootSubIds.length > 0) {
      const children = await prisma.submission.findMany({
        where: { parentId: { in: rootSubIds } },
        select: {
          id: true,
          parentId: true,
          version: true,
          versionSlot: true,
          versionTitle: true,
          status: true,
          createdAt: true,
          thumbnailUrl: true,
          streamUid: true,
          _count: { select: { feedbacks: true } },
          video: {
            select: {
              id: true, title: true, thumbnailUrl: true,
              streamUid: true, status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      for (const child of children) {
        if (!child.parentId) continue;
        const list = childrenByRoot.get(child.parentId) ?? [];
        list.push(child);
        childrenByRoot.set(child.parentId, list);
      }
    }
  }

  // ── 썸네일 URL 서명 (requireSignedURLs=true이므로 서명 필수) ──
  // submissions에서 latestSubmission 추출 후 addSignedThumbnails에 넘길 형태로 변환
  const rowsPrepped = rows.map((row) => {
    const rootSubmission = row.submissions.find((s) => !s.parentId) ?? null;
    const { submissions, ...restRow } = row;

    if (!includeVersions) {
      const latestSubmission = submissions[0] ?? null;
      return {
        ...restRow,
        submissionId: latestSubmission?.id ?? null,
        latestSubmissionStatus: latestSubmission?.status ?? null,
      };
    }

    // 버전 그룹핑: root의 체인 children 가져오기
    const chainChildren = rootSubmission ? (childrenByRoot.get(rootSubmission.id) ?? []) : [];
    // 최신 child가 메인에 표시, 나머지(root 포함)가 allSubmissions
    const latestChild = chainChildren.length > 0 ? chainChildren[0] : null;
    const latestSubmission = latestChild ?? rootSubmission;

    // 최신 버전의 video 정보로 row 덮어쓰기 (title, thumbnail 등)
    const videoOverrides = latestChild?.video ? {
      title: latestChild.video.title,
      thumbnailUrl: latestChild.video.thumbnailUrl ?? restRow.thumbnailUrl,
      streamUid: latestChild.video.streamUid ?? restRow.streamUid,
    } : {};

    // allSubmissions: 최신 제외한 나머지 children + root (오래된 버전들)
    const olderVersions = [
      ...chainChildren.slice(1).map((s) => ({
        id: s.id,
        version: s.version,
        versionSlot: s.versionSlot,
        versionTitle: s.versionTitle,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        feedbackCount: s._count.feedbacks,
      })),
      ...(rootSubmission ? [{
        id: rootSubmission.id,
        version: rootSubmission.version,
        versionSlot: rootSubmission.versionSlot,
        versionTitle: rootSubmission.versionTitle,
        status: rootSubmission.status,
        createdAt: rootSubmission.createdAt.toISOString(),
        feedbackCount: rootSubmission._count.feedbacks,
      }] : []),
    ];

    return {
      ...restRow,
      ...videoOverrides,
      submissionId: latestSubmission?.id ?? null,
      latestSubmissionStatus: latestSubmission?.status ?? null,
      submissionCount: 1 + chainChildren.length,
      latestVersion: latestSubmission?.version ?? null,
      allSubmissions: olderVersions,
    };
  });

  // 병렬로 서명된 썸네일 URL 생성 (Promise.all 내부)
  const rowsWithThumbnails = await addSignedThumbnails(rowsPrepped);

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
