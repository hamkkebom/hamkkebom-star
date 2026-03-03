import { NextResponse } from "next/server";
import { Prisma, SettlementStatus, SubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { generateSettlementSchema } from "@/lib/validations/settlement";
import { createAuditLog } from "@/lib/audit";

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

  const { startDate: startDateStr, endDate: endDateStr } = parsed.data;

  // AI 툴 지원비 조회 (트랜잭션 외부 — 테스트 mock 호환)
  let aiToolSupportFee = 0;
  try {
    const aiFeeSetting = await prisma.systemSettings.findUnique({
      where: { key: "ai_tool_support_fee" },
    });
    aiToolSupportFee = aiFeeSetting ? Number(aiFeeSetting.value) : 0;
  } catch {
    aiToolSupportFee = 0;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const startDate = new Date(startDateStr + "T00:00:00.000Z");
      const endDate = new Date(endDateStr + "T23:59:59.999Z");

      // 해당 월에 승인된 제출물 조회 (영상 단가 포함)
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
          video: {
            select: {
              customRate: true,
            },
          },
        },
      });

      if (approvedSubmissions.length === 0) {
        throw {
          code: "NO_SUBMISSIONS",
          message: "해당 기간에 승인된 제출물이 없습니다.",
          status: 404,
        } satisfies ApiError;
      }

      // STAR별로 제출물 그룹화 (영상 단가 보존)
      type SubmissionEntry = { id: string; customRate: number | null };
      const groupedByStar = approvedSubmissions.reduce<Record<string, SubmissionEntry[]>>((acc, sub) => {
        if (!acc[sub.starId]) {
          acc[sub.starId] = [];
        }
        acc[sub.starId].push({
          id: sub.id,
          customRate: sub.video?.customRate ? Number(sub.video.customRate) : null,
        });
        return acc;
      }, {});

      const starIds = Object.keys(groupedByStar);

      // STAR 정보 조회 (baseRate + 등급 단가 포함)
      const stars = await tx.user.findMany({
        where: { id: { in: starIds } },
        select: {
          id: true,
          name: true,
          baseRate: true,
          aiToolSupportFee: true,
          grade: { select: { baseRate: true } },
        },
      });
      const starById = new Map(stars.map((star) => [star.id, star]));

      // Find existing settlements that overlap with the date range
      const existingSettlements = await tx.settlement.findMany({
        where: {
          starId: { in: starIds },
          status: { in: [SettlementStatus.PENDING, SettlementStatus.PROCESSING, SettlementStatus.COMPLETED] },
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
        select: { id: true, starId: true, status: true },
      });

      // Skip STARs with COMPLETED overlapping settlements
      const completedStarIds = new Set(
        existingSettlements
          .filter(s => s.status === SettlementStatus.COMPLETED)
          .map(s => s.starId)
      );

      // Delete PENDING/PROCESSING overlapping settlements
      const toDelete = existingSettlements
        .filter(s => s.status !== SettlementStatus.COMPLETED)
        .map(s => s.id);
      if (toDelete.length > 0) {
        await tx.settlement.deleteMany({ where: { id: { in: toDelete } } });
      }

      // baseRate 미설정 STAR 목록
      const skippedStars: { id: string; name: string; reason: string }[] = [];
      // 이미 확정된 STAR 목록
      const completedStars: { id: string; name: string }[] = [];

      const settlements = await Promise.all(
        Object.entries(groupedByStar).map(async ([starId, submissions]) => {
          const star = starById.get(starId);

          if (!star) {
            return null; // STAR 정보를 찾을 수 없으면 skip
          }

          // STAR 기본 단가 결정: 개인 단가 > 등급 단가 > null(스킵)
          const starBaseRate = star.baseRate ?? star.grade?.baseRate ?? null;

          // 모든 submission에 영상 단가가 없고 STAR 기본 단가도 없으면 스킵
          const hasAnyRate = starBaseRate !== null || submissions.some(s => s.customRate !== null);

          if (!hasAnyRate) {
            skippedStars.push({
              id: star.id,
              name: star.name,
              reason: "기본 단가(baseRate)가 설정되지 않았습니다.",
            });
            return null;
          }

          // Skip STARs with COMPLETED overlapping settlements
          if (completedStarIds.has(starId)) {
            completedStars.push({ id: star.id, name: star.name });
            return null;
          }

          const defaultRate = starBaseRate ? Number(starBaseRate) : 0;

          const createdSettlement = await tx.settlement.create({
            data: {
              starId: star.id,
              startDate,
              endDate,
              status: SettlementStatus.PENDING,
            },
          });

          // 각 제출물마다 개별 단가 적용: 영상 단가 > STAR 기본 단가
          const itemsData = submissions.map((sub) => {
            const rate = sub.customRate ?? defaultRate;
            return {
              settlementId: createdSettlement.id,
              submissionId: sub.id,
              starId: star.id,
              baseAmount: rate,
              finalAmount: rate,
              adjustedAmount: null,
            };
          });

          await tx.settlementItem.createMany({
            data: itemsData,
          });

          // AI 툴 지원비 항목 추가
          const userAiToolSupportFee = star.aiToolSupportFee !== null ? Number(star.aiToolSupportFee) : aiToolSupportFee;
          if (userAiToolSupportFee > 0) {
            await tx.settlementItem.create({
              data: {
                settlementId: createdSettlement.id,
                submissionId: null,
                starId: star.id,
                itemType: "AI_TOOL_SUPPORT",
                description: "AI 툴 지원비",
                baseAmount: userAiToolSupportFee,
                finalAmount: userAiToolSupportFee,
                adjustedAmount: null,
              },
            });
          }

          const totalAmount = itemsData.reduce(
            (sum, item) => sum + item.finalAmount,
            0
          ) + aiToolSupportFee;

          const updatedSettlement = await tx.settlement.update({
            where: { id: createdSettlement.id },
            data: { totalAmount },
          });

          return {
            ...updatedSettlement,
            itemCount: itemsData.length + (aiToolSupportFee > 0 ? 1 : 0),
          };
        })
      );

      const created = settlements.filter(Boolean);

      return {
        created,
        skippedStars,
        completedStars,
      };
    });

    void createAuditLog({
      actorId: user.id,
      action: "GENERATE_SETTLEMENTS",
      entityType: "Settlement",
      entityId: "batch",
      metadata: {
        count: result.created.length,
        startDate: startDateStr,
        endDate: endDateStr,
      },
    });

    return NextResponse.json(
      {
        data: result.created,
        warnings: {
          skippedStars: result.skippedStars,
          completedStars: result.completedStars,
        },
      },
      { status: 201 }
    );
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
