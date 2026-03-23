"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import Link from "next/link";
import { SidebarWidget } from "./sidebar-widget";


interface RecentPost {
  id: string;
  title: string;
  boardType: string;
  viewedAt: number;
  author: string;
}

export function RecentPostsWidget() {
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const stored = localStorage.getItem("community_recent_posts");
      if (stored) {
        const parsed = JSON.parse(stored) as RecentPost[];
        // Sort by viewedAt desc and take top 5
        const sorted = parsed.sort((a, b) => b.viewedAt - a.viewedAt).slice(0, 5);
        setRecentPosts(sorted);
      }
    } catch (e) {
      console.error("Failed to parse recent posts from localStorage", e);
    }
  }, []);

  const formatViewedTime = (timestamp: number) => {
    // eslint-disable-next-line react-hooks/purity -- Date.now()는 시간 표시를 위해 렌더 시 필요
    const minDiff = Math.floor((Date.now() - timestamp) / (1000 * 60));
    if (minDiff < 1) return "방금 전";
    if (minDiff < 60) return `${minDiff}분 전`;
    const hourDiff = Math.floor(minDiff / 60);
    if (hourDiff < 24) return `${hourDiff}시간 전`;
    return `${Math.floor(hourDiff / 24)}일 전`;
  };

  if (!isClient) return null; // Hydration 렌더링 방지

  // Return null if no recent posts, or you can show a placeholder.
  if (recentPosts.length === 0) {
    return null; // 숨김 처리 (요구사항 또는 취향에 따라 다름)
  }

  return (
    <SidebarWidget
      title="최근 본 글"
      icon={<History className="w-4 h-4 text-emerald-500" />}
    >
      <div className="space-y-1">
        {recentPosts.map((post) => (
          <Link 
            key={post.id} 
            href={`/community/post/${post.id}`} 
            className="group flex flex-col hover:bg-muted/30 p-2 -mx-2 rounded-lg transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-[13px] text-foreground font-medium line-clamp-1 group-hover:text-primary transition-colors flex-1">
                {post.title}
              </p>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                {formatViewedTime(post.viewedAt)}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {post.author}
            </div>
          </Link>
        ))}
      </div>
    </SidebarWidget>
  );
}
