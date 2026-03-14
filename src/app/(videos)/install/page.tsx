"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Smartphone, Share, CheckCircle2, Zap, Wifi, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PublicInstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as unknown as Record<string, unknown>).standalone);
  });
  const [isIOS] = useState(() => {
    if (typeof window === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        toast.success("앱이 설치되었습니다! 🎉");
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  return (
    <div className="min-h-screen pb-[env(safe-area-inset-bottom)] pb-20 md:pb-24 bg-background">
      {/* Header */}
      <section className="pt-24 pb-12 md:pt-32 md:pb-16 bg-gradient-to-b from-violet-500/5 to-background border-b border-border/50">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-16 h-16 mx-auto bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Smartphone className="w-8 h-8 text-violet-600 dark:text-violet-400" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              함께봄스타 앱 설치
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              웹 브라우저를 열 필요 없이, 바탕화면에서 바로 접속하세요.
              더 빠르고 쾌적한 환경을 제공합니다.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 md:py-20 container mx-auto px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Install Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className={`overflow-hidden border-2 ${isInstalled ? "border-emerald-500/40 bg-emerald-500/5" : "border-violet-500/40 bg-gradient-to-br from-violet-500/5 to-indigo-500/5"}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  {isInstalled ? (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      앱이 이미 설치되어 있습니다
                    </>
                  ) : (
                    <>
                      <Download className="w-6 h-6 text-violet-500" />
                      지금 바로 설치하기
                    </>
                  )}
                </CardTitle>
                <CardDescription className="text-base">
                  {isInstalled
                    ? "홈 화면에서 함께봄스타 아이콘을 찾아 실행해주세요."
                    : "홈 화면에 추가하면 네이티브 앱처럼 빠르게 사용할 수 있습니다."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isInstalled ? (
                  <div className="p-4 rounded-xl bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    설치가 완료되었습니다. 홈 화면을 확인해주세요!
                  </div>
                ) : deferredPrompt ? (
                  <Button
                    size="lg"
                    onClick={handleInstall}
                    className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold h-14 px-8 rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:scale-105 active:scale-95"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    앱 설치하기
                  </Button>
                ) : isIOS ? (
                  <div className="space-y-5 p-6 rounded-xl bg-background/50 border border-border/50 backdrop-blur-sm">
                    <p className="font-bold text-foreground flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-violet-500" />
                      iOS 기기 설치 방법
                    </p>
                    <div className="space-y-4">
                      {[
                        { step: 1, text: "Safari 하단의 공유 버튼을 누르세요", icon: <Share className="w-5 h-5" /> },
                        { step: 2, text: '"홈 화면에 추가"를 선택하세요', icon: <Download className="w-5 h-5" /> },
                        { step: 3, text: '"추가"를 눌러 완료!', icon: <CheckCircle2 className="w-5 h-5" /> },
                      ].map((item) => (
                        <div key={item.step} className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-base font-black text-violet-600 dark:text-violet-400 shadow-sm">
                            {item.step}
                          </div>
                          <span className="text-base font-medium flex items-center gap-2 text-foreground/80">
                            {item.icon} {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-muted/50 text-muted-foreground text-sm">
                    Chrome 또는 Edge 브라우저의 주소창 오른쪽에 있는 설치(⊕) 아이콘을 눌러 설치할 수 있습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {[
              { icon: Zap, title: "빠른 접근", desc: "바탕화면 아이콘으로 1초 만에 접속" },
              { icon: Wifi, title: "오프라인 지원", desc: "네트워크가 불안정해도 기본 기능 사용" },
              { icon: Bell, title: "푸시 알림", desc: "중요한 업데이트를 놓치지 않고 확인" },
            ].map((benefit, i) => (
              <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                    <benefit.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>

        </div>
      </section>
    </div>
  );
}
