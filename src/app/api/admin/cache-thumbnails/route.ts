import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { batchCacheThumbnails } from "@/lib/thumbnail-cache";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/cache-thumbnails
 * R2에 아직 캐싱되지 않은 모든 공개 영상의 썸네일을 R2에 배치 캐싱합니다.
 * ADMIN만 실행 가능.
 */
export async function POST() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 }
    );
  }

  try {
    const result = await batchCacheThumbnails(5);

    return NextResponse.json({
      data: {
        message: `썸네일 캐싱 완료: ${result.success}개 성공, ${result.failed}개 실패, ${result.skipped}개 스킵 (총 ${result.total}개)`,
        ...result,
      },
    });
  } catch (error) {
    console.error("[cache-thumbnails] 배치 처리 실패:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "썸네일 캐싱 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
