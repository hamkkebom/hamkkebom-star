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
    Activity,
    BadgeDollarSign,
    ScrollText,
    BarChart3,
    Target,
    Brain,
    Award,
    LayoutDashboard,
    Shield,
    Flag,
    FileText,
    MessageCircle,
    UserX,
    Megaphone,
    HelpCircle,
    Smartphone,
} from "lucide-react";

export type NavChild = {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    exact?: boolean;
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
        id: "operations",
        label: "운영",
        icon: Activity,
        color: "indigo",
        children: [
            { href: "/admin", label: "대시보드", icon: LayoutDashboard, exact: true },
            { href: "/admin/insights/operational", label: "운영 지표", icon: Activity },
            { href: "/admin/insights/financial", label: "재무 지표", icon: BadgeDollarSign },
            { href: "/admin/insights/scorecard", label: "스코어카드", icon: Award },
            { href: "/admin/insights/trends", label: "트렌드 분석", icon: BarChart3 },
            { href: "/admin/insights/roi", label: "ROI 분석", icon: Target },
            { href: "/admin/insights/ai-quality", label: "AI 품질 분석", icon: Brain },
            { href: "/admin/logs", label: "활동 로그", icon: ScrollText },
            { href: "/admin/announcements", label: "공지사항 관리", icon: Megaphone },
            { href: "/admin/faq", label: "FAQ 관리", icon: HelpCircle },
        ],
    },
    {
        id: "community",
        label: "커뮤니티",
        icon: Shield,
        color: "sky",
        children: [
            { href: "/admin/reports", label: "신고 관리", icon: Flag },
            { href: "/admin/board-posts", label: "게시글 관리", icon: FileText },
            { href: "/admin/comments", label: "댓글 관리", icon: MessageCircle },
            { href: "/admin/sanctions", label: "유저 제재", icon: UserX },
        ],
    },
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
        color: "rose",
        children: [
            { href: "/admin/videos", label: "영상 관리", icon: Film },
            { href: "/admin/reviews/my", label: "담당 피드백 작성", icon: PenTool },
            { href: "/admin/reviews", label: "전체 피드백 관리", icon: MessageSquare },
            { href: "/admin/placements", label: "매체별 영상 현황", icon: Share2 },
        ],
    },
    {
        id: "creator",
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
];

export const externalItems = [
    { href: "/admin/install", label: "앱 설치 · 설정", icon: Smartphone },
    { href: "/", label: "메인으로 돌아가기", icon: ExternalLink, exact: true },
];

export const colorMap: Record<string, { bg: string; text: string; glow: string; dot: string; line: string }> = {
    indigo: {
        bg: "bg-primary/8 dark:bg-primary/10",
        text: "text-primary dark:text-primary",
        glow: "shadow-[0_0_12px_oklch(0.5_0.15_230/0.3)]",
        dot: "bg-primary",
        line: "border-primary/20 dark:border-primary/15",
    },
    violet: {
        bg: "bg-primary/8 dark:bg-primary/10",
        text: "text-primary dark:text-primary",
        glow: "shadow-[0_0_12px_oklch(0.5_0.15_230/0.3)]",
        dot: "bg-primary",
        line: "border-primary/20 dark:border-primary/15",
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
    sky: {
        bg: "bg-sky-500/8 dark:bg-sky-500/10",
        text: "text-sky-600 dark:text-sky-400",
        glow: "shadow-[0_0_12px_rgba(14,165,233,0.3)]",
        dot: "bg-sky-500",
        line: "border-sky-500/20 dark:border-sky-400/15",
    },
};
