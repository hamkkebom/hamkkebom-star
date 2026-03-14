"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { drawStroke, type Stroke } from "@/lib/draw-utils";
import { Button } from "@/components/ui/button";
import { MousePointer2, Pen, Square, ArrowRight, Undo, Redo, Trash2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AnnotationCanvasProps {
    videoRef: React.RefObject<HTMLDivElement | null>;
    currentTime: number;
    /** 적용 시 부모에게 스트로크 데이터와 캡처 시점을 전달 */
    onSave?: (strokes: Stroke[], capturedTime: number) => void;
}

export function AnnotationCanvas({ videoRef: _videoRef, currentTime, onSave }: AnnotationCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const isActive = useCanvasStore((s) => s.isActive);
    const tool = useCanvasStore((s) => s.tool);
    const color = useCanvasStore((s) => s.color);
    const strokeWidth = useCanvasStore((s) => s.strokeWidth);
    const setTool = useCanvasStore((s) => s.setTool);
    const setColor = useCanvasStore((s) => s.setColor);
    const toggleCanvas = useCanvasStore((s) => s.toggleCanvas);
    const saveDrawing = useCanvasStore((s) => s.saveDrawing);

    // 스트로크 기록
    const strokesRef = useRef<Stroke[]>([]);
    const undoStackRef = useRef<Stroke[][]>([]);
    const redoStackRef = useRef<Stroke[][]>([]);
    const isDrawingRef = useRef(false);
    const currentStrokeRef = useRef<Stroke | null>(null);

    const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#ffffff", "#000000"];

    // ─── 전체 다시 그리기 ───
    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        ctx.clearRect(0, 0, w, h);

        for (const stroke of strokesRef.current) {
            drawStroke(ctx, stroke);
        }
        if (currentStrokeRef.current) {
            drawStroke(ctx, currentStrokeRef.current);
        }
    }, []);

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
        if (ctx) ctx.scale(dpr, dpr);
        redraw();
    }, [redraw]);

    // ─── 마우스/터치 → 캔버스 좌표 ───
    const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
        const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    // ─── 포인터 이벤트 핸들러 (마우스) ───
    const handlePointerDown = (e: React.MouseEvent) => {
        if (tool === "select" || tool === "text") return;
        isDrawingRef.current = true;
        const pos = getPos(e);
        const drawTool = tool === "pen" ? "pen" : tool === "rect" ? "rect" : "arrow";
        currentStrokeRef.current = { tool: drawTool, color, width: strokeWidth, points: [pos] };
    };

    const handlePointerMove = (e: React.MouseEvent) => {
        if (!isDrawingRef.current || !currentStrokeRef.current) return;
        const pos = getPos(e);
        if (currentStrokeRef.current.tool === "pen") {
            currentStrokeRef.current.points.push(pos);
        } else {
            currentStrokeRef.current.points = [currentStrokeRef.current.points[0], pos];
        }
        redraw();
    };

    const handlePointerUp = () => {
        if (!isDrawingRef.current || !currentStrokeRef.current) return;
        isDrawingRef.current = false;
        if (currentStrokeRef.current.points.length >= 2) {
            undoStackRef.current.push([...strokesRef.current]);
            redoStackRef.current = []; // 새 스트로크 시 redo 초기화
            strokesRef.current.push(currentStrokeRef.current);
        }
        currentStrokeRef.current = null;
        redraw();
    };

    // ─── 터치 이벤트 핸들러 ───
    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        if (tool === "select" || tool === "text") return;
        isDrawingRef.current = true;
        const pos = getPos(e);
        const drawTool = tool === "pen" ? "pen" : tool === "rect" ? "rect" : "arrow";
        currentStrokeRef.current = { tool: drawTool, color, width: strokeWidth, points: [pos] };
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();
        if (!isDrawingRef.current || !currentStrokeRef.current) return;
        const pos = getPos(e);
        if (currentStrokeRef.current.tool === "pen") {
            currentStrokeRef.current.points.push(pos);
        } else {
            currentStrokeRef.current.points = [currentStrokeRef.current.points[0], pos];
        }
        redraw();
    };

    // ─── Undo ───
    const undo = useCallback(() => {
        if (undoStackRef.current.length === 0) return;
        redoStackRef.current.push([...strokesRef.current]);
        strokesRef.current = undoStackRef.current.pop()!;
        redraw();
    }, [redraw]);

    // ─── Redo ───
    const redo = useCallback(() => {
        if (redoStackRef.current.length === 0) return;
        undoStackRef.current.push([...strokesRef.current]);
        strokesRef.current = redoStackRef.current.pop()!;
        redraw();
    }, [redraw]);

    // ─── 전체 지우기 ───
    const handleClear = useCallback(() => {
        undoStackRef.current.push([...strokesRef.current]);
        redoStackRef.current = [];
        strokesRef.current = [];
        redraw();
    }, [redraw]);

    // ─── 적용(Save) ───
    const handleSave = useCallback(() => {
        const strokes = [...strokesRef.current];
        // 현재 캔버스 CSS 크기를 기록하여 viewer에서 정확한 스케일링 가능
        const container = containerRef.current;
        const sourceSize = container
            ? { width: container.getBoundingClientRect().width, height: container.getBoundingClientRect().height }
            : undefined;
        saveDrawing(strokes, currentTime, sourceSize);
        onSave?.(strokes, currentTime);
        toggleCanvas();
    }, [saveDrawing, toggleCanvas, onSave, currentTime]);

    // ─── 취소 ───
    const handleCancel = useCallback(() => {
        strokesRef.current = [];
        undoStackRef.current = [];
        redoStackRef.current = [];
        currentStrokeRef.current = null;
        toggleCanvas();
    }, [toggleCanvas]);

    // ─── 초기화 및 리사이즈 ───
    useEffect(() => {
        syncSize();
        window.addEventListener("resize", syncSize);
        return () => window.removeEventListener("resize", syncSize);
    }, [syncSize]);

    useEffect(() => {
        if (isActive) {
            requestAnimationFrame(() => syncSize());
        }
    }, [isActive, syncSize]);

    if (!isActive) return null;

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.08)" }}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-10"
                style={{ cursor: tool === "select" ? "default" : "crosshair", touchAction: "none" }}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handlePointerUp}
            />

            {/* ─── Floating Toolbar ─── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 bg-[#1a1a24]/90 border border-border rounded-2xl shadow-2xl"
            >
                {/* 도구 버튼 */}
                <div className="flex gap-1 pr-2 border-r border-border">
                    <ToolBtn icon={<MousePointer2 className="w-4 h-4" />} active={tool === "select"} onClick={() => setTool("select")} tip="선택 (V)" />
                    <ToolBtn icon={<Pen className="w-4 h-4" />} active={tool === "pen"} onClick={() => setTool("pen")} tip="펜 (P)" />
                    <ToolBtn icon={<Square className="w-4 h-4" />} active={tool === "rect"} onClick={() => setTool("rect")} tip="상자 (R)" />
                    <ToolBtn icon={<ArrowRight className="w-4 h-4" />} active={tool === "arrow"} onClick={() => setTool("arrow")} tip="화살표 (A)" />
                </div>

                {/* 색상 팔레트 */}
                <div className="flex gap-1.5 px-2 border-r border-border">
                    {COLORS.map((c) => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={cn(
                                "w-5 h-5 rounded-full border-2 transition-all",
                                color === c ? "border-white scale-110" : "border-transparent opacity-80 hover:opacity-100"
                            )}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                {/* Undo / Redo / Clear */}
                <div className="flex gap-1 pl-2">
                    <Button variant="ghost" size="icon" onClick={undo} className="w-8 h-8 rounded-lg text-slate-300 hover:text-foreground hover:bg-secondary">
                        <Undo className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={redo} className="w-8 h-8 rounded-lg text-slate-300 hover:text-foreground hover:bg-secondary">
                        <Redo className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleClear} className="w-8 h-8 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>

                {/* 취소 / 적용 */}
                <div className="flex gap-2 pl-4">
                    <Button variant="ghost" size="sm" onClick={handleCancel} className="text-slate-300 hover:text-foreground rounded-xl">
                        <X className="w-4 h-4 mr-1.5" /> 취소
                    </Button>
                    <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-xl shadow-lg shadow-indigo-600/20">
                        <Check className="w-4 h-4 mr-1.5" /> 적용
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── 도구 버튼 컴포넌트 ───
function ToolBtn({ icon, active, onClick, tip }: { icon: React.ReactNode; active: boolean; onClick: () => void; tip: string }) {
    return (
        <button
            onClick={onClick}
            title={tip}
            className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg transition-all",
                active ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:text-foreground hover:bg-secondary"
            )}
        >
            {icon}
        </button>
    );
}
