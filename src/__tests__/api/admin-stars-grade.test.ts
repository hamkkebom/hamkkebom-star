import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetAuthUser = vi.fn();
vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

const mockUserUpdate = vi.fn();
const mockGradeFindUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    pricingGrade: {
      findUnique: (...args: unknown[]) => mockGradeFindUnique(...args),
    },
    projectAssignment: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    settlement: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// --- Helpers ---

const adminUser = { id: "admin-001", role: "ADMIN", name: "관리자" };

function makeRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/admin/stars/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Import ---

import { PATCH } from "@/app/api/admin/stars/[id]/route";

// --- Tests ---

describe("PATCH /api/admin/stars/[id] — grade assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("200 — gradeId 설정 시 baseRate 자동 동기화", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockGradeFindUnique.mockResolvedValue({ id: "grade-1", name: "S등급", baseRate: 120000 });
    mockUserUpdate.mockResolvedValue({
      id: "star-1",
      email: "star@test.com",
      name: "홍길동",
      phone: null,
      baseRate: 120000,
      gradeId: "grade-1",
      updatedAt: new Date(),
    });

    const res = await PATCH(
      makeRequest("star-1", { gradeId: "grade-1" }),
      { params: Promise.resolve({ id: "star-1" }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.gradeId).toBe("grade-1");
    expect(json.data.baseRate).toBe(120000);
  });

  it("200 — gradeId null로 미배정 이동 시 baseRate 유지", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockUserUpdate.mockResolvedValue({
      id: "star-1",
      email: "star@test.com",
      name: "홍길동",
      phone: null,
      baseRate: 120000,
      gradeId: null,
      updatedAt: new Date(),
    });

    const res = await PATCH(
      makeRequest("star-1", { gradeId: null }),
      { params: Promise.resolve({ id: "star-1" }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.gradeId).toBeNull();
    expect(json.data.baseRate).toBe(120000);
  });

  it("404 — 존재하지 않는 gradeId", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockGradeFindUnique.mockResolvedValue(null);

    const res = await PATCH(
      makeRequest("star-1", { gradeId: "nonexistent" }),
      { params: Promise.resolve({ id: "star-1" }) }
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(json.error.message).toBe("등급을 찾을 수 없습니다.");
  });
});
