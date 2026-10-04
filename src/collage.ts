import { INK, renderDrawing } from "./canvas";
import type { GameResult } from "./types";
import { formatScore, formatTime, frameCode } from "./ui";

const ROOM = "#24211e";
const FILM = "#1a1816";
const PAPER = "#e2dacc";
const TEXT = "#dcd5ca";
const MUTED = "#9a9287";
const SAFELIGHT = "#c9654c";

/** Render the contact sheet onto an offscreen canvas and save it as a PNG. */
export async function downloadCollage(result: GameResult, verdict: string): Promise<void> {
  await document.fonts.ready;
  const cols = result.rounds.length <= 12 ? 4 : 5;
  const rows = Math.ceil(result.rounds.length / cols);
  const cell = 240;
  const gapX = 36;
  const rowH = cell + 128; // frame code + print + captions
  const pad = 72;
  const header = 260;
  const width = pad * 2 + cols * cell + (cols - 1) * gapX;
  const height = pad + header + rows * rowH + pad;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = ROOM;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = SAFELIGHT;
  ctx.beginPath();
  ctx.arc(pad + 6, pad + 4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = MUTED;
  ctx.font = '500 18px "Geist Mono", ui-monospace, monospace';
  ctx.fillText(`DOODLE RECALL · CONTACT SHEET · ROLL ${result.config.seed.toUpperCase()}`, pad + 22, pad + 10);

  ctx.fillStyle = TEXT;
  ctx.font = '800 120px "Bricolage Grotesque", system-ui, sans-serif';
  const scoreText = formatScore(result.score);
  ctx.fillText(scoreText, pad - 4, pad + 140);
  const scoreW = ctx.measureText(scoreText).width;
  ctx.fillStyle = MUTED;
  ctx.font = '400 44px "Geist Mono", ui-monospace, monospace';
  ctx.fillText(`/${result.rounds.length}`, pad + scoreW + 10, pad + 140);

  ctx.fillStyle = TEXT;
  ctx.font = '500 30px "Bricolage Grotesque", system-ui, sans-serif';
  ctx.fillText(verdict, pad, pad + 190);
  ctx.fillStyle = MUTED;
  ctx.font = '400 18px "Geist Mono", ui-monospace, monospace';
  ctx.fillText(
    `${result.config.drawTime}s per frame · recalled in ${formatTime(result.recallSeconds)}`,
    pad,
    pad + 222,
  );

  // Film-base band behind each row, with sprocket holes along both edges.
  for (let r = 0; r < rows; r++) {
    const y = pad + header + r * rowH;
    ctx.fillStyle = FILM;
    ctx.fillRect(0, y - 8, width, cell + 64);
    ctx.fillStyle = ROOM;
    for (let x = 14; x < width; x += 28) {
      roundRect(ctx, x, y - 2, 14, 9, 2);
      ctx.fill();
      roundRect(ctx, x, y + cell + 46, 14, 9, 2);
      ctx.fill();
    }
  }

  result.rounds.forEach((round, i) => {
    const x = pad + (i % cols) * (cell + gapX);
    const y = pad + header + Math.floor(i / cols) * rowH;

    ctx.fillStyle = MUTED;
    ctx.font = '500 13px "Geist Mono", ui-monospace, monospace';
    ctx.fillText(frameCode(i), x, y + 24);

    const py = y + 34;
    ctx.fillStyle = PAPER;
    ctx.fillRect(x, py, cell, cell);
    renderDrawing(ctx, round.drawing, x + 10, py + 10, cell - 20, INK);
    drawMark(ctx, round.verdict, x, py, cell, i);

    ctx.fillStyle = round.verdict === "wrong" ? MUTED : TEXT;
    ctx.font = '700 36px "Caveat", cursive';
    ctx.fillText(round.word, x, py + cell + 66, cell);
    ctx.fillStyle = MUTED;
    ctx.font = '400 14px "Geist Mono", ui-monospace, monospace';
    ctx.fillText(round.guess.trim() ? `you said "${round.guess.trim()}"` : "no guess", x, py + cell + 90, cell);
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `doodle-recall-${result.config.seed}.png`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Grease-pencil mark: loose circle (exact), dashed circle (close), strike (wrong). */
function drawMark(ctx: CanvasRenderingContext2D, verdict: string, x: number, y: number, size: number, seed: number) {
  ctx.save();
  ctx.strokeStyle = SAFELIGHT;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.92;
  const cx = x + size / 2;
  const cy = y + size / 2;
  if (verdict === "wrong") {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.1, y + size * 0.88);
    ctx.lineTo(x + size * 0.9, y + size * 0.11);
    ctx.stroke();
  } else {
    if (verdict === "close") ctx.setLineDash([18, 14]);
    const tilt = ((seed * 37) % 9) * 0.04;
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.5, size * 0.47, tilt, 0.15, Math.PI * 2 + 0.35);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
