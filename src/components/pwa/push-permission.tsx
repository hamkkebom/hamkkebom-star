"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

export function PushPermission() {
    const [showDialog, setShowDialog] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

        // 이미 구독 중인지 확인
        navigator.serviceWorker.ready.then((reg) => {
            reg.pushManager.getSubscription().then((sub) => {
                setIsSubscribed(!!sub);
            });
        });

        // 이전에 거절/숨김 처리했으면 안 보여줌
        const dismissed = localStorage.getItem("push-permission-dismissed");
        if (dismissed) {
            const daysSince = (Date.now() - new Date(dismissed).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince < 30) return;
        }

        // 방문 3회 후 자동으로 다이얼로그 표시
        const visitCount = parseInt(localStorage.getItem("pwa-visit-count") || "0", 10);
        if (visitCount >= 3 && Notification.permission === "default") {
            setTimeout(() => setShowDialog(true), 5000);
        }
    }, []);

    const subscribe = useCallback(async () => {
        setIsLoading(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                setShowDialog(false);
                localStorage.setItem("push-permission-dismissed", new Date().toISOString());
                return;
            }

            const reg = await navigator.serviceWorker.ready;
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

            setIsSubscribed(true);
            setShowDialog(false);
        } catch (error) {
            console.error("Push subscription failed:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleDismiss = () => {
        setShowDialog(false);
        localStorage.setItem("push-permission-dismissed", new Date().toISOString());
    };

    if (isSubscribed) return null;

    return (
        <AnimatePresence>
            {showDialog && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50"
                >
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                <Bell className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-foreground">피드백 알림을 받으시겠습니까?</h3>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    새 피드백, 정산 완료, 마감 임박 등 중요한 알림을 즉시 받아볼 수 있어요.
                                </p>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={subscribe}
                                disabled={isLoading}
                                className="flex-1 py-2 rounded-xl bg-violet-600 text-foreground text-sm font-bold shadow-md shadow-violet-600/30 hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <span className="w-4 h-4 border-2 border-border border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Bell className="w-4 h-4" />
                                )}
                                알림 받기
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                            >
                                나중에
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
