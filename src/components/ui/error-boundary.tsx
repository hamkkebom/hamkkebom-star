"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
    /** 에러 발생 시 표시할 제목 (기본: "문제가 발생했습니다") */
    title?: string;
    /** 에러 발생 시 표시할 설명 */
    description?: string;
    /** 에러 발생 시 fallback UI (title/description 대신 완전 커스텀) */
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * 클라이언트 에러 바운더리 — React 클래스 컴포넌트 기반.
 * 자식 트리에서 발생한 런타임 에러를 catch하여 fallback UI를 표시합니다.
 *
 * @example
 * <ErrorBoundary title="피드백을 불러올 수 없습니다">
 *   <FeedbackList />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("[ErrorBoundary]", error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        if (this.props.fallback) {
            return this.props.fallback;
        }

        return (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>

                <h3 className="text-lg font-bold text-foreground dark:text-white mb-2">
                    {this.props.title ?? "문제가 발생했습니다"}
                </h3>

                <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
                    {this.props.description ??
                        "일시적인 오류가 발생했습니다. 다시 시도해 주세요."}
                </p>

                {process.env.NODE_ENV === "development" && this.state.error && (
                    <pre className="mb-6 max-w-lg text-left text-xs text-red-400/80 bg-red-500/5 border border-red-500/10 rounded-xl p-4 overflow-auto whitespace-pre-wrap">
                        {this.state.error.message}
                    </pre>
                )}

                <Button
                    onClick={this.handleRetry}
                    variant="outline"
                    className="gap-2 rounded-xl border-red-500/20 hover:bg-red-500/5 hover:border-red-500/30 text-red-500 hover:text-red-400 transition-all"
                >
                    <RefreshCcw className="w-4 h-4" />
                    다시 시도
                </Button>
            </div>
        );
    }
}
