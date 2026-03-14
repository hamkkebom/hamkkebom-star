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

    // 강제 갱신 시 기존 fetch를 무시하고 새로 시작
    if (force) {
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

        // Supabase 세션이 있을 때만 API 호출
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
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
        // 계정 전환 중 race condition으로 이전 유저 데이터가 반환될 수 있음
        if (data.data.authId !== session.user.id) {
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
