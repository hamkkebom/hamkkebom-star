import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetAuthUser = vi.fn();
vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

const mockFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

// --- Helpers ---

const adminUser = { id: "admin-001", role: "ADMIN", name: "관리자" };
const starUser = { id: "star-001", role: "STAR", name: "스타" };

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/admin/users/target-user-id/approve", {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : "invalid",
    headers: { "Content-Type": "application/json" },
  });
}

function makeParams(id = "target-user-id") {
  return { params: Promise.resolve({ id }) };
}

// --- Import ---

import { PATCH } from "@/app/api/admin/users/[id]/approve/route";

describe("PATCH /api/admin/users/[id]/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ approved: true }), makeParams());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("403 — STAR 접근 불가", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await PATCH(makeRequest({ approved: true }), makeParams());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("400 — 잘못된 JSON", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const req = new Request("http://localhost/api/admin/users/id/approve", {
      method: "PATCH",
      body: "not-json",
      headers: { "Content-Type": "text/plain" },
    });
    const res = await PATCH(req, makeParams());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("400 — approved 값 누락", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const res = await PATCH(makeRequest({ foo: "bar" }), makeParams());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("404 — 대상 사용자 없음", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindUnique.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ approved: true }), makeParams());
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("200 — 승인 성공", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindUnique.mockResolvedValue({ id: "target-user-id", isApproved: false });
    mockUserUpdate.mockResolvedValue({
      id: "target-user-id",
      name: "이몽룡",
      email: "lee@test.com",
      isApproved: true,
    });

    const res = await PATCH(makeRequest({ approved: true }), makeParams());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.id).toBe("target-user-id");
    expect(json.data.isApproved).toBe(true);
  });
});
