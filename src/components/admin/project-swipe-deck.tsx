"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { CheckCircle2, XCircle, CalendarDays, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type PendingStar = {
    id: string;
    name: string;
    chineseName: string | null;
    email: string;
    avatarUrl: string | null;
};

export type PendingRequest = {
    id: string;
    title: string;
    deadline: string;
    maxAssignees: number;
    categories: string[];
    status: string;
    _count: {
        assignments: number;
    };
};

export type PendingAssignment = {
    id: string;
    createdAt: string;
    star: PendingStar;
    request: PendingRequest;
};

interface ProjectSwipeDeckProps {
    assignments: PendingAssignment[];
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onViewDetail: (assignment: PendingAssignment) => void;
}

function getInitials(name: string) {
    return name.charAt(0).toUpperCase();
}

function getDisplayName(star: PendingStar) {
    return star.chineseName || star.name;
}

function formatDate(dateInput: string) {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

export function ProjectSwipeDeck({ assignments, onApprove, onReject }: ProjectSwipeDeckProps) {
    const [deck, setDeck] = useState(assignments);

    React.useEffect(() => {
        setDeck(assignments);
    }, [assignments]);

    const triggerHaptic = (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => {
        if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
            switch (type) {
                case "light": window.navigator.vibrate(10); break;
                case "medium": window.navigator.vibrate(20); break;
                case "heavy": window.navigator.vibrate(30); break;
                case "success": window.navigator.vibrate([20, 50, 20]); break;
                case "warning": window.navigator.vibrate([30, 50, 30]); break;
                case "error": window.navigator.vibrate([50, 50, 50]); break;
            }
        }
    };

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, assignment: PendingAssignment) => {
        const threshold = 100;
        if (info.offset.x > threshold) {
            triggerHaptic("success");
            onApprove(assignment.id);
            setDeck((prev) => prev.filter((a) => a.id !== assignment.id));
        } else if (info.offset.x < -threshold) {
            triggerHaptic("error");
            onReject(assignment.id);
            setDeck((prev) => prev.filter((a) => a.id !== assignment.id));
        }
    };

    const handleDragStart = () => {
        triggerHaptic("light");
    };

    if (deck.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10 text-center text-muted-foreground border-2 border-dashed border-border rounded-3xl mx-4 my-8 bg-muted/30">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-5">
                    <ShieldCheck className="w-10 h-10 text-emerald-500 opacity-80" />
                </div>
                <p className="font-bold text-xl text-foreground">모든 처리가 완료되었습니다!</p>
                <p className="text-sm mt-2 text-muted-foreground text-balance">더 이상 승인 대기 중인 프로젝트 신청이 없습니다.</p>
            </div>
        );
    }

    const visibleAssignments = deck.slice(0, 3).reverse();

    return (
        <div className="relative w-full aspect-[3/4.5] max-h-[550px] flex items-center justify-center perspective-1000 mt-4 mb-16 select-none touch-none">
            <AnimatePresence>
                {visibleAssignments.map((assignment, index) => {
                    const isTop = index === visibleAssignments.length - 1;
                    const starName = getDisplayName(assignment.star);

                    return (
                        <motion.div
                            key={assignment.id}
                            className="absolute w-full h-full max-h-[500px] max-w-sm rounded-[32px] overflow-hidden bg-card shadow-2xl border border-border flex flex-col z-10"
                            style={{
                                zIndex: index,
                                transformOrigin: "bottom",
                            }}
                            initial={{ scale: 0.95, y: 30, opacity: 0 }}
                            animate={{
                                scale: isTop ? 1 : 1 - (visibleAssignments.length - 1 - index) * 0.05,
                                y: isTop ? 0 : (visibleAssignments.length - 1 - index) * 20,
                                opacity: 1,
                            }}
                            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                            drag={isTop ? "x" : false}
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.8}
                            onDragStart={isTop ? handleDragStart : undefined}
                            onDragEnd={(e, info) => isTop && handleDragEnd(e, info, assignment)}
                            whileDrag={{ scale: 1.02, cursor: "grabbing" }}
                        >
                            <div className="flex-1 flex flex-col p-6 pointer-events-none bg-gradient-to-b from-primary/5 to-card relative">

                                {/* Visual Background Pattern */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />

                                {/* Header (Project Info) */}
                                <div className="w-full flex flex-col gap-2 pt-2 mb-6 z-10">
                                    <div className="bg-primary/15 text-primary px-3 py-1 rounded-full text-xs font-bold w-fit shadow-sm">
                                        프로젝트 참여 신청
                                    </div>
                                    <h3 className="text-xl font-bold tracking-tight text-foreground line-clamp-2 leading-tight">
                                        {assignment.request.title}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                        <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md">
                                            <CalendarDays className="w-3 h-3" />
                                            마감: {formatDate(assignment.request.deadline)}
                                        </span>
                                        <span className="bg-muted px-2 py-0.5 rounded-md">
                                            {assignment.request._count.assignments}/{assignment.request.maxAssignees}명 승인됨
                                        </span>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="w-full border-t border-dashed border-border my-2 z-10" />

                                {/* Applicant Info */}
                                <div className="flex-1 flex flex-col items-center justify-center mt-2 z-10">
                                    <Avatar className="w-24 h-24 mb-4 ring-4 ring-card shadow-xl">
                                        {assignment.star.avatarUrl ? (
                                            <AvatarImage src={assignment.star.avatarUrl} alt={starName} className="object-cover" />
                                        ) : (
                                            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-foreground text-2xl font-bold">
                                                {getInitials(starName)}
                                            </AvatarFallback>
                                        )}
                                    </Avatar>

                                    <h4 className="text-2xl font-black text-foreground truncate max-w-full tracking-tight">
                                        {starName}
                                    </h4>
                                    <p className="text-sm font-medium text-muted-foreground mb-4">
                                        {assignment.star.email}
                                    </p>

                                    <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                                        신청일: {formatDate(assignment.createdAt)}
                                    </p>
                                </div>

                            </div>

                            {/* Action Guides */}
                            <div className="h-20 bg-background border-t border-border flex items-center justify-between px-6 shrink-0 relative">
                                {/* Swipe Left */}
                                <div className="flex flex-col items-center opacity-40 transition-opacity">
                                    <div className="w-10 h-10 rounded-full border-2 border-destructive/30 flex items-center justify-center mb-1 bg-destructive/10">
                                        <XCircle className="w-5 h-5 text-destructive" />
                                    </div>
                                    <span className="text-[9px] font-bold text-destructive tracking-wider">거절</span>
                                </div>

                                {/* Drag Handle */}
                                <div className="flex flex-col items-center justify-center w-full max-w-[120px]">
                                    <div className="w-12 h-1.5 bg-muted rounded-full mb-3" />
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">스와이프</span>
                                </div>

                                {/* Swipe Right */}
                                <div className="flex flex-col items-center opacity-40 transition-opacity">
                                    <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 flex items-center justify-center mb-1 bg-emerald-500/10">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <span className="text-[9px] font-bold text-emerald-500 tracking-wider">승인</span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
