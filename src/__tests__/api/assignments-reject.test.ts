import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetAuthUser = vi.fn();
vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectAssignment: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

vi.mock("@/generated/prisma/client", () => ({
  AssignmentStatus: {
    PENDING_APPROVAL: "PENDING_APPROVAL",
    REJECTED: "REJECTED",
  },
}));

// --- Helpers ---

const adminUser = { id: "admin-001", role: "ADMIN", name: "관리자" };
const starUser = { id: "star-001", role: "STAR", name: "스타" };

function makeRequest(body?: unknown) {
  if (body === undefined) {
    return new Request("http://localhost/api/projects/assignments/assign-001/reject", {
      method: "POST",
      body: "invalid-json",
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new Request("http://localhost/api/projects/assignments/assign-001/reject", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeParams(id = "assign-001") {
  return { params: Promise.resolve({ id }) };
}

// --- Import ---

import { POST } from "@/app/api/projects/assignments/[id]/reject/route";

describe("POST /api/projects/assignments/[id]/reject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(makeRequest({ rejectionReason: "사유" }), makeParams());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("403 — STAR 접근 불가 (ADMIN only)", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await POST(makeRequest({ rejectionReason: "사유" }), makeParams());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("400 — 잘못된 JSON body", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const res = await POST(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("404 — 배정 없음", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ rejectionReason: "사유" }), makeParams());
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("409 — 승인 대기 아님", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindUnique.mockResolvedValue({
      id: "assign-001",
      status: "ACCEPTED",
    });

    const res = await POST(makeRequest({ rejectionReason: "사유" }), makeParams());
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe("CONFLICT");
  });

  it("200 — 거절 성공", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindUnique.mockResolvedValue({
      id: "assign-001",
      status: "PENDING_APPROVAL",
    });
    const updated = {
      id: "assign-001",
      status: "REJECTED",
      rejectionReason: "사유",
      star: { id: "star-001", name: "스타", email: "star@test.com" },
      request: { id: "req-001", title: "홍보 영상" },
    };
    mockUpdate.mockResolvedValue(updated);

    const res = await POST(makeRequest({ rejectionReason: "사유" }), makeParams());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.id).toBe("assign-001");
    expect(json.data.status).toBe("REJECTED");
    expect(json.data.star.name).toBe("스타");
  });
});
