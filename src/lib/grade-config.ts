export const GRADE_COLOR_PRESETS = {
  amber: {
    label: "골드",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-t-4 border-amber-400",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  emerald: {
    label: "그린",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-t-4 border-emerald-500",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  sky: {
    label: "블루",
    bg: "bg-sky-50 dark:bg-sky-950/20",
    border: "border-t-4 border-sky-500",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  violet: {
    label: "퍼플",
    bg: "bg-violet-50 dark:bg-violet-950/20",
    border: "border-t-4 border-violet-500",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  rose: {
    label: "핑크",
    bg: "bg-rose-50 dark:bg-rose-950/20",
    border: "border-t-4 border-rose-500",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  slate: {
    label: "그레이",
    bg: "bg-slate-50 dark:bg-slate-950/20",
    border: "border-t-4 border-slate-400",
    badge: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
    dot: "bg-slate-500",
  },
  cyan: {
    label: "시안",
    bg: "bg-cyan-50 dark:bg-cyan-950/20",
    border: "border-t-4 border-cyan-500",
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
    dot: "bg-cyan-500",
  },
  orange: {
    label: "오렌지",
    bg: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-t-4 border-orange-500",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    dot: "bg-orange-500",
  },
} as const;

export type GradeColorKey = keyof typeof GRADE_COLOR_PRESETS;

export const UNASSIGNED_CONFIG = {
  label: "미배정",
  bg: "bg-muted/30",
  border: "border-t-4 border-dashed border-muted-foreground/30",
  badge: "bg-muted text-muted-foreground",
} as const;

export function getGradeColor(colorKey: string) {
  if (colorKey in GRADE_COLOR_PRESETS) {
    return GRADE_COLOR_PRESETS[colorKey as GradeColorKey];
  }
  return GRADE_COLOR_PRESETS.slate;
}
