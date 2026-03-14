import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  fetchUser: (force?: boolean) => Promise<void>;
}

// fetchUser 중복 호출 방지 플래그
let fetchInProgress: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),

  clearUser: () => set({ user: null, isLoading: false }),

  fetchUser: async (force?: boolean) => {
    // 이미 user가 있으면 스킵 (서버에서 인증 완료)
    // force=true이면 무조건 다시 fetch (계정 전환 시)
    if (!force && get().user && !get().isLoading) return;

    // 강제 갱신 시: 기존 fetch 완료를 기다린 후 새로 시작
    // (기존: null 할당 후 진행 → 동시에 2개 API 호출 race condition)
    if (force && fetchInProgress) {
      await fetchInProgress;
      fetchInProgress = null;
    }

    // 중복 호출 방지 — 이미 진행 중이면 같은 Promise 대기
    if (fetchInProgress) {
      await fetchInProgress;
      return;
    }

    fetchInProgress = (async () => {
      try {
        set({ isLoading: true });

        // ✅ getUser()로 서버 검증 (getSession()은 로컬 스토리지만 읽어 stale 가능)
        // getUser()는 Supabase 서버에 토큰을 검증하므로 정확한 인증 상태 확인
        const supabase = createClient();
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authUser) {
          set({ user: null, isLoading: false });
          return;
        }

        const response = await fetch("/api/users/me", { cache: "no-store" });

        if (!response.ok) {
          set({ user: null, isLoading: false });
          return;
        }

        const data = (await response.json()) as { data: User };

        // 세션 유저와 API 응답 유저가 일치하는지 검증
        // ✅ authUser.id로 비교 (서버 검증된 값이므로 신뢰 가능)
        if (data.data.authId !== authUser.id) {
          set({ user: null, isLoading: false });
          return;
        }

        set({ user: data.data, isLoading: false });
      } catch {
        set({ user: null, isLoading: false });
      } finally {
        fetchInProgress = null;
      }
    })();

    await fetchInProgress;
  },
}));
