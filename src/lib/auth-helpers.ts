import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

interface GetAuthUserOptions {
  /** true이면 isApproved 체크를 건너뜁니다 (레이아웃 가드에서 별도 처리 시 사용) */
  skipApprovalCheck?: boolean;
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

  if (!options?.skipApprovalCheck && !user.isApproved) {
    return null;
  }

  return user;
}
