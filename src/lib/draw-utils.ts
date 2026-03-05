// ─── 드로잉 스트로크 공유 타입 & 유틸 ───

export type Stroke = {
    tool: "pen" | "rect" | "arrow";
    color: string;
    width: number;
    points: { x: number; y: number }[];
};

/**
 * 개별 스트로크를 Canvas 2D Context에 그린다.
 * annotation-canvas, annotation-viewer, drawing-preview에서 공유.
 */
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    if (stroke.points.length < 1) return;
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.tool === "pen") {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
    } else if (stroke.tool === "rect") {
        if (stroke.points.length >= 2) {
            const p0 = stroke.points[0];
            const p1 = stroke.points[stroke.points.length - 1];
            const x = Math.min(p0.x, p1.x);
            const y = Math.min(p0.y, p1.y);
            const w = Math.abs(p1.x - p0.x);
            const h = Math.abs(p1.y - p0.y);
            ctx.strokeRect(x, y, w, h);
        }
    } else if (stroke.tool === "arrow") {
        if (stroke.points.length >= 2) {
            const p0 = stroke.points[0];
            const p1 = stroke.points[stroke.points.length - 1];
            // Line
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
            // Arrowhead
            const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
            const headLen = stroke.width * 4;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p1.x - headLen * Math.cos(angle - Math.PI / 6), p1.y - headLen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p1.x - headLen * Math.cos(angle + Math.PI / 6), p1.y - headLen * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
        }
    }
    ctx.restore();
}

/**
 * 여러 스트로크의 바운딩 박스를 계산한다.
 */
export function calculateBounds(strokes: Stroke[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const stroke of strokes) {
        for (const p of stroke.points) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
    }

    return { minX, minY, maxX, maxY };
}
