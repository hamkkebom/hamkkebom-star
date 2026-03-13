"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const { user, isLoading, fetchUser, clearUser } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    // Fetch user on mount - server will verify auth
    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        // 계정 전환 시 이전 유저 데이터가 남아있을 수 있으므로 강제 갱신
        fetchUser(true);
      } else if (event === "TOKEN_REFRESHED") {
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
