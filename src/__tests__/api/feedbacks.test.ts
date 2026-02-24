import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetAuthUser = vi.fn();
vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

const mockSubmissionFindUnique = vi.fn();
const mockSubmissionUpdate = vi.fn();
const mockFeedbackCreate = vi.fn();
const mockFeedbackFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        submission: {
          findUnique: (...args: unknown[]) => mockSubmissionFindUnique(...args),
          update: (...args: unknown[]) => mockSubmissionUpdate(...args),
        },
        feedback: {
          create: (...args: unknown[]) => mockFeedbackCreate(...args),
        },
      }),
    submission: {
      findUnique: (...args: unknown[]) => mockSubmissionFindUnique(...args),
    },
    feedback: {
      create: (...args: unknown[]) => mockFeedbackCreate(...args),
      findMany: (...args: unknown[]) => mockFeedbackFindMany(...args),
    },
  },
}));

vi.mock("@/generated/prisma/client", () => ({
  Prisma: { JsonNull: "DbNull" },
}));

vi.mock("@/lib/validations/feedback", async () => {
  const { z } = await import("zod");
  return {
    createFeedbackSchema: z.object({
      submissionId: z.string().min(1, "제출물 ID를 입력해주세요."),
      type: z.enum(["SUBTITLE", "BGM", "CUT_EDIT", "COLOR_GRADE", "GENERAL"]).default("GENERAL"),
      priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
      content: z.string().trim().min(1, "피드백 내용을 입력해주세요."),
      startTime: z.number().nonnegative().optional(),
      endTime: z.number().nonnegative().optional(),
      annotation: z.any().optional(),
    }),
  };
});

// --- Helpers ---

const adminUser = { id: "admin-001", role: "ADMIN", name: "관리자" };
const starUser = { id: "star-001", role: "STAR", name: "스타" };

const validFeedback = {
  submissionId: "sub-001",
  type: "GENERAL",
  priority: "NORMAL",
  content: "자막 수정 필요합니다. 00:30 부분 확인 부탁드립니다.",
};

function makePostRequest(body?: unknown) {
  return new Request("http://localhost/api/feedbacks", {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : "invalid",
    headers: { "Content-Type": "application/json" },
  });
}

function makeGetRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/feedbacks");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new Request(url.toString());
}

// --- Import ---

import { POST, GET } from "@/app/api/feedbacks/route";

describe("POST /api/feedbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(makePostRequest(validFeedback));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("403 — STAR 접근 불가 (ADMIN만 작성 가능)", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await POST(makePostRequest(validFeedback));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("400 — 잘못된 JSON", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const req = new Request("http://localhost/api/feedbacks", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "text/plain" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("400 — Zod 검증 실패 (content 비어있음)", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const res = await POST(makePostRequest({ submissionId: "sub-001", content: "" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("404 — 제출물 없음", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockSubmissionFindUnique.mockResolvedValue(null);

    const res = await POST(makePostRequest(validFeedback));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("201 — 피드백 생성 성공", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockSubmissionFindUnique.mockResolvedValue({ id: "sub-001" });
    mockFeedbackCreate.mockResolvedValue({
      id: "fb-001",
      submissionId: "sub-001",
      type: "GENERAL",
      priority: "NORMAL",
      content: "자막 수정 필요합니다.",
      author: { id: "admin-001", name: "관리자", email: "admin@test.com", avatarUrl: null },
    });

    const res = await POST(makePostRequest(validFeedback));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.id).toBe("fb-001");
    expect(json.data.author.name).toBe("관리자");
  });
});

describe("GET /api/feedbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("400 — submissionId 누락", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("403 — STAR가 타인 제출물 피드백 조회", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    mockSubmissionFindUnique.mockResolvedValue({ starId: "other-star-999" });

    const res = await GET(makeGetRequest({ submissionId: "sub-001" }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("200 — ADMIN 성공", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFeedbackFindMany.mockResolvedValue([
      { id: "fb-001", content: "수정 필요", author: { id: "admin-001", name: "관리자" } },
    ]);

    const res = await GET(makeGetRequest({ submissionId: "sub-001" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].content).toBe("수정 필요");
  });

  it("200 — STAR 본인 제출물 피드백 조회", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    mockSubmissionFindUnique.mockResolvedValue({ starId: "star-001" });
    mockFeedbackFindMany.mockResolvedValue([
      { id: "fb-001", content: "자막 확인", author: { id: "admin-001", name: "관리자" } },
    ]);

    const res = await GET(makeGetRequest({ submissionId: "sub-001" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
  });
});
