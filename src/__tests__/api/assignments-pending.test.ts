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
    projectAssignment: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

vi.mock("@/generated/prisma/client", () => ({
  AssignmentStatus: {
    PENDING_APPROVAL: "PENDING_APPROVAL",
    ACCEPTED: "ACCEPTED",
    IN_PROGRESS: "IN_PROGRESS",
    SUBMITTED: "SUBMITTED",
    COMPLETED: "COMPLETED",
  },
}));

// --- Helpers ---

const adminUser = { id: "admin-001", role: "ADMIN", name: "관리자" };
const starUser = { id: "star-001", role: "STAR", name: "스타" };

function makeRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/projects/assignments/pending");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new Request(url.toString());
}

// --- Import ---

import { GET } from "@/app/api/projects/assignments/pending/route";

describe("GET /api/projects/assignments/pending", () => {
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

  it("403 — STAR 접근 불가 (ADMIN only)", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("200 — 빈 목록", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(0);
    expect(json.total).toBe(0);
    expect(json.totalPages).toBe(1);
  });

  it("200 — 대기 목록 (페이지네이션)", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    const pendingItem = {
      id: "assign-001",
      status: "PENDING_APPROVAL",
      starId: "star-001",
      requestId: "req-001",
      star: { id: "star-001", name: "스타", chineseName: null, email: "star@test.com", avatarUrl: null },
      request: { id: "req-001", title: "홍보 영상", deadline: null, maxAssignees: 3, categories: [], status: "OPEN", _count: { assignments: 1 } },
    };
    mockFindMany.mockResolvedValue([pendingItem]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest({ page: "1", pageSize: "10" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe("assign-001");
    expect(json.total).toBe(1);
    expect(json.page).toBe(1);
    expect(json.pageSize).toBe(10);
  });
});
