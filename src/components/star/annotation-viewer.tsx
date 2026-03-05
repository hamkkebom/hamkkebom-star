"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { drawStroke, type Stroke } from "@/lib/draw-utils";

interface AnnotationData {
    strokes: Stroke[];
    sourceSize?: { width: number; height: number };
}

interface AnnotationViewerProps {
    annotation?: AnnotationData | Stroke[] | string | null;
    isActive: boolean;
}

/**
 * annotation 데이터를 파싱하여 { strokes, sourceSize } 형태로 통합
 */
function parseAnnotation(annotation: AnnotationViewerProps["annotation"]): AnnotationData {
    if (!annotation) return { strokes: [] };
    if (typeof annotation === "string") {
        try {
            const parsed = JSON.parse(annotation);
            // { strokes, sourceSize } 구조
            if (parsed && Array.isArray(parsed.strokes)) return parsed;
            // 배열 구조 (이전 호환)
            if (Array.isArray(parsed)) return { strokes: parsed };
        } catch { /* ignore */ }
        return { strokes: [] };
    }
    // { strokes, sourceSize } 구조
    if ("strokes" in annotation && Array.isArray((annotation as AnnotationData).strokes)) {
        return annotation as AnnotationData;
    }
    // Stroke[] 배열 (이전 호환)
    if (Array.isArray(annotation)) return { strokes: annotation };
    return { strokes: [] };
}

export function AnnotationViewer({ annotation, isActive }: AnnotationViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const { strokes, sourceSize } = parseAnnotation(annotation);

    // ─── Canvas 크기 동기화 ───
    const syncSize = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.scale(dpr, dpr);
        }
        redraw(rect.width, rect.height);
    }, [strokes, sourceSize]);

    // ─── 그림 그리기 — 원본 캔버스 크기 기반 정확 스케일링 ───
    const redraw = useCallback((containerW: number, containerH: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        ctx.clearRect(0, 0, w, h);

        if (strokes.length === 0) return;

        // sourceSize가 있으면 정확한 스케일링, 없으면 1:1 렌더링 (이전 데이터 호환)
        if (sourceSize) {
            const scaleX = containerW / sourceSize.width;
            const scaleY = containerH / sourceSize.height;
            ctx.save();
            ctx.scale(scaleX, scaleY);
            for (const stroke of strokes) {
                if (!stroke.points || stroke.points.length < 1) continue;
                drawStroke(ctx, stroke);
            }
            ctx.restore();
        } else {
            // sourceSize 없음 — 1:1 렌더링 (이전 호환)
            for (const stroke of strokes) {
                if (!stroke.points || stroke.points.length < 1) continue;
                drawStroke(ctx, stroke);
            }
        }
    }, [strokes, sourceSize]);

    // ─── 초기화 및 리사이즈 ───
    useEffect(() => {
        syncSize();
        window.addEventListener("resize", syncSize);
        return () => window.removeEventListener("resize", syncSize);
    }, [syncSize]);

    useEffect(() => {
        if (isActive && strokes.length > 0) {
            const timer = setTimeout(() => {
                requestAnimationFrame(() => syncSize());
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isActive, strokes, syncSize]);

    return (
        <AnimatePresence>
            {isActive && strokes.length > 0 && (
                <motion.div
                    key="annotation-overlay"
                    ref={containerRef}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 z-40 pointer-events-none"
                    style={{ background: "transparent" }}
                >
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 z-10 pointer-events-none mix-blend-normal"
                        style={{ opacity: 0.95 }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
