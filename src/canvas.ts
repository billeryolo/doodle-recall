import type { Drawing, Stroke } from "./types";

export const INK = "#2b2723";
const LINE_WIDTH = 0.022; // fraction of the canvas side

/** Size a canvas's backing store for crisp lines on high-DPI screens. */
export function fitCanvas(canvas: HTMLCanvasElement, cssSize: number): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** Render a normalized drawing into a square region of a context. */
export function renderDrawing(
  ctx: CanvasRenderingContext2D,
  drawing: Drawing,
  x: number,
  y: number,
  size: number,
  color = INK,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1.5, size * LINE_WIDTH);
  for (const stroke of drawing) {
    const pts = stroke.length / 2;
    if (pts === 1) {
      ctx.beginPath();
      ctx.arc(x + stroke[0] * size, y + stroke[1] * size, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(x + stroke[0] * size, y + stroke[1] * size);
    // Quadratic curves through midpoints give smooth, marker-like lines.
    for (let i = 1; i < pts - 1; i++) {
      const cx = stroke[i * 2], cy = stroke[i * 2 + 1];
      const nx = stroke[i * 2 + 2], ny = stroke[i * 2 + 3];
      ctx.quadraticCurveTo(x + cx * size, y + cy * size, x + ((cx + nx) / 2) * size, y + ((cy + ny) / 2) * size);
    }
    ctx.lineTo(x + stroke[(pts - 1) * 2] * size, y + stroke[(pts - 1) * 2 + 1] * size);
    ctx.stroke();
  }
  ctx.restore();
}

export function isBlank(drawing: Drawing): boolean {
  return drawing.every((s) => s.length === 0);
}

/** Interactive drawing surface using Pointer Events (mouse, touch, stylus). */
export class DrawingPad {
  private ctx: CanvasRenderingContext2D;
  private size: number;
  private strokes: Stroke[] = [];
  private current: Stroke | null = null;
  private activePointer: number | null = null;
  private enabled = false;

  constructor(private canvas: HTMLCanvasElement, cssSize: number) {
    this.size = cssSize;
    this.ctx = fitCanvas(canvas, cssSize);
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onUp);
    canvas.addEventListener("lostpointercapture", this.onUp);
  }

  resize(cssSize: number): void {
    this.size = cssSize;
    this.ctx = fitCanvas(this.canvas, cssSize);
    this.redraw();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.endStroke();
  }

  /** Returns the drawing so far and clears the pad. */
  take(): Drawing {
    this.endStroke();
    const out = this.strokes;
    this.strokes = [];
    this.redraw();
    return out;
  }

  clear(): void {
    this.current = null;
    this.activePointer = null;
    this.strokes = [];
    this.redraw();
  }

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointercancel", this.onUp);
    this.canvas.removeEventListener("lostpointercapture", this.onUp);
  }

  private redraw(): void {
    this.ctx.clearRect(0, 0, this.size, this.size);
    renderDrawing(this.ctx, this.strokes, 0, 0, this.size);
  }

  private point(e: PointerEvent): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    return [clamp((e.clientX - rect.left) / rect.width), clamp((e.clientY - rect.top) / rect.height)];
  }

  private onDown = (e: PointerEvent) => {
    if (!this.enabled || this.activePointer !== null) return;
    e.preventDefault();
    this.activePointer = e.pointerId;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone — the stroke still works without capture */
    }
    this.current = [...this.point(e)];
    this.strokes.push(this.current);
    // Draw a dot immediately so a tap registers visibly.
    this.redraw();
  };

  private onMove = (e: PointerEvent) => {
    if (!this.current || e.pointerId !== this.activePointer) return;
    e.preventDefault();
    // Some browsers return an empty list (e.g. for synthetic events) — fall back to the event itself.
    const coalesced = e.getCoalescedEvents?.() ?? [];
    const events = coalesced.length ? coalesced : [e];
    const s = this.size;
    const ctx = this.ctx;
    ctx.strokeStyle = INK;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(1.5, s * LINE_WIDTH);
    for (const ev of events) {
      const [x, y] = this.point(ev);
      const lx = this.current[this.current.length - 2];
      const ly = this.current[this.current.length - 1];
      if (Math.abs(x - lx) + Math.abs(y - ly) < 0.002) continue;
      ctx.beginPath();
      ctx.moveTo(lx * s, ly * s);
      ctx.lineTo(x * s, y * s);
      ctx.stroke();
      this.current.push(x, y);
    }
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.activePointer) return;
    this.endStroke();
  };

  private endStroke(): void {
    if (this.activePointer !== null && this.canvas.hasPointerCapture(this.activePointer)) {
      this.canvas.releasePointerCapture(this.activePointer);
    }
    if (this.current) this.redraw(); // re-render the stroke smoothed
    this.current = null;
    this.activePointer = null;
  }
}
