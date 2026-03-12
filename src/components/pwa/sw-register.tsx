"use client";

import { useEffect } from "react";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * 개발 모드에서는 기존 SW를 해제하고 캐시를 정리합니다.
 * 프로덕션에서만 SW를 등록합니다.
 */
export function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        // ── 개발 모드: 기존 SW 해제 + 캐시 정리 ──
        if (!IS_PRODUCTION) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (const registration of registrations) {
                    registration.unregister();
                    console.log("[SW] Dev mode — unregistered:", registration.scope);
                }
            });
            caches.keys().then((names) => {
                for (const name of names) {
                    caches.delete(name);
                }
                if (names.length > 0) {
                    console.log("[SW] Dev mode — cleared caches:", names);
                }
            });
            return;
        }

        // ── 프로덕션: SW 등록 ──
        window.addEventListener("load", () => {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("[SW] Registered:", registration.scope);

                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        if (!installingWorker) return;

                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === "installed") {
                                if (navigator.serviceWorker.controller) {
                                    console.log("[SW] New version available.");
                                } else {
                                    console.log("[SW] First install complete.");
                                }
                            }
                        };
                    };
                })
                .catch((err) => {
                    console.log("[SW] Registration failed:", err);
                });
        });
    }, []);

    return null;
}
