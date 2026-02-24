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
  AssignmentStatus: {
    PENDING_APPROVAL: "PENDING_APPROVAL",
    ACCEPTED: "ACCEPTED",
    IN_PROGRESS: "IN_PROGRESS",
    SUBMITTED: "SUBMITTED",
    COMPLETED: "COMPLETED",
  },
  RequestStatus: { OPEN: "OPEN", FULL: "FULL" },
}));

// --- Helpers ---

const adminUser = { id: "admin-001", role: "ADMIN", name: "관리자" };
const starUser = { id: "star-001", role: "STAR", name: "스타" };

function makeRequest() {
  return new Request("http://localhost/api/projects/assignments/assign-001/approve", {
    method: "POST",
  });
}

function makeParams(id = "assign-001") {
  return { params: Promise.resolve({ id }) };
}

// --- Import ---

import { POST } from "@/app/api/projects/assignments/[id]/approve/route";

describe("POST /api/projects/assignments/[id]/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("403 — STAR 접근 불가 (ADMIN only)", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await POST(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("404 — 배정 없음", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockTransaction.mockRejectedValue({
      code: "NOT_FOUND",
      message: "배정을 찾을 수 없습니다.",
      status: 404,
    });

    const res = await POST(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("409 — 승인 대기 아님", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockTransaction.mockRejectedValue({
      code: "CONFLICT",
      message: "승인 대기 상태가 아닙니다.",
      status: 409,
    });

    const res = await POST(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe("CONFLICT");
  });

  it("200 — 승인 성공", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    const assignment = {
      id: "assign-001",
      starId: "star-001",
      requestId: "req-001",
      status: "ACCEPTED",
      star: { id: "star-001", name: "스타", email: "star@test.com" },
      request: { id: "req-001", title: "홍보 영상" },
    };
    mockTransaction.mockResolvedValue(assignment);

    const res = await POST(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.id).toBe("assign-001");
    expect(json.data.star.name).toBe("스타");
  });

  it("500 — 예기치 않은 에러", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockTransaction.mockRejectedValue(new Error("DB fail"));

    const res = await POST(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });
});
