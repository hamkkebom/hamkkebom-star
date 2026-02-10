import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetAuthUser = vi.fn();
vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

const mockCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectRequest: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

vi.mock("@/lib/validations/project-request", async () => {
  const { z } = await import("zod");
  return {
    createRequestSchema: z.object({
      title: z.string().trim().min(2, "제목은 2자 이상이어야 합니다."),
      categories: z.array(z.string().trim().min(1)).min(1, "카테고리를 1개 이상 입력해주세요."),
      deadline: z.string().min(1, "마감일을 입력해주세요."),
      assignmentType: z.enum(["SINGLE", "MULTIPLE"]),
      maxAssignees: z.number().int().min(1).max(10),
      estimatedBudget: z.number().nonnegative().optional(),
      requirements: z.string().trim().optional(),
      referenceUrls: z.array(z.string().url()).optional(),
    }),
  };
});

// --- Helpers ---

const adminUser = { id: "admin-001", role: "ADMIN", name: "관리자" };
const starUser = { id: "star-001", role: "STAR", name: "스타" };

const validBody = {
  title: "홍보 영상 제작",
  categories: ["홍보"],
  deadline: "2026-03-01",
  assignmentType: "SINGLE" as const,
  maxAssignees: 1,
  estimatedBudget: 500000,
};

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/projects/requests", {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : "invalid",
    headers: { "Content-Type": "application/json" },
  });
}

// --- Import ---

import { POST } from "@/app/api/projects/requests/route";

describe("POST /api/projects/requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("403 — STAR 접근 불가", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("400 — 잘못된 JSON", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const req = new Request("http://localhost/api/projects/requests", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "text/plain" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("400 — Zod 검증 실패 (제목 누락)", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const res = await POST(makeRequest({ categories: ["홍보"], deadline: "2026-03-01", assignmentType: "SINGLE", maxAssignees: 1 }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("201 — 성공 생성", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockCreate.mockResolvedValue({
      id: "req-001",
      title: "홍보 영상 제작",
      categories: ["홍보"],
      status: "OPEN",
      _count: { assignments: 0 },
      createdBy: { id: "admin-001", name: "관리자", email: "admin@test.com" },
    });

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.title).toBe("홍보 영상 제작");
    expect(json.data.currentAssignees).toBe(0);
  });
});
