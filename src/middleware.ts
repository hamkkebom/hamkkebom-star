// ============================================================
// 🔒 AUTH BYPASS: 로그인 기능 전체 주석 처리 (2026-02-10)
// 원래 코드는 아래 주석 블록에 보존되어 있습니다.
// 복원하려면 이 파일 전체를 원래 코드로 교체하세요.
// ============================================================

// --- 원래 코드 (주석 처리됨) ---
// import { updateSession } from "@/lib/supabase/middleware";
// import { type NextRequest } from "next/server";
//
// export async function middleware(request: NextRequest) {
//   return await updateSession(request);
// }
//
// export const config = {
//   matcher: [
//     "/((?!_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
//   ],
// };
// --- 원래 코드 끝 ---

import { NextResponse } from "next/server";

export async function middleware() {
  // AUTH BYPASS: 인증 체크 없이 모든 요청을 통과시킵니다.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
