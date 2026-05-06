import { NextResponse } from "next/server";
import { Prisma, SettlementStatus, SubmissionStatus } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { generateSettlementSchema } from "@/lib/validations/settlement";
import { createAuditLog } from "@/lib/audit";
import { calculateTax } from "@/lib/settlement-utils";
import { recordSettlementHistoryTx } from "@/lib/settlement-history";
export const dynamic = "force-dynamic";

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

const generateOptionsSchema = generateSettlementSchema
  .and(
    z.object({
      dryRun: z.boolean().optional().default(false),
      confirmDeletePending: z.boolean().optional().default(false),
    })
  );

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

  const parsed = generateOptionsSchema.safeParse(body);

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

  const { startDate: startDateStr, endDate: endDateStr, dryRun, confirmDeletePending } = parsed.data;

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

      // 해당 월에 STAR가 업로드한 승인 제출물 조회 (영상 단가 포함).
      // 기간 기준은 createdAt(작성자 업로드 시점) — 어드민 승인 후 메모/단가 등이
      // 수정되어도 정산 월이 흔들리지 않게 함.
      const approvedSubmissions = await tx.submission.findMany({
        where: {
          status: SubmissionStatus.APPROVED,
          createdAt: {
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

      // 아카이브된 정산(archivedAt != null)은 이미 정리된 것으로 간주하고 삭제해 submissionId unique 해제
      const archivedOverlapping = await tx.settlement.findMany({
        where: {
          starId: { in: starIds },
          startDate: { lt: endDate },
          endDate: { gt: startDate },
          archivedAt: { not: null },
        },
        select: { id: true, starId: true, status: true },
      });
      if (archivedOverlapping.length > 0) {
        const archivedIds = archivedOverlapping.map(s => s.id);
        await tx.settlementItem.deleteMany({ where: { settlementId: { in: archivedIds } } });
        await tx.settlement.deleteMany({ where: { id: { in: archivedIds } } });
      }

      // 아카이브된 COMPLETED 정산이 있는 STAR는 재생성 금지
      const archivedCompletedStarIds = new Set(
        archivedOverlapping
          .filter(s => s.status === SettlementStatus.COMPLETED)
          .map(s => s.starId)
      );

      // Find existing settlements that overlap with the date range (archived 제외)
      const existingSettlements = await tx.settlement.findMany({
        where: {
          starId: { in: starIds },
          status: { in: [SettlementStatus.PENDING, SettlementStatus.REVIEW, SettlementStatus.PROCESSING, SettlementStatus.COMPLETED] },
          startDate: { lt: endDate },
          endDate: { gt: startDate },
          archivedAt: null,
        },
        select: { id: true, starId: true, status: true, startDate: true, endDate: true },
      });

      const conflictingActive = existingSettlements.filter(s => s.status !== SettlementStatus.COMPLETED);
      const completedConflicts = existingSettlements.filter(s => s.status === SettlementStatus.COMPLETED);
      const completedStarIds = new Set([
        ...completedConflicts.map(s => s.starId),
        ...archivedCompletedStarIds,
      ]);

      // Dry-run: 실제 쓰기 없이 예측 결과만 반환
      if (dryRun) {
        const starNameById = new Map(stars.map(s => [s.id, s.name]));
        const plan = Object.entries(groupedByStar).map(([starId, subs]) => {
          const star = starById.get(starId);
          const starBaseRate = star?.baseRate ?? star?.grade?.baseRate ?? null;
          const hasAnyRate = starBaseRate !== null || subs.some(s => s.customRate !== null);
          const willSkip = !hasAnyRate || completedStarIds.has(starId);
          return {
            starId,
            starName: starNameById.get(starId) ?? starId,
            submissionCount: subs.length,
            willSkip,
            skipReason: !hasAnyRate ? "기본 단가 미설정" : completedStarIds.has(starId) ? "이미 확정된 정산 존재" : null,
          };
        });
        throw {
          __dryRun: true,
          plan,
          willDeletePending: conflictingActive,
          completedConflicts,
        };
      }

      // 실제 실행 경로: 충돌 PENDING 이 있는데 confirm 하지 않으면 실패
      if (conflictingActive.length > 0 && !confirmDeletePending) {
        throw {
          code: "CONFLICT_PENDING",
          message: `기존 진행 중인 정산 ${conflictingActive.length}건이 해당 기간과 겹칩니다. 삭제 후 재생성하려면 확인이 필요합니다.`,
          status: 409,
        } satisfies ApiError;
      }

      // Delete PENDING/REVIEW/PROCESSING overlapping settlements
      const toDelete = conflictingActive.map(s => s.id);
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
            return null;
          }

          const starBaseRate = star.baseRate ?? star.grade?.baseRate ?? null;
          const hasAnyRate = starBaseRate !== null || submissions.some(s => s.customRate !== null);

          if (!hasAnyRate) {
            skippedStars.push({
              id: star.id,
              name: star.name,
              reason: "기본 단가(baseRate)가 설정되지 않았습니다.",
            });
            return null;
          }

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
          ) + userAiToolSupportFee;

          const { incomeTax, localTax } = calculateTax(totalAmount);
          const taxAmount = incomeTax + localTax;
          const netAmount = totalAmount - taxAmount;

          const updatedSettlement = await tx.settlement.update({
            where: { id: createdSettlement.id },
            data: { totalAmount, taxAmount, netAmount },
          });

          // History 기록
          await recordSettlementHistoryTx(tx, {
            settlementId: createdSettlement.id,
            action: "CREATED",
            actorId: user.id,
            actorName: user.name ?? user.email ?? "관리자",
            metadata: {
              startDate: startDateStr,
              endDate: endDateStr,
              itemCount: itemsData.length + (userAiToolSupportFee > 0 ? 1 : 0),
              totalAmount,
            },
          });

          return {
            ...updatedSettlement,
            itemCount: itemsData.length + (userAiToolSupportFee > 0 ? 1 : 0),
          };
        })
      );

      const created = settlements.filter(Boolean);

      return {
        created,
        skippedStars,
        completedStars,
        deletedCount: toDelete.length,
      };
    }, { maxWait: 10000, timeout: 30000 });

    void createAuditLog({
      actorId: user.id,
      action: "GENERATE_SETTLEMENTS",
      entityType: "Settlement",
      entityId: "batch",
      metadata: {
        count: result.created.length,
        startDate: startDateStr,
        endDate: endDateStr,
        deletedCount: result.deletedCount,
      },
    });

    return NextResponse.json(
      {
        data: result.created,
        warnings: {
          skippedStars: result.skippedStars,
          completedStars: result.completedStars,
          deletedCount: result.deletedCount,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Dry-run 분기는 throw 로 트랜잭션을 끝냈으므로 여기서 가로챈다
    if (typeof error === "object" && error && "__dryRun" in error) {
      const dry = error as unknown as { plan: unknown[]; willDeletePending: unknown[]; completedConflicts: unknown[] };
      return NextResponse.json({
        dryRun: true,
        plan: dry.plan,
        willDeletePending: dry.willDeletePending,
        completedConflicts: dry.completedConflicts,
      });
    }

    if (isApiError(error)) {
      return toErrorResponse(error);
    }

    console.error("[settlements/generate] Error:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[settlements/generate] Prisma Error:", error.code, error.meta, error.message);
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "정산 생성 중 데이터 오류가 발생했습니다. 잠시 후 다시 시도해주세요." } },
        { status: 500 }
      );
    }

    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: `정산 생성 중 오류: ${errMsg}` } },
      { status: 500 }
    );
  }
}
