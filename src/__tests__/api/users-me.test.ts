import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

// --- Helpers ---

const mockAuthUser = { id: "auth-uuid-123" };
const mockUser = {
  id: "user-cuid-001",
  authId: "auth-uuid-123",
  email: "star@example.com",
  name: "김영상",
  phone: "010-1234-5678",
  avatarUrl: null,
  role: "STAR",
  baseRate: 100000,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-15"),
};

// --- Import route handlers ---

import { GET, PATCH } from "@/app/api/users/me/route";

describe("GET /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증 사용자", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("200 — Supabase 인증 O, DB 사용자 없음 → 자동 생성", async () => {
    const authUserWithMeta = {
      id: "auth-uuid-123",
      email: "star@example.com",
      user_metadata: { name: "김영상", phone: "010-1234-5678" },
    };
    mockGetUser.mockResolvedValue({ data: { user: authUserWithMeta } });
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "user-cuid-new",
      authId: "auth-uuid-123",
      email: "star@example.com",
      name: "김영상",
      phone: "010-1234-5678",
      avatarUrl: null,
      role: "STAR",
      isApproved: false,
      baseRate: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.email).toBe("star@example.com");
    expect(json.data.name).toBe("김영상");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("200 — 성공", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockAuthUser } });
    mockFindUnique.mockResolvedValue(mockUser);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.email).toBe("star@example.com");
    expect(json.data.name).toBe("김영상");
  });
});

describe("PATCH /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증 사용자", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = new Request("http://localhost/api/users/me", {
      method: "PATCH",
      body: JSON.stringify({ name: "새이름" }),
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("404 — DB 사용자 없음", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockAuthUser } });
    mockFindUnique.mockResolvedValue(null);

    const req = new Request("http://localhost/api/users/me", {
      method: "PATCH",
      body: JSON.stringify({ name: "새이름" }),
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("400 — 잘못된 JSON body", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockAuthUser } });
    mockFindUnique.mockResolvedValue(mockUser);

    const req = new Request("http://localhost/api/users/me", {
      method: "PATCH",
      body: "not-json",
      headers: { "Content-Type": "text/plain" },
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("400 — Zod 검증 실패 (이름 1자)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockAuthUser } });
    mockFindUnique.mockResolvedValue(mockUser);

    const req = new Request("http://localhost/api/users/me", {
      method: "PATCH",
      body: JSON.stringify({ name: "김" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("200 — 성공 업데이트", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockAuthUser } });
    mockFindUnique.mockResolvedValue(mockUser);
    const updatedUser = { ...mockUser, name: "김수정" };
    mockUpdate.mockResolvedValue(updatedUser);

    const req = new Request("http://localhost/api/users/me", {
      method: "PATCH",
      body: JSON.stringify({ name: "김수정" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.name).toBe("김수정");
  });
});
