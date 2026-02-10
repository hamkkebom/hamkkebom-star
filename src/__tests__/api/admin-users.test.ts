import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetAuthUser = vi.fn();
vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

const mockFindMany = vi.fn();
const mockCount = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

// --- Helpers ---

const adminUser = { id: "admin-001", role: "ADMIN", name: "관리자" };
const starUser = { id: "star-001", role: "STAR", name: "스타" };

const mockUsers = [
  { id: "u1", email: "a@test.com", name: "홍길동", role: "STAR", isApproved: true, createdAt: new Date() },
  { id: "u2", email: "b@test.com", name: "이몽룡", role: "STAR", isApproved: false, createdAt: new Date() },
];

function makeRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/admin/users");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new Request(url.toString());
}

// --- Import ---

import { GET } from "@/app/api/admin/users/route";

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("403 — STAR 접근 불가", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("200 — ADMIN 성공 (페이지네이션)", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindMany.mockResolvedValue(mockUsers);
    mockCount.mockResolvedValue(2);

    const res = await GET(makeRequest({ page: "1", pageSize: "10" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.total).toBe(2);
    expect(json.page).toBe(1);
    expect(json.totalPages).toBe(1);
  });

  it("200 — 검색 필터 전달 확인", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindMany.mockResolvedValue([mockUsers[0]]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest({ search: "홍길동" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
  });

  it("200 — approved 필터 전달 확인", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindMany.mockResolvedValue([mockUsers[1]]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest({ approved: "false" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
  });
});
