"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(false);
    const [showOnlineMode, setShowOnlineMode] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            setShowOnlineMode(true);
            setTimeout(() => setShowOnlineMode(false), 3000);
        };

        const handleOffline = () => {
            setIsOffline(true);
            setShowOnlineMode(false);
        };

        // 초기 상태
        if (!navigator.onLine) {
            setIsOffline(true);
        }

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    return (
        <AnimatePresence>
            {isOffline && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold shadow-md z-50 fixed top-0 left-0 right-0 w-full"
                >
                    <WifiOff className="w-4 h-4" />
                    <span>오프라인 모드 — 캐시된 데이터를 표시합니다</span>
                </motion.div>
            )}

            {showOnlineMode && !isOffline && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="bg-emerald-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold shadow-md z-50 fixed top-0 left-0 right-0 w-full"
                >
                    <Wifi className="w-4 h-4" />
                    <span>온라인으로 복귀했습니다!</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
