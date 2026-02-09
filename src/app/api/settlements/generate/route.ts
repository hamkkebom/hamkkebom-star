import { NextResponse } from "next/server";
import { Prisma, SettlementStatus, SubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { generateSettlementSchema } from "@/lib/validations/settlement";

type ApiError = {
  code: string;
  message: string;
  status: number;
};

function toErrorResponse(error: ApiError) {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
      },
    },
    { status: error.status }
  );
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "status" in error
  );
}

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 정산을 생성할 수 있습니다." } },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const parsed = generateSettlementSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
        },
      },
      { status: 400 }
    );
  }

  const { year, month } = parsed.data;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const existing = await tx.settlement.findFirst({
        where: { year, month },
        select: { id: true },
      });

      if (existing) {
        throw {
          code: "ALREADY_GENERATED",
          message: "해당 연월의 정산이 이미 존재합니다.",
          status: 409,
        } satisfies ApiError;
      }

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      const approvedSubmissions = await tx.submission.findMany({
        where: {
          status: SubmissionStatus.APPROVED,
          updatedAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        select: {
          id: true,
          starId: true,
        },
      });

      const groupedByStar = approvedSubmissions.reduce<Record<string, string[]>>((acc, submission) => {
        if (!acc[submission.starId]) {
          acc[submission.starId] = [];
        }

        acc[submission.starId].push(submission.id);
        return acc;
      }, {});

      const settlements = await Promise.all(
        Object.entries(groupedByStar).map(async ([starId, submissionIds]) => {
          const star = await tx.user.findUnique({
            where: { id: starId },
            select: {
              id: true,
              baseRate: true,
            },
          });

          if (!star) {
            throw {
              code: "INTERNAL_ERROR",
              message: "정산 대상 STAR 정보를 찾을 수 없습니다.",
              status: 500,
            } satisfies ApiError;
          }

          const baseAmount = star.baseRate ?? new Prisma.Decimal(0);

          const createdSettlement = await tx.settlement.create({
            data: {
              starId: star.id,
              year,
              month,
              status: SettlementStatus.PENDING,
            },
          });

          const itemsData = submissionIds.map((submissionId) => ({
            settlementId: createdSettlement.id,
            submissionId,
            starId: star.id,
            baseAmount,
            finalAmount: baseAmount,
            adjustedAmount: null,
          }));

          await tx.settlementItem.createMany({
            data: itemsData,
          });

          const totalAmount = itemsData.reduce((sum, item) => sum + Number(item.finalAmount), 0);

          const updatedSettlement = await tx.settlement.update({
            where: { id: createdSettlement.id },
            data: {
              totalAmount,
            },
          });

          return {
            ...updatedSettlement,
            itemCount: itemsData.length,
          };
        })
      );

      return settlements;
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    if (isApiError(error)) {
      return toErrorResponse(error);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "정산 생성 중 데이터 오류가 발생했습니다." } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "정산 생성 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
