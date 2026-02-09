"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Supabase onAuthStateChange 리스너 + Zustand 스토어 연동.
 * - 마운트 시 현재 세션 확인 → fetchUser()
 * - SIGNED_IN → fetchUser()
 * - SIGNED_OUT → clearUser()
 *
 * Providers에서 한 번만 호출하여 전역 auth 상태를 초기화합니다.
 */
export function useAuth() {
  const { user, isLoading, fetchUser, clearUser } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUser();
      } else {
        clearUser();
      }
    });

    // auth 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchUser();
      } else if (event === "SIGNED_OUT") {
        clearUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser, clearUser]);

  return { user, isLoading };
}
