"use client";

import { create } from "zustand";

// ─── 타입 정의 ───
export interface FeedbackScene {
    startTime: number;
    endTime: number;
    feedbackIds: string[];
    hasAnnotation: boolean;
    priority: "HIGH" | "NORMAL" | "LOW";
}

export interface FeedbackViewFeedback {
    id: string;
    type: string;
    priority: string;
    content: string;
    startTime: number | null;
    endTime: number | null;
    status: string;
    annotation: unknown;
    createdAt: string;
    author: {
        name: string;
        avatarUrl: string | null;
    };
}

interface FeedbackViewState {
    // 현재 영상 시간
    currentTime: number;
    setCurrentTime: (t: number) => void;

    // 전체 영상 길이
    duration: number;
    setDuration: (d: number) => void;

    // 원본 피드백 배열
    feedbacks: FeedbackViewFeedback[];
    setFeedbacks: (f: FeedbackViewFeedback[]) => void;

    // 장면별 피드백 그룹
    scenes: FeedbackScene[];

    // 선택된 피드백 ID
    selectedFeedbackId: string | null;
    setSelectedFeedbackId: (id: string | null) => void;

    // 현재 보여줄 어노테이션 데이터
    activeAnnotation: unknown;
    setActiveAnnotation: (a: unknown) => void;

    // 체크된 피드백 (수정 완료 표시)
    checkedIds: Set<string>;
    toggleCheck: (id: string) => void;
}

// 5초 이내 피드백은 같은 장면으로 그룹핑
const SCENE_GAP = 5;

function groupByTimecode(feedbacks: FeedbackViewFeedback[]): FeedbackScene[] {
    const sorted = feedbacks
        .filter((f) => f.startTime !== null)
        .sort((a, b) => a.startTime! - b.startTime!);

    const scenes: FeedbackScene[] = [];
    let current: FeedbackScene | null = null;

    for (const fb of sorted) {
        if (!current || fb.startTime! - current.endTime > SCENE_GAP) {
            current = {
                startTime: fb.startTime!,
                endTime: fb.endTime ?? fb.startTime! + 3,
                feedbackIds: [fb.id],
                hasAnnotation: !!fb.annotation,
                priority: fb.priority === "URGENT" || fb.priority === "HIGH" ? "HIGH" : fb.priority === "LOW" ? "LOW" : "NORMAL",
            };
            scenes.push(current);
        } else {
            current.feedbackIds.push(fb.id);
            current.endTime = Math.max(current.endTime, fb.endTime ?? fb.startTime! + 3);
            if (fb.annotation) current.hasAnnotation = true;
            if (fb.priority === "URGENT" || fb.priority === "HIGH") current.priority = "HIGH";
        }
    }

    // 타임코드 없는 피드백 그룹
    const noTimecode = feedbacks.filter((f) => f.startTime === null);
    if (noTimecode.length > 0) {
        scenes.push({
            startTime: -1,
            endTime: -1,
            feedbackIds: noTimecode.map((f) => f.id),
            hasAnnotation: false,
            priority: "NORMAL",
        });
    }

    return scenes;
}

export const useFeedbackViewStore = create<FeedbackViewState>((set, get) => ({
    currentTime: 0,
    setCurrentTime: (t) => {
        set({ currentTime: t });
        // 현재 시간에 해당하는 어노테이션 자동 활성화
        const { feedbacks } = get();
        const activeFb = feedbacks.find(
            (fb) =>
                fb.startTime !== null &&
                fb.annotation &&
                t >= fb.startTime &&
                t <= (fb.endTime ?? fb.startTime + 3)
        );
        if (activeFb) {
            set({ activeAnnotation: activeFb.annotation, selectedFeedbackId: activeFb.id });
        } else {
            // 현재 선택된 피드백이 수동 선택이 아니면 해제
            const { selectedFeedbackId, feedbacks: fbs } = get();
            const selFb = fbs.find((f) => f.id === selectedFeedbackId);
            if (selFb && selFb.startTime !== null) {
                // 시간 기반 선택이었으면 해제
                if (t < selFb.startTime || t > (selFb.endTime ?? selFb.startTime + 3)) {
                    set({ activeAnnotation: null });
                }
            }
        }
    },

    duration: 0,
    setDuration: (d) => set({ duration: d }),

    feedbacks: [],
    setFeedbacks: (f) => set({ feedbacks: f, scenes: groupByTimecode(f) }),

    scenes: [],

    selectedFeedbackId: null,
    setSelectedFeedbackId: (id) => {
        if (!id) {
            set({ selectedFeedbackId: null, activeAnnotation: null });
            return;
        }
        const fb = get().feedbacks.find((f) => f.id === id);
        set({
            selectedFeedbackId: id,
            activeAnnotation: fb?.annotation ?? null,
        });
    },

    activeAnnotation: null,
    setActiveAnnotation: (a) => set({ activeAnnotation: a }),

    checkedIds: new Set(),
    toggleCheck: (id) =>
        set((state) => {
            const next = new Set(state.checkedIds);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return { checkedIds: next };
        }),
}));
