import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // 1. 인증
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  // 2. 권한 (ADMIN only)
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 }
    );
  }

  // 3. 쿼리 파라미터 파싱
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));
  const action = searchParams.get("action")?.trim();
  const entityType = searchParams.get("entityType")?.trim();
  const actorId = searchParams.get("actorId")?.trim();
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const search = searchParams.get("search")?.trim();

  // 4. 날짜 검증
  if (startDateParam && isNaN(new Date(startDateParam).getTime())) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효한 시작 날짜를 입력해주세요." } },
      { status: 400 }
    );
  }

  if (endDateParam && isNaN(new Date(endDateParam).getTime())) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효한 종료 날짜를 입력해주세요." } },
      { status: 400 }
    );
  }

  // 5. where 절 구성
  const where: Record<string, unknown> = {};

  if (action) {
    where.action = action;
  }

  if (entityType) {
    where.entityType = entityType;
  }

  if (actorId) {
    where.actorId = actorId;
  }

  if (startDateParam) {
    where.createdAt = {
      ...(where.createdAt as Record<string, unknown> || {}),
      gte: new Date(startDateParam + "T00:00:00.000Z"),
    };
  }

  if (endDateParam) {
    where.createdAt = {
      ...(where.createdAt as Record<string, unknown> || {}),
      lte: new Date(endDateParam + "T23:59:59.999Z"),
    };
  }

  if (search) {
    where.actor = {
      name: { contains: search, mode: "insensitive" },
    };
  }

  // 6. 페이지네이션 계산
  const skip = (page - 1) * pageSize;

  // 7. DB 조회
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // 8. 응답
  return NextResponse.json({
    data: items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
