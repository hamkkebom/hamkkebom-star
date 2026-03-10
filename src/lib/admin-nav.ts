import {
    FolderKanban,
    ClipboardList,
    Clapperboard,
    Film,
    UsersRound,
    UserCheck,
    Users,
    Wallet,
    DollarSign,
    ExternalLink,
    UserCog,
    PenTool,
    MessageSquare,
    ShieldCheck,
    Share2,
    BookOpen,
    TrendingUp,
    Activity,
    BadgeDollarSign,
    ScrollText,
    Mail,
    BarChart3,
    Target,
    Brain,
    Award,
} from "lucide-react";

export type NavChild = {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
};

export type NavGroup = {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string; // tailwind color class for accent
    children: NavChild[];
};

export const navGroups: NavGroup[] = [
    {
        id: "project",
        label: "프로젝트",
        icon: FolderKanban,
        color: "violet",
        children: [
            { href: "/admin/requests", label: "프로젝트 관리", icon: ClipboardList },
            { href: "/admin/approvals", label: "프로젝트 승인", icon: ShieldCheck },
        ],
    },
    {
        id: "video",
        label: "영상",
        icon: Clapperboard,
        color: "cyan",
        children: [
            { href: "/admin/reviews/my", label: "담당 피드백 작성", icon: PenTool },
            { href: "/admin/reviews", label: "전체 피드백 관리", icon: MessageSquare },
            { href: "/admin/videos", label: "영상 관리", icon: Film },
            { href: "/admin/placements", label: "매체별 영상 현황", icon: Share2 },
        ],
    },
    {
        id: "account",
        label: "계정",
        icon: UsersRound,
        color: "emerald",
        children: [
            { href: "/admin/users", label: "모든 계정 관리", icon: UserCheck },
            { href: "/admin/admins", label: "관리자 계정 관리", icon: UserCog },
            { href: "/admin/users/assign", label: "담당 STAR 배정", icon: Users },
        ],
    },
    {
        id: "settlement",
        label: "정산",
        icon: Wallet,
        color: "amber",
        children: [
            { href: "/admin/settlements", label: "정산 관리", icon: DollarSign },
            { href: "/admin/stars", label: "단가 설정", icon: Wallet },
            { href: "/admin/settlements/guide", label: "정산 가이드", icon: BookOpen },
        ],
    },
    {
        id: "message",
        label: "메시지",
        icon: Mail,
        color: "cyan",
        children: [
            { href: "/admin/messages", label: "메시지 관리", icon: MessageSquare },
        ],
    },
    {
        id: "insight",
        label: "지표",
        icon: TrendingUp,
        color: "indigo",
        children: [
            { href: "/admin/insights/operational", label: "운영 지표", icon: Activity },
            { href: "/admin/insights/financial", label: "재무 지표", icon: BadgeDollarSign },
            { href: "/admin/insights/scorecard", label: "스코어카드", icon: Award },
            { href: "/admin/insights/trends", label: "트렌드 분석", icon: BarChart3 },
            { href: "/admin/insights/roi", label: "ROI 분석", icon: Target },
            { href: "/admin/insights/ai-quality", label: "AI 품질 분석", icon: Brain },
        ],
    },
    {
        id: "monitoring",
        label: "모니터링",
        icon: ScrollText,
        color: "rose",
        children: [
            { href: "/admin/logs", label: "활동 로그", icon: Activity },
        ],
    },
];

export const externalItems = [
    { href: "/", label: "메인으로 돌아가기", icon: ExternalLink, exact: true },
];

export const colorMap: Record<string, { bg: string; text: string; glow: string; dot: string; line: string }> = {
    indigo: {
        bg: "bg-indigo-500/8 dark:bg-indigo-500/10",
        text: "text-indigo-600 dark:text-indigo-400",
        glow: "shadow-[0_0_12px_rgba(99,102,241,0.3)]",
        dot: "bg-indigo-500",
        line: "border-indigo-500/20 dark:border-indigo-400/15",
    },
    violet: {
        bg: "bg-violet-500/8 dark:bg-violet-500/10",
        text: "text-violet-600 dark:text-violet-400",
        glow: "shadow-[0_0_12px_rgba(139,92,246,0.3)]",
        dot: "bg-violet-500",
        line: "border-violet-500/20 dark:border-violet-400/15",
    },
    cyan: {
        bg: "bg-cyan-500/8 dark:bg-cyan-500/10",
        text: "text-cyan-600 dark:text-cyan-400",
        glow: "shadow-[0_0_12px_rgba(6,182,212,0.3)]",
        dot: "bg-cyan-500",
        line: "border-cyan-500/20 dark:border-cyan-400/15",
    },
    emerald: {
        bg: "bg-emerald-500/8 dark:bg-emerald-500/10",
        text: "text-emerald-600 dark:text-emerald-400",
        glow: "shadow-[0_0_12px_rgba(16,185,129,0.3)]",
        dot: "bg-emerald-500",
        line: "border-emerald-500/20 dark:border-emerald-400/15",
    },
    amber: {
        bg: "bg-amber-500/8 dark:bg-amber-500/10",
        text: "text-amber-600 dark:text-amber-400",
        glow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]",
        dot: "bg-amber-500",
        line: "border-amber-500/20 dark:border-amber-400/15",
    },
    rose: {
        bg: "bg-rose-500/8 dark:bg-rose-500/10",
        text: "text-rose-600 dark:text-rose-400",
        glow: "shadow-[0_0_12px_rgba(244,63,94,0.3)]",
        dot: "bg-rose-500",
        line: "border-rose-500/20 dark:border-rose-400/15",
    },
};
