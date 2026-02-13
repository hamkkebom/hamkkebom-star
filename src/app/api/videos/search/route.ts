import { NextResponse } from "next/server";
import { VideoStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// 공개 API — 인증 불필요 (APPROVED/FINAL만 검색)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));

  if (!q) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "검색어를 입력해주세요." } },
      { status: 400 }
    );
  }

  const where = {
    status: { in: [VideoStatus.APPROVED, VideoStatus.FINAL] },
    OR: [
      { title: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.video.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            chineseName: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        technicalSpec: {
          select: {
            duration: true,
          },
        },
        _count: {
          select: {
            eventLogs: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.video.count({ where }),
  ]);

  return NextResponse.json({
    data: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
