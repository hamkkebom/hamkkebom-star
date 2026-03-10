"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Download, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    useEffect(() => {
        // iOS 감지
        const ua = navigator.userAgent;
        const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
        const isInStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
        setIsIOS(isIOSDevice);

        // 이미 설치된 경우 프롬프트 안 보여줌
        if (isInStandalone) return;

        // "나중에" 30일 숨김 체크
        const dismissed = localStorage.getItem("pwa-install-dismissed");
        if (dismissed) {
            const dismissedAt = new Date(dismissed);
            const daysSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince < 30) return;
        }

        // 영구 숨김 체크
        if (localStorage.getItem("pwa-install-never") === "true") return;

        // 방문 횟수 체크 (3회 이상 방문 시에만 보여줌)
        const visitCount = parseInt(localStorage.getItem("pwa-visit-count") || "0", 10) + 1;
        localStorage.setItem("pwa-visit-count", String(visitCount));
        if (visitCount < 3) return;

        // Android/Desktop Chrome — beforeinstallprompt 이벤트 리스닝
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowPrompt(true);
        };
        window.addEventListener("beforeinstallprompt", handler);

        // iOS — Safari에서 standalone이 아닌 경우 보여줌
        if (isIOSDevice && !isInStandalone && visitCount >= 3) {
            setTimeout(() => setShowPrompt(true), 3000);
        }

        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = useCallback(async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
        } else if (isIOS) {
            setShowIOSGuide(true);
        }
    }, [deferredPrompt, isIOS]);

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
    };

    const handleNever = () => {
        setShowPrompt(false);
        localStorage.setItem("pwa-install-never", "true");
    };

    if (!showPrompt) return null;

    return (
        <>
            {/* 설치 스낵바 */}
            <AnimatePresence>
                {showPrompt && !showIOSGuide && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="fixed bottom-[calc(64px+env(safe-area-inset-bottom,16px)+8px)] left-4 right-4 md:left-auto md:right-6 md:w-96 z-50"
                    >
                        <div className="bg-gradient-to-br from-violet-600 to-pink-500 rounded-2xl p-4 shadow-2xl shadow-violet-500/30 flex items-center gap-3">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <Download className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-bold">앱으로 써보세요! 📱</p>
                                <p className="text-white/70 text-xs mt-0.5">홈 화면에 추가하고 앱처럼 사용하세요</p>
                            </div>
                            <button
                                onClick={handleInstall}
                                className="flex-shrink-0 px-4 py-2 rounded-xl bg-white text-violet-700 text-xs font-black shadow-md hover:bg-white/90 active:scale-95 transition-all"
                            >
                                설치
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="flex-shrink-0 text-white/60 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {/* 영구 숨기기 링크 */}
                        <button
                            onClick={handleNever}
                            className="mt-1 w-full text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                            다시 보지 않기
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* iOS Safari 가이드 다이얼로그 */}
            <AnimatePresence>
                {showIOSGuide && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowIOSGuide(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,16px))] shadow-2xl"
                        >
                            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-6" />

                            <h3 className="text-lg font-black text-center mb-6 tracking-tight">
                                홈 화면에 앱 추가하기
                            </h3>

                            <div className="space-y-5">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-lg font-black text-violet-600">1</div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">하단의 공유 버튼을 누르세요</p>
                                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                            Safari 하단의 <Share className="w-3.5 h-3.5 inline" /> 아이콘
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-lg font-black text-violet-600">2</div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">&quot;홈 화면에 추가&quot;를 선택하세요</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">스크롤해서 찾을 수 있어요</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-lg font-black text-violet-600">3</div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">&quot;추가&quot; 버튼을 눌러 완료!</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">홈 화면에 별들에게 물어봐 아이콘이 생깁니다</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowIOSGuide(false)}
                                className="mt-8 w-full py-3 rounded-xl bg-violet-600 text-white font-bold text-sm shadow-lg shadow-violet-600/30 active:scale-95 transition-all"
                            >
                                알겠습니다
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
