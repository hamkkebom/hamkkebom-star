"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function UpdatePrompt() {
    const [showUpdate, setShowUpdate] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        const handleControllerChange = () => {
            // 새로운 SW가 활성화되면 리로드
            window.location.reload();
        };

        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

        navigator.serviceWorker.ready.then((registration) => {
            // 업데이트 체크 (24시간마다)
            setInterval(() => registration.update(), 24 * 60 * 60 * 1000);

            registration.addEventListener("updatefound", () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener("statechange", () => {
                        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                            setWaitingWorker(newWorker);
                            setShowUpdate(true);
                        }
                    });
                }
            });
        });

        return () => {
            navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
        };
    }, []);

    const handleUpdate = useCallback(() => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: "SKIP_WAITING" });
        }
        setShowUpdate(false);
    }, [waitingWorker]);

    const handleDismiss = () => setShowUpdate(false);

    return (
        <AnimatePresence>
            {showUpdate && (
                <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50"
                >
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <RefreshCcw className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground">새 버전이 있습니다 ✨</p>
                            <p className="text-xs text-muted-foreground mt-0.5">업데이트하면 최신 기능을 사용할 수 있어요</p>
                        </div>
                        <button
                            onClick={handleUpdate}
                            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
                        >
                            업데이트
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            나중에
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
