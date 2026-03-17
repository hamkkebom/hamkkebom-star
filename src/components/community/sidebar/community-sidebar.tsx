"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { HotPostsWidget } from "./hot-posts-widget";
import { TrendingTagsWidget } from "./trending-tags-widget";
import { CommunityStatsWidget } from "./community-stats-widget";
import { TopContributorsWidget } from "./top-contributors-widget";
import { AnnouncementsWidget } from "./announcements-widget";
import { FeaturedVideoWidget } from "./featured-video-widget";
import { BookmarksWidget } from "./bookmarks-widget";
import { RecentPostsWidget } from "./recent-posts-widget";
import { BestCommentsWidget } from "./best-comments-widget";

interface CommunitySidebarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setPage: (page: number) => void;
}

export function CommunitySidebar({ searchQuery, setSearchQuery, setPage }: CommunitySidebarProps) {
  return (
    <div className="space-y-5">
      {/* 1. 검색 위젯 */}
      <div className="relative w-full shadow-sm rounded-xl overflow-hidden">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="게시글 검색..."
          value={searchQuery}
          onChange={(e) => { 
            setSearchQuery(e.target.value); 
            setPage(1); 
          }}
          className="pl-10 h-11 bg-card border-border focus-visible:ring-primary/30 text-sm"
        />
      </div>

      {/* 2. 📊 커뮤니티 통계 */}
      <CommunityStatsWidget />

      {/* 3. 🔥 실시간 인기글 */}
      <HotPostsWidget />

      {/* 4. 🏆 이번 주 활동왕 */}
      <TopContributorsWidget />

      {/* 5. 🏷️ 트렌딩 태그 */}
      <TrendingTagsWidget />
      
      {/* 6. 📢 공지사항 */}
      <AnnouncementsWidget />

      {/* 7. 🎬 추천 영상 */}
      <FeaturedVideoWidget />

      {/* 8. 🔖 내 북마크 */}
      <BookmarksWidget />

      {/* 9. 📜 최근 본 글 */}
      <RecentPostsWidget />

      {/* 10. 💬 베스트 댓글 */}
      <BestCommentsWidget />
    </div>
  );
}
