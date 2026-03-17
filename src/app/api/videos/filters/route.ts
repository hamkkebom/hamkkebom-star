import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VideoStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/videos/filters
 * 공개 영상 브라우저용 필터 데이터 (카테고리, 제작자, 상담사) 통합 조회
 */
export async function GET() {
  const publicFilter = { status: { in: [VideoStatus.APPROVED, VideoStatus.FINAL] } };

  const [categories, ownerRows, counselorRows] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, name: true, slug: true, _count: { select: { videos: { where: publicFilter } } } },
      orderBy: { name: "asc" },
    }),
    prisma.video.groupBy({
      by: ["ownerId"],
      where: publicFilter,
      _count: true,
    }),
    prisma.video.groupBy({
      by: ["counselorId"],
      where: { ...publicFilter, counselorId: { not: null } },
      _count: true,
    }),
  ]);

  // Resolve owner names
  const ownerIds = ownerRows.map(r => r.ownerId);
  const owners = ownerIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, name: true, chineseName: true },
      })
    : [];
  const ownerMap = new Map(owners.map(o => [o.id, o]));
  const ownersData = ownerRows
    .map(r => {
      const user = ownerMap.get(r.ownerId);
      return user ? { id: user.id, name: user.name, chineseName: user.chineseName, videoCount: r._count } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (b!.videoCount - a!.videoCount));

  // Resolve counselor names
  const counselorIds = counselorRows.filter(r => r.counselorId).map(r => r.counselorId!);
  const counselors = counselorIds.length > 0
    ? await prisma.counselor.findMany({
        where: { id: { in: counselorIds } },
        select: { id: true, displayName: true, imageUrl: true },
      })
    : [];
  const counselorMap = new Map(counselors.map(c => [c.id, c]));
  const counselorsData = counselorRows
    .filter(r => r.counselorId)
    .map(r => {
      const c = counselorMap.get(r.counselorId!);
      return c ? { id: c.id, displayName: c.displayName, imageUrl: c.imageUrl, videoCount: r._count } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (b!.videoCount - a!.videoCount));

  return NextResponse.json(
    { data: { categories, owners: ownersData, counselors: counselorsData } },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } }
  );
}
