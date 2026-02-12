import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetAuthUser = vi.fn();
vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

const mockTransaction = vi.fn();
const mockFindMany = vi.fn();
const mockCount = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (fn: unknown) => mockTransaction(fn),
    submission: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

vi.mock("@/generated/prisma/client", () => ({
  AssignmentStatus: { ACCEPTED: "ACCEPTED", IN_PROGRESS: "IN_PROGRESS", COMPLETED: "COMPLETED" },
  SubmissionStatus: { PENDING: "PENDING", APPROVED: "APPROVED", REJECTED: "REJECTED" },
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(message: string, opts: { code: string }) {
        super(message);
        this.code = opts.code;
      }
    },
  },
}));

vi.mock("@/lib/validations/submission", async () => {
  const { z } = await import("zod");
  return {
    createSubmissionSchema: z.object({
      assignmentId: z.string().min(1, "배정 ID를 입력해주세요."),
      versionSlot: z.number().int().min(1).max(5),
      versionTitle: z.string().trim().optional(),
      description: z.string().trim().max(2000).optional(),
      streamUid: z.string().min(1, "Stream UID를 입력해주세요."),
    }),
  };
});

// --- Helpers ---

const adminUser = { id: "admin-001", role: "ADMIN", name: "관리자" };
const starUser = { id: "star-001", role: "STAR", name: "스타" };

const validSubmission = {
  assignmentId: "assign-001",
  versionSlot: 1,
  versionTitle: "메인 영상 v1",
  streamUid: "stream-uid-123",
};

function makePostRequest(body?: unknown) {
  return new Request("http://localhost/api/submissions", {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : "invalid",
    headers: { "Content-Type": "application/json" },
  });
}

function makeGetRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/submissions");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new Request(url.toString());
}

// --- Import ---

import { POST, GET } from "@/app/api/submissions/route";

describe("POST /api/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(makePostRequest(validSubmission));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("403 — ADMIN 접근 불가 (STAR만 제출 가능)", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const res = await POST(makePostRequest(validSubmission));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("400 — 잘못된 JSON", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const req = new Request("http://localhost/api/submissions", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "text/plain" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("400 — Zod 검증 실패 (assignmentId 누락)", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await POST(makePostRequest({ versionSlot: 1, streamUid: "abc" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("404 — 배정 정보 없음 (트랜잭션 throw)", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    mockTransaction.mockRejectedValue({
      code: "NOT_FOUND",
      message: "배정 정보를 찾을 수 없습니다.",
      status: 404,
    });

    const res = await POST(makePostRequest(validSubmission));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("201 — 제출 성공", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    const created = {
      id: "sub-001",
      assignmentId: "assign-001",
      versionSlot: 1,
      version: "1.0",
      versionTitle: "메인 영상 v1",
      streamUid: "stream-uid-123",
      starId: "star-001",
      status: "PENDING",
    };
    mockTransaction.mockResolvedValue(created);

    const res = await POST(makePostRequest(validSubmission));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.id).toBe("sub-001");
    expect(json.data.version).toBe("1.0");
  });
});

describe("GET /api/submissions", () => {
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

  it("403 — STAR 접근 불가 (ADMIN only)", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("200 — ADMIN 성공 (페이지네이션)", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindMany.mockResolvedValue([
      { id: "sub-001", versionSlot: 1, version: "1.0", status: "PENDING" },
    ]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeGetRequest({ page: "1", pageSize: "10" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.total).toBe(1);
    expect(json.page).toBe(1);
  });

  it("400 — 유효하지 않은 상태값", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const res = await GET(makeGetRequest({ status: "INVALID_STATUS" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });
});
