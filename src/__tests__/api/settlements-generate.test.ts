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
  SettlementStatus: { PENDING: "PENDING", COMPLETED: "COMPLETED" },
  SubmissionStatus: { PENDING: "PENDING", APPROVED: "APPROVED", REJECTED: "REJECTED" },
  Prisma: {
    Decimal: class {
      value: number;
      constructor(v: number) { this.value = v; }
    },
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(message: string, opts: { code: string }) {
        super(message);
        this.code = opts.code;
      }
    },
  },
}));

vi.mock("@/lib/validations/settlement", async () => {
  const { z } = await import("zod");
  return {
    generateSettlementSchema: z.object({
      year: z.number().int().min(2020).max(2100),
      month: z.number().int().min(1).max(12),
    }),
  };
});

// --- Helpers ---

const adminUser = { id: "admin-001", role: "ADMIN", name: "관리자" };
const starUser = { id: "star-001", role: "STAR", name: "스타" };

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/settlements/generate", {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : "invalid",
    headers: { "Content-Type": "application/json" },
  });
}

// --- Import ---

import { POST } from "@/app/api/settlements/generate/route";

describe("POST /api/settlements/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(makeRequest({ year: 2026, month: 1 }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("403 — STAR 접근 불가", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await POST(makeRequest({ year: 2026, month: 1 }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("400 — 잘못된 JSON", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const req = new Request("http://localhost/api/settlements/generate", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "text/plain" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("400 — Zod 검증 실패 (월 범위 초과)", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const res = await POST(makeRequest({ year: 2026, month: 13 }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("409 — 이미 존재하는 정산", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockTransaction.mockRejectedValue({
      code: "ALREADY_GENERATED",
      message: "해당 연월의 정산이 이미 존재합니다.",
      status: 409,
    });

    const res = await POST(makeRequest({ year: 2026, month: 1 }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe("ALREADY_GENERATED");
  });

  it("201 — 정산 생성 성공", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    const settlements = [
      {
        id: "settle-001",
        starId: "star-001",
        year: 2026,
        month: 1,
        status: "PENDING",
        totalAmount: 300000,
        itemCount: 3,
      },
    ];
    mockTransaction.mockResolvedValue(settlements);

    const res = await POST(makeRequest({ year: 2026, month: 1 }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].totalAmount).toBe(300000);
    expect(json.data[0].itemCount).toBe(3);
  });

  it("500 — 예기치 않은 에러", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockTransaction.mockRejectedValue(new Error("Unknown error"));

    const res = await POST(makeRequest({ year: 2026, month: 1 }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });
});
