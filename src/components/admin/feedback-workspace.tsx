"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
    Play, Clock, CheckCircle2, MessageSquare,
    X, ThumbsUp, ThumbsDown,
    Sparkles, Send, Loader2, FileVideo,
    Search, Command, User,
    AlertTriangle,
    Tag, Flag,
    ChevronLeft, Edit2, Trash2, MoreHorizontal, Download, Brush,
    ImageIcon, ZoomIn
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbnailPreview } from "./feedback-dashboard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

import { Undo2 } from "lucide-react";
import dynamic from "next/dynamic";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale/ko";
import { downloadThumbnail } from "@/lib/download-thumbnail";
import { AnnotationCanvas } from "@/components/admin/annotation-canvas";
import { DrawingPreview } from "@/components/admin/drawing-preview";
import { EmptyState } from "@/components/ui/empty-state";

// Shared types, constants, helpers
import type { Submission } from "@/types/feedback-workspace";
import {
    FEEDBACK_TYPES, PRIORITY_OPTIONS,
    TYPE_LABELS, TYPE_COLORS, PRIORITY_BADGE,
    formatTime,
} from "@/types/feedback-workspace";

// Custom hook — all state, queries, mutations, handlers
import { useFeedbackWorkspace } from "@/hooks/use-feedback-workspace";

// Dynamic imports
/* eslint-disable @typescript-eslint/no-explicit-any */
const VideoPlayer = dynamic(() => import("@/components/video/video-player").then((mod: any) => mod.VideoPlayer || mod.default || mod) as any, {
    ssr: false,
    loading: () => <div className="flex h-full w-full items-center justify-center bg-black text-slate-500"><Loader2 className="h-8 w-8 animate-spin" /></div>
}) as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================================
//  MAIN COMPONENT (View-only — logic in useFeedbackWorkspace)
// ============================================================

