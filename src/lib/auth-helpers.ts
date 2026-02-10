// ============================================================
// 🔒 AUTH BYPASS: 로그인 기능 전체 주석 처리 (2026-02-10)
// getAuthUser()가 항상 mock ADMIN 유저를 반환합니다.
// 복원하려면 아래 주석 블록의 원래 코드로 교체하세요.
// ============================================================

// --- 원래 코드 (주석 처리됨) ---
// import { prisma } from "@/lib/prisma";
// import { createClient } from "@/lib/supabase/server";
//
// export async function getAuthUser() {
//   const supabase = await createClient();
//   const {
//     data: { user: authUser },
//   } = await supabase.auth.getUser();
//
//   if (!authUser?.id) {
//     return null;
//   }
//
//   const user = await prisma.user.findUnique({ where: { authId: authUser.id } });
//   return user;
// }
// --- 원래 코드 끝 ---

import { prisma } from "@/lib/prisma";

export async function getAuthUser() {
  // AUTH BYPASS: Supabase 인증 없이 DB에서 첫 번째 ADMIN 유저를 반환합니다.
  const user = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    // ADMIN 유저가 없으면 아무 유저나 반환
    return await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  }

  return user;
}
