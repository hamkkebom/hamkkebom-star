"use client";

import { type ReactNode } from "react";
import { type LucideIcon, Inbox, Search, FileX, BarChart3, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/** 미리 정의된 Empty State 프리셋 */
export type EmptyStatePreset =
    | "no-data"       // 데이터 없음  (기본)
    | "no-results"    // 검색 결과 없음
    | "no-feedback"   // 피드백 없음
    | "no-chart"      // 차트 데이터 없음
    | "not-found";    // 페이지/리소스 없음

interface EmptyStateProps {
    /** 프리셋으로 아이콘/제목/설명을 자동 설정 */
    preset?: EmptyStatePreset;
    /** 커스텀 아이콘 (프리셋보다 우선) */
    icon?: LucideIcon;
    /** 제목 (프리셋보다 우선) */
    title?: string;
    /** 설명 (프리셋보다 우선) */
    description?: string;
    /** 하단 액션 영역 (버튼 등) */
    action?: ReactNode;
    /** 추가 className */
    className?: string;
    /** 컴팩트 모드 — 패딩과 아이콘 크기 축소 */
    compact?: boolean;
}

const PRESETS: Record<EmptyStatePreset, { icon: LucideIcon; title: string; description: string }> = {
    "no-data": {
        icon: Inbox,
        title: "데이터가 없습니다",
        description: "아직 등록된 항목이 없습니다.",
    },
    "no-results": {
        icon: Search,
        title: "검색 결과가 없습니다",
        description: "다른 키워드로 검색하거나 필터를 변경해 보세요.",
    },
    "no-feedback": {
        icon: MessageSquare,
        title: "피드백이 없습니다",
        description: "아직 작성된 피드백이 없습니다.",
    },
    "no-chart": {
        icon: BarChart3,
        title: "차트 데이터가 없습니다",
        description: "해당 기간의 데이터가 충분하지 않습니다.",
    },
    "not-found": {
        icon: FileX,
        title: "찾을 수 없습니다",
        description: "요청하신 항목이 존재하지 않습니다.",
    },
};

/**
 * 통일된 Empty State 컴포넌트.
 * 프리셋 또는 커스텀 props로 사용하며, 일관된 디자인을 보장합니다.
 *
 * @example
 * // 프리셋 사용
 * <EmptyState preset="no-results" />
 *
 * // 커스텀
 * <EmptyState
 *   icon={Users}
 *   title="STAR가 없습니다"
 *   description="새로운 STAR를 초대해 보세요."
 *   action={<Button>STAR 초대</Button>}
 * />
 */
export function EmptyState({
    preset = "no-data",
    icon,
    title,
    description,
    action,
    className,
    compact = false,
}: EmptyStateProps) {
    const presetConfig = PRESETS[preset];
    const Icon = icon ?? presetConfig.icon;
    const displayTitle = title ?? presetConfig.title;
    const displayDesc = description ?? presetConfig.description;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn(
                "flex flex-col items-center justify-center text-center",
                compact ? "py-8 px-4" : "py-16 px-6",
                className
            )}
        >
            <div
                className={cn(
                    "rounded-2xl bg-muted/50 dark:bg-white/[0.03] border border-border dark:border-white/[0.06] flex items-center justify-center mb-4",
                    compact ? "w-12 h-12" : "w-16 h-16"
                )}
            >
                <Icon
                    className={cn(
                        "text-muted-foreground/50",
                        compact ? "w-6 h-6" : "w-8 h-8"
                    )}
                />
            </div>

            <h3
                className={cn(
                    "font-bold text-foreground dark:text-white mb-1.5",
                    compact ? "text-sm" : "text-base"
                )}
            >
                {displayTitle}
            </h3>

            <p
                className={cn(
                    "text-muted-foreground max-w-xs leading-relaxed",
                    compact ? "text-xs" : "text-sm"
                )}
            >
                {displayDesc}
            </p>

            {action && <div className="mt-5">{action}</div>}
        </motion.div>
    );
}
