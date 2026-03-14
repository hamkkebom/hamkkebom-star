"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Film, Users, Star, Search, ArrowRight, CheckCircle2, PlayCircle, UploadCloud, CreditCard, UserPlus } from "lucide-react";
import NumberTicker from "@/components/ui/number-ticker";
import { Skeleton } from "@/components/ui/skeleton";

export default function AboutPage() {
  const { data: videosData, isLoading: isVideosLoading } = useQuery({
    queryKey: ["videos", "count"],
    queryFn: async () => {
      const res = await fetch("/api/videos?pageSize=1");
      if (!res.ok) throw new Error("Failed to fetch videos");
      return res.json();
    },
  });

  const { data: starsData, isLoading: isStarsLoading } = useQuery({
    queryKey: ["stars", "count"],
    queryFn: async () => {
      const res = await fetch("/api/stars?pageSize=1");
      if (!res.ok) throw new Error("Failed to fetch stars");
      return res.json();
    },
  });

  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["categories", "list"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const { data: counselorsData, isLoading: isCounselorsLoading } = useQuery({
    queryKey: ["counselors", "count"],
    queryFn: async () => {
      const res = await fetch("/api/videos/counselors");
      if (!res.ok) throw new Error("Failed to fetch counselors");
      return res.json();
    },
  });

  const totalVideos = videosData?.total || 0;
  const totalStars = starsData?.total || 0;
  const totalCategories = categoriesData?.data?.length || 0;
  const totalCounselors = counselorsData?.data?.length || 0;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden bg-slate-50 dark:bg-[#050508]">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent dark:from-primary/10 pointer-events-none"></div>
        
        <div className="container mx-auto px-4 relative z-10 text-center animate-fade-in-up">
          <div className="inline-flex items-center justify-center px-3 py-1 mb-6 text-sm font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
            함께봄스타 소개
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            프리미엄 지식 크리에이터 <br className="hidden md:block" />
            <span className="text-gradient">네트워크</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            전문 지식과 크리에이티브가 만나는 곳. 함께봄스타는 검증된 전문가들의 지식을 고품질 영상 콘텐츠로 제작하여 세상에 전달합니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-medium text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/25"
            >
              크리에이터로 합류하기
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/videos"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-medium text-foreground bg-card border border-border rounded-full hover:bg-accent hover:text-accent-foreground transition-all active:scale-95"
            >
              영상 둘러보기
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-24 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
                <Film className="w-6 h-6" />
              </div>
              <div className="text-3xl md:text-4xl font-bold mb-2">
                {isVideosLoading ? <Skeleton className="h-10 w-20" /> : <NumberTicker value={totalVideos} />}
              </div>
              <div className="text-sm text-muted-foreground font-medium">누적 영상</div>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-4">
                <Star className="w-6 h-6" />
              </div>
              <div className="text-3xl md:text-4xl font-bold mb-2">
                {isStarsLoading ? <Skeleton className="h-10 w-20" /> : <NumberTicker value={totalStars} />}
              </div>
              <div className="text-sm text-muted-foreground font-medium">활동 크리에이터</div>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mb-4">
                <Search className="w-6 h-6" />
              </div>
              <div className="text-3xl md:text-4xl font-bold mb-2">
                {isCategoriesLoading ? <Skeleton className="h-10 w-20" /> : <NumberTicker value={totalCategories} />}
              </div>
              <div className="text-sm text-muted-foreground font-medium">전문 분야</div>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-3xl md:text-4xl font-bold mb-2">
                {isCounselorsLoading ? <Skeleton className="h-10 w-20" /> : <NumberTicker value={totalCounselors} />}
              </div>
              <div className="text-sm text-muted-foreground font-medium">전문 상담사</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 md:py-24 bg-slate-50 dark:bg-[#050508]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">이런 영상을 만듭니다</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              다양한 전문 분야의 지식을 시청자가 이해하기 쉽고 매력적인 영상으로 제작합니다.
            </p>
          </div>

          {isCategoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categoriesData?.data?.map((category: { id: string; name: string; icon?: string; _count?: { videos: number } }, index: number) => (
                <div 
                  key={category.id}
                  className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 card-hover animate-fade-in-up"
                  style={{ animationDelay: `${(index % 8) * 50}ms` }}
                >
                  <div className="text-4xl mb-3">{category.icon || "📚"}</div>
                  <h3 className="font-semibold text-foreground mb-1">{category.name}</h3>
                  <p className="text-xs text-muted-foreground">{category._count?.videos || 0}개의 영상</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 md:py-24 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800/50">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">함께봄과 함께하는 방법</h2>
            <p className="text-muted-foreground">
              체계적인 시스템으로 크리에이터의 안정적인 수익 창출을 지원합니다.
            </p>
          </div>

          <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
            
            {/* Step 1 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active animate-fade-in-up">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-foreground">1. 회원가입 및 포트폴리오 등록</h3>
                  <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">Step 1</span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  STAR 회원으로 가입하고 본인의 역량을 보여줄 수 있는 포트폴리오와 쇼릴을 등록합니다.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-foreground">2. 관리자 승인</h3>
                  <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">Step 2</span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  등록된 포트폴리오를 바탕으로 관리자의 심사를 거쳐 정식 STAR 크리에이터로 승인됩니다.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <PlayCircle className="w-4 h-4" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-foreground">3. 프로젝트 수주</h3>
                  <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">Step 3</span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  제작요청 게시판에서 원하는 프로젝트를 확인하고 수락하여 작업을 시작합니다.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active animate-fade-in-up" style={{ animationDelay: "300ms" }}>
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-foreground">4. 영상 제작 및 피드백</h3>
                  <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">Step 4</span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  영상을 제작하여 업로드하고, 관리자의 피드백을 반영하여 최종본을 완성합니다.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active animate-fade-in-up" style={{ animationDelay: "400ms" }}>
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-foreground">5. 정산 완료</h3>
                  <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">Step 5</span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  최종 승인된 영상에 대해 매월 정해진 기일에 투명하고 정확하게 정산받습니다.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-32 bg-slate-950 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="container mx-auto px-4 relative z-10 animate-fade-in-up">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">당신의 지식을 영상으로 펼쳐보세요</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
            함께봄스타와 함께 성장할 역량 있는 크리에이터를 기다립니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-medium text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/25"
            >
              크리에이터로 합류하기
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
