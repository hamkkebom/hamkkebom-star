"use client";

import { useState } from "react";
import { Archive, ArrowRight, Clock, Upload, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SpecialProjectCardProps {
    projectTitle?: string;
    categories?: string[];
    isAssigned: boolean;
    isLoading: boolean;
    onClick: () => void;
}

export function SpecialProjectCard({
    projectTitle = "신년운세 프로젝트",
    categories = [],
    isAssigned,
    isLoading,
    onClick,
}: SpecialProjectCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="space-y-3">
            {/* Section Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-3 text-left group"
            >
                <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                    <Archive className="w-4 h-4" />
                    <span className="text-sm font-semibold tracking-tight">지난 의뢰</span>
                </div>
                <div className="flex-1 h-px bg-border" />
                <ChevronDown
                    className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-300",
                        isExpanded && "rotate-180"
                    )}
                />
            </button>

            {/* Expandable Content */}
            <div
                className={cn(
                    "grid transition-all duration-500 ease-in-out",
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
            >
                <div className="overflow-hidden">
                    <div
                        onClick={onClick}
                        className={cn(
                            "group/card relative cursor-pointer rounded-xl border bg-card p-5 transition-all duration-300",
                            "hover:shadow-md hover:-translate-y-0.5",
                            "border-border/60 bg-muted/20",
                            isAssigned && "ring-1 ring-primary/30 border-primary/30 bg-primary/5"
                        )}
                    >
                        {/* Subtle archive pattern */}
                        <div className="absolute top-3 right-3 opacity-[0.04]">
                            <Archive className="w-20 h-20" />
                        </div>

                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
                            {/* Left: Project Info */}
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] border-amber-300/50 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                                    >
                                        <Clock className="w-2.5 h-2.5 mr-1" />
                                        마감된 프로젝트
                                    </Badge>
                                    {isAssigned && (
                                        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                                            참여중
                                        </Badge>
                                    )}
                                </div>

                                <h4 className="font-bold text-base text-foreground/90 group-hover/card:text-foreground transition-colors line-clamp-1">
                                    {projectTitle}
                                </h4>

                                {categories.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {categories.slice(0, 4).map((cat) => (
                                            <span
                                                key={cat}
                                                className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground"
                                            >
                                                {cat}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    이 프로젝트는 마감되었지만, 영상을 바로 업로드할 수 있습니다.
                                </p>
                            </div>

                            {/* Right: Action */}
                            <div className="shrink-0">
                                <Button
                                    size="sm"
                                    variant={isAssigned ? "default" : "outline"}
                                    disabled={isLoading}
                                    className={cn(
                                        "rounded-full px-5 font-semibold shadow-sm transition-all",
                                        !isAssigned &&
                                        "border-primary/30 text-primary hover:bg-primary hover:text-white",
                                        isAssigned && "bg-primary"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClick();
                                    }}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            처리중...
                                        </span>
                                    ) : isAssigned ? (
                                        <span className="flex items-center gap-1.5">
                                            <Upload className="w-3.5 h-3.5" />
                                            바로 업로드
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5">
                                            참여 후 업로드
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
