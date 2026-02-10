import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

interface GetAuthUserOptions {
  /** true이면 isApproved 체크를 건너뜁니다 (레이아웃 가드에서 별도 처리 시 사용) */
  skipApprovalCheck?: boolean;
}

/**
 * Supabase 인증 → Prisma User 조회.
 * 기본적으로 isApproved === false인 유저는 null을 반환합니다.
 * 레이아웃에서 미승인 유저를 별도 리다이렉트해야 할 경우 { skipApprovalCheck: true } 사용.
 */
export async function getAuthUser(options?: GetAuthUserOptions) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { authId: authUser.id } });

  if (!user) {
    return null;
  }

  if (!options?.skipApprovalCheck && !user.isApproved) {
    return null;
  }

  return user;
}
