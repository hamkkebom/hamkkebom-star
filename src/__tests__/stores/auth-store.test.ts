import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types/database";

// Supabase client mock — fetchUser에서 getSession()으로 세션 확인 후 fetch 호출
const mockGetSession = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
  }),
}));

describe("useAuthStore", () => {
  beforeEach(() => {
    // 각 테스트 전에 store 초기화
    useAuthStore.setState({ user: null, isLoading: true });
    vi.clearAllMocks();
    // 기본: 세션이 있는 상태
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "test-token" } } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchUser", () => {
    it("성공 — API가 { data: User } 반환 시 user 정상 설정", async () => {
      const mockUser = {
        id: "user-1",
        authId: "auth-1",
        email: "star@test.com",
        name: "김영상",
        phone: "010-1234-5678",
        avatarUrl: null,
        role: "STAR",
        isApproved: true,
        baseRate: null,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-15"),
      } as User;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockUser }),
      });

      const { fetchUser } = useAuthStore.getState();
      await fetchUser();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.user?.id).toBe("user-1");
      expect(state.user?.role).toBe("STAR");
      expect(state.user?.email).toBe("star@test.com");
      expect(state.isLoading).toBe(false);
    });

    it("성공 — ADMIN 역할 사용자 처리", async () => {
      const mockAdminUser = {
        id: "admin-1",
        authId: "auth-admin-1",
        email: "admin@test.com",
        name: "관리자",
        phone: null,
        avatarUrl: null,
        role: "ADMIN",
        isApproved: true,
        baseRate: null,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-15"),
      } as User;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAdminUser }),
      });

      const { fetchUser } = useAuthStore.getState();
      await fetchUser();

      const state = useAuthStore.getState();
      expect(state.user?.role).toBe("ADMIN");
      expect(state.user?.isApproved).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it("성공 — 미승인 사용자 처리", async () => {
      const mockUnapprovedUser = {
        id: "user-2",
        authId: "auth-2",
        email: "pending@test.com",
        name: "대기중",
        phone: null,
        avatarUrl: null,
        role: "STAR",
        isApproved: false,
        baseRate: null,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-15"),
      } as User;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockUnapprovedUser }),
      });

      const { fetchUser } = useAuthStore.getState();
      await fetchUser();

      const state = useAuthStore.getState();
      expect(state.user?.isApproved).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it("401 Unauthorized — user null 설정", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { fetchUser } = useAuthStore.getState();
      await fetchUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it("404 Not Found — user null 설정", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { fetchUser } = useAuthStore.getState();
      await fetchUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it("네트워크 에러 — user null 설정", async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

      const { fetchUser } = useAuthStore.getState();
      await fetchUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it("JSON 파싱 에러 — user null 설정", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const { fetchUser } = useAuthStore.getState();
      await fetchUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it("API 호출 시 cache: no-store 옵션 사용", async () => {
      const mockUser = {
        id: "user-1",
        authId: "auth-1",
        email: "test@test.com",
        name: "테스트",
        phone: null,
        avatarUrl: null,
        role: "STAR",
        isApproved: true,
        baseRate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockUser }),
      });

      const { fetchUser } = useAuthStore.getState();
      await fetchUser();

      expect(global.fetch).toHaveBeenCalledWith("/api/users/me", {
        cache: "no-store",
      });
    });
  });

  describe("setUser", () => {
    it("사용자 수동 설정", () => {
      const mockUser = {
        id: "user-1",
        authId: "auth-1",
        email: "test@test.com",
        name: "테스트",
        phone: null,
        avatarUrl: null,
        role: "STAR",
        isApproved: true,
        baseRate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      const { setUser } = useAuthStore.getState();
      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isLoading).toBe(false);
    });

    it("null 설정 — 로그아웃", () => {
      const mockUser = {
        id: "user-1",
        authId: "auth-1",
        email: "test@test.com",
        name: "테스트",
        phone: null,
        avatarUrl: null,
        role: "STAR",
        isApproved: true,
        baseRate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      const { setUser } = useAuthStore.getState();
      setUser(mockUser);
      setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe("clearUser", () => {
    it("사용자 정보 초기화", () => {
      const mockUser = {
        id: "user-1",
        authId: "auth-1",
        email: "test@test.com",
        name: "테스트",
        phone: null,
        avatarUrl: null,
        role: "STAR",
        isApproved: true,
        baseRate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      const { setUser, clearUser } = useAuthStore.getState();
      setUser(mockUser);
      expect(useAuthStore.getState().user).not.toBeNull();

      clearUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe("상태 관리", () => {
    it("초기 상태 — user null, isLoading true", () => {
      useAuthStore.setState({ user: null, isLoading: true });
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(true);
    });

    it("fetchUser 중 isLoading 상태 변화", async () => {
      const mockUser = {
        id: "user-1",
        authId: "auth-1",
        email: "test@test.com",
        name: "테스트",
        phone: null,
        avatarUrl: null,
        role: "STAR",
        isApproved: true,
        baseRate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      global.fetch = vi.fn().mockImplementation(async () => {
        return {
          ok: true,
          json: async () => ({ data: mockUser }),
        };
      });

      const { fetchUser } = useAuthStore.getState();
      await fetchUser();

      // getSession → fetch → user 설정 완료 후 상태 확인
      expect(global.fetch).toHaveBeenCalledOnce();

      const state = useAuthStore.getState();
      expect(state.user).not.toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });
});
