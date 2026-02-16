"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, GitCommit, CheckCircle2, Circle } from "lucide-react";

type Version = {
    id: string;
    version: string;
    status: string;
    createdAt: string;
    versionTitle?: string | null;
    // TODO: Add duration/thumbnail if available
};

interface VersionTimelineProps {
    versions: Version[];
    currentVersionId: string;
}

export function VersionTimeline({ versions, currentVersionId }: VersionTimelineProps) {
    return (
        <div className="h-full flex flex-col bg-card/30 backdrop-blur-md border-r border-border/50">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <GitCommit className="w-4 h-4" />
                    버전 히스토리
                </h3>
                <Badge variant="outline" className="font-mono text-[10px]">{versions.length} versions</Badge>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="relative space-y-0.5">
                    {/* Timeline Line */}
                    <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border/50 z-0" />

                    {versions.map((ver, idx) => {
                        const isActive = ver.id === currentVersionId;
                        return (
                            <Link
                                key={ver.id}
                                href={`/stars/my-videos/${ver.id}`}
                                className={cn(
                                    "relative z-10 flex items-start gap-3 p-3 rounded-xl transition-all duration-300 group",
                                    isActive
                                        ? "bg-primary/10 border border-primary/20 shadow-sm translate-x-1"
                                        : "hover:bg-accent/50 border border-transparent hover:border-border/30 hover:translate-x-0.5"
                                )}
                            >
                                {/* Status Dot */}
                                <div className={cn(
                                    "mt-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-background transition-colors",
                                    isActive ? "bg-primary" : "bg-muted-foreground/30 group-hover:bg-muted-foreground/50"
                                )} />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className={cn(
                                            "font-bold text-sm",
                                            isActive ? "text-primary" : "text-foreground"
                                        )}>
                                            v{ver.version}
                                        </span>
                                        <span className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                            ver.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-500" :
                                                ver.status === 'PENDING' ? "bg-amber-500/10 text-amber-500" :
                                                    "bg-muted text-muted-foreground"
                                        )}>
                                            {ver.status}
                                        </span>
                                    </div>

                                    {ver.versionTitle && (
                                        <p className="text-xs font-medium truncate text-foreground/80 mb-1">
                                            {ver.versionTitle}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        {new Date(ver.createdAt).toLocaleDateString()}
                                    </div>
                                </div>

                                {/* Active Indicator Arrow */}
                                {isActive && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
