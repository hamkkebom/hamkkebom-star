import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetAuthUser = vi.fn();
vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

const mockFeedbackCount = vi.fn();
const mockSubmissionCount = vi.fn();
const mockSettlementCount = vi.fn();
const mockProjectAssignmentCount = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    feedback: {
      count: (...args: unknown[]) => mockFeedbackCount(...args),
    },
    submission: {
      count: (...args: unknown[]) => mockSubmissionCount(...args),
    },
    settlement: {
      count: (...args: unknown[]) => mockSettlementCount(...args),
    },
    projectAssignment: {
      count: (...args: unknown[]) => mockProjectAssignmentCount(...args),
    },
  },
}));

vi.mock("@/generated/prisma/client", () => ({
  FeedbackStatus: { PENDING: "PENDING", RESOLVED: "RESOLVED", WONTFIX: "WONTFIX" },
  SubmissionStatus: { PENDING: "PENDING", APPROVED: "APPROVED", REJECTED: "REJECTED" },
  SettlementStatus: { PENDING: "PENDING", COMPLETED: "COMPLETED" },
  AssignmentStatus: { PENDING_APPROVAL: "PENDING_APPROVAL" },
}));

// --- Helpers ---

const adminUser = { id: "admin-001", role: "ADMIN", name: "관리자" };
const starUser = { id: "star-001", role: "STAR", name: "스타" };

// --- Import ---

import { GET } from "@/app/api/notifications/badge/route";

describe("GET /api/notifications/badge", () => {
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

  it("200 — STAR 뱃지 (미읽은 피드백 수)", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    mockFeedbackCount.mockResolvedValue(5);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.unreadFeedbacks).toBe(5);
  });

  it("200 — ADMIN 뱃지 (미리뷰 제출물 + 대기 정산 + 승인 대기)", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockSubmissionCount.mockResolvedValue(3);
    mockSettlementCount.mockResolvedValue(2);
    mockProjectAssignmentCount.mockResolvedValue(1);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.unreviewedSubmissions).toBe(3);
    expect(json.data.pendingSettlements).toBe(2);
    expect(json.data.pendingApprovals).toBe(1);
  });

  it("403 — 알 수 없는 role", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "user-001", role: "UNKNOWN", name: "알수없음" });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });
});
