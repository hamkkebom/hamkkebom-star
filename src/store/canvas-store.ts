import { create } from 'zustand';
import type { Stroke } from '@/lib/draw-utils';

export type DrawingTool = 'select' | 'pen' | 'rect' | 'arrow' | 'text';

interface CanvasState {
    isActive: boolean;
    tool: DrawingTool;
    color: string;
    strokeWidth: number;
    drawingObjects: Stroke[];

    // 드로잉 첨부 상태 관리
    hasDrawingAttached: boolean;
    attachedTimecode: number | null;
    sourceSize: { width: number; height: number } | null;

    setTool: (tool: DrawingTool) => void;
    setColor: (color: string) => void;
    toggleCanvas: () => void;
    saveDrawing: (objects: Stroke[], timecode?: number, sourceSize?: { width: number; height: number }) => void;
    loadDrawing: (objects: Stroke[]) => void;
    clearCanvas: () => void;
    detachDrawing: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
    isActive: false,
    tool: 'pen',
    color: '#ef4444',
    strokeWidth: 4,
    drawingObjects: [],
    hasDrawingAttached: false,
    attachedTimecode: null,
    sourceSize: null,

    setTool: (tool) => set({ tool }),
    setColor: (color) => set({ color }),
    toggleCanvas: () => set((state) => ({ isActive: !state.isActive })),

    saveDrawing: (objects, timecode, sourceSize) => set({
        drawingObjects: objects,
        hasDrawingAttached: objects.length > 0,
        attachedTimecode: timecode ?? null,
        sourceSize: sourceSize ?? null,
    }),

    loadDrawing: (objects) => set({
        drawingObjects: objects,
        isActive: true,
        hasDrawingAttached: objects.length > 0,
    }),

    clearCanvas: () => set({
        drawingObjects: [],
        isActive: false,
        hasDrawingAttached: false,
        attachedTimecode: null,
        sourceSize: null,
    }),

    detachDrawing: () => set({
        drawingObjects: [],
        hasDrawingAttached: false,
        attachedTimecode: null,
        sourceSize: null,
    }),
}));
