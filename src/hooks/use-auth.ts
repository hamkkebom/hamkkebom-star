"use client";

// ============================================================
// 🔒 AUTH BYPASS: 로그인 기능 전체 주석 처리 (2026-02-10)
// Supabase auth 리스너 없이 직접 /api/users/me에서 유저를 가져옵니다.
// 복원하려면 아래 주석 블록의 원래 코드로 교체하세요.
// ============================================================

// --- 원래 코드 (주석 처리됨) ---
// import { useEffect } from "react";
// import { createClient } from "@/lib/supabase/client";
// import { useAuthStore } from "@/stores/auth-store";
//
// export function useAuth() {
//   const { user, isLoading, fetchUser, clearUser } = useAuthStore();
//
//   useEffect(() => {
//     const supabase = createClient();
//
//     supabase.auth.getSession().then(({ data: { session } }) => {
//       if (session) {
//         fetchUser();
//       } else {
//         clearUser();
//       }
//     });
//
//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange((event) => {
//       if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
//         fetchUser();
//       } else if (event === "SIGNED_OUT") {
//         clearUser();
//       }
//     });
//
//     return () => {
//       subscription.unsubscribe();
//     };
//   }, [fetchUser, clearUser]);
//
//   return { user, isLoading };
// }
// --- 원래 코드 끝 ---

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const { user, isLoading, fetchUser } = useAuthStore();

  useEffect(() => {
    // AUTH BYPASS: Supabase 없이 바로 /api/users/me에서 유저 정보를 가져옵니다.
    fetchUser();
  }, [fetchUser]);

  return { user, isLoading };
}
