import { SettlementStatus } from "@/generated/prisma/client";

/**
 * 정산 상태 전이 규칙.
 *
 * Key = 현재 상태, Value = 전이 가능한 다음 상태 목록.
 * 스스로로의 전이는 포함하지 않는다(재요청 방어).
 *
 * - PENDING / REVIEW / PROCESSING → COMPLETED: 관리자 확정
 * - COMPLETED → PENDING: 확정 취소 (cancellationReason 필수)
 * - PROCESSING → FAILED: 송금 실패 (failureReason 필수)
 * - FAILED → PENDING: 재처리
 * - PENDING / REVIEW / PROCESSING → CANCELLED: 관리자에 의한 종결 취소
 * - CANCELLED: 종결, 추가 전이 없음
 */
export const SETTLEMENT_TRANSITIONS: Record<SettlementStatus, SettlementStatus[]> = {
    PENDING: [SettlementStatus.REVIEW, SettlementStatus.PROCESSING, SettlementStatus.COMPLETED, SettlementStatus.CANCELLED],
    REVIEW: [SettlementStatus.PENDING, SettlementStatus.PROCESSING, SettlementStatus.COMPLETED, SettlementStatus.CANCELLED],
    PROCESSING: [SettlementStatus.COMPLETED, SettlementStatus.FAILED, SettlementStatus.CANCELLED],
    COMPLETED: [SettlementStatus.PENDING],
    FAILED: [SettlementStatus.PENDING],
    CANCELLED: [],
};

/**
 * 주어진 전이가 허용되는지 검사.
 */
export function canTransit(from: SettlementStatus, to: SettlementStatus): boolean {
    if (from === to) return false;
    return SETTLEMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * 아카이브 분류: 사용자가 "지난 정산"으로 보는 상태.
 * 실제 DB 에서는 archivedAt IS NOT NULL 을 기준으로 함(상태와 이중으로 관리되지 않도록 주의).
 */
export const ARCHIVED_STATUSES: SettlementStatus[] = [
    SettlementStatus.COMPLETED,
    SettlementStatus.CANCELLED,
    SettlementStatus.FAILED,
];

export const ACTIVE_STATUSES: SettlementStatus[] = [
    SettlementStatus.PENDING,
    SettlementStatus.REVIEW,
    SettlementStatus.PROCESSING,
];

export function isArchivedStatus(status: SettlementStatus): boolean {
    return ARCHIVED_STATUSES.includes(status);
}

/**
 * 한국어 UI 표기.
 */
export const STATUS_LABEL_KO: Record<SettlementStatus, string> = {
    PENDING: "검토 대기 중",
    REVIEW: "관리자 검토 중",
    PROCESSING: "지급 처리 중",
    COMPLETED: "지급 완료",
    FAILED: "지급 실패",
    CANCELLED: "취소됨",
};

export const STATUS_DESCRIPTION_KO: Record<SettlementStatus, string> = {
    PENDING: "관리자 검토를 기다리고 있습니다.",
    REVIEW: "관리자가 정산 내역을 검토 중입니다.",
    PROCESSING: "지급이 처리 중입니다. 영업일 기준 3–5일 소요됩니다.",
    COMPLETED: "입금이 완료되었습니다.",
    FAILED: "지급에 실패했습니다. 계좌 정보를 확인해주세요.",
    CANCELLED: "정산이 취소되었습니다.",
};

/**
 * 전이 규칙 위반 에러 객체.
 */
export class InvalidTransitionError extends Error {
    code = "INVALID_TRANSITION" as const;
    constructor(public from: SettlementStatus, public to: SettlementStatus) {
        super(
            `허용되지 않은 상태 전이입니다: ${STATUS_LABEL_KO[from]} → ${STATUS_LABEL_KO[to]}`
        );
    }
}

/**
 * 전이 검증 + 실패 시 throw.
 */
export function assertCanTransit(from: SettlementStatus, to: SettlementStatus): void {
    if (!canTransit(from, to)) {
        throw new InvalidTransitionError(from, to);
    }
}
