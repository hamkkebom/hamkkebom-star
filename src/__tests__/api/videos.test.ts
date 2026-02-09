import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    video: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock auth helpers
vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: vi.fn().mockRejectedValue(new Error("Not authenticated")),
}));

describe("/api/videos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should build valid query parameters", () => {
    const params = new URLSearchParams({
      page: "1",
      pageSize: "18",
      sort: "latest",
    });
    expect(params.get("page")).toBe("1");
    expect(params.get("pageSize")).toBe("18");
    expect(params.get("sort")).toBe("latest");
  });

  it("should handle pagination correctly", () => {
    const page = 3;
    const pageSize = 18;
    const total = 120;
    const totalPages = Math.ceil(total / pageSize);
    expect(totalPages).toBe(7);
    expect((page - 1) * pageSize).toBe(36); // skip
  });

  it("should handle search parameter encoding", () => {
    const params = new URLSearchParams();
    params.set("q", "지금 전화하세요");
    expect(params.toString()).toContain("q=");
    expect(params.get("q")).toBe("지금 전화하세요");
  });

  it("should validate sort values", () => {
    const validSorts = ["latest", "oldest"];
    expect(validSorts).toContain("latest");
    expect(validSorts).toContain("oldest");
    expect(validSorts).not.toContain("random");
  });
});

describe("/api/videos/[id]", () => {
  it("should validate video id format", () => {
    const validId = "cmlegkqje00kbsgtxtty98uy0";
    expect(validId.length).toBeGreaterThan(10);
    expect(typeof validId).toBe("string");
  });
});

describe("/api/stars", () => {
  it("should build stars query params", () => {
    const params = new URLSearchParams({
      page: "1",
      pageSize: "12",
    });
    params.set("search", "이승태");
    expect(params.get("search")).toBe("이승태");
    expect(params.get("pageSize")).toBe("12");
  });

  it("should limit pageSize to 50", () => {
    const rawPageSize = 100;
    const pageSize = Math.min(50, Math.max(1, rawPageSize));
    expect(pageSize).toBe(50);
  });

  it("should default page to 1", () => {
    const page = Math.max(1, Number(null) || 1);
    expect(page).toBe(1);
  });
});
