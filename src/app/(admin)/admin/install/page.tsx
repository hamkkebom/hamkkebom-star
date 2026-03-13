"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Bell, BellOff, Smartphone, Share, CheckCircle2, Wifi, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function AdminInstallAppPage() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isPushSubscribed, setIsPushSubscribed] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const ua = navigator.userAgent;
        const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as unknown as Record<string, unknown>).standalone);
        setIsIOS(isIOSDevice);
        setIsMobile(isMobileDevice);
        setIsInstalled(isStandalone);
        setIsOnline(navigator.onLine);

        const onOnline = () => setIsOnline(true);
        const onOffline = () => setIsOnline(false);
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener("beforeinstallprompt", handler);

        if ("serviceWorker" in navigator && "PushManager" in window) {
            navigator.serviceWorker.ready.then((reg) => {
                reg.pushManager.getSubscription().then((sub) => {
                    setIsPushSubscribed(!!sub);
                });
            });
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
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

    const handlePushToggle = useCallback(async () => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            toast.error("이 브라우저에서는 푸시 알림을 지원하지 않습니다.");
            return;
        }
        setPushLoading(true);
        try {
            const reg = await navigator.serviceWorker.ready;

            if (isPushSubscribed) {
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                    await fetch("/api/push/unsubscribe", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ endpoint: sub.endpoint }),
                    });
                    await sub.unsubscribe();
                }
                setIsPushSubscribed(false);
                toast.success("알림이 해제되었습니다.");
            } else {
                const permission = await Notification.requestPermission();
                if (permission !== "granted") {
                    toast.error("알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.");
                    return;
                }
                const vapidRes = await fetch("/api/push/vapid-key");
                const { publicKey } = await vapidRes.json();
                const keyArray = urlBase64ToUint8Array(publicKey);
                const subscription = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: keyArray.buffer as ArrayBuffer,
                });
                const subJson = subscription.toJSON();
                await fetch("/api/push/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        endpoint: subJson.endpoint,
                        keys: subJson.keys,
                        userAgent: navigator.userAgent,
                    }),
                });
                setIsPushSubscribed(true);
                toast.success("알림이 활성화되었습니다! 🔔");
            }
        } catch (error) {
            console.error("Push toggle error:", error);
            toast.error("알림 설정 중 오류가 발생했습니다.");
        } finally {
            setPushLoading(false);
        }
    }, [isPushSubscribed]);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* 헤더 */}
            <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <Smartphone className="w-7 h-7 text-primary" />
                    앱 설치 · 설정
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    별들에게 물어봐를 앱처럼 설치하고 알림을 관리하세요
                </p>
            </div>

            {/* 설치 상태 카드 */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card className={isInstalled ? "border-emerald-500/40 bg-emerald-500/5" : "border-primary/40 bg-gradient-to-br from-primary/5 to-violet-500/5"}>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            {isInstalled ? (
                                <>
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    앱이 설치되어 있습니다
                                </>
                            ) : (
                                <>
                                    <Download className="w-5 h-5 text-primary" />
                                    {isMobile ? "앱 설치하기" : "📱 모바일 앱 설치"}
                                </>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {isInstalled
                                ? "홈 화면에서 앱을 실행할 수 있습니다."
                                : isMobile
                                    ? "홈 화면에 추가하면 네이티브 앱처럼 빠르게 사용할 수 있어요."
                                    : "휴대폰에서 이 페이지에 접속하면 앱을 설치할 수 있습니다."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isInstalled ? (
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                ✅ 설치 완료 — 홈 화면에서 별들에게 물어봐 아이콘을 확인하세요!
                            </p>
                        ) : deferredPrompt && isMobile ? (
                            <Button
                                size="lg"
                                onClick={handleInstall}
                                className="w-full sm:w-auto bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-600 text-primary-foreground font-bold h-12 active:scale-95 transition-all shadow-lg shadow-primary/30"
                            >
                                <Download className="w-5 h-5 mr-2" />
                                지금 설치하기
                            </Button>
                        ) : isIOS ? (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground font-medium">iOS에서는 아래 단계를 따라주세요:</p>
                                <div className="space-y-3">
                                    {[
                                        { step: 1, text: "Safari 하단의 공유 버튼을 누르세요", icon: <Share className="w-4 h-4" /> },
                                        { step: 2, text: '"홈 화면에 추가"를 선택하세요', icon: <Download className="w-4 h-4" /> },
                                        { step: 3, text: '"추가"를 눌러 완료!', icon: <CheckCircle2 className="w-4 h-4" /> },
                                    ].map((item) => (
                                        <motion.div
                                            key={item.step}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: item.step * 0.1 }}
                                            className="flex items-center gap-3"
                                        >
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-black text-primary">
                                                {item.step}
                                            </div>
                                            <span className="text-sm flex items-center gap-1.5">{item.icon} {item.text}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    {isMobile
                                        ? "Chrome 또는 Edge 브라우저의 메뉴에서 \"홈 화면에 추가\"를 선택하세요."
                                        : "📱 휴대폰 브라우저에서 이 페이지에 접속하여 설치해주세요."}
                                </p>
                                {!isMobile && (
                                    <p className="text-xs text-amber-500 dark:text-amber-400 font-medium">
                                        💡 데스크탑에서는 아래 알림 설정만 이용 가능합니다
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* 알림 설정 */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            {isPushSubscribed ? <Bell className="w-5 h-5 text-primary" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
                            푸시 알림
                        </CardTitle>
                        <CardDescription>새 제출물, STAR 승인 요청, 정산 알림 등을 실시간으로 받아보세요</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            size="lg"
                            variant={isPushSubscribed ? "outline" : "default"}
                            onClick={handlePushToggle}
                            disabled={pushLoading}
                            className="w-full sm:w-auto h-12 font-bold active:scale-95 transition-all"
                        >
                            {pushLoading ? (
                                <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
                            ) : isPushSubscribed ? (
                                <BellOff className="w-4 h-4 mr-2" />
                            ) : (
                                <Bell className="w-4 h-4 mr-2" />
                            )}
                            {isPushSubscribed ? "알림 해제" : "알림 켜기"}
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>

            {/* 앱 상태 정보 */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">앱 상태</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">설치 상태</span>
                            <span className={isInstalled ? "text-emerald-500 font-bold" : "text-amber-500 font-medium"}>
                                {isInstalled ? "✅ 설치됨" : "⬜ 미설치"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">푸시 알림</span>
                            <span className={isPushSubscribed ? "text-emerald-500 font-bold" : "text-muted-foreground"}>
                                {isPushSubscribed ? "🔔 활성화" : "🔕 비활성화"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">네트워크</span>
                            <span className="flex items-center gap-1">
                                {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-500" /> : <WifiOff className="w-3.5 h-3.5 text-amber-500" />}
                                <span className={isOnline ? "text-emerald-500 font-bold" : "text-amber-500 font-medium"}>
                                    {isOnline ? "온라인" : "오프라인"}
                                </span>
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