export function FeedbackWorkspace({
    submissions: initialSubmissions,
    initialSelectedId,
    isStandalone = false
}: {
    submissions: Submission[];
    initialSelectedId?: string;
    isStandalone?: boolean;
}) {
    const {
        // State
        submissions, selectedId, filter, searchQuery,
        currentTime, duration, seekTo,
        feedbackText, feedbackType, feedbackPriority,
        capturedTime, isTimeCaptured,
        actionModal, rejectReason, adEligible,
        editingFeedbackId, editFeedbackText, editFeedbackType, editFeedbackPriority,
        isDownloading, isMobileSheetOpen,
        // Canvas
        isCanvasActive, toggleCanvas, drawingObjects, loadDrawing,
        hasDrawingAttached, attachedTimecode, detachDrawing,
        videoContainerRef,
        // Derived
        selectedSubmission, filteredSubmissions, feedbacksRaw, isFeedbacksLoading, streamUid,
        // Mutations
        createFeedbackMutation, updateFeedbackMutation, deleteFeedbackMutation, reviewMutation,
        // Setters
        setFilter, setSearchQuery, setCurrentTime, setDuration, setSeekTo,
        setFeedbackText, setFeedbackType, setFeedbackPriority,
        setCapturedTime, setIsTimeCaptured,
        setActionModal, setRejectReason, setAdEligible,
        setEditFeedbackText, setEditFeedbackType, setEditFeedbackPriority,
        setIsMobileSheetOpen,
        // Handlers
        handleCaptureTime, clearCapturedTime, handleAction, confirmAction,
        startEditingFeedback, cancelEditing, saveEditing,
        handleSelectSubmission, handleDownload,
    } = useFeedbackWorkspace({ submissions: initialSubmissions, initialSelectedId });

    return (
        <TooltipProvider>
            <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-50 dark:bg-[#080810] text-slate-800 dark:text-slate-200 font-sans selection:bg-indigo-500/30">

                {/* ================================================================
                    LEFT PANEL: QUEUE
                   ================================================================ */}
                {!isStandalone && (
                    <div
                        className={cn(
                            "flex flex-col border-r border-slate-200 dark:border-border/50 bg-white dark:bg-[#0c0c14] relative z-20 shrink-0 h-full",
                            selectedId ? "hidden lg:flex w-[320px]" : "w-full lg:w-[380px]"
                        )}
                    >
                        {/* Header */}
                        <div className="p-5 pb-2">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                                        <Sparkles className="w-4 h-4 text-foreground" />
                                    </div>
                                    Feedback Studio
                                </h2>
                                <Badge variant="outline" className="border-border text-slate-500 text-[10px]">
                                    {submissions.length}건
                                </Badge>
                            </div>

                            {/* Search */}
                            <div className="relative group mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                                <Input
                                    placeholder="STAR 또는 영상 검색..."
                                    className="pl-9 bg-secondary/30 border-border/50 focus:border-indigo-500/40 focus:bg-white/[0.05] h-9 rounded-xl text-sm transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Filter Tabs */}
                            <div className="flex gap-1 p-1 bg-secondary/30 rounded-lg border border-white/[0.04]">
                                {[
                                    { id: "ALL", label: "전체" },
                                    { id: "PENDING", label: "대기" },
                                    { id: "IN_REVIEW", label: "피드백중" }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setFilter(tab.id)}
                                        className={cn(
                                            "flex-1 text-[11px] font-bold py-1.5 rounded-md transition-all duration-200",
                                            filter === tab.id
                                                ? "bg-indigo-500/90 text-foreground shadow-sm shadow-indigo-500/25"
                                                : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submission List */}
                        <ScrollArea className="flex-1 px-3 pb-4">
                            <div className="space-y-1.5 pt-2">
                                <AnimatePresence mode="popLayout">
                                    {filteredSubmissions.length > 0 ? (
                                        filteredSubmissions.map((sub, i) => (
                                            <motion.div
                                                key={sub.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.96 }}
                                                transition={{ delay: i * 0.04, duration: 0.3 }}
                                                onClick={() => handleSelectSubmission(sub.id)}
                                                className={cn(
                                                    "group relative p-3 rounded-xl cursor-pointer transition-all duration-200 border",
                                                    selectedId === sub.id
                                                        ? "bg-white/[0.06] border-indigo-500/30 shadow-lg shadow-indigo-500/5"
                                                        : "border-transparent hover:bg-white/[0.04] hover:border-border/50"
                                                )}
                                            >
                                                {selectedId === sub.id && (
                                                    <motion.div
                                                        layoutId="active-indicator"
                                                        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                                                    />
                                                )}

                                                <div className="flex gap-3">
                                                    {/* Thumbnail */}
                                                    <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-black shrink-0 ring-1 ring-white/[0.08]">
                                                        <ThumbnailPreview
                                                            thumbnailUrl={sub.video?.thumbnailUrl || null}
                                                            videoTitle={sub.video?.title || sub.assignment?.request.title || sub.versionTitle || "제목 없음"}
                                                        />
                                                        {sub.status === "IN_REVIEW" && (
                                                            <div className="absolute top-1 left-1">
                                                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                                                            </div>
                                                        )}
                                                        <div className="absolute bottom-0.5 right-0.5 px-1 py-0.5 bg-background rounded text-[8px] font-mono text-muted-foreground">
                                                            v{sub.version.replace(/^v/i, "")}
                                                        </div>
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex flex-col flex-1 min-w-0 justify-center">
                                                        <div className="flex items-center gap-1 mb-0.5">
                                                            <Avatar className="w-3.5 h-3.5">
                                                                <AvatarImage src={sub.star.avatarUrl || undefined} />
                                                                <AvatarFallback className="text-[7px] bg-slate-700">{(sub.star.chineseName || sub.star.name)[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-[10px] text-slate-500 truncate">{sub.star.chineseName || sub.star.name}</span>
                                                        </div>
                                                        <h3 className={cn(
                                                            "text-xs font-semibold truncate leading-tight transition-colors",
                                                            selectedId === sub.id ? "text-foreground" : "text-slate-300 group-hover:text-foreground"
                                                        )}>
                                                            {sub.video?.title || sub.assignment?.request.title || sub.versionTitle || "제목 없음"}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className="text-[9px] text-slate-600">
                                                                {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true, locale: ko })}
                                                            </span>
                                                            {(sub._count?.feedbacks ?? 0) > 0 && (
                                                                <span className="flex items-center gap-0.5 text-[9px] text-indigo-400/60">
                                                                    <MessageSquare className="w-2.5 h-2.5" />
                                                                    {sub._count?.feedbacks}
                                                                </span>
                                                            )}
{sub.status === "APPROVED" && sub.video && (
                                                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${(sub.video as unknown as Record<string, boolean>).adEligible ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700/50 text-slate-500'}`}>
                                                                     {(sub.video as unknown as Record<string, boolean>).adEligible ? "광고" : "일반"}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <EmptyState preset="no-results" compact />
                                    )}
                                </AnimatePresence>
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {/* ================================================================
                    CENTER: VIDEO STAGE
                   ================================================================ */}
                <div className={cn(
                    "flex flex-col relative bg-black shrink-0 lg:flex-1",
                    !selectedId ? "hidden lg:flex" : "h-full w-full flex-1"
                )}>
                    <AnimatePresence mode="wait">
                        {selectedSubmission ? (
                            <motion.div
                                key={selectedSubmission.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-1 flex-col lg:flex-row overflow-hidden"
                            >
                                {/* Video Area */}
                                <div className="flex-1 flex flex-col relative">
                                    {/* Top Toolbar */}
                                    <div className="h-12 border-b border-slate-200 dark:border-border/50 bg-muted dark:bg-[#0c0c14]/90 flex items-center justify-between px-5 z-30">
                                        <div className="flex items-center gap-3">
                                            {isStandalone && (
                                                <Link href="/admin/reviews/my">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 mr-1 text-slate-400 hover:text-foreground hover:bg-secondary rounded-full transition-colors">
                                                        <ChevronLeft className="w-5 h-5" />
                                                    </Button>
                                                </Link>
                                            )}
                                            <h2 className="text-sm font-bold text-slate-900 dark:text-foreground tracking-tight truncate max-w-[300px]">
                                                {selectedSubmission.video?.title || "영상"}
                                            </h2>
                                            <Badge className="bg-white/[0.06] text-slate-400 hover:bg-secondary border-0 text-[10px] h-5">
                                                {selectedSubmission.versionTitle || `v${selectedSubmission.version.replace(/^v/i, "")}`}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-secondary/50 h-8 text-xs font-medium transition-all"
                                                        onClick={handleDownload}
                                                        disabled={isDownloading || !streamUid}
                                                    >
                                                        {isDownloading ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Download className="w-3.5 h-3.5" />
                                                        )}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">
                                                    <p>영상 다운로드</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <AnimatePresence mode="popLayout">
                                                {selectedSubmission.status === "APPROVED" || selectedSubmission.status === "REJECTED" ? (
                                                    <motion.div
                                                        key="status-badge"
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <div className={cn(
                                                            "px-3 py-1.5 rounded-full text-xs font-medium flex items-center border shadow-sm",
                                                            selectedSubmission.status === "APPROVED"
                                                                ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                                                : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                                                        )}>
                                                            {selectedSubmission.status === "APPROVED" ? (
                                                                <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> 승인 완료</>
                                                            ) : (
                                                                <><AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> 반려됨</>
                                                            )}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-secondary/50 h-8 text-xs font-medium group transition-all"
                                                            onClick={() => handleAction("UNDO")}
                                                            disabled={reviewMutation.isPending}
                                                        >
                                                            <Undo2 className="w-3.5 h-3.5 mr-1.5 group-hover:-rotate-45 transition-transform duration-300" />
                                                            실행 취소
                                                        </Button>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="action-buttons"
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-8 text-xs"
                                                            onClick={() => handleAction("REJECT")}
                                                            disabled={reviewMutation.isPending}
                                                        >
                                                            <ThumbsDown className="w-3.5 h-3.5 mr-1.5" /> 반려
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-foreground shadow-md shadow-emerald-600/20 border-0 h-8 text-xs"
                                                            onClick={() => handleAction("APPROVE")}
                                                            disabled={reviewMutation.isPending}
                                                        >
                                                            <ThumbsUp className="w-3.5 h-3.5 mr-1.5" /> 승인
                                                        </Button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Video Player */}
                                    <div className="flex-1 bg-black relative flex items-center justify-center lg:p-4" ref={videoContainerRef}>
                                        <div className="relative w-full h-full lg:max-h-[calc(100vh-14rem)] lg:aspect-video shadow-2xl lg:rounded-xl overflow-hidden lg:ring-1 lg:ring-white/[0.08] bg-[#050508]">
                                            {streamUid ? (
                                                <>
                                                    <VideoPlayer
                                                        streamUid={streamUid}
                                                        onTimeUpdate={(t: number) => setCurrentTime(t)}
                                                        onDurationChange={(d: number) => setDuration(d)}
                                                        seekTo={seekTo}
                                                    />
                                                    <AnnotationCanvas
                                                        videoRef={videoContainerRef}
                                                        currentTime={currentTime}
                                                        onSave={(strokes, time) => {
                                                            setIsTimeCaptured(true);
                                                            setCapturedTime(time);
                                                        }}
                                                    />
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 gap-3">
                                                    <FileVideo className="w-12 h-12 opacity-30" />
                                                    <p className="text-sm">재생할 소스가 없습니다.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Canvas Toggle FAB */}
                                        {streamUid && !isCanvasActive && (
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="absolute right-6 bottom-6 lg:right-10 lg:bottom-10 z-20 rounded-full shadow-lg w-12 h-12 bg-secondary hover:bg-accent border border-border text-foreground"
                                                onClick={toggleCanvas}
                                            >
                                                <Brush className="w-5 h-5" />
                                            </Button>
                                        )}
                                    </div>

                                    {/* Timeline Bar */}
                                    <div className="h-12 bg-white dark:bg-[#0c0c14] border-t border-slate-200 dark:border-border/50 px-5 flex items-center">
                                        <div className="flex items-center gap-3 w-full max-w-3xl mx-auto">
                                            <span className="text-[10px] font-mono text-slate-500 w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
                                            <input
                                                type="range"
                                                value={currentTime}
                                                max={duration || 1}
                                                step={0.1}
                                                onChange={(e) => setSeekTo(Number(e.target.value))}
                                                className="flex-1 h-1 appearance-none bg-white/[0.08] rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(99,102,241,0.5)] hover:[&::-webkit-slider-thumb]:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                                            />
                                            <span className="text-[10px] font-mono text-slate-500 w-10 tabular-nums">{formatTime(duration)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* ================================================================
                                    RIGHT PANEL: FEEDBACK COMPOSER + HISTORY 
                                    (Desktop: flex-col right panel | Mobile: Bottom sheet overlay)
                                   ================================================================ */}
                                <div className={cn(
                                    "w-full lg:w-[400px] border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-border/50 bg-white dark:bg-[#0c0c14] flex flex-col z-50 shrink-0 transition-transform duration-300",
                                    "lg:relative lg:h-full lg:translate-y-0 lg:rounded-none lg:shadow-none lg:bottom-auto lg:left-auto lg:right-auto",
                                    "fixed bottom-[calc(env(safe-area-inset-bottom,20px)+64px)] left-0 right-0 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] h-[75vh]",
                                    isMobileSheetOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0"
                                )}>
                                    {/* Drag handle for mobile */}
                                    <div
                                        className="lg:hidden w-full flex justify-center pt-3 pb-2 cursor-pointer active:bg-secondary/30 transition-colors rounded-t-3xl"
                                        onClick={() => setIsMobileSheetOpen(false)}
                                    >
                                        <div className="w-12 h-1.5 bg-slate-300 dark:bg-secondary rounded-full" />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="lg:hidden absolute top-2 right-2 rounded-full hover:bg-slate-100 dark:hover:bg-secondary"
                                        onClick={() => setIsMobileSheetOpen(false)}
                                    >
                                        <X className="w-4 h-4 text-slate-500" />
                                    </Button>

                                    <Tabs defaultValue="compose" className="flex flex-col h-full min-h-0">
                                        <div className="px-4 pt-1 lg:pt-3 pb-1">
                                            <TabsList className="w-full bg-slate-100 dark:bg-white/[0.04] h-8">
                                                <TabsTrigger value="compose" className="flex-1 text-xs text-slate-500 dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-500/20 dark:data-[state=active]:text-indigo-300 dark:data-[state=active]:shadow-none">
                                                    ✏️ 작성
                                                </TabsTrigger>
                                                <TabsTrigger value="history" className="flex-1 text-xs text-slate-500 dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-500/20 dark:data-[state=active]:text-indigo-300 dark:data-[state=active]:shadow-none">
                                                    📋 내역 ({feedbacksRaw.length})
                                                </TabsTrigger>
                                                <TabsTrigger value="thumbnail" className="flex-1 text-xs text-slate-500 dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-500/20 dark:data-[state=active]:text-indigo-300 dark:data-[state=active]:shadow-none">
                                                    🖼️ 썸네일
                                                </TabsTrigger>
                                                <TabsTrigger value="info" className="flex-1 text-xs text-slate-500 dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-500/20 dark:data-[state=active]:text-indigo-300 dark:data-[state=active]:shadow-none">
                                                    ℹ️ 정보
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>

                                        {/* ======== TAB: COMPOSE ======== */}
                                        <TabsContent value="compose" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-0">
                                            <ScrollArea className="flex-1 min-h-0">
                                                <div className="p-4 space-y-5">
                                                    {/* Feedback Type Selector — Chip Style */}
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            <Tag className="w-3 h-3" /> 피드백 유형
                                                        </label>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {FEEDBACK_TYPES.map(ft => {
                                                                const Icon = ft.icon;
                                                                const isActive = feedbackType === ft.value;
                                                                return (
                                                                    <motion.button
                                                                        key={ft.value}
                                                                        whileHover={{ scale: 1.03 }}
                                                                        whileTap={{ scale: 0.97 }}
                                                                        onClick={() => setFeedbackType(ft.value)}
                                                                        className={cn(
                                                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200",
                                                                            isActive
                                                                                ? `${ft.color} ring-1 ring-current/20 shadow-sm`
                                                                                : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-border/50 dark:bg-secondary/30 dark:hover:bg-secondary/50 dark:hover:text-slate-300"
                                                                        )}
                                                                    >
                                                                        <Icon className="w-3.5 h-3.5" />
                                                                        {ft.label}
                                                                    </motion.button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Priority Selector — Pill Style */}
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            <Flag className="w-3 h-3" /> 우선순위
                                                        </label>
                                                        <div className="flex gap-1.5">
                                                            {PRIORITY_OPTIONS.map(pr => {
                                                                const isActive = feedbackPriority === pr.value;
                                                                return (
                                                                    <motion.button
                                                                        key={pr.value}
                                                                        whileHover={{ scale: 1.05 }}
                                                                        whileTap={{ scale: 0.95 }}
                                                                        onClick={() => setFeedbackPriority(pr.value)}
                                                                        className={cn(
                                                                            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-200",
                                                                            isActive
                                                                                ? `${pr.color} border-current/20 bg-current/5`
                                                                                : "border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:border-border/50 dark:bg-secondary/30 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-white/[0.04]"
                                                                        )}
                                                                    >
                                                                        <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? pr.dot : "bg-slate-600")} />
                                                                        {pr.label}
                                                                    </motion.button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    <Separator className="bg-white/[0.06]" />

                                                    {/* Drawing Attachment Preview */}
                                                    {hasDrawingAttached && drawingObjects.length > 0 && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 overflow-hidden"
                                                        >
                                                            <div className="p-3">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <Brush className="w-3.5 h-3.5 text-indigo-400" />
                                                                        <span className="text-[11px] font-bold text-indigo-300">드로잉 첨부됨</span>
                                                                        <Badge className="text-[9px] h-4 bg-indigo-500/20 text-indigo-300 border-indigo-500/30">{drawingObjects.length}개</Badge>
                                                                        {attachedTimecode !== null && (
                                                                            <Badge className="text-[9px] h-4 bg-violet-500/20 text-violet-300 border-violet-500/30">⏱ {formatTime(attachedTimecode)}</Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-500 hover:text-indigo-400" onClick={() => loadDrawing(drawingObjects)}>
                                                                            <Edit2 className="w-3 h-3" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-500 hover:text-red-400" onClick={detachDrawing}>
                                                                            <X className="w-3 h-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                                <div className="relative w-full h-20 bg-card rounded-lg overflow-hidden">
                                                                    <DrawingPreview strokes={drawingObjects} />
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                    {/* Timecode Capture */}
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            <Clock className="w-3 h-3" /> 타임스탬프
                                                        </label>
                                                        <div className="flex items-center gap-2">
                                                            <motion.button
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                                onClick={handleCaptureTime}
                                                                className={cn(
                                                                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200",
                                                                    isTimeCaptured
                                                                        ? "border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300 shadow-sm"
                                                                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:border-border/50 dark:bg-secondary/30 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-foreground"
                                                                )}
                                                            >
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {isTimeCaptured && capturedTime !== null
                                                                    ? `⏱ ${formatTime(capturedTime)} 캡처됨`
                                                                    : `현재 시점 캡처 (${formatTime(currentTime)})`}
                                                            </motion.button>
                                                            {isTimeCaptured && (
                                                                <motion.button
                                                                    initial={{ scale: 0, opacity: 0 }}
                                                                    animate={{ scale: 1, opacity: 1 }}
                                                                    exit={{ scale: 0, opacity: 0 }}
                                                                    whileHover={{ scale: 1.1 }}
                                                                    onClick={clearCapturedTime}
                                                                    className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 dark:border-border/50 dark:bg-secondary/30 dark:hover:text-red-400 dark:hover:bg-red-500/10 dark:hover:border-red-500/20 transition-colors"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </motion.button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Feedback Text */}
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            <MessageSquare className="w-3 h-3" /> 피드백 내용
                                                        </label>
                                                        <Textarea
                                                            value={feedbackText}
                                                            onChange={(e) => setFeedbackText(e.target.value)}
                                                            placeholder="구체적인 피드백을 작성해주세요... (Shift+Enter로 줄바꿈)"
                                                            className="min-h-[120px] bg-slate-50 border-slate-200 focus:border-indigo-400 focus:bg-white dark:bg-secondary/30 dark:border-border/50 dark:focus:border-indigo-500/40 dark:focus:bg-white/[0.05] resize-none text-sm rounded-xl py-3 leading-relaxed transition-all"
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter" && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    if (feedbackText.trim()) createFeedbackMutation.mutate();
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </ScrollArea>

                                            {/* Submit Bar */}
                                            <div className="p-4 border-t border-slate-200 dark:border-border/50 bg-slate-50 dark:bg-[#0a0a12] shrink-0">
                                                <div className="flex items-center gap-2 mb-3">
                                                    {/* Summary of current form state */}
                                                    <Badge className={cn("text-[9px] h-5 border", TYPE_COLORS[feedbackType])}>
                                                        {TYPE_LABELS[feedbackType]}
                                                    </Badge>
                                                    <Badge className={cn("text-[9px] h-5 border", PRIORITY_BADGE[feedbackPriority])}>
                                                        {PRIORITY_OPTIONS.find(p => p.value === feedbackPriority)?.label}
                                                    </Badge>
                                                    {isTimeCaptured && capturedTime !== null && (
                                                        <Badge className="text-[9px] h-5 border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
                                                            ⏱ {formatTime(capturedTime)}
                                                        </Badge>
                                                    )}
                                                    {hasDrawingAttached && (
                                                        <Badge className="text-[9px] h-5 border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
                                                            🎨 드로잉
                                                        </Badge>
                                                    )}
                                                </div>
                                                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                                                    <Button
                                                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-foreground shadow-lg shadow-indigo-600/20 border-0 h-10 font-bold text-sm rounded-xl transition-all duration-300"
                                                        onClick={() => createFeedbackMutation.mutate()}
                                                        disabled={!feedbackText.trim() || createFeedbackMutation.isPending}
                                                    >
                                                        {createFeedbackMutation.isPending
                                                            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> 등록 중...</>
                                                            : <><Send className="w-4 h-4 mr-2" /> 피드백 등록</>}
                                                    </Button>
                                                </motion.div>
                                            </div>
                                        </TabsContent>

                                        {/* ======== TAB: HISTORY ======== */}
                                        <TabsContent value="history" className="flex-1 flex flex-col min-h-0 mt-0">
                                            <ScrollArea className="flex-1 p-4">
                                                <div className="space-y-3">
                                                    {isFeedbacksLoading ? (
                                                        <div className="flex items-center justify-center py-10">
                                                            <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                                                        </div>
                                                    ) : feedbacksRaw.length === 0 ? (
                                                        <div className="text-center py-10 text-slate-600 text-xs">
                                                            <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
                                                            아직 작성된 피드백이 없습니다.
                                                        </div>
                                                    ) : (
                                                        <AnimatePresence>
                                                            {feedbacksRaw.map((fb, idx) => (
                                                                <motion.div
                                                                    key={fb.id}
                                                                    initial={{ opacity: 0, y: 6 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: idx * 0.03 }}
                                                                    className="group"
                                                                >
                                                                    <div className="flex gap-2.5">
                                                                        <div className="flex flex-col items-center">
                                                                            <Avatar className="w-7 h-7 border border-border/50">
                                                                                <AvatarImage src={fb.author.avatarUrl || undefined} />
                                                                                <AvatarFallback className="text-[9px] bg-slate-800">{fb.author.name[0]}</AvatarFallback>
                                                                            </Avatar>
                                                                            {idx !== feedbacksRaw.length - 1 && <div className="w-px flex-1 bg-white/[0.04] mt-1.5" />}
                                                                        </div>
                                                                        <div className="flex-1 pb-4 min-w-0">
                                                                            <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                                                                                <span className="text-[11px] font-bold text-slate-300">{fb.author.name}</span>
                                                                                <span className="text-[9px] text-slate-600">{formatDistanceToNow(new Date(fb.createdAt), { locale: ko, addSuffix: true })}</span>
                                                                            </div>
                                                                            {/* Type & Priority & Timecode badges */}
                                                                            <div className="flex flex-wrap gap-1 mb-2">
                                                                                <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", TYPE_COLORS[fb.type])}>
                                                                                    {TYPE_LABELS[fb.type]}
                                                                                </span>
                                                                                <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", PRIORITY_BADGE[fb.priority])}>
                                                                                    {PRIORITY_OPTIONS.find(p => p.value === fb.priority)?.label}
                                                                                </span>
                                                                                {fb.startTime !== null && (
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setSeekTo(fb.startTime!);
                                                                                            if (fb.annotation) {
                                                                                                loadDrawing(typeof fb.annotation === 'string' ? JSON.parse(fb.annotation) : fb.annotation);
                                                                                            }
                                                                                        }}
                                                                                        className="text-[9px] font-mono bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 hover:bg-indigo-500/25 transition-colors flex items-center gap-0.5"
                                                                                    >
                                                                                        <Play className="w-2 h-2 fill-current" />
                                                                                        {formatTime(fb.startTime)}
                                                                                        {fb.endTime !== null && ` → ${formatTime(fb.endTime)}`}
                                                                                        {fb.annotation && <Brush className="w-2 h-2 ml-0.5" />}
                                                                                    </button>
                                                                                )}
                                                                            </div>

                                                                            {/* Content / Edit Mode */}
                                                                            {editingFeedbackId === fb.id ? (
                                                                                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-xl border border-indigo-200 dark:border-indigo-500/20 shadow-inner mt-2 animate-in fade-in duration-200">
                                                                                    {/* Edit Type & Priority */}
                                                                                    <div className="flex flex-col gap-3 mb-3">
                                                                                        <div className="flex flex-wrap gap-1.5">
                                                                                            <span className="text-[10px] font-bold text-slate-400 mr-1 self-center">유형:</span>
                                                                                            {FEEDBACK_TYPES.map(ft => (
                                                                                                <button
                                                                                                    key={ft.value}
                                                                                                    onClick={() => setEditFeedbackType(ft.value)}
                                                                                                    className={cn(
                                                                                                        "text-[10px] px-2 py-1 rounded-md border transition-all duration-200",
                                                                                                        editFeedbackType === ft.value
                                                                                                            ? `${ft.color} shadow-sm ring-1 ring-current/20`
                                                                                                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-border/50 dark:bg-secondary/30 dark:text-slate-400 dark:hover:bg-secondary/50"
                                                                                                    )}
                                                                                                >
                                                                                                    {ft.label}
                                                                                                </button>
                                                                                            ))}
                                                                                        </div>
                                                                                        <div className="flex flex-wrap gap-1.5">
                                                                                            <span className="text-[10px] font-bold text-slate-400 mr-1 self-center">중요도:</span>
                                                                                            {PRIORITY_OPTIONS.map(pr => (
                                                                                                <button
                                                                                                    key={pr.value}
                                                                                                    onClick={() => setEditFeedbackPriority(pr.value)}
                                                                                                    className={cn(
                                                                                                        "text-[10px] px-2 py-1 rounded-md border transition-all duration-200 font-medium",
                                                                                                        editFeedbackPriority === pr.value
                                                                                                            ? `${pr.color} bg-current/5 border-current/20`
                                                                                                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-border/50 dark:bg-secondary/30 dark:text-slate-400 dark:hover:bg-secondary/50"
                                                                                                    )}
                                                                                                >
                                                                                                    {pr.label}
                                                                                                </button>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>

                                                                                    <Textarea
                                                                                        value={editFeedbackText}
                                                                                        onChange={(e) => setEditFeedbackText(e.target.value)}
                                                                                        className="min-h-[80px] bg-white dark:bg-[#0c0c14] border-slate-200 dark:border-white/[0.1] text-xs resize-none mb-3 shadow-sm focus-visible:ring-indigo-500/50"
                                                                                        autoFocus
                                                                                    />
                                                                                    <div className="flex items-center justify-end">
                                                                                        <div className="flex gap-2">
                                                                                            <Button size="sm" variant="ghost" className="h-7 text-[11px] px-3 text-slate-500 hover:text-slate-700 bg-white dark:bg-secondary/30 border border-slate-200 dark:border-white/[0.05]" onClick={cancelEditing}>취소</Button>
                                                                                            <Button size="sm" className="h-7 text-[11px] px-4 bg-indigo-600 hover:bg-indigo-500 text-foreground shadow-sm" onClick={saveEditing} disabled={updateFeedbackMutation.isPending}>
                                                                                                {updateFeedbackMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3 h-3 mr-1.5" />}
                                                                                                저장
                                                                                            </Button>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="relative group/content">
                                                                                    <div className="text-[13px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-secondary/30 p-3.5 rounded-2xl rounded-tl-none border border-slate-200 dark:border-white/[0.05] leading-relaxed whitespace-pre-line group-hover:bg-slate-100 dark:group-hover:bg-white/[0.06] transition-colors shadow-sm">
                                                                                        {fb.content}
                                                                                    </div>

                                                                                    {/* Actions Menu (Edit/Delete) */}
                                                                                    <div className="absolute top-2 right-2 opacity-0 group-hover/content:opacity-100 transition-opacity">
                                                                                        <DropdownMenu>
                                                                                            <DropdownMenuTrigger asChild>
                                                                                                <button className="p-1.5 rounded-lg bg-muted dark:bg-card hover:bg-slate-100 dark:hover:bg-secondary text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-slate-200 dark:border-border shadow-sm transition-all focus:outline-none">
                                                                                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                                                                                </button>
                                                                                            </DropdownMenuTrigger>
                                                                                            <DropdownMenuContent align="end" className="w-32 min-w-0">
                                                                                                <DropdownMenuItem onClick={() => startEditingFeedback(fb)} className="text-xs text-slate-600 dark:text-slate-300 focus:bg-slate-50 dark:focus:bg-secondary/30 cursor-pointer">
                                                                                                    <Edit2 className="w-3.5 h-3.5 mr-2" /> 수정하기
                                                                                                </DropdownMenuItem>
                                                                                                <DropdownMenuSeparator />
                                                                                                <DropdownMenuItem
                                                                                                    onClick={() => {
                                                                                                        if (confirm("정말로 이 피드백을 삭제하시겠습니까?")) {
                                                                                                            deleteFeedbackMutation.mutate(fb.id);
                                                                                                        }
                                                                                                    }}
                                                                                                    className="text-xs text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10 cursor-pointer"
                                                                                                >
                                                                                                    <Trash2 className="w-3.5 h-3.5 mr-2" /> 삭제하기
                                                                                                </DropdownMenuItem>
                                                                                            </DropdownMenuContent>
                                                                                        </DropdownMenu>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </AnimatePresence>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </TabsContent>

                                        {/* ======== TAB: INFO ======== */}
                                        <TabsContent value="info" className="flex-1 p-4 mt-0">
                                            <ScrollArea className="h-full">
                                                <div className="space-y-5">
                                                    {/* STAR Info */}
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            <User className="w-3 h-3" /> STAR 정보
                                                        </label>
                                                        <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border/50">
                                                            <Avatar className="w-10 h-10">
                                                                <AvatarImage src={selectedSubmission.star.avatarUrl || undefined} />
                                                                <AvatarFallback>{selectedSubmission.star.name[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="text-sm font-bold text-foreground">{selectedSubmission.star.name}</div>
                                                                <div className="text-[11px] text-slate-500">{selectedSubmission.star.email}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <Separator className="bg-white/[0.06]" />

                                                    {/* Project/Assignment */}
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">프로젝트</label>
                                                        <div className="p-3 bg-secondary/30 rounded-xl border border-border/50 text-sm text-slate-300">
                                                            {selectedSubmission.assignment?.request.title || "미지정"}
                                                        </div>
                                                    </div>

                                                    <Separator className="bg-white/[0.06]" />

                                                    {/* AI Insights */}
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            <Sparkles className="w-3 h-3 text-purple-400" /> AI Insights
                                                        </label>
                                                        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/[0.06] to-indigo-500/[0.06] border border-purple-500/15 text-sm leading-relaxed text-slate-300">
                                                            <p className="mb-2">AI 분석 결과, 전반적인 영상 품질은 <strong className="text-purple-300">우수(High)</strong> 합니다.</p>
                                                            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
                                                                <li>음성 명료도: 98%</li>
                                                                <li>조명 밝기: 적절함</li>
                                                                <li>배경 소음: 낮음</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </ScrollArea>
                                        </TabsContent>

                                        {/* ======== TAB: THUMBNAIL ======== */}
                                        <TabsContent value="thumbnail" className="flex-1 p-4 mt-0">
                                            <ScrollArea className="h-full">
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        <ImageIcon className="w-3 h-3 text-indigo-400" /> 스타 등록 썸네일
                                                    </label>

                                                    {(selectedSubmission.signedThumbnailUrl || selectedSubmission.video?.thumbnailUrl) ? (
                                                        <div className="space-y-3">
                                                            {/* 썸네일 메인 프리뷰 */}
                                                            <div className="relative group aspect-video w-full rounded-xl overflow-hidden bg-black ring-1 ring-white/[0.08] shadow-lg">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={selectedSubmission.signedThumbnailUrl || selectedSubmission.video?.thumbnailUrl || ""}
                                                                    alt={selectedSubmission.video?.title || "등록 썸네일"}
                                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                                />
                                                                {/* 호버 시 원본 보기 */}
                                                                <div className="absolute inset-0 bg-card opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <a
                                                                        href={selectedSubmission.signedThumbnailUrl || selectedSubmission.video?.thumbnailUrl || ""}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-2 bg-accent text-foreground text-xs font-medium px-4 py-2 rounded-full hover:bg-accent transition-colors"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <ZoomIn className="w-4 h-4" />
                                                                        새창
                                                                    </a>
                                                                    <button
                                                                        className="flex items-center gap-2 bg-indigo-500/80 text-foreground text-xs font-medium px-4 py-2 rounded-full hover:bg-indigo-600 transition-colors"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            downloadThumbnail(selectedSubmission.signedThumbnailUrl || selectedSubmission.video?.thumbnailUrl, selectedSubmission.video?.title || "썸네일");
                                                                        }}
                                                                    >
                                                                        <Download className="w-4 h-4" />
                                                                        다운로드
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* 상태 메시지 */}
                                                            <div className="flex items-center gap-2 text-[11px] p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                                <span className="text-emerald-300">스타가 등록한 썸네일이 확인되었습니다.</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                                            <div className="w-20 h-20 rounded-2xl bg-secondary/30 border border-border/50 flex items-center justify-center mb-5">
                                                                <ImageIcon className="w-10 h-10 text-slate-700" />
                                                            </div>
                                                            <p className="text-sm font-medium text-slate-400 mb-1">등록된 썸네일이 없습니다</p>
                                                            <p className="text-[11px] text-slate-600 max-w-[240px] leading-relaxed">스타가 영상 제출 시 썸네일을 등록하지 않았습니다.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </TabsContent>

                                    </Tabs>
                                </div>
                            </motion.div>
                        ) : (
                            /* Empty State */
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex-1 flex flex-col items-center justify-center text-slate-500 relative"
                            >
                                <div className="text-center space-y-5">
                                    <motion.div
                                        animate={{ rotate: [0, 6, -6, 0] }}
                                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                        className="w-20 h-20 rounded-2xl bg-secondary/30 border border-border/50 flex items-center justify-center mx-auto shadow-2xl"
                                    >
                                        <Command className="w-8 h-8 text-indigo-500/60" />
                                    </motion.div>
                                    <div>
                                        <h2 className="text-xl font-bold text-foreground mb-2">피드백 스튜디오</h2>
                                        <p className="text-slate-600 text-sm max-w-xs mx-auto leading-relaxed">
                                            좌측 리스트에서 리뷰할 영상을 선택하세요.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Mobile FAB to trigger sheet */}
                    {!isMobileSheetOpen && selectedId && (
                        <div className="lg:hidden absolute bottom-[calc(env(safe-area-inset-bottom,20px)+80px)] right-4 z-40">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    size="lg"
                                    className="rounded-full shadow-[0_8px_30px_rgba(99,102,241,0.5)] bg-indigo-600 hover:bg-indigo-500 text-foreground h-14 px-6 ring-2 ring-white/10 flex items-center gap-2"
                                    onClick={() => setIsMobileSheetOpen(true)}
                                >
                                    <MessageSquare className="w-5 h-5" />
                                    <span className="font-bold">심사 / 피드백</span>
                                    {feedbacksRaw.length > 0 && (
                                        <Badge className="ml-1.5 bg-accent hover:bg-accent text-foreground border-0 px-1.5 py-0.5 h-auto flex items-center justify-center font-mono text-[11px]">
                                            {feedbacksRaw.length}
                                        </Badge>
                                    )}
                                </Button>
                            </motion.div>
                        </div>
                    )}
                </div>

                {/* ================================================================
                    REVIEW ACTION DIALOG
                   ================================================================ */}
                <ResponsiveModal
                    open={actionModal.isOpen}
                    onOpenChange={(open: boolean) => !open && setActionModal({ isOpen: false, type: null })}
                    title={actionModal.type === "APPROVE" ? "최종 승인 확인" : "반려/수정 요청"}
                    description={actionModal.type === "APPROVE" ? "승인 후에는 상태를 되돌릴 수 없습니다." : "STAR에게 전달할 사유를 작성해주세요."}
                    className="bg-card border-border/50 text-foreground sm:max-w-md"
                >
                    {actionModal.type !== "APPROVE" && (
                        <div className="py-2">
                            <label className="text-[11px] font-bold text-slate-400 mb-2 block uppercase tracking-wider">반려/수정 사유 (필수)</label>
                            <Textarea
                                placeholder="구체적인 사유를 입력하세요..."
                                className="bg-secondary/30 border-border/50 min-h-[100px] focus:border-destructive/30"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                        </div>
                    )}
                    {actionModal.type === "APPROVE" && (
                        <div className="py-2 space-y-3">
                            <Button
                                className="w-full justify-start gap-4 h-auto py-3.5 rounded-xl border border-primary/30 hover:bg-slate-800/50 hover:border-primary/50 transition-all text-left whitespace-normal"
                                variant="outline"
                                onClick={() => setAdEligible(true)}
                            >
                                <div className={`p-1.5 rounded-full ${adEligible ? 'bg-primary shadow-lg shadow-primary/20 text-primary-foreground' : 'bg-slate-800 text-slate-400'}`}>
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <p className={`font-bold transition-colors ${adEligible ? 'text-primary' : 'text-slate-300'}`}>광고 영상으로 전환/승인</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 break-keep">이 제출물 품질이 우수하여 마케팅/광고 소재로 활용합니다.</p>
                                </div>
                            </Button>
                            <Button
                                className="w-full justify-start gap-4 h-auto py-3.5 rounded-xl border border-slate-700 hover:bg-slate-800/50 hover:border-slate-600 transition-all text-left whitespace-normal"
                                variant="outline"
                                onClick={() => setAdEligible(false)}
                            >
                                <div className={`p-1.5 rounded-full ${!adEligible ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40 text-foreground' : 'bg-slate-800 text-slate-400'}`}>
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <p className={`font-bold transition-colors ${!adEligible ? 'text-emerald-400' : 'text-slate-300'}`}>일반 리뷰 영상으로 승인</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 break-keep">일반적인 리뷰 목적(광고 활용 제외)으로만 승인 상태로 바꿉니다.</p>
                                </div>
                            </Button>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="ghost" onClick={() => { setActionModal({ isOpen: false, type: null }); setRejectReason(""); setAdEligible(false); }} className="hover:bg-secondary/50">
                            취소
                        </Button>
                        <Button
                            onClick={confirmAction}
                            disabled={reviewMutation.isPending || (actionModal.type !== "APPROVE" && !rejectReason.trim())}
                            className={cn(
                                "font-bold text-foreground",
                                actionModal.type === "APPROVE"
                                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
                                    : "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20"
                            )}
                        >
                            {reviewMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            {actionModal.type === "APPROVE" ? "승인 확정" : "요청 보내기"}
                        </Button>
                    </div>
                </ResponsiveModal>
            </div>
        </TooltipProvider>
    );
}
