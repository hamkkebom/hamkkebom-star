"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const { user, isLoading, fetchUser, clearUser } = useAuthStore();
  const queryClient = useQueryClient();
  // SIGNED_IN과 INITIAL_SESSION 중복 방지용 플래그
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    hasInitializedRef.current = false;

    // Fetch user on mount - server will verify auth
    fetchUser();

    // Magic link implicit flow 처리: #access_token=... hash fragment에서 토큰 추출
    // @supabase/ssr의 createBrowserClient는 PKCE flow만 자동 처리하므로
    // implicit flow 토큰은 수동으로 setSession() 호출 필요
    if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
      const hashParams = new URLSearchParams(
        window.location.hash.substring(1)
      );
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ data, error }) => {
            if (!error && data.session) {
              // hash fragment 제거 (URL 정리)
              window.history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search
              );
            }
          });
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        // SIGNED_IN과 INITIAL_SESSION은 로그인 시 모두 발생할 수 있음
        // 첫 번째 이벤트만 처리하여 중복 fetchUser(true) 방지
        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;

        // 계정 전환/로드 시: 유저 의존 쿼리만 무효화 + 새 유저 fetch
        queryClient.invalidateQueries();
        fetchUser(true);
      } else if (event === "TOKEN_REFRESHED") {
        fetchUser();
      } else if (event === "SIGNED_OUT") {
        hasInitializedRef.current = false;
        // 로그아웃 시: Zustand 유저 데이터 제거 + 유저 의존 쿼리 무효화
        clearUser();
        queryClient.invalidateQueries();
      }
    });

    // bfcache 방어: 브라우저 뒤로가기/앞으로가기로 페이지가 복원되면
    // 이전 유저의 stale 데이터가 보일 수 있으므로 유저 데이터만 강제 새로고침
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
