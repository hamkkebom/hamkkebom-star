"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
    MessageSquare,
    Heart,
    Eye,
    ChevronRight,
    Users,
    HelpCircle,
    Lightbulb,
    Camera,
    Megaphone,
    Sparkles,
    PenSquare,
    Flame,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ─────────────── Types ─────────────── */

type CommunityPost = {
    id: string;
    boardType: string;
    title: string;
    content: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    hotScore: number;
    tags: string[];
    thumbnailUrl: string | null;
    isFeatured: boolean;
    isPinned: boolean;
    isNotice: boolean;
    createdAt: string;
    author: {
        name: string;
        chineseName: string | null;
        avatarUrl: string | null;
        role: string;
    };
    _count: { comments: number; likes: number };
};

/* ─────────────── Constants ─────────────── */

const BOARD_LABELS: Record<string, string> = {
    FREE: "자유",
    QNA: "Q&A",
    TIPS: "제작 팁",
    SHOWCASE: "작품 자랑",
    RECRUITMENT: "협업 모집",
    NOTICE: "공지",
};

const BOARD_ICONS: Record<string, React.ElementType> = {
    FREE: MessageSquare,
    QNA: HelpCircle,
    TIPS: Lightbulb,
    SHOWCASE: Camera,
    RECRUITMENT: Users,
    NOTICE: Megaphone,
};

const BOARD_COLORS: Record<string, { badge: string; dot: string }> = {
    FREE: {
        badge: "bg-violet-500/15 text-violet-400 border-violet-500/20",
        dot: "bg-violet-500",
    },
    QNA: {
        badge: "bg-orange-500/15 text-orange-400 border-orange-500/20",
        dot: "bg-orange-500",
    },
    TIPS: {
        badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
        dot: "bg-amber-500",
    },
    SHOWCASE: {
        badge: "bg-blue-500/15 text-blue-400 border-blue-500/20",
        dot: "bg-blue-500",
    },
    RECRUITMENT: {
        badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
        dot: "bg-emerald-500",
    },
    NOTICE: {
        badge: "bg-red-500/15 text-red-400 border-red-500/20",
        dot: "bg-red-500",
    },
};

type TabConfig = {
    key: string;
    label: string;
    icon?: React.ElementType;
    params: { boardType?: string; sort: string };
};

const TABS: TabConfig[] = [
    { key: "all", label: "전체", params: { sort: "popular" } },
    { key: "hot", label: "인기", icon: Flame, params: { sort: "popular" } },
    { key: "qna", label: "Q&A", params: { boardType: "QNA", sort: "latest" } },
    { key: "tips", label: "제작 팁", params: { boardType: "TIPS", sort: "latest" } },
    { key: "showcase", label: "작품 자랑", params: { boardType: "SHOWCASE", sort: "latest" } },
    { key: "recruit", label: "협업 모집", params: { boardType: "RECRUITMENT", sort: "latest" } },
];

/* ─────────────── Utilities ─────────────── */

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "방금 전";
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const d = Math.floor(hr / 24);
    if (d < 30) return `${d}일 전`;
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(dateStr));
}

function formatViews(n: number) {
    if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
    return n.toLocaleString();
}

function stripHtml(str: string) {
    return str.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/* ─────────────── Animation Variants ─────────────── */

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

/* ─────────────── Sub Components ─────────────── */

function BoardBadge({ boardType }: { boardType: string }) {
    const colors = BOARD_COLORS[boardType] || BOARD_COLORS.FREE;
    const Icon = BOARD_ICONS[boardType] || MessageSquare;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0",
                colors.badge
            )}
        >
            <Icon className="w-3 h-3" />
            {BOARD_LABELS[boardType] || boardType}
        </span>
    );
}

function AuthorAvatar({ author }: { author: CommunityPost["author"]; size?: "sm" | "md" }) {
    const name = author.chineseName || author.name;
    if (author.avatarUrl) {
        return (
            <img
                src={author.avatarUrl}
                alt={name}
                className="w-7 h-7 rounded-full object-cover shrink-0"
            />
        );
    }
    return (
        <div className="w-7 h-7 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0">
            {name.charAt(0)}
        </div>
    );
}

function EngagementMeta({ post, compact = false }: { post: CommunityPost; compact?: boolean }) {
    const textSize = compact ? "text-[10px]" : "text-[11px]";
    return (
        <div className={cn("flex items-center gap-2.5 text-muted-foreground", textSize)}>
            <span className="flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" />
                {post._count.comments}
            </span>
            <span className="flex items-center gap-0.5">
                <Heart className="w-3 h-3" />
                {post._count.likes}
            </span>
            <span className="flex items-center gap-0.5">
                <Eye className="w-3 h-3" />
                {formatViews(post.viewCount)}
            </span>
        </div>
    );
}

