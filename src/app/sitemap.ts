import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://hamkkebom.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 정적 공개 페이지
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/videos`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/explore`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/best`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/categories`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/counselors`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/community`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/showcase`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/recruit`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/announcements`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${BASE_URL}/faq`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/guide`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/help`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/updates`, changeFrequency: "weekly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.1 },
  ];

  // 동적 공개 페이지 — DB 에서 조회
  const [videos, categories, posts, counselors] = await Promise.all([
    prisma.video.findMany({
      where: { status: "FINAL" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({
      select: { slug: true },
    }),
    prisma.boardPost.findMany({
      where: { isHidden: false },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.counselor.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    }),
  ]);

  const videoPages: MetadataRoute.Sitemap = videos.map((v) => ({
    url: `${BASE_URL}/videos/${v.id}`,
    lastModified: v.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE_URL}/categories/${c.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const communityPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE_URL}/community/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  const counselorPages: MetadataRoute.Sitemap = counselors.map((c) => ({
    url: `${BASE_URL}/counselors/${c.id}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [
    ...staticPages,
    ...videoPages,
    ...categoryPages,
    ...communityPages,
    ...counselorPages,
  ];
}
