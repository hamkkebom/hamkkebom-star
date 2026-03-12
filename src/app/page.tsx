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
    <div className="flex min-h-screen flex-col bg-background">
      {/* 공지사항 배너 */}
      <AnnouncementBanner />

      {/* 헤더 */}
      <PublicHeader />

      <main className="flex-1 pb-20 md:pb-0 flex flex-col">
        {/* 히어로 배너 (인기 영상) */}
        <HeroBanner />

        {/* 인기 스타 크리에이터 */}
        <PopularStars />

        {/* 주간 인기 차트 */}
        <WeeklyChart />

        {/* 카테고리 쇼케이스 */}
        <CategoryShowcase />

        {/* 커뮤니티 미리보기 */}
        <CommunityPreview />

        {/* 더 둘러보기 (Quick Links) */}
        <section className="container mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link 
              href="/videos" 
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-border bg-card/50 hover:bg-card transition-all active:scale-95"
            >
              <div className="p-3 rounded-full bg-blue-900/30 text-blue-400">
                <Film className="w-6 h-6" />
              </div>
              <span className="font-medium text-foreground">영상 둘러보기</span>
            </Link>
            
            <Link 
              href="/community" 
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-border bg-card/50 hover:bg-card transition-all active:scale-95"
            >
              <div className="p-3 rounded-full bg-green-900/30 text-green-400">
                <Users className="w-6 h-6" />
              </div>
              <span className="font-medium text-foreground">커뮤니티</span>
            </Link>
            
            <Link 
              href="/stars" 
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-border bg-card/50 hover:bg-card transition-all active:scale-95"
            >
              <div className="p-3 rounded-full bg-amber-900/30 text-amber-400">
                <Star className="w-6 h-6" />
              </div>
              <span className="font-medium text-foreground">크리에이터</span>
            </Link>
            
            <Link 
              href="/explore" 
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-border bg-card/50 hover:bg-card transition-all active:scale-95"
            >
              <div className="p-3 rounded-full bg-purple-900/30 text-purple-400">
                <Search className="w-6 h-6" />
              </div>
              <span className="font-medium text-foreground">통합 검색</span>
            </Link>
          </div>
        </section>

        {/* FAQ 미리보기 */}
        <FaqPreview />
      </main>

      <div className="mb-16 md:mb-0">
        <PublicFooter />
      </div>
    </div>
  );
}
