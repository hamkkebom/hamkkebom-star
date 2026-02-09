"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { VideoCard } from "./video-card";

type VideoItem = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  streamUid: string;
  createdAt: string;
  owner: { name: string };
  category: { name: string } | null;
  technicalSpec: { duration: number | null } | null;
};

type SwimlaneRowProps = {
  title: string;
  videos: VideoItem[];
  icon?: React.ReactNode;
};

export function SwimlaneRow({ title, videos, icon }: SwimlaneRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, videos]);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  if (!videos.length) return null;

  return (
    <section className="relative">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <span className="text-sm text-muted-foreground">({videos.length})</span>
      </div>

      {/* Scroll container */}
      <div className="group/lane relative">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute -left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-lg ring-1 ring-border/50 backdrop-blur-sm transition-all hover:scale-110 hover:bg-violet-600 hover:text-white"
            aria-label="이전"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-lg ring-1 ring-border/50 backdrop-blur-sm transition-all hover:scale-110 hover:bg-violet-600 hover:text-white"
            aria-label="다음"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Edge gradients */}
        {canScrollLeft && (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-5 w-12 bg-linear-to-r from-background to-transparent" />
        )}
        {canScrollRight && (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-5 w-12 bg-linear-to-l from-background to-transparent" />
        )}

        <div
          ref={scrollRef}
          className="scrollbar-hide flex gap-4 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory"
        >
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              id={v.id}
              title={v.title}
              thumbnailUrl={v.thumbnailUrl}
              streamUid={v.streamUid}
              duration={v.technicalSpec?.duration ?? null}
              ownerName={v.owner.name}
              categoryName={v.category?.name ?? null}
              createdAt={v.createdAt}
              compact
            />
          ))}
        </div>
      </div>
    </section>
  );
}
