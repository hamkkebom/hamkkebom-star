import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createAuditLog } from "@/lib/audit";
import { SettlementStatus, SubmissionStatus } from "@/generated/prisma/client";
import { calculateTax } from "@/lib/settlement-utils";
export const dynamic = "force-dynamic";

/**
 * POST /api/settlements/auto-generate
 *
 * 자동 정산 생성 — 전월 1일~말일 사이 승인된 제출물 기반.
 * Vercel Cron 또는 관리자가 수동 호출 가능.
 *
 * Headers:
 *   Authorization: Bearer <CRON_SECRET>  (Cron 호출 시)
 *   또는 일반 관리자 세션
 */
export async function POST(request: Request) {
    // 인증: Cron secret 또는 관리자 세션
    const cronSecret = request.headers.get("authorization")?.replace("Bearer ", "");
    const isCron = cronSecret === process.env.CRON_SECRET && !!process.env.CRON_SECRET;

    if (!isCron) {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json(
                { error: { code: "UNAUTHORIZED", message: "관리자 인증이 필요합니다." } },
                { status: 401 }
            );
        }
    }

    // 기간 계산: 전월 1일 ~ 전월 말일
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    const now = new Date();
    let targetYear: number;
    let targetMonth: number; // 0-indexed

    if (yearParam && monthParam) {
        targetYear = parseInt(yearParam);
        targetMonth = parseInt(monthParam) - 1; // URL은 1-indexed
    } else {
        // 기본값: 전월
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        targetYear = prevMonth.getFullYear();
        targetMonth = prevMonth.getMonth();
    }

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const periodLabel = `${targetYear}년 ${targetMonth + 1}월`;

    try {
        // 해당 기간 승인된 제출물 + STAR별 그룹 (정산에 아직 포함되지 않은 것만)
        const approvedSubmissions = await prisma.submission.findMany({
            where: {
                status: SubmissionStatus.APPROVED,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                // 이미 정산에 포함된 것은 제외
                settlementItem: null,
            },
            include: {
                video: { select: { customRate: true } },
                assignment: {
                    include: {
                        star: {
                            select: { id: true, name: true, baseRate: true },
                        },
                    },
                },
            },
        });

        if (approvedSubmissions.length === 0) {
            return NextResponse.json({
                data: { created: 0, period: periodLabel },
                message: `${periodLabel}에 정산할 승인 제출물이 없습니다.`,
            });
        }

        // STAR별 그룹화
        const starGroups: Record<
            string,
            { starId: string; starName: string; baseRate: number; submissions: typeof approvedSubmissions }
        > = {};

        for (const sub of approvedSubmissions) {
            const star = sub.assignment?.star;
            if (!star) continue;

            if (!starGroups[star.id]) {
                starGroups[star.id] = {
                    starId: star.id,
                    starName: star.name,
                    baseRate: Number(star.baseRate ?? 0),
                    submissions: [],
                };
            }
            starGroups[star.id].submissions.push(sub);
        }

        // 트랜잭션으로 STAR별 정산 생성
        const results = await prisma.$transaction(async (tx) => {
            const created: { settlementId: string; starId: string; itemCount: number; totalAmount: number }[] = [];

            for (const group of Object.values(starGroups)) {
                // 이미 해당 기간에 정산이 존재하는지 확인
                const existing = await tx.settlement.findFirst({
                    where: {
                        starId: group.starId,
                        startDate: { gte: startDate },
                        endDate: { lte: new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999) },
                    },
                });

                if (existing) continue; // 중복 방지

                let totalAmount = 0;

                const settlement = await tx.settlement.create({
                    data: {
                        starId: group.starId,
                        startDate,
                        endDate,
                        status: SettlementStatus.PENDING,
                        note: `${periodLabel} 자동 생성`,
                    },
                });

                for (const sub of group.submissions) {
                    const rate = Number(sub.video?.customRate ?? group.baseRate);
                    const finalAmount = rate;
                    totalAmount += finalAmount;

                    await tx.settlementItem.create({
                        data: {
                            settlementId: settlement.id,
                            submissionId: sub.id,
                            starId: group.starId,
                            baseAmount: rate,
                            finalAmount,
                            itemType: "SUBMISSION",
                            description: `${periodLabel} 영상 제출`,
                        },
                    });
                }

                // 총액 업데이트 + 세금 계산
                const { incomeTax, localTax } = calculateTax(totalAmount);
                const taxAmount = incomeTax + localTax;
                const netAmount = totalAmount - taxAmount;

                await tx.settlement.update({
                    where: { id: settlement.id },
                    data: { totalAmount, taxAmount, netAmount },
                });

                created.push({
                    settlementId: settlement.id,
                    starId: group.starId,
                    itemCount: group.submissions.length,
                    totalAmount,
                });
            }

            return created;
        });

        // 감사 로그
        if (!isCron) {
            const user = await getAuthUser();
            if (user) {
                void createAuditLog({
                    actorId: user.id,
                    action: "AUTO_GENERATE_SETTLEMENT",
                    entityType: "Settlement",
                    entityId: `batch-${periodLabel}`,
                });
            }
        }

        return NextResponse.json({
            data: {
                created: results.length,
                period: periodLabel,
                settlements: results,
            },
            message: `${periodLabel} 정산 ${results.length}건이 자동 생성되었습니다.`,
        });
    } catch (err) {
        console.error("[Auto-Generate Settlement Error]", err);
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "자동 정산 생성 중 오류가 발생했습니다." } },
            { status: 500 }
        );
    }
}
