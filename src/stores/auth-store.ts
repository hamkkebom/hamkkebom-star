import { create } from "zustand";
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
      const response = await fetch("/api/users/me", { cache: "no-store" });

      if (!response.ok) {
        set({ user: null, isLoading: false });
        return;
      }

      const data = (await response.json()) as { user: User };
      set({ user: data.user, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },
}));
