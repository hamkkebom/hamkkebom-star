"use client";

import { cn } from "@/lib/utils";
import { VideoPlayer } from "@/components/video/video-player";

interface CinemaContainerProps {
    streamUid: string | null;
    className?: string;
}

export function CinemaContainer({ streamUid, className }: CinemaContainerProps) {
    return (
        <div className={cn("relative w-full group perspective-1000", className)}>
            {/* Ambient Backlight (Glow based on video content) */}
            <div className="absolute -inset-4 bg-gradient-to-t from-primary/30 to-indigo-500/30 rounded-[2rem] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />

            {/* Main Container */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
                {/* Aspect Ratio Enforcer (16:9) */}
                <div className="relative w-full pt-[56.25%]">
                    <div className="absolute inset-0">
                        {streamUid ? (
                            <VideoPlayer streamUid={streamUid} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-neutral-900">
                                <span className="text-4xl mb-4">📺</span>
                                <p className="font-medium text-sm">재생할 영상이 없습니다</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Glossy Overlay (Screen Reflection Effect) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-30 pointer-events-none transition-opacity duration-500" />
            </div>
        </div>
    );
}
