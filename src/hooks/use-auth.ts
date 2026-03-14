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
        // 계정 전환 시: 이전 유저의 role-dependent 데이터만 무효화 + 새 유저 fetch
        // queryClient.clear()는 사용 금지: 영상/크리에이터 등 공개 쿼리 캐시까지 삭제됨
        // invalidateQueries는 마운트된 observer가 있으면 자동 refetch하므로 안전
        queryClient.invalidateQueries();
        fetchUser(true);
      } else if (event === "INITIAL_SESSION") {
        // 페이지 로드 시 기존 세션 복원 — 유저 데이터만 force refresh
        // queryClient.clear() 호출 금지: 영상/크리에이터 등 다른 쿼리 캐시까지 삭제됨
        fetchUser(true);
      } else if (event === "TOKEN_REFRESHED") {
        fetchUser();
      } else if (event === "SIGNED_OUT") {
        // 로그아웃 시: Zustand 유저 데이터 제거 + 유저 의존 쿼리만 무효화
        clearUser();
        queryClient.invalidateQueries();
      }
    });

    // bfcache 방어: 브라우저 뒤로가기/앞으로가기로 페이지가 복원되면
    // 이전 유저의 stale 데이터가 보일 수 있으므로 유저 데이터만 강제 새로고침
    // queryClient.clear()는 사용 금지 — 영상/크리에이터 등 다른 쿼리 캐시까지 삭제됨
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        fetchUser(true);
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [fetchUser, clearUser, queryClient]);

  return { user, isLoading };
}
