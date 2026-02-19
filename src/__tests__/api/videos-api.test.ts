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
    video: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

vi.mock("@/generated/prisma/client", () => ({
  VideoStatus: {
    PENDING: "PENDING",
    PROCESSING: "PROCESSING",
    APPROVED: "APPROVED",
    FINAL: "FINAL",
    ARCHIVED: "ARCHIVED",
  },
  VideoSubject: {
    COUNSELOR: "COUNSELOR",
    BRAND: "BRAND",
    OTHER: "OTHER",
  },
}));

// --- Helpers ---

const adminUser = { id: "admin-001", role: "ADMIN", name: "관리자" };

const mockVideos = [
  {
    id: "vid-001",
    title: "홍보 영상",
    status: "APPROVED",
    owner: { id: "star-001", name: "스타", email: "star@test.com" },
    category: { id: "cat-001", name: "홍보", slug: "promo" },
    technicalSpec: { duration: 120 },
    _count: { eventLogs: 3 },
  },
];

function makeRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/videos");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new Request(url.toString());
}

// --- Import ---

import { GET } from "@/app/api/videos/route";

describe("GET /api/videos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("200 — 비인증 사용자도 공개 영상 조회 가능", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("Not authenticated"));
    mockFindMany.mockResolvedValue(mockVideos);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe("홍보 영상");
  });

  it("200 — ADMIN 상태 필터 사용 가능", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const res = await GET(makeRequest({ status: "PENDING" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(0);
  });

  it("400 — 유효하지 않은 정렬 값", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("Not authenticated"));

    const res = await GET(makeRequest({ sort: "random" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("400 — 유효하지 않은 상태값", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("Not authenticated"));

    const res = await GET(makeRequest({ status: "INVALID" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("200 — 페이지네이션 정보 포함", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("Not authenticated"));
    mockFindMany.mockResolvedValue(mockVideos);
    mockCount.mockResolvedValue(50);

    const res = await GET(makeRequest({ page: "2", pageSize: "10" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.page).toBe(2);
    expect(json.pageSize).toBe(10);
    expect(json.total).toBe(50);
    expect(json.totalPages).toBe(5);
  });
});
