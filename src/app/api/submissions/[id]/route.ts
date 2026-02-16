import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { getSignedPlaybackToken, deleteVideo } from "@/lib/cloudflare/stream";
import { extractR2Key, getPresignedGetUrl, deleteR2Object } from "@/lib/cloudflare/r2-upload";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      star: { select: { id: true, name: true, email: true, avatarUrl: true } },
      assignment: {
        include: {
          request: { select: { id: true, title: true, deadline: true } },
        },
      },
      video: {
        select: {
          id: true,
          title: true,
          streamUid: true,
          thumbnailUrl: true,
          technicalSpec: { select: { duration: true } },
        },
      },
      feedbacks: {
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { feedbacks: true } },
    },
  });

  if (!submission) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  // STAR는 본인 제출물만 조회 가능
  if (user.role === "STAR" && submission.starId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인 제출물만 조회할 수 있습니다." } },
      { status: 403 }
    );
  }

  // 썸네일 URL 생성 (우선순위: R2 presigned → Cloudflare Stream signed)
  let signedThumbnailUrl: string | null = null;

  // 1) Video.thumbnailUrl이 R2 URL이면 → presigned GET URL 생성
  const videoThumbUrl = submission.video?.thumbnailUrl;
  if (videoThumbUrl) {
    const r2Key = extractR2Key(videoThumbUrl);
    if (r2Key) {
      try {
        signedThumbnailUrl = await getPresignedGetUrl(r2Key);
      } catch {
        // R2 실패 시 fallback
      }
    }
  }

  // 1-2) Submission.thumbnailUrl이 R2 URL이면 → presigned GET URL
  if (!signedThumbnailUrl && submission.thumbnailUrl) {
    const r2Key = extractR2Key(submission.thumbnailUrl);
    if (r2Key) {
      try {
        signedThumbnailUrl = await getPresignedGetUrl(r2Key);
      } catch {
        // ignore
      }
    }
  }

  // 2) R2 실패 시 → Cloudflare Stream signed thumbnail
  if (!signedThumbnailUrl) {
    const uid = submission.streamUid || submission.video?.streamUid;
    if (uid) {
      try {
        const token = await getSignedPlaybackToken(uid);
        if (token) {
          signedThumbnailUrl = `https://videodelivery.net/${token}/thumbnails/thumbnail.jpg?time=1s&width=640`;
        }
      } catch {
        // ignore
      }
    }
  }

  // siblings 요청 시 추가 조회
  const url = new URL(_request.url);
  const includeSiblings = url.searchParams.get("includeSiblings") === "true";
  let siblings: any[] = [];

  if (includeSiblings) {
    try {
      // parentId를 별도로 안전하게 조회
      const parentInfo = await prisma.submission.findUnique({
        where: { id },
        select: { parentId: true },
      });
      const rootId = parentInfo?.parentId || id;

      siblings = await prisma.submission.findMany({
        where: {
          AND: [
            {
              OR: [
                { id: rootId },
                { parentId: rootId },
              ],
            },
            { id: { not: id } },
          ],
        },
        select: {
          id: true,
          version: true,
          status: true,
          createdAt: true,
          thumbnailUrl: true,
          versionTitle: true,
          video: {
            select: {
              thumbnailUrl: true,
              technicalSpec: { select: { duration: true } }
            }
          }
        },
        orderBy: { versionSlot: "desc" },
      });
    } catch (err) {
      console.error("[siblings] ERROR:", err);
    }
  }

  // siblings도 버전에 본인 포함해서 정렬된 리스트로 내려주는 게 편함
  // 하지만 여기서는 요청된 포맷(siblings 배열)에 맞춤

  return NextResponse.json({ data: { ...submission, signedThumbnailUrl, siblings } });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const existing = await prisma.submission.findUnique({
    where: { id },
    select: { starId: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  if (user.role === "STAR" && existing.starId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인 제출물만 수정할 수 있습니다." } },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const allowedFields = ["versionTitle", "streamUid", "r2Key", "duration", "thumbnailUrl", "status"];
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.submission.update({
    where: { id },
    data,
    include: {
      star: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const { id } = await params;

  // 삭제 대상의 전체 정보 조회 (외부 리소스 정리에 필요)
  const existing = await prisma.submission.findUnique({
    where: { id },
    select: {
      starId: true,
      status: true,
      streamUid: true,
      thumbnailUrl: true,
      video: {
        select: {
          streamUid: true,
          thumbnailUrl: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  if (user.role === "STAR" && existing.starId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인 제출물만 삭제할 수 있습니다." } },
      { status: 403 }
    );
  }

  if (existing.status !== "PENDING") {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "대기중(Pending) 상태인 영상만 삭제할 수 있습니다.",
        },
      },
      { status: 400 }
    );
  }

  // ── 외부 리소스 정리 (best-effort: 실패해도 DB 삭제는 진행) ──

  const cleanupResults: string[] = [];

  // 1) Cloudflare Stream 영상 삭제
  const streamUid = existing.streamUid || existing.video?.streamUid;
  if (streamUid) {
    try {
      const deleted = await deleteVideo(streamUid);
      cleanupResults.push(`Stream(${streamUid}): ${deleted ? "✓" : "✗"}`);
    } catch (e) {
      console.error("Stream 영상 삭제 실패:", e);
      cleanupResults.push(`Stream(${streamUid}): error`);
    }
  }

  // 2) R2 썸네일 삭제 (Video.thumbnailUrl)
  const videoThumbUrl = existing.video?.thumbnailUrl;
  if (videoThumbUrl) {
    const r2Key = extractR2Key(videoThumbUrl);
    if (r2Key) {
      try {
        const deleted = await deleteR2Object(r2Key);
        cleanupResults.push(`R2-video(${r2Key}): ${deleted ? "✓" : "✗"}`);
      } catch (e) {
        console.error("R2 Video 썸네일 삭제 실패:", e);
      }
    }
  }

  // 3) R2 썸네일 삭제 (Submission.thumbnailUrl — 직접 업로드)
  if (existing.thumbnailUrl && existing.thumbnailUrl !== videoThumbUrl) {
    const r2Key = extractR2Key(existing.thumbnailUrl);
    if (r2Key) {
      try {
        const deleted = await deleteR2Object(r2Key);
        cleanupResults.push(`R2-sub(${r2Key}): ${deleted ? "✓" : "✗"}`);
      } catch (e) {
        console.error("R2 Submission 썸네일 삭제 실패:", e);
      }
    }
  }

  if (cleanupResults.length > 0) {
    console.log(`[DELETE /submissions/${id}] cleanup:`, cleanupResults.join(", "));
  }

  // 4) DB 레코드 삭제
  await prisma.submission.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
