import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // updateSession handles auth gating and root-role redirect.
  return await updateSession(request);
}

export const config = {
  matcher: [
    // auth 경로와 정적 파일 제외, 나머지 전체 보호
    "/((?!_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
