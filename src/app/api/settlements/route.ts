import { NextResponse } from "next/server";
import { SettlementStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

const settlementStatuses = new Set(Object.values(SettlementStatus));

export async function GET(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "ADMIN" && user.role !== "STAR") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "접근 권한이 없습니다." } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));

  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const statusParam = searchParams.get("status");

  const year = yearParam ? Number(yearParam) : undefined;
  const month = monthParam ? Number(monthParam) : undefined;

  if (year !== undefined && (!Number.isInteger(year) || year < 2020 || year > 2100)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효한 연도를 입력해주세요." } },
      { status: 400 }
    );
  }

  if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효한 월을 입력해주세요." } },
      { status: 400 }
    );
  }

  if (statusParam && statusParam !== "ALL" && !settlementStatuses.has(statusParam as SettlementStatus)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 정산 상태입니다." } },
      { status: 400 }
    );
  }

  const where = {
    ...(year !== undefined ? { year } : {}),
    ...(month !== undefined ? { month } : {}),
    ...(statusParam && statusParam !== "ALL" ? { status: statusParam as SettlementStatus } : {}),
    ...(user.role === "STAR" ? { starId: user.id } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.settlement.findMany({
      where,
      include: {
        star: {
          select: {
            id: true,
            name: true,
            chineseName: true,
            email: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.settlement.count({ where }),
  ]);

  return NextResponse.json({
    data: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
