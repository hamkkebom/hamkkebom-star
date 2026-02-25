"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Youtube, Instagram, MonitorPlay, Layers, ExternalLink, Loader2, Plus, Share2, Search, Film } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssignPlacementModal } from "@/components/admin/assign-placement-modal";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type PlacementRow = {
    id: string;
    medium: string;
    videoId: string;
    url: string | null;
    createdAt: string;
    video: {
        title: string;
        thumbnailUrl: string | null;
        owner: { name: string; chineseName: string | null; avatarUrl: string | null };
    };
};

type ListResponse = {
    data: PlacementRow[];
    stats: Record<string, number>;
    meta: { total: number; page: number; totalPages: number };
};

const PLATFORMS = [
    { id: "ALL", label: "전체", icon: Layers, styles: "text-foreground bg-foreground/10" },
    { id: "YOUTUBE", label: "YouTube", icon: Youtube, styles: "text-red-500 bg-red-500/10" },
    { id: "INSTAGRAM", label: "Instagram", icon: Instagram, styles: "text-fuchsia-500 bg-fuchsia-500/10" },
    { id: "TIKTOK", label: "TikTok", icon: MonitorPlay, styles: "text-slate-900 dark:text-slate-100 bg-slate-500/10" },
];

export default function PlacementsDashboard() {
    const [activePlatform, setActivePlatform] = useState("ALL");
    const [page, setPage] = useState(1);

    // State for Assign Placement Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<{ id: string; title: string } | null>(null);

    // State for Video List section
    const [videoPage, setVideoPage] = useState(1);
    const [videoSearch, setVideoSearch] = useState("");
    const [videoSearchInput, setVideoSearchInput] = useState("");

    // Fetch placement data
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["admin-placements-list", activePlatform, page],
        queryFn: async () => {
            const res = await fetch(`/api/admin/placements/list?medium=${activePlatform}&page=${page}`);
            if (!res.ok) throw new Error("Failed to fetch");
            return (await res.json()) as ListResponse;
        }
    });

    // Fetch video list
    const { data: videoData, isLoading: isVideosLoading, isFetching: isVideosFetching } = useQuery({
        queryKey: ["admin-videos-for-placement", videoPage, videoSearch],
        queryFn: async () => {
            const params = new URLSearchParams({ page: String(videoPage), pageSize: "10" });
            if (videoSearch) params.set("q", videoSearch);
            const res = await fetch(`/api/videos?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch videos");
            return res.json();
        }
    });

    const rows = data?.data || [];
    const stats = data?.stats || {};
    const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

    const videos = videoData?.data || [];
    const videoMeta = {
        total: videoData?.total || 0,
        page: videoData?.page || 1,
        totalPages: videoData?.totalPages || 1,
    };

    const handleVideoSearch = () => {
        setVideoSearch(videoSearchInput);
        setVideoPage(1);
    };

    return (
        <div className="space-y-10 max-w-[1400px] mx-auto pb-10">
            {/* ========== SECTION 1: Media Placement Dashboard ========== */}
            <div className="space-y-6">
                {/* Header & Filters */}
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center pb-1">
                            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                                매체별 영상 현황
                            </h1>
                            <Button
                                onClick={() => {
                                    setSelectedVideo(null);
                                    setModalOpen(true);
                                }}
                                className="rounded-full shadow-sm hover:shadow-md transition-all group"
                            >
                                <Plus className="w-4 h-4 mr-1.5 group-hover:rotate-90 transition-transform duration-300" />
                                새 매체 등록
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            승인된 영상들이 광고 및 소셜 미디어 플랫폼에 어떻게 사용되고 있는지 확인합니다.
                        </p>
                    </div>

                    {/* Glassmorphic Filters */}
                    <div className="flex gap-2 pb-2 overflow-x-auto snap-x scrollbar-hide">
                        {PLATFORMS.map((plat) => {
                            const isActive = activePlatform === plat.id;
                            const count = stats[plat.id] ?? 0;
                            return (
                                <button
                                    key={plat.id}
                                    onClick={() => { setActivePlatform(plat.id); setPage(1); }}
                                    className={cn(
                                        "relative flex items-center gap-2.5 px-4 py-2.5 rounded-full border transition-all duration-300 snap-center shrink-0",
                                        isActive
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-border hover:bg-muted/50 bg-background/50 backdrop-blur-md"
                                    )}
                                >
                                    <div className={cn("p-1.5 rounded-full", plat.styles, isActive && "scale-110 shadow-sm transition-transform duration-300")}>
                                        <plat.icon className="h-4 w-4" />
                                    </div>
                                    <span className={cn("text-sm font-semibold tracking-tight", isActive ? "text-primary" : "text-muted-foreground")}>
                                        {plat.label}
                                    </span>
                                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 rounded-full h-5 font-bold tabular-nums">
                                        {typeof count === 'number' ? count.toString().padStart(2, '0') : '0'}
                                    </Badge>
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeFilter"
                                            className="absolute bottom-0 left-6 right-6 h-[2px] rounded-t-full bg-primary"
                                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Grid Layout */}
                <div className="relative min-h-[200px]">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-[200px]">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-center border rounded-2xl border-dashed bg-muted/20">
                            <div className="p-4 bg-muted/50 rounded-full mb-4">
                                <Layers className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="font-semibold text-lg">기록이 없습니다.</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                선택한 매체에 할당된 영상 기록이 없습니다.<br />아래 영상 목록에서 매체를 등록해보세요.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <AnimatePresence mode="popLayout">
                                {rows.map((row, idx) => {
                                    const PlatConfig = PLATFORMS.find(p => p.id === row.medium) || PLATFORMS[0];
                                    return (
                                        <motion.div
                                            key={row.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                                            transition={{ type: "spring", stiffness: 400, damping: 30, delay: idx * 0.03 }}
                                            className={cn(
                                                "group relative flex flex-col rounded-2xl border bg-background/50 backdrop-blur-md overflow-hidden",
                                                "hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-primary/20 transition-all duration-300",
                                                isFetching && "opacity-60"
                                            )}
                                        >
                                            <div className={cn("absolute top-0 left-0 right-0 h-1", PlatConfig.styles.replace("text-", "bg-").split(" ")[0])} />

                                            <div className="p-5 flex-1 flex flex-col gap-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1.5">
                                                        <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold tracking-tight", PlatConfig.styles)}>
                                                            <PlatConfig.icon className="h-3.5 w-3.5" />
                                                            {PlatConfig.label}
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground font-medium pl-1">
                                                            등록: {format(new Date(row.createdAt), "yy. MM. dd", { locale: ko })}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-[10px] bg-muted/50 hover:bg-primary/10 hover:text-primary rounded-full transition-colors"
                                                        onClick={() => {
                                                            setSelectedVideo({ id: row.videoId, title: row.video.title });
                                                            setModalOpen(true);
                                                        }}
                                                    >
                                                        수정
                                                    </Button>
                                                </div>

                                                <div className="space-y-1">
                                                    <h3 className="font-bold text-base leading-snug line-clamp-2 uppercase group-hover:text-primary transition-colors">
                                                        {row.video.title}
                                                    </h3>
                                                    <p className="text-xs font-semibold text-muted-foreground bg-muted/50 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm">
                                                        {row.video.owner.chineseName && `${row.video.owner.chineseName} / `}{row.video.owner.name}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="px-5 py-4 border-t bg-muted/20 flex items-center justify-between mt-auto">
                                                {row.url ? (
                                                    <div className="flex items-center gap-2 max-w-[80%]">
                                                        <div className={cn("h-6 w-6 rounded-full flex items-center justify-center shrink-0 shadow-sm", PlatConfig.styles)}>
                                                            <PlatConfig.icon className="h-3 w-3" />
                                                        </div>
                                                        <span className="text-[11px] font-medium text-muted-foreground truncate" title={row.url}>
                                                            {(() => { try { return new URL(row.url).hostname.replace("www.", ""); } catch { return row.url; } })()}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] font-medium text-muted-foreground/60 italic">URL 없음</span>
                                                )}

                                                {row.url && (
                                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-primary/20 text-primary hover:bg-primary hover:text-white transition-all shadow-sm" asChild>
                                                        <a href={row.url} target="_blank" rel="noopener noreferrer">
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Placement Pagination */}
                {!isLoading && meta.totalPages > 1 && (
                    <div className="flex justify-center">
                        <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-md p-1.5 border rounded-full shadow-sm">
                            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isFetching} className="rounded-full px-4">이전</Button>
                            <span className="text-xs font-semibold px-2 tabular-nums">{page} <span className="text-muted-foreground font-normal mx-0.5">/</span> {meta.totalPages}</span>
                            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages || isFetching} className="rounded-full px-4">다음</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ========== SECTION 2: Video List for Direct Assignment ========== */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10">
                            <Film className="h-4.5 w-4.5 text-cyan-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight">영상 목록에서 매체 등록</h2>
                            <p className="text-xs text-muted-foreground">등록된 전체 영상을 탐색하고, 원하는 영상에 바로 매체를 배정할 수 있습니다.</p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <form onSubmit={(e) => { e.preventDefault(); handleVideoSearch(); }} className="flex gap-2">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="영상 제목, 모델명으로 검색..."
                            value={videoSearchInput}
                            onChange={(e) => setVideoSearchInput(e.target.value)}
                            className="pl-9 bg-muted/30 focus-visible:bg-background transition-colors"
                        />
                    </div>
                    <Button type="submit" variant="secondary" className="shrink-0">검색</Button>
                    {videoSearch && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setVideoSearch(""); setVideoSearchInput(""); setVideoPage(1); }} className="text-muted-foreground">
                            초기화
                        </Button>
                    )}
                </form>

                {/* Video Table */}
                <div className="rounded-xl border bg-background/50 backdrop-blur-md overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[50%]">영상 제목</TableHead>
                                <TableHead>소유자</TableHead>
                                <TableHead>등록일</TableHead>
                                <TableHead className="text-right pr-6">액션</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isVideosLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : videos.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                        검색 결과가 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                videos.map((v: any) => (
                                    <TableRow key={v.id} className={cn("group", isVideosFetching && "opacity-60")}>
                                        <TableCell className="font-medium max-w-[300px]">
                                            <span className="truncate block">{v.title}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-semibold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-sm">
                                                {v.owner?.chineseName ? `${v.owner.chineseName} / ` : ''}{v.owner?.name || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(v.createdAt), "yy.MM.dd", { locale: ko })}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedVideo({ id: v.id, title: v.title });
                                                    setModalOpen(true);
                                                }}
                                                className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-transparent"
                                            >
                                                <Share2 className="w-3.5 h-3.5 mr-1" /> 매체 등록
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Video Pagination */}
                {!isVideosLoading && videoMeta.totalPages > 1 && (
                    <div className="flex justify-center">
                        <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-md p-1.5 border rounded-full shadow-sm">
                            <Button variant="ghost" size="sm" onClick={() => setVideoPage(p => Math.max(1, p - 1))} disabled={videoPage === 1 || isVideosFetching} className="rounded-full px-4">이전</Button>
                            <span className="text-xs font-semibold px-2 tabular-nums">{videoPage} <span className="text-muted-foreground font-normal mx-0.5">/</span> {videoMeta.totalPages}</span>
                            <Button variant="ghost" size="sm" onClick={() => setVideoPage(p => Math.min(videoMeta.totalPages, p + 1))} disabled={videoPage >= videoMeta.totalPages || isVideosFetching} className="rounded-full px-4">다음</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Assign Placement Modal */}
            <AssignPlacementModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                videoId={selectedVideo?.id || ""}
                videoTitle={selectedVideo?.title || ""}
            />
        </div>
    );
}
