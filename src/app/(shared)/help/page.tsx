"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, HelpCircle, BookOpen, Search, ChevronRight, AlertCircle, Info, AlertTriangle } from "lucide-react";
import Link from "next/link";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Types
type Announcement = {
  id: string;
  title: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  createdAt: string;
};

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

type GuideSection = {
  id: string;
  title: string;
  content: string;
  icon: string | null;
  category: string;
  sortOrder: number;
};

function HelpCenterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultTab = searchParams.get("tab") || "announcements";
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sync tab state with URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["announcements", "faq", "guide"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/help?tab=${value}`, { scroll: false });
  };

  // Fetch Announcements
  const { data: announcementsData, isLoading: isLoadingAnnouncements } = useQuery({
    queryKey: ["help-center", "announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements/public");
      if (!res.ok) throw new Error("Failed to fetch announcements");
      return res.json() as Promise<{ data: Announcement[] }>;
    },
  });

  // Fetch FAQ
  const { data: faqData, isLoading: isLoadingFaq } = useQuery({
    queryKey: ["help-center", "faq"],
    queryFn: async () => {
      const res = await fetch("/api/faq/public");
      if (!res.ok) throw new Error("Failed to fetch FAQ");
      return res.json() as Promise<{ data: FaqItem[] }>;
    },
  });

  // Fetch Guide
  const { data: guideData, isLoading: isLoadingGuide, error: guideError } = useQuery({
    queryKey: ["help-center", "guide"],
    queryFn: async () => {
      const res = await fetch("/api/guide");
      if (!res.ok) {
        if (res.status === 401) {
          return { data: {}, total: 0, error: "Unauthorized" };
        }
        throw new Error("Failed to fetch guide");
      }
      return res.json() as Promise<{ data: Record<string, GuideSection[]>, total: number, error?: string }>;
    },
  });

  // FAQ Search & Filter
  const [faqSearch, setFaqSearch] = useState("");
  const [faqCategory, setFaqCategory] = useState<string | null>(null);

  const filteredFaq = faqData?.data?.filter((item) => {
    const matchesSearch = item.question.toLowerCase().includes(faqSearch.toLowerCase()) || item.answer.toLowerCase().includes(faqSearch.toLowerCase());
    const matchesCategory = faqCategory ? item.category === faqCategory : true;
    return matchesSearch && matchesCategory;
  }) || [];

  const faqCategories = Array.from(new Set(faqData?.data?.map((item) => item.category) || []));

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">지원센터</h1>
        <p className="text-muted-foreground">공지사항, 자주 묻는 질문, 사용 가이드를 확인하세요</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted rounded-xl p-1 mb-8">
          <TabsTrigger value="announcements" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">공지사항</span>
              {announcementsData?.data && announcementsData.data.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 border-none">
                  {announcementsData.data.length}
                </Badge>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="faq" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">FAQ</span>
              {faqData?.data && faqData.data.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 border-none">
                  {faqData.data.length}
                </Badge>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="guide" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">가이드</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TabsContent value="announcements" className="mt-0 outline-none">
              <div className="space-y-4">
                {isLoadingAnnouncements ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="rounded-xl border border-border shadow-none">
                      <CardContent className="p-6">
                        <Skeleton className="h-6 w-3/4 mb-4" />
                        <Skeleton className="h-4 w-1/4" />
                      </CardContent>
                    </Card>
                  ))
                ) : announcementsData?.data?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    등록된 공지사항이 없습니다.
                  </div>
                ) : (
                  announcementsData?.data?.map((announcement) => (
                    <Link key={announcement.id} href={`/announcements/${announcement.id}`} className="block group">
                      <Card className="rounded-xl border border-border shadow-none transition-colors hover:bg-muted/50">
                        <CardContent className="p-6 flex items-start gap-4">
                          <div className="mt-1">
                            {announcement.priority === "URGENT" ? (
                              <AlertTriangle className="w-5 h-5 text-destructive" />
                            ) : announcement.priority === "HIGH" ? (
                              <AlertCircle className="w-5 h-5 text-amber-500" />
                            ) : (
                              <Info className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {announcement.priority === "URGENT" && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">긴급</Badge>}
                              {announcement.priority === "HIGH" && <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-[10px] px-1.5 py-0 h-4">중요</Badge>}
                              <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                {announcement.title}
                              </h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(announcement.createdAt).toLocaleDateString("ko-KR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors self-center" />
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="faq" className="mt-0 outline-none">
              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="궁금한 점을 검색해보세요"
                    className="pl-9 rounded-xl border-border bg-card"
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                  />
                </div>

                {!isLoadingFaq && faqCategories.length > 0 && (
                  <ScrollArea className="w-full whitespace-nowrap pb-4">
                    <div className="flex w-max space-x-2">
                      <Badge
                        variant={faqCategory === null ? "default" : "outline"}
                        className="cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
                        onClick={() => setFaqCategory(null)}
                      >
                        전체
                      </Badge>
                      {faqCategories.map((category) => (
                        <Badge
                          key={category}
                          variant={faqCategory === category ? "default" : "outline"}
                          className="cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
                          onClick={() => setFaqCategory(category)}
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="invisible" />
                  </ScrollArea>
                )}

                <Card className="rounded-xl border border-border shadow-none overflow-hidden">
                  <CardContent className="p-0">
                    {isLoadingFaq ? (
                      <div className="p-6 space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : filteredFaq.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        검색 결과가 없습니다.
                      </div>
                    ) : (
                      <Accordion type="single" collapsible className="w-full">
                        {filteredFaq.map((item) => (
                          <AccordionItem key={item.id} value={item.id} className="border-b border-border px-6 last:border-0">
                            <AccordionTrigger className="hover:no-underline py-4 text-left font-medium text-foreground hover:text-primary transition-colors">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-border/50 shrink-0">
                                  {item.category}
                                </Badge>
                                <span>{item.question}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground pb-4 leading-relaxed whitespace-pre-wrap">
                              {item.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="guide" className="mt-0 outline-none">
              {isLoadingGuide ? (
                <div className="space-y-8">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="space-y-4">
                      <Skeleton className="h-8 w-1/3" />
                      <Card className="rounded-xl border border-border shadow-none">
                        <CardContent className="p-6 space-y-4">
                          <Skeleton className="h-6 w-full" />
                          <Skeleton className="h-6 w-5/6" />
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              ) : guideData?.error === "Unauthorized" ? (
                <Card className="rounded-xl border border-border shadow-none bg-muted/30">
                  <CardContent className="p-12 text-center flex flex-col items-center justify-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">로그인이 필요합니다</h3>
                    <p className="text-muted-foreground mb-6">가이드를 보려면 로그인이 필요합니다.</p>
                    <Link href="/auth/login?callbackUrl=/help?tab=guide">
                      <Badge variant="default" className="px-4 py-2 text-sm cursor-pointer">
                        로그인하기
                      </Badge>
                    </Link>
                  </CardContent>
                </Card>
              ) : !guideData?.data || Object.keys(guideData.data).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  등록된 가이드가 없습니다.
                </div>
              ) : (
                <div className="space-y-10">
                  {Object.entries(guideData.data).map(([category, sections]) => (
                    <div key={category} className="space-y-4">
                      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        {category}
                      </h2>
                      <div className="grid gap-4">
                        {sections.map((section, index) => (
                          <Card key={section.id} className="rounded-xl border border-border shadow-none overflow-hidden">
                            <CardHeader className="bg-muted/30 border-b border-border/50 py-4 px-6">
                              <CardTitle className="text-base font-medium flex items-center gap-3">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-background border border-border text-xs font-bold text-muted-foreground">
                                  {index + 1}
                                </span>
                                {section.title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                              <div 
                                className="prose prose-sm max-w-none text-muted-foreground prose-p:leading-relaxed prose-a:text-primary hover:prose-a:text-primary/80"
                                dangerouslySetInnerHTML={{ __html: section.content }}
                              />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

export default function HelpCenterPage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 flex justify-center">
        <Skeleton className="h-10 w-48" />
      </div>
    }>
      <HelpCenterContent />
    </Suspense>
  );
}
