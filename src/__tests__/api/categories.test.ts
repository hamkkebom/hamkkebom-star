import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

// --- Helpers ---

const mockCategories = [
  { id: "cat-001", name: "광고", slug: "ad", icon: "📺", _count: { videos: 12 } },
  { id: "cat-002", name: "다큐멘터리", slug: "documentary", icon: "🎬", _count: { videos: 5 } },
  { id: "cat-003", name: "홍보", slug: "promo", icon: "📢", _count: { videos: 8 } },
];

// --- Import ---

import { GET } from "@/app/api/categories/route";

describe("GET /api/categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("200 — 카테고리 목록 반환", async () => {
    mockFindMany.mockResolvedValue(mockCategories);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(3);
    expect(json.data[0].name).toBe("광고");
    expect(json.data[2].slug).toBe("promo");
  });

  it("200 — 빈 카테고리 목록", async () => {
    mockFindMany.mockResolvedValue([]);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(0);
  });

  it("200 — _count.videos 포함", async () => {
    mockFindMany.mockResolvedValue(mockCategories);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data[0]._count.videos).toBe(12);
  });
});