/* ── Community Post Card (모바일 카드 템플릿) ── */
function CommunityPostCard({ post, isHot }: { post: CommunityPost; isHot?: boolean }) {
    const authorName = post.author.chineseName || post.author.name;
    const preview = stripHtml(post.content);

    return (
        <motion.div variants={itemVariants} className="h-full">
            <Link
                href={`/community/${post.id}`}
                className="group flex flex-col h-full rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 active:scale-[0.98] overflow-hidden"
            >
                {/* 1. Upper Content Area */}
                <div className="p-5 flex-1 flex flex-col">
                    {/* Header: badges + engagement */}
                    <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {isHot && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/20 animate-pulse-subtle shrink-0">
                                    <Flame className="w-3 h-3" /> HOT
                                </span>
                            )}
                            <BoardBadge boardType={post.boardType} />
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base sm:text-lg font-bold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors leading-snug">
                        {post.title}
                    </h3>

                    {/* Content Preview */}
                    {preview && (
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-4 mt-auto">
                            {preview}
                        </p>
                    )}
                </div>

                {/* 2. Lower Meta Area */}
                <div className="px-5 py-3.5 bg-muted/20 border-t border-border/50 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                        <AuthorAvatar author={post.author} size="sm" />
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-foreground/90 truncate max-w-[100px]">
                                {authorName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {timeAgo(post.createdAt)}
                            </span>
                        </div>
                    </div>
                    <EngagementMeta post={post} compact />
                </div>
            </Link>
        </motion.div>
    );
}

/* ── Community Post List Row (데스크탑 템플릿) ── */
function CommunityPostListRow({ post, isHot }: { post: CommunityPost; isHot?: boolean }) {
    const authorName = post.author.chineseName || post.author.name;

    return (
        <motion.div variants={itemVariants}>
            <Link
                href={`/community/${post.id}`}
                className="group flex items-center justify-between px-5 py-4 border-b border-border/50 transition-colors bg-card hover:bg-accent/40 active:bg-accent/60 last:border-0"
            >
                <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 shrink-0">
                        {isHot && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/20 animate-pulse-subtle">
                                <Flame className="w-3 h-3" /> HOT
                            </span>
                        )}
                        <BoardBadge boardType={post.boardType} />
                    </div>
                    
                    <h3 className="text-[15px] font-medium text-foreground truncate group-hover:text-primary transition-colors flex-1">
                        {post.title}
                    </h3>
                </div>

                <div className="flex items-center gap-6 shrink-0 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 w-[130px]">
                        <AuthorAvatar author={post.author} size="sm" />
                        <span className="truncate text-[13px] font-medium text-foreground/80">{authorName}</span>
                    </div>
                    <div className="w-[70px] text-right text-xs">
                        {timeAgo(post.createdAt)}
                    </div>
                    <div className="w-[140px] flex justify-end">
                        <EngagementMeta post={post} compact />
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}


