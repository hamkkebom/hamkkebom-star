import { type LucideIcon, MessageSquare, Type, Music, Scissors, Palette } from "lucide-react";

// ============================================================
//  TYPES
// ============================================================

export type FeedbackType = "GENERAL" | "SUBTITLE" | "BGM" | "CUT_EDIT" | "COLOR_GRADE";
export type FeedbackPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type ReviewAction = "APPROVE" | "REJECT" | "REQUEST_CHANGES";

export type Submission = {
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
        description?: string;
    } | null;
    star: {
        id: string;
        name: string;
        chineseName?: string | null;
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

export type FeedbackItem = {
    id: string;
    type: FeedbackType;
    priority: FeedbackPriority;
    content: string;
    startTime: number | null;
    endTime: number | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    annotation?: any;
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
//  CONSTANTS
// ============================================================

export const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: LucideIcon; color: string }[] = [
    { value: "GENERAL", label: "일반", icon: MessageSquare, color: "text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/20" },
    { value: "SUBTITLE", label: "자막", icon: Type, color: "text-cyan-600 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-500/10 dark:border-cyan-500/20" },
    { value: "BGM", label: "BGM", icon: Music, color: "text-pink-600 bg-pink-50 border-pink-200 dark:text-pink-400 dark:bg-pink-500/10 dark:border-pink-500/20" },
    { value: "CUT_EDIT", label: "컷 편집", icon: Scissors, color: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20" },
    { value: "COLOR_GRADE", label: "색보정", icon: Palette, color: "text-violet-600 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-500/10 dark:border-violet-500/20" },
];

export const PRIORITY_OPTIONS: { value: FeedbackPriority; label: string; color: string; dot: string }[] = [
    { value: "LOW", label: "낮음", color: "text-slate-600 dark:text-slate-400", dot: "bg-slate-500 dark:bg-slate-400" },
    { value: "NORMAL", label: "보통", color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500 dark:bg-blue-400" },
    { value: "HIGH", label: "높음", color: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500 dark:bg-orange-400" },
    { value: "URGENT", label: "긴급", color: "text-red-600 dark:text-red-400", dot: "bg-red-500 dark:bg-red-400" },
];

export const TYPE_LABELS: Record<FeedbackType, string> = {
    GENERAL: "일반", SUBTITLE: "자막", BGM: "BGM", CUT_EDIT: "컷편집", COLOR_GRADE: "색보정"
};

export const TYPE_COLORS: Record<FeedbackType, string> = {
    GENERAL: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
    SUBTITLE: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300",
    BGM: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-300",
    CUT_EDIT: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    COLOR_GRADE: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
};

export const PRIORITY_BADGE: Record<FeedbackPriority, string> = {
    LOW: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/20 dark:bg-slate-500/5 dark:text-slate-500",
    NORMAL: "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/5 dark:text-blue-400",
    HIGH: "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/5 dark:text-orange-400",
    URGENT: "border-red-200 bg-red-50 text-red-600 animate-pulse dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-400",
};

// ============================================================
//  HELPERS
// ============================================================

export function formatTime(seconds: number) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
