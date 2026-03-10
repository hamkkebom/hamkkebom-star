import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { AnnouncementBanner } from "@/components/home/announcement-banner";
import { HeroBanner } from "@/components/home/hero-banner";
import { WeeklyChart } from "@/components/home/weekly-chart";
import { PopularStars } from "@/components/home/popular-stars";
import { CommunityPreview } from "@/components/home/community-preview";
import { FaqPreview } from "@/components/home/faq-preview";
import { CategoryShowcase } from "@/components/home/category-showcase";
import Link from "next/link";
import { Film, Users, Star, Search } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#050508]">
      {/* 공지사항 배너 */}
      <AnnouncementBanner />

      {/* 헤더 */}
      <PublicHeader />

      <main className="flex-1 pb-20 md:pb-0 flex flex-col gap-4 md:gap-8">
        {/* 히어로 배너 (인기 영상) */}
        <section className="bg-slate-950">
          <HeroBanner />
        </section>

        {/* 인기 스타 크리에이터 */}
        <section className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/50">
          <PopularStars />
        </section>

        {/* 주간 인기 차트 */}
        <section className="bg-slate-50 dark:bg-slate-950/50">
          <WeeklyChart />
        </section>

        {/* 카테고리 쇼케이스 */}
        <section className="bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800/50">
          <CategoryShowcase />
        </section>

        {/* 커뮤니티 미리보기 */}
        <section className="bg-slate-50 dark:bg-slate-950/50">
          <CommunityPreview />
        </section>

        {/* 더 둘러보기 (Quick Links) */}
        <section className="container mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link 
              href="/videos" 
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-muted/30 hover:bg-muted/50 transition-all active:scale-95"
            >
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Film className="w-6 h-6" />
              </div>
              <span className="font-medium text-slate-900 dark:text-slate-100">영상 둘러보기</span>
            </Link>
            
            <Link 
              href="/community" 
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-muted/30 hover:bg-muted/50 transition-all active:scale-95"
            >
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <Users className="w-6 h-6" />
              </div>
              <span className="font-medium text-slate-900 dark:text-slate-100">커뮤니티</span>
            </Link>
            
            <Link 
              href="/stars" 
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-muted/30 hover:bg-muted/50 transition-all active:scale-95"
            >
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <Star className="w-6 h-6" />
              </div>
              <span className="font-medium text-slate-900 dark:text-slate-100">크리에이터</span>
            </Link>
            
            <Link 
              href="/explore" 
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-muted/30 hover:bg-muted/50 transition-all active:scale-95"
            >
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <Search className="w-6 h-6" />
              </div>
              <span className="font-medium text-slate-900 dark:text-slate-100">통합 검색</span>
            </Link>
          </div>
        </section>

        {/* FAQ 미리보기 */}
        <section className="bg-slate-50 dark:bg-slate-950/50">
          <FaqPreview />
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

