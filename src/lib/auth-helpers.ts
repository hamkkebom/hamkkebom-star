import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

interface GetAuthUserOptions {
  /** true이면 isApproved 체크를 건너뜁니다 (레이아웃 가드에서 별도 처리 시 사용) */
  skipApprovalCheck?: boolean;
  /** true이면 ban/suspend 체크를 건너뜁니다 (레이아웃에서 별도 리다이렉트 처리 시 사용) */
  skipBanCheck?: boolean;
}

/**
 * Supabase 인증 → Prisma User 조회.
 * React cache()로 같은 요청 내 중복 호출 방지.
 * 레이아웃 + 페이지에서 모두 호출하더라도 1회만 실행됩니다.
 */
const getAuthUserCached = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.id) return null;

  return prisma.user.findUnique({ where: { authId: authUser.id } });
});

export async function getAuthUser(options?: GetAuthUserOptions) {
  const user = await getAuthUserCached();

  if (!user) return null;

  // Ban/Suspend 체크 (skipBanCheck가 아닌 경우)
  if (!options?.skipBanCheck) {
    // 영구 정지 체크
    if (user.isBanned) return null;

    // 임시 정지 체크
    if (user.suspendedUntil) {
      if (user.suspendedUntil > new Date()) {
        return null; // 아직 정지 중
      }
      // 만료됨 → 자동 해제 (DB 업데이트)
      await prisma.user.update({
        where: { id: user.id },
        data: { suspendedUntil: null, suspendedReason: null },
      });
      // cache() 내부의 stale 객체를 덮어쓰기 (Momus 이슈 #1 수정)
      user.suspendedUntil = null;
      user.suspendedReason = null;
    }
  }

  // 승인 체크
  if (!options?.skipApprovalCheck && !user.isApproved) {
    return null;
  }

  return user;
}