/* ── Skeleton Loading ── */
function CommunitySkeletonDesktopList() {
    return (
        <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-muted/30 border-b border-border">
                <Skeleton className="h-4 w-12" />
                <div className="flex items-center gap-6">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="flex items-center justify-between px-5 py-4 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-4 flex-1 pr-4">
                        <Skeleton className="h-6 w-16 rounded-md shrink-0" />
                        <Skeleton className="h-5 w-3/4 max-w-md shrink-0" />
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                        <div className="flex items-center gap-2 w-[130px]">
                            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                            <Skeleton className="h-4 w-16 shrink-0" />
                        </div>
                        <div className="w-[70px] flex justify-end">
                            <Skeleton className="h-4 w-10 shrink-0" />
                        </div>
                        <div className="w-[140px] flex justify-end">
                            <Skeleton className="h-4 w-24 shrink-0" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function CommunitySkeletonMobileGrid() {
    return (
        <div className="grid md:hidden grid-cols-1 sm:grid-cols-2 gap-5">
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-border bg-card flex flex-col h-[220px]">
                    <div className="p-5 flex-1 space-y-3">
                        <Skeleton className="h-5 w-16 rounded-md" />
                        <Skeleton className="h-6 w-11/12" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full mt-4" />
                        <Skeleton className="h-4 w-4/5" />
                    </div>
                    <div className="px-5 py-3.5 bg-muted/10 border-t border-border/50 flex items-center gap-2">
                        <Skeleton className="h-7 w-7 rounded-full" />
                        <div className="space-y-1.5 flex-1">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-2 w-12" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── Empty State ── */
function EmptyState() {
    const categoryChips = [
        { label: "자유", icon: MessageSquare, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
        { label: "Q&A", icon: HelpCircle, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
        { label: "제작 팁", icon: Lightbulb, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
        { label: "협업 모집", icon: Users, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    ];

    return (
        <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-primary" />
                <Sparkles className="w-4 h-4 text-amber-400 -ml-2 -mt-4" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
                커뮤니티의 첫 이야기를 시작해보세요!
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                영상 제작 팁, Q&A, 협업 모집 등 크리에이터들과 소통하는 공간입니다
            </p>

            {/* Category chips */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
                {categoryChips.map((chip) => {
                    const Icon = chip.icon;
                    return (
                        <span
                            key={chip.label}
                            className={cn(
                                "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border",
                                chip.color
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {chip.label}
                        </span>
                    );
                })}
            </div>

            <Link
                href="/community/write"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity active:scale-95 shadow-lg shadow-primary/20"
            >
                <PenSquare className="w-4 h-4" />
                첫 글 작성하기
            </Link>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   ██  Main Component
   ═══════════════════════════════════════════════════════ */

export function CommunityPreview() {
    const [activeTab, setActiveTab] = useState("all");

    const currentTab = TABS.find((t) => t.key === activeTab) || TABS[0];

    const { data, isLoading } = useQuery({
        queryKey: ["community-preview", activeTab],
        queryFn: async () => {
            const params = new URLSearchParams({
                pageSize: "8",
                sort: currentTab.params.sort,
            });
            if (currentTab.params.boardType) {
                params.set("boardType", currentTab.params.boardType);
            }
            const res = await fetch(`/api/board/posts?${params.toString()}`);
            if (!res.ok) return [];
            const json = await res.json();
            return (json.data || []) as CommunityPost[];
        },
        staleTime: 2 * 60 * 1000,
    });

    const posts = data || [];
    const isHotTab = activeTab === "all" || activeTab === "hot";

    return (
        <section className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="community-heading">
            {/* ─── Section Header ─── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div>
                    <h2 id="community-heading" className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <MessageSquare className="w-7 h-7 text-primary" />
                        커뮤니티
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2 md:mt-3">
                        영상 제작자들의 이야기를 나누고 팁을 얻어보세요
                    </p>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                    <Link
                        href="/community/write"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-md shadow-primary/10 active:scale-95"
                    >
                        <PenSquare className="w-4 h-4" />
                        글쓰기
                    </Link>
                    <Link
                        href="/community"
                        className="hidden md:flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
                    >
                        전체 게시글 보기 <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* ─── Tab Filter ─── */}
            <div className="mb-6">
                <div
                    className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide snap-x"
                    role="tablist"
                    aria-label="게시판 카테고리"
                >
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.key;
                        const TabIcon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full border whitespace-nowrap transition-all duration-200 snap-start shrink-0",
                                    isActive
                                        ? "bg-foreground text-background border-foreground shadow-[0_4px_14px_0_rgba(255,255,255,0.1)]"
                                        : "bg-card text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                {TabIcon && <TabIcon className={cn("w-4 h-4", isActive ? "text-background" : "text-muted-foreground")} />}
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── Content Area ─── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                >
                    {isLoading ? (
                        <>
                            <CommunitySkeletonDesktopList />
                            <CommunitySkeletonMobileGrid />
                        </>
                    ) : posts.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <>
                            {/* 데스크탑 리스트 뷰 */}
                            <motion.div
                                className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                <div className="flex items-center justify-between px-5 py-3.5 bg-muted/40 border-b border-border text-[13px] font-bold text-muted-foreground/80">
                                    <div className="flex-1 pl-[92px]">제목</div>
                                    <div className="flex items-center gap-6">
                                        <div className="w-[130px] text-left">작성자</div>
                                        <div className="w-[70px] text-right">작성일</div>
                                        <div className="w-[140px] text-right pr-1">조회 / 공감 / 댓글</div>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    {posts.map((post, index) => {
                                        const showHotBadge = isHotTab && index < 2 && post.likeCount >= 1;
                                        return (
                                            <CommunityPostListRow 
                                                key={post.id} 
                                                post={post} 
                                                isHot={showHotBadge} 
                                            />
                                        );
                                    })}
                                </div>
                            </motion.div>

                            {/* 모바일 2열 카드 뷰 */}
                            <motion.div
                                className="grid md:hidden grid-cols-1 sm:grid-cols-2 gap-5"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                {posts.slice(0, 4).map((post, index) => {
                                    // 모바일은 최대 4개까지만 노출하여 스크롤 최적화
                                    const showHotBadge = isHotTab && index < 2 && post.likeCount >= 1;
                                    return (
                                        <CommunityPostCard 
                                            key={post.id} 
                                            post={post} 
                                            isHot={showHotBadge} 
                                        />
                                    );
                                })}
                            </motion.div>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex justify-center md:hidden">
                <Link
                    href="/community"
                    className="flex items-center text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
                >
                    커뮤니티 전체 보기 <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
            </div>
        </section>
    );
}
