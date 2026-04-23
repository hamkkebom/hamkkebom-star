import { NextResponse } from "next/server";
import { SettlementStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createAuditLog } from "@/lib/audit";
import { assertCanTransit, InvalidTransitionError } from "@/lib/settlement-state";
import { recordSettlementHistoryTx } from "@/lib/settlement-history";
import { z } from "zod";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const failSchema = z.object({
    reason: z.string().trim().min(2, "실패 사유는 2자 이상 입력해주세요.").max(500, "실패 사유는 500자 이하로 입력해주세요."),
});

export async function PATCH(request: Request, { params }: Params) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }
    if (user.role !== "ADMIN") {
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "관리자만 정산 실패 처리를 할 수 있습니다." } },
            { status: 403 }
        );
    }

    const { id } = await params;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    const parsed = failSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: { code: "MISSING_REASON", message: parsed.error.issues[0]?.message ?? "실패 사유가 필요합니다." } },
            { status: 400 }
        );
    }

    try {
        const updated = await prisma.$transaction(async (tx) => {
            const current = await tx.settlement.findUnique({
                where: { id },
                select: { id: true, status: true },
            });
            if (!current) {
                throw { code: "NOT_FOUND", message: "정산을 찾을 수 없습니다.", status: 404 };
            }

            assertCanTransit(current.status, SettlementStatus.FAILED);

            const now = new Date();
            const result = await tx.settlement.update({
                where: { id },
                data: {
                    status: SettlementStatus.FAILED,
                    failureReason: parsed.data.reason,
                    archivedAt: now,
                },
                include: {
                    star: { select: { id: true, name: true, email: true } },
                    _count: { select: { items: true } },
                },
            });

            await recordSettlementHistoryTx(tx, {
                settlementId: id,
                action: "STATUS_CHANGED",
                actorId: user.id,
                actorName: user.name ?? user.email ?? "관리자",
                field: "status",
                oldValue: current.status,
                newValue: SettlementStatus.FAILED,
                metadata: { failureReason: parsed.data.reason },
            });

            return result;
        });

        void createAuditLog({
            actorId: user.id,
            action: "FAIL_SETTLEMENT",
            entityType: "Settlement",
            entityId: id,
            metadata: { reason: parsed.data.reason },
        });

        return NextResponse.json({ data: updated });
    } catch (err) {
        if (err instanceof InvalidTransitionError) {
            return NextResponse.json(
                { error: { code: err.code, message: err.message } },
                { status: 400 }
            );
        }
        if (typeof err === "object" && err && "code" in err && "status" in err) {
            const e = err as { code: string; message: string; status: number };
            return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
        }
        console.error("[settlements/fail] Error:", err);
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "정산 실패 처리 중 오류가 발생했습니다." } },
            { status: 500 }
        );
    }
}
