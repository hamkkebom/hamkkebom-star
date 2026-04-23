import { NextResponse } from "next/server";
import { SettlementStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { maskIdNumber } from "@/lib/settlement-utils";
export const dynamic = "force-dynamic";

const settlementStatuses = new Set(Object.values(SettlementStatus));
const VALID_SCOPES = new Set(["active", "archive", "all"]);

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
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));

  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const statusParam = searchParams.get("status");
  const scopeParam = (searchParams.get("scope") ?? "active").toLowerCase();
  const yearParam = searchParams.get("year");
  const folderIdParam = searchParams.get("folderId");

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

  if (statusParam && statusParam !== "ALL" && !settlementStatuses.has(statusParam as SettlementStatus)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 정산 상태입니다." } },
      { status: 400 }
    );
  }

  if (!VALID_SCOPES.has(scopeParam)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 scope 입니다." } },
      { status: 400 }
    );
  }

  if (yearParam && !/^\d{4}$/.test(yearParam)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "연도는 4자리 숫자여야 합니다." } },
      { status: 400 }
    );
  }

  const where: Prisma.SettlementWhereInput = {
    ...(statusParam && statusParam !== "ALL" ? { status: statusParam as SettlementStatus } : {}),
    ...(user.role === "STAR" ? { starId: user.id } : {}),
  };

  // scope 필터 (archivedAt 기준)
  if (scopeParam === "active") {
    where.archivedAt = null;
  } else if (scopeParam === "archive") {
    where.archivedAt = { not: null };
  }

  // 폴더 필터
  if (folderIdParam === "unfiled") {
    where.folderId = null;
  } else if (folderIdParam) {
    where.folderId = folderIdParam;
  }

  // 연도 필터 — startDate 기준
  if (yearParam) {
    const year = Number(yearParam);
    const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { startDate: { gte: yearStart, lt: yearEnd } },
    ];
  }

  if (startDateParam) {
    where.endDate = { gte: new Date(startDateParam + "T00:00:00.000Z") };
  }

  if (endDateParam) {
    where.startDate = { lte: new Date(endDateParam + "T23:59:59.999Z") };
  }

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
            phone: true,
            idNumber: true,
            bankName: true,
            bankAccount: true,
          },
        },
        folder: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }) as Promise<Array<{
      id: string; starId: string; startDate: Date; endDate: Date;
      totalAmount: import("@/generated/prisma/client").Prisma.Decimal;
      taxAmount: import("@/generated/prisma/client").Prisma.Decimal;
      netAmount: import("@/generated/prisma/client").Prisma.Decimal;
      status: import("@/generated/prisma/client").SettlementStatus;
      note: string | null; paymentDate: Date | null; confirmedAt: Date | null;
      confirmedBy: string | null; cancellationReason: string | null;
      failureReason: string | null; archivedAt: Date | null; folderId: string | null;
      createdAt: Date; updatedAt: Date;
      star: { id: string; name: string; chineseName: string | null; email: string; phone: string | null; idNumber: string | null; bankName: string | null; bankAccount: string | null };
      folder: { id: string; name: string } | null;
      _count: { items: number };
    }>>,
    prisma.settlement.count({ where }),
  ]);

  const maskedRows = rows.map((row) => ({
    ...row,
    star: {
      ...row.star,
      idNumber: row.star.idNumber ? maskIdNumber(row.star.idNumber) : null,
    },
  }));

  return NextResponse.json({
    data: maskedRows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    scope: scopeParam,
  });
}
