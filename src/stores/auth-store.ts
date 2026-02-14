import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),

  clearUser: () => set({ user: null, isLoading: false }),

  fetchUser: async () => {
    try {
      // Supabase 세션이 있을 때만 API 호출하여 비인증 시 401 콘솔 에러 방지
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
      set({ user: data.data, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },
}));
