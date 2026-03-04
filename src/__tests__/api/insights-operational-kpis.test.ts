import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockProjectRequestCount = vi.fn();
const mockSubmissionCount = vi.fn();
const mockFeedbackFindMany = vi.fn();
const mockUserCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectRequest: {
      count: (...args: unknown[]) => mockProjectRequestCount(...args),
    },
    submission: {
      count: (...args: unknown[]) => mockSubmissionCount(...args),
    },
    feedback: {
      findMany: (...args: unknown[]) => mockFeedbackFindMany(...args),
    },
    user: {
      count: (...args: unknown[]) => mockUserCount(...args),
    },
  },
}));

// --- Helpers ---

function makeRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/admin/insights/operational/kpis");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new Request(url.toString());
}

// --- Import ---

import { GET } from "@/app/api/admin/insights/operational/kpis/route";

describe("GET /api/admin/insights/operational/kpis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("200 — 파라미터 없음 (기본값)", async () => {
    mockProjectRequestCount.mockResolvedValue(0);
    mockSubmissionCount.mockResolvedValue(0);
    mockFeedbackFindMany.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(0);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(4);
  });

  it("200 — 유효한 from/to 파라미터", async () => {
    mockProjectRequestCount.mockResolvedValue(0);
    mockSubmissionCount.mockResolvedValue(0);
    mockFeedbackFindMany.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(0);

    const res = await GET(
      makeRequest({
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-02-28T23:59:59.999Z",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(4);
  });

  it("400 — 유효하지 않은 from 파라미터", async () => {
    const res = await GET(makeRequest({ from: "invalid" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("400 — from이 to보다 큰 경우", async () => {
    const res = await GET(
      makeRequest({
        from: "2026-03-01T00:00:00.000Z",
        to: "2026-01-01T00:00:00.000Z",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("활동 STAR — submissions 기반 쿼리 사용 확인", async () => {
    mockProjectRequestCount.mockResolvedValue(0);
    mockSubmissionCount.mockResolvedValue(0);
    mockFeedbackFindMany.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(3);

    await GET(makeRequest());

    const calls = mockUserCount.mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    const firstCallArg = calls[0]?.[0] as {
      where?: { submissions?: unknown; feedbacks?: unknown };
    };
    expect(firstCallArg?.where).toHaveProperty("submissions");
    expect(firstCallArg?.where).not.toHaveProperty("feedbacks");
  });

  it("라벨 — 피드백 응답 시간 포함, 평균 소요 시간 미포함", async () => {
    mockProjectRequestCount.mockResolvedValue(0);
    mockSubmissionCount.mockResolvedValue(0);
    mockFeedbackFindMany.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(0);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);

    const titles = json.map((item: { title: string }) => item.title);
    expect(titles).toContain("피드백 응답 시간");
    expect(titles).not.toContain("평균 소요 시간");
  });
});
