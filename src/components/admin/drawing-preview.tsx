"use client";

import { useEffect, useRef, memo } from "react";
import { drawStroke, calculateBounds, type Stroke } from "@/lib/draw-utils";
import { cn } from "@/lib/utils";

interface DrawingPreviewProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strokes: any;
    className?: string;
}

/**
 * 미니 캔버스 프리뷰 — 스트로크를 축소하여 렌더링.
 * 관리자 작성 탭, 피드백 히스토리, 스타 피드백 카드에서 사용.
 */
export const DrawingPreview = memo(function DrawingPreview({ strokes: rawStrokes, className }: DrawingPreviewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // 다양한 형태 호환: { strokes, sourceSize } | Stroke[] | string
    const strokes: Stroke[] = (() => {
        if (!rawStrokes) return [];
        if (typeof rawStrokes === "string") {
            try {
                const parsed = JSON.parse(rawStrokes);
                if (parsed && Array.isArray(parsed.strokes)) return parsed.strokes;
                if (Array.isArray(parsed)) return parsed;
            } catch { /* ignore */ }
            return [];
        }
        // { strokes, sourceSize } 구조
        if (rawStrokes && Array.isArray(rawStrokes.strokes)) return rawStrokes.strokes;
        // Stroke[] 직접
        if (Array.isArray(rawStrokes)) return rawStrokes as Stroke[];
        return [];
    })();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || strokes.length === 0) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, rect.width, rect.height);

        // 바운딩 박스 계산 → 중앙 정렬 + 패딩
        const bounds = calculateBounds(strokes);
        const bw = bounds.maxX - bounds.minX;
        const bh = bounds.maxY - bounds.minY;
        if (bw === 0 && bh === 0) return;

        const padding = 8;
        const scaleX = (rect.width - padding * 2) / Math.max(bw, 1);
        const scaleY = (rect.height - padding * 2) / Math.max(bh, 1);
        const scale = Math.min(scaleX, scaleY, 1); // 원본보다 커지지 않도록

        const offsetX = padding + (rect.width - padding * 2 - bw * scale) / 2 - bounds.minX * scale;
        const offsetY = padding + (rect.height - padding * 2 - bh * scale) / 2 - bounds.minY * scale;

        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        for (const stroke of strokes) {
            drawStroke(ctx, stroke);
        }
        ctx.restore();
    }, [strokes]);

    if (strokes.length === 0) return null;

    return (
        <canvas
            ref={canvasRef}
            className={cn("w-full h-full", className)}
        />
    );
});
