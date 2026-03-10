import { Suspense } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { VideosBrowser } from "@/components/video/videos-browser";
import { AnnouncementBanner } from "@/components/home/announcement-banner";
import { HeroBanner } from "@/components/home/hero-banner";
import { WeeklyChart } from "@/components/home/weekly-chart";
import { PopularStars } from "@/components/home/popular-stars";
import { FaqPreview } from "@/components/home/faq-preview";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#050508]">
      {/* 공지사항 배너 */}
      <AnnouncementBanner />

      {/* 헤더 */}
      <PublicHeader />

      <main className="flex-1">
        {/* 히어로 배너 (인기 영상) */}
        <HeroBanner />

        {/* 인기 스타 크리에이터 */}
        <PopularStars />

        {/* 주간 인기 차트 */}
        <WeeklyChart />

        {/* 영상 브라우저 (기존 기능 유지) */}
        <Suspense fallback={<div className="py-20 text-center text-muted-foreground">영상 로딩 중...</div>}>
          <VideosBrowser />
        </Suspense>

        {/* FAQ 미리보기 */}
        <FaqPreview />
      </main>

      <PublicFooter />
    </div>
  );
}
