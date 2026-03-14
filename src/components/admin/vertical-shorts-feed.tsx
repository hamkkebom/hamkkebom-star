"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ChevronDown } from "lucide-react";
import { VideoPlayer } from "@/components/video/video-player";
import type { SubmissionRow } from "@/app/(admin)/admin/reviews/page";

const statusLabels: Record<string, string> = {
    PENDING: "대기중",
    IN_REVIEW: "피드백중",
    APPROVED: "승인됨",
    REJECTED: "반려됨",
    REVISED: "수정됨",
};

function ShortsItem({
    item,
    onViewDetail,
    onSkip
}: {
    item: SubmissionRow;
    onViewDetail: (id: string) => void;
    onSkip: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setIsActive(true);
                } else {
                    setIsActive(false);
                }
            });
        }, { threshold: 0.6 });

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    const projectTitle = item.versionTitle || item.assignment?.request?.title || item.video?.title || `v${item.version.replace(/^v/i, "")}`;

    return (
        <div ref={ref} className="w-full h-full snap-start snap-always relative bg-black flex flex-col">
            {/* Video Background */}
            <div className="absolute inset-0 z-0">
                {isActive ? (
                    <VideoPlayer
                        streamUid={item.streamUid}
                        autoPlay
                        muted={false}
                        loop
                        controls={true}
                        className="w-full h-full flex items-center justify-center bg-black [&>stream]:w-full [&>stream]:h-full [&>stream]:!max-h-none [&_iframe]:!max-h-none"
                    />
                ) : (
                    <div className="w-full h-full bg-slate-900 animate-pulse flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-slate-500 animate-spin" />
                    </div>
                )}
            </div>

            {/* Overlay gradients to make text readable */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-10 pointer-events-none" />

            {/* Content overlay */}
            <div className="relative z-20 flex-1 flex flex-col justify-end p-5 pb-16 pointer-events-none">
                <div className="flex items-end justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Avatar className="w-10 h-10 border-2 border-border shadow-lg pointer-events-auto">
                                <AvatarImage src={(item.star as unknown as Record<string, string>).avatarUrl || undefined} />
                                <AvatarFallback className="bg-slate-800 text-foreground font-bold">{item.star.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="text-foreground font-bold shadow-black drop-shadow-md">
                                    {item.star.chineseName || item.star.name}
                                </div>
                                <div className="text-foreground/80 text-[11px] font-medium shadow-black drop-shadow-md">
                                    {item.star.email}
                                </div>
                            </div>
                        </div>
                        <h3 className="text-foreground font-black text-xl leading-snug mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate whitespace-normal line-clamp-2">
                            {projectTitle}
                        </h3>
                        {item.assignment?.request?.title && item.versionTitle && (
                            <div className="text-foreground text-sm mb-3 drop-shadow-md line-clamp-1">
                                {item.assignment.request.title}
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2 pointer-events-auto">
                            <Badge className="bg-indigo-500/90 text-foreground border-border px-2.5 py-1">v{item.version.replace(/^v/i, "")}</Badge>
                            <Badge className="bg-background text-foreground border-border px-2.5 py-1">{statusLabels[item.status] || item.status}</Badge>
                            {item._count.feedbacks > 0 && <Badge className="bg-rose-500/90 text-foreground border-rose-400/30 px-2.5 py-1">{item._count.feedbacks}개의 피드백</Badge>}
                        </div>
                    </div>

                    {/* Right side floating buttons */}
                    <div className="flex flex-col gap-5 items-center pointer-events-auto pl-2 pb-2">
                        <button
                            className="w-12 h-12 rounded-full bg-card border border-border flex flex-col items-center justify-center text-foreground hover:bg-accent transition-all active:scale-95 shadow-[0_8px_30px_rgba(0,0,0,0.5)] group"
                            onClick={() => onViewDetail(item.id)}
                        >
                            <MessageSquare className="w-5 h-5 mb-0.5 group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-bold">리뷰</span>
                        </button>
                        <button
                            className="w-12 h-12 rounded-full bg-card border border-border flex flex-col items-center justify-center text-foreground hover:bg-accent transition-all active:scale-95 shadow-[0_8px_30px_rgba(0,0,0,0.5)] group"
                            onClick={onSkip}
                        >
                            <ChevronDown className="w-5 h-5 mb-0.5 group-hover:translate-y-1 transition-transform" />
                            <span className="text-[9px] font-bold">패스</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function VerticalShortsFeed({
    items,
    onViewDetail
}: {
    items: SubmissionRow[];
    onViewDetail: (id: string) => void;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleSkip = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ top: scrollRef.current.clientHeight, behavior: 'smooth' });
        }
    };

    if (items.length === 0) return null;

    return (
        <div
            ref={scrollRef}
            className="w-full h-[calc(100vh-220px)] sm:h-[calc(100vh-200px)] overflow-y-auto snap-y snap-mandatory scrollbar-none rounded-3xl bg-black shadow-2xl ring-1 ring-white/10 overflow-hidden relative"
        >
            {/* Top faded edge indicator */}
            <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/40 to-transparent z-30 pointer-events-none" />

            <div className="h-full">
                {items.map((item) => (
                    <ShortsItem key={item.id} item={item} onViewDetail={onViewDetail} onSkip={handleSkip} />
                ))}
            </div>
        </div>
    );
}
