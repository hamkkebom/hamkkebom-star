"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Youtube, Instagram, MonitorPlay, Loader2, Link as LinkIcon, Save, Trash2, Search, Video as VideoIcon } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type MediaPlacement = {
    id: string;
    videoId: string;
    medium: string;
    url: string | null;
    status: string;
    createdAt: string;
};

type AssignPlacementModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    videoId?: string;
    videoTitle?: string;
};

const PLATFORMS = [
    { id: "YOUTUBE", label: "YouTube", icon: Youtube, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", activeBg: "bg-red-50", activeBorder: "border-red-500" },
    { id: "INSTAGRAM", label: "Instagram", icon: Instagram, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20", activeBg: "bg-fuchsia-50", activeBorder: "border-fuchsia-500" },
    { id: "TIKTOK", label: "TikTok", icon: MonitorPlay, color: "text-slate-900 dark:text-slate-100", bg: "bg-slate-500/10", border: "border-slate-500/20", activeBg: "bg-slate-100 dark:bg-slate-800", activeBorder: "border-slate-900 dark:border-slate-400" },
];

export function AssignPlacementModal({ open, onOpenChange, videoId = "", videoTitle = "" }: AssignPlacementModalProps) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<string>("YOUTUBE");
    const [url, setUrl] = useState("");

    // Internal state for video selection when not provided
    const [internalVideoId, setInternalVideoId] = useState(videoId);
    const [internalVideoTitle, setInternalVideoTitle] = useState(videoTitle);
    const [searchQuery, setSearchQuery] = useState("");

    // Sync props with internal state on open
    useEffect(() => {
        if (open) {
            setInternalVideoId(videoId);
            setInternalVideoTitle(videoTitle);
            setSearchQuery("");
        }
    }, [open, videoId, videoTitle]);

    // Search query for videos
    const { data: searchResults, isFetching: isSearching } = useQuery({
        queryKey: ["admin-videos-search", searchQuery],
        queryFn: async () => {
            if (!searchQuery) return [];
            const res = await fetch(`/api/videos?q=${encodeURIComponent(searchQuery)}&pageSize=5`);
            if (!res.ok) return [];
            const json = await res.json();
            return json.data || [];
        },
        enabled: open && !internalVideoId && searchQuery.length >= 1,
    });

    // Get placements for this video
    const { data, isLoading } = useQuery({
        queryKey: ["admin-placements", internalVideoId],
        queryFn: async () => {
            const res = await fetch(`/api/admin/placements?videoId=${internalVideoId}`);
            if (!res.ok) throw new Error("Failed to fetch placements");
            return (await res.json()) as { data: MediaPlacement[] };
        },
        enabled: open && !!internalVideoId,
    });

    const placements = data?.data || [];
    const activePlacement = placements.find((p) => p.medium === activeTab);

    // When tab changes, populate URL if it exists
    useEffect(() => {
        if (activePlacement) {
            setUrl(activePlacement.url || "");
        } else {
            setUrl("");
        }
    }, [activeTab, activePlacement]);

    const saveMutation = useMutation({
        mutationFn: async ({ medium, urlValue }: { medium: string; urlValue: string }) => {
            const res = await fetch("/api/admin/placements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoId: internalVideoId, medium, url: urlValue }),
            });
            if (!res.ok) throw new Error("Failed to save");
            return res.json();
        },
        onSuccess: () => {
            toast.success("매체 게시 정보가 저장되었습니다.");
            queryClient.invalidateQueries({ queryKey: ["admin-placements", internalVideoId] });
            queryClient.invalidateQueries({ queryKey: ["admin-placements-list"] }); // Also update the dashboard
        },
        onError: () => toast.error("저장에 실패했습니다."),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/admin/placements?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            return res.json();
        },
        onSuccess: () => {
            toast.success("매체 게시 정보가 삭제되었습니다.");
            setUrl("");
            queryClient.invalidateQueries({ queryKey: ["admin-placements", internalVideoId] });
            queryClient.invalidateQueries({ queryKey: ["admin-placements-list"] });
        },
        onError: () => toast.error("삭제에 실패했습니다."),
    });

    const handleSave = () => {
        saveMutation.mutate({ medium: activeTab, urlValue: url });
    };

    const handleDelete = () => {
        if (activePlacement) {
            deleteMutation.mutate(activePlacement.id);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md overflow-hidden bg-background/80 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-2xl p-0">
                <div className="p-6 pb-4">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center justify-between">
                            <span className="flex items-center gap-2">광고 매체 할당</span>
                            {!videoId && internalVideoId && (
                                <Button variant="ghost" size="sm" onClick={() => setInternalVideoId("")} className="h-7 text-xs px-2 text-muted-foreground">
                                    다른 영상 선택
                                </Button>
                            )}
                        </DialogTitle>
                        <DialogDescription className="truncate max-w-[350px]">
                            {internalVideoId ? (
                                <>
                                    <span className="font-semibold text-foreground mr-1">"{internalVideoTitle}"</span>
                                    영상이 업로드된 매체를 등록하세요.
                                </>
                            ) : (
                                "매체에 등록할 영상을 검색하여 선택하세요."
                            )}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {!internalVideoId ? (
                    <div className="px-6 pb-6 space-y-4 min-h-[250px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="영상 제목, 모델명, 틱톡커 아이디 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-muted/50 focus-visible:bg-background transition-colors"
                            />
                        </div>

                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                            {isSearching ? (
                                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                            ) : searchResults?.length === 0 && searchQuery ? (
                                <p className="text-center text-sm text-muted-foreground py-6">검색 결과가 없습니다.</p>
                            ) : (
                                searchResults?.map((video: any) => (
                                    <button
                                        key={video.id}
                                        onClick={() => {
                                            setInternalVideoId(video.id);
                                            setInternalVideoTitle(video.title);
                                        }}
                                        className="w-full text-left flex items-start flex-col gap-1 px-3 py-2.5 rounded-lg border border-transparent hover:bg-muted/50 hover:border-border transition-colors group"
                                    >
                                        <span className="text-sm font-semibold truncate w-full group-hover:text-primary transition-colors">{video.title}</span>
                                        <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-sm">
                                            {video.owner?.chineseName ? `${video.owner.chineseName} / ` : ''}{video.owner?.name}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                ) : isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="px-6 pb-6 space-y-6">
                        {/* Platforms Tabs Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            {PLATFORMS.map((plat) => {
                                const isSelected = activeTab === plat.id;
                                const isAssigned = placements.some((p) => p.medium === plat.id);

                                return (
                                    <button
                                        key={plat.id}
                                        onClick={() => setActiveTab(plat.id)}
                                        className={cn(
                                            "relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200 overflow-hidden group",
                                            isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted/50",
                                        )}
                                    >
                                        {/* Assigned Indicator Dot */}
                                        {isAssigned && (
                                            <span className="absolute top-2 right-2 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                        )}

                                        <div className={cn("p-2 rounded-full", plat.bg, isSelected && plat.activeBg)}>
                                            <plat.icon className={cn("h-5 w-5", plat.color)} />
                                        </div>
                                        <span className={cn("text-xs font-semibold", isSelected ? "text-primary" : "text-muted-foreground")}>
                                            {plat.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Editing Form */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold flex items-center justify-between">
                                        <span>{PLATFORMS.find(p => p.id === activeTab)?.label} 게시물 URL</span>
                                        {activePlacement && (
                                            <span className="text-[10px] text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                                                등록됨
                                            </span>
                                        )}
                                    </Label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="https://"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            className="pl-9 h-11 bg-muted/50 focus-visible:bg-background transition-colors"
                                        />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        이 주소는 관리자 전용 대시보드에서 링크로 바로가기를 지원합니다.
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    {activePlacement && (
                                        <Button
                                            variant="destructive"
                                            className="flex-1"
                                            onClick={handleDelete}
                                            disabled={deleteMutation.isPending}
                                        >
                                            {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                            할당 해제
                                        </Button>
                                    )}
                                    <Button
                                        className={cn("flex-1", !activePlacement && "w-full")}
                                        onClick={handleSave}
                                        disabled={saveMutation.isPending || (!url && !activePlacement)}
                                    >
                                        {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        {activePlacement ? "변경사항 저장" : "매체 할당"}
                                    </Button>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
