"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Admin Error]", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 shadow-lg shadow-red-500/5">
                <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>

            <h2 className="text-2xl font-bold text-foreground dark:text-foreground mb-2">
                관리자 페이지 오류
            </h2>

            <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed">
                페이지를 표시하는 중 오류가 발생했습니다.
                다시 시도하거나, 이전 페이지로 돌아가 주세요.
            </p>

            {process.env.NODE_ENV === "development" && (
                <pre className="mb-6 max-w-lg text-left text-xs text-red-400/80 bg-red-500/5 border border-red-500/10 rounded-xl p-4 overflow-auto whitespace-pre-wrap">
                    {error.message}
                </pre>
            )}

            <div className="flex items-center gap-3">
                <Button
                    onClick={reset}
                    variant="outline"
                    className="gap-2 rounded-xl border-red-500/20 hover:bg-red-500/5 hover:border-red-500/30 text-red-500 hover:text-red-400"
                >
                    <RefreshCcw className="w-4 h-4" />
                    다시 시도
                </Button>

                <Link href="/admin">
                    <Button
                        variant="ghost"
                        className="gap-2 rounded-xl text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        관리자 홈
                    </Button>
                </Link>
            </div>
        </div>
    );
}
