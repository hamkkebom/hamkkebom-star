import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetAuthUser = vi.fn();
vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

const mockTransaction = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (fn: unknown) => mockTransaction(fn),
  },
}));

vi.mock("@/generated/prisma/client", () => ({
  SubmissionStatus: { PENDING: "PENDING", APPROVED: "APPROVED", REJECTED: "REJECTED" },
  AssignmentStatus: { ACCEPTED: "ACCEPTED", IN_PROGRESS: "IN_PROGRESS", COMPLETED: "COMPLETED" },
}));

// --- Helpers ---

const adminUser = { id: "admin-001", role: "ADMIN", name: "관리자" };
const starUser = { id: "star-001", role: "STAR", name: "스타" };

function makeRequest() {
  return new Request("http://localhost/api/submissions/sub-001/approve", {
    method: "PATCH",
  });
}

function makeParams(id = "sub-001") {
  return { params: Promise.resolve({ id }) };
}

// --- Import ---

import { PATCH } from "@/app/api/submissions/[id]/approve/route";

describe("PATCH /api/submissions/[id]/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await PATCH(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("403 — STAR 접근 불가 (ADMIN만 승인 가능)", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await PATCH(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("404 — 제출물 없음 (트랜잭션 throw)", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockTransaction.mockRejectedValue({
      code: "NOT_FOUND",
      message: "제출물을 찾을 수 없습니다.",
      status: 404,
    });

    const res = await PATCH(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("200 — 승인 성공", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    const updated = {
      id: "sub-001",
      status: "APPROVED",
      reviewerId: "admin-001",
      approvedAt: new Date().toISOString(),
      star: { id: "star-001", name: "스타", email: "star@test.com" },
    };
    mockTransaction.mockResolvedValue(updated);

    const res = await PATCH(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe("APPROVED");
    expect(json.data.star.name).toBe("스타");
  });

  it("500 — 예기치 않은 에러", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockTransaction.mockRejectedValue(new Error("DB error"));

    const res = await PATCH(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });
});
