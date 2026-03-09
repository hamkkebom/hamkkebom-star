/**
 * 프론트엔드 공유 타입 — STAR 대시보드/피드백/제출물 관련
 *
 * 각 페이지에서 API 응답 형태가 미묘하게 다를 수 있으므로
 * 기반 타입을 정의하고 필요 시 & 교차타입으로 확장합니다.
 */

// ============================================================
//  Submission (STAR 측)
// ============================================================

/** STAR 측 제출물 기본 타입 — Dashboard / MyVideos 공통 */
export type MySubmissionBase = {
    id: string;
    versionTitle: string | null;
    version: string;
    duration: number | null;
    signedThumbnailUrl: string | null;
    assignment: {
        request: {
            title: string;
        } | null;
    } | null;
    _count: {
        feedbacks: number;
    } | null;
    video: {
        title: string | null;
        streamUid: string | null;
        thumbnailUrl: string | null;
    } | null;
    createdAt: string;
};

/** Dashboard 페이지용 — 기본 + AI 분석 요약 */
export type MySubmissionDashboard = MySubmissionBase & {
    aiAnalysis: {
        padding?: boolean;
        status: string;
        summary: string;
    } | null;
};

/** 피드백 페이지용 — 기본 + AI 점수 + 미확인 피드백 */
export type MySubmissionFeedback = MySubmissionBase & {
    aiAnalysis: {
        summary: string;
        status: string;
        scores: Record<string, number>;
    } | null;
    latestFeedback: {
        id: string;
        content: string;
        type: string;
        priority: string;
        status: string;
        startTime: number | null;
        createdAt: string;
        readByStar: boolean;
        annotation: unknown;
        author: { id: string; name: string } | null;
    } | null;
    unreadFeedbackCount: number;
};

// ============================================================
//  Submission (ADMIN 측)
// ============================================================

/** ADMIN 측 제출물 행(행정 비디오 목록, 리뷰 등) */
export type SubmissionRowBase = {
    id: string;
    version: string;
    versionTitle: string | null;
    status: string;
    createdAt: string;
    streamUid?: string;
    signedThumbnailUrl?: string | null;
    video: {
        id: string;
        title: string;
        thumbnailUrl: string | null;
        streamUid: string | null;
    } | null;
    star: {
        id: string;
        name: string;
        avatarUrl: string | null;
        email: string;
    };
    assignment: {
        request: {
            title: string;
        };
    } | null;
    _count?: {
        feedbacks: number;
    };
};

// ============================================================
//  Feedback
// ============================================================

export type FeedbackType = "GENERAL" | "SUBTITLE" | "BGM" | "CUT_EDIT" | "COLOR_GRADE";
export type FeedbackPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

/** 피드백 아이템 — 피드백 목록/타임라인 공통 */
export type FeedbackItemBase = {
    id: string;
    type: FeedbackType;
    priority: FeedbackPriority;
    content: string;
    startTime: number | null;
    endTime: number | null;
    status: string;
    createdAt: string;
    author: {
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
    };
};

// ============================================================
//  Video
// ============================================================

/** Admin 영상 관리 목록 행 기본 타입 */
export type VideoRowBase = {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    streamUid: string | null;
    status: string;
    createdAt: string;
};

// ============================================================
//  Settlement
// ============================================================

/** 정산 행 기본 타입 */
export type SettlementRowBase = {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    totalAmount: number;
    createdAt: string;
};
