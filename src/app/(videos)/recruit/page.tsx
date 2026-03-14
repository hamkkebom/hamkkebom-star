"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, MessageSquare, Wallet, FileText, Film, MessageCircle, CheckCircle, CreditCard, ChevronDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = [
  {
    question: "어떤 장비가 필요한가요?",
    answer: "기본적인 영상 편집이 가능한 PC와 편집 소프트웨어(Premiere Pro, Final Cut Pro, DaVinci Resolve 등)가 필요합니다. 고사양의 장비보다는 안정적인 작업 환경을 권장합니다.",
  },
  {
    question: "수익은 어떻게 되나요?",
    answer: "크리에이터의 역량과 프로젝트 난이도에 따라 건별 단가가 책정됩니다. 투명한 정산 시스템을 통해 매월 정해진 날짜에 자동으로 수익이 지급되며, 상세 내역은 언제든 확인 가능합니다.",
  },
  {
    question: "경력이 없어도 지원 가능한가요?",
    answer: "네, 가능합니다! 포트폴리오 심사를 통해 실력을 증명해주시면 됩니다. 열정과 감각이 있는 신입 크리에이터분들의 지원을 환영합니다.",
  },
  {
    question: "프로젝트는 어떻게 선택하나요?",
    answer: "매주 업데이트되는 프로젝트 목록에서 본인의 일정과 관심사에 맞는 프로젝트를 직접 선택하여 수주할 수 있습니다. 강제 할당은 없습니다.",
  },
  {
    question: "정산은 언제 되나요?",
    answer: "매월 말일을 기준으로 정산이 마감되며, 익월 지정된 날짜에 등록하신 계좌로 자동 입금됩니다. 정산 명세서는 PDF로 제공됩니다.",
  },
];

const steps = [
  { icon: FileText, title: "프로젝트 수주", desc: "원하는 프로젝트를 선택하고 수락합니다." },
  { icon: Film, title: "영상 제작", desc: "가이드라인에 맞춰 영상을 제작합니다." },
  { icon: MessageCircle, title: "피드백 & 수정", desc: "타임코드 기반의 정밀한 피드백을 주고받습니다." },
  { icon: CheckCircle, title: "승인 & 공개", desc: "최종 승인된 영상이 플랫폼에 공개됩니다." },
  { icon: CreditCard, title: "정산", desc: "투명하고 정확한 월별 정산을 받습니다." },
];

export default function RecruitPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen pb-[env(safe-area-inset-bottom)] pb-20 md:pb-0">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-violet-500/10 to-background pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground">
              영상으로 세상을 바꾸는 <br className="hidden md:block" />
              <span className="text-gradient">크리에이터를 찾습니다</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              안정적인 프로젝트 공급 · 체계적인 피드백 · 투명한 정산
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button asChild size="lg" className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold h-14 px-8 rounded-full shadow-lg shadow-violet-500/25 transition-all hover:scale-105">
                <Link href="/auth/signup">
                  지금 지원하기 <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-full border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all">
                <Link href="/videos">
                  영상 둘러보기
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 왜 함께봄인가? */}
      <section className="py-16 md:py-24 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">왜 함께봄인가?</h2>
          <p className="text-muted-foreground">크리에이터가 창작에만 집중할 수 있는 환경을 제공합니다.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Briefcase, title: "안정적인 프로젝트 공급", desc: "매주 새로운 제작 요청이 올라옵니다" },
            { icon: MessageSquare, title: "체계적인 피드백 시스템", desc: "타임코드 기반 정밀 피드백으로 빠르게 성장합니다" },
            { icon: Wallet, title: "투명한 정산", desc: "월별 자동 정산, 건별 금액 확인, PDF 명세서 제공" },
          ].map((benefit, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="h-full border-violet-100 dark:border-violet-900/50 bg-card/50 backdrop-blur-sm card-hover">
                <CardHeader>
                  <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4 text-violet-600 dark:text-violet-400">
                    <benefit.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{benefit.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 이렇게 일합니다 */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">이렇게 일합니다</h2>
            <p className="text-muted-foreground">체계적이고 효율적인 워크플로우를 경험하세요.</p>
          </motion.div>

          <div className="max-w-3xl mx-auto relative">
            {/* Vertical Line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />

            <div className="space-y-12">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative flex items-center gap-6 md:gap-0 ${
                    i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Icon Marker */}
                  <div className="absolute left-8 md:left-1/2 w-12 h-12 rounded-full bg-background border-2 border-violet-500 flex items-center justify-center -translate-x-1/2 z-10 shadow-sm">
                    <step.icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>

                  {/* Content */}
                  <div className={`flex-1 pl-20 md:pl-0 ${i % 2 === 0 ? "md:pr-16 md:text-right" : "md:pl-16 md:text-left"}`}>
                    <Card className="border-none shadow-sm bg-background/80 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2 md:inline-flex">
                          <span className="text-violet-500 font-black text-sm">0{i + 1}</span>
                          {step.title}
                        </h3>
                        <p className="text-muted-foreground text-sm">{step.desc}</p>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 자주 묻는 질문 */}
      <section className="py-16 md:py-24 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">자주 묻는 질문</h2>
          <p className="text-muted-foreground">지원 전 궁금한 점을 확인해보세요.</p>
        </motion.div>

        <div className="max-w-2xl mx-auto space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="overflow-hidden border-border/50">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <span className="font-medium">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-6 pb-6 text-muted-foreground text-sm leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-32 bg-gradient-to-t from-violet-500/10 to-background text-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto space-y-8"
        >
          <h2 className="text-3xl md:text-5xl font-black tracking-tight">
            당신의 크리에이티브를 <br />
            <span className="text-gradient">기다리고 있습니다</span>
          </h2>
          <Button asChild size="lg" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold h-14 px-10 rounded-full shadow-xl shadow-violet-500/20 transition-all hover:scale-105">
            <Link href="/auth/signup">
              크리에이터로 합류하기
            </Link>
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
