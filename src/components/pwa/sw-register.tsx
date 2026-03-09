"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            window.addEventListener("load", () => {
                navigator.serviceWorker
                    .register("/sw.js")
                    .then((registration) => {
                        console.log("SW registered: ", registration);

                        // 업데이트 발견 시
                        registration.onupdatefound = () => {
                            const installingWorker = registration.installing;
                            if (installingWorker) {
                                installingWorker.onstatechange = () => {
                                    if (installingWorker.state === "installed") {
                                        if (navigator.serviceWorker.controller) {
                                            // 새 버전이 가능함
                                            console.log("새 버전을 사용할 수 있습니다.");
                                            // 여기서 toast 띄워서 업데이트 유도
                                            // update-prompt 컴포넌트에서 더 상세히 다룰 수 있음
                                        } else {
                                            // 처음 설치 완료
                                            console.log("PWA 설치가 완료되었습니다.");
                                        }
                                    }
                                };
                            }
                        };
                    })
                    .catch((registrationError) => {
                        console.log("SW registration failed: ", registrationError);
                    });
            });
        }
    }, []);

    return null;
}
