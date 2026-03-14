import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "12", 10)));

    const skip = (page - 1) * pageSize;

    const where: Prisma.CounselorWhereInput = {
      status: "ACTIVE",
    };

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: "insensitive" } },
        { hashtags: { contains: search, mode: "insensitive" } },
        { specialties: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = category;
    }

    const [counselors, total] = await Promise.all([
      prisma.counselor.findMany({
        where,
        select: {
          id: true,
          displayName: true,
          category: true,
          imageUrl: true,
          hashtags: true,
          specialties: true,
          introduction: true,
          _count: {
            select: {
              videos: {
                where: {
                  status: { in: ["APPROVED", "FINAL"] },
                },
              },
            },
          },
        },
        orderBy: {
          videos: {
            _count: "desc",
          },
        },
        skip,
        take: pageSize,
      }),
      prisma.counselor.count({ where }),
    ]);

    return NextResponse.json({
      data: counselors,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[GET /api/counselors]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "전문가 목록을 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
