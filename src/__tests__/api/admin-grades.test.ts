import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetAuthUser = vi.fn();
vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const _mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockAggregate = vi.fn();
const mockUpdateMany = vi.fn();
const mockTransaction = vi.fn();
const mockUserFindMany = vi.fn();
const mockGradeUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pricingGrade: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockGradeUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      aggregate: (...args: unknown[]) => mockAggregate(...args),
    },
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// --- Helpers ---

const adminUser = { id: "admin-001", role: "ADMIN", name: "관리자" };
const starUser = { id: "star-001", role: "STAR", name: "스타" };

const mockGrades = [
  { id: "grade-1", name: "S등급", baseRate: 150000, color: "amber", sortOrder: 0, users: [] },
  { id: "grade-2", name: "A등급", baseRate: 100000, color: "emerald", sortOrder: 1, users: [{ id: "star-1", name: "홍길동" }] },
];

const mockUnassigned = [
  { id: "star-2", name: "이몽룡", chineseName: null, avatarUrl: null, baseRate: null, isApproved: true, _count: { assignments: 0, submissions: 0, videos: 0 } },
];

function makeRequest(method = "GET", body?: unknown) {
  const url = "http://localhost/api/admin/grades";
  const init: RequestInit = { method };
  if (body) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

function makeIdRequest(id: string, method = "PATCH", body?: unknown) {
  const url = `http://localhost/api/admin/grades/${id}`;
  const init: RequestInit = { method };
  if (body) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

function makeReorderRequest(body?: unknown) {
  const url = "http://localhost/api/admin/grades/reorder";
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Imports ---

import { GET, POST } from "@/app/api/admin/grades/route";
import { PATCH, DELETE } from "@/app/api/admin/grades/[id]/route";
import { POST as REORDER } from "@/app/api/admin/grades/reorder/route";

// --- Tests ---

describe("GET /api/admin/grades", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("403 — STAR 접근 불가", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("200 — 등급 목록 + 미배정 STAR 반환", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindMany.mockResolvedValue(mockGrades);
    mockUserFindMany.mockResolvedValue(mockUnassigned);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.grades).toHaveLength(2);
    expect(json.data.unassigned).toHaveLength(1);
    expect(json.data.grades[0].name).toBe("S등급");
  });
});

describe("POST /api/admin/grades", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(makeRequest("POST", { name: "S등급", baseRate: 150000, color: "amber" }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("400 — 잘못된 JSON", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const res = await POST(new Request("http://localhost/api/admin/grades", {
      method: "POST",
      body: "invalid json",
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("400 — Zod 검증 실패 (이름 누락)", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const res = await POST(makeRequest("POST", { baseRate: 150000, color: "amber" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("201 — 등급 생성 성공", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockAggregate.mockResolvedValue({ _max: { sortOrder: 1 } });
    mockCreate.mockResolvedValue({
      id: "grade-new",
      name: "S등급",
      baseRate: 150000,
      color: "amber",
      sortOrder: 2,
    });

    const res = await POST(makeRequest("POST", { name: "S등급", baseRate: 150000, color: "amber" }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.name).toBe("S등급");
    expect(json.data.baseRate).toBe(150000);
  });

  it("409 — 중복 등급 이름", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockAggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
    const error = new Error("Unique constraint failed");
    Object.assign(error, { code: "P2002" });
    mockCreate.mockRejectedValue(error);

    const res = await POST(makeRequest("POST", { name: "S등급", baseRate: 150000, color: "amber" }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe("CONFLICT");
    expect(json.error.message).toBe("이미 존재하는 등급 이름입니다.");
  });
});

describe("PATCH /api/admin/grades/[id]", () => {
  const params = Promise.resolve({ id: "grade-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await PATCH(makeIdRequest("grade-1", "PATCH", { name: "변경" }), { params });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("404 — 존재하지 않는 등급", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindUnique.mockResolvedValue(null);

    const res = await PATCH(makeIdRequest("grade-999", "PATCH", { name: "변경" }), { params: Promise.resolve({ id: "grade-999" }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("200 — 등급 수정 (baseRate 변경 시 $transaction 호출)", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindUnique.mockResolvedValue({ id: "grade-1", name: "S등급", baseRate: 150000 });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        pricingGrade: { update: vi.fn().mockResolvedValue({ id: "grade-1", name: "S등급", baseRate: 200000, color: "amber" }) },
        user: { updateMany: vi.fn().mockResolvedValue({ count: 3 }) },
      };
      return fn(tx);
    });

    const res = await PATCH(makeIdRequest("grade-1", "PATCH", { baseRate: 200000 }), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.baseRate).toBe(200000);
    expect(mockTransaction).toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/grades/[id]", () => {
  const params = Promise.resolve({ id: "grade-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await DELETE(makeIdRequest("grade-1", "DELETE"), { params });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("404 — 존재하지 않는 등급", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindUnique.mockResolvedValue(null);

    const res = await DELETE(makeIdRequest("grade-999", "DELETE"), { params: Promise.resolve({ id: "grade-999" }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("200 — 등급 삭제 성공", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockFindUnique.mockResolvedValue({ id: "grade-1", name: "S등급", _count: { users: 2 } });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        user: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
        pricingGrade: { delete: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const res = await DELETE(makeIdRequest("grade-1", "DELETE"), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.deleted).toBe(true);
    expect(json.data.affectedStars).toBe(2);
  });
});

describe("POST /api/admin/grades/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await REORDER(makeReorderRequest([{ id: "grade-1", sortOrder: 0 }]));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("400 — 잘못된 형식", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const res = await REORDER(makeReorderRequest({ invalid: true }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("200 — 순서 변경 성공", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockTransaction.mockResolvedValue([{}, {}]);

    const res = await REORDER(makeReorderRequest([
      { id: "grade-1", sortOrder: 1 },
      { id: "grade-2", sortOrder: 0 },
    ]));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.reordered).toBe(2);
  });
});
