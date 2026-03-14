"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const { user, isLoading, fetchUser, clearUser } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    // Fetch user on mount - server will verify auth
    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        // 계정 전환 시: 이전 유저의 캐시 데이터 완전 제거 후 새 유저 fetch
        queryClient.clear();
        fetchUser(true);
      } else if (event === "TOKEN_REFRESHED") {
        fetchUser();
      } else if (event === "SIGNED_OUT") {
        // 로그아웃 시: Zustand + TanStack Query 캐시 모두 제거
        clearUser();
        queryClient.clear();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser, clearUser, queryClient]);

  return { user, isLoading };
}
