import { INK, renderDrawing } from "./canvas";
import type { GameResult } from "./types";
import { formatScore, formatTime } from "./ui";

const PAPER = "#f6f1e7";
const CARD = "#fdfbf6";
const MUTED = "#8a7f72";
const ACCENT: Record<string, string> = { exact: "#4f7a5a", close: "#c08a2b", wrong: "#b8513b" };

/** Render the results grid onto an offscreen canvas and save it as a PNG. */
export async function downloadCollage(result: GameResult, verdict: string): Promise<void> {
  await document.fonts.ready;
  const cols = result.rounds.length <= 12 ? 4 : 5;
  const rows = Math.ceil(result.rounds.length / cols);
  const cell = 240;
  const gap = 24;
  const pad = 64;
  const header = 220;
  const caption = 64;
  const width = pad * 2 + cols * cell + (cols - 1) * gap;
  const height = pad + header + rows * (cell + caption) + (rows - 1) * gap + pad;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = MUTED;
  ctx.font = '500 18px "Geist", system-ui, sans-serif';
  ctx.fillText("DOODLE RECALL", pad, pad + 10);

  ctx.fillStyle = INK;
  ctx.font = 'italic 92px "Instrument Serif", Georgia, serif';
  const scoreText = `${formatScore(result.score)} / ${result.rounds.length}`;
  ctx.fillText(scoreText, pad, pad + 110);

  ctx.font = '400 30px "Instrument Serif", Georgia, serif';
  ctx.fillStyle = MUTED;
  ctx.fillText(
    `${verdict}  ·  ${result.config.drawTime}s per doodle  ·  recalled in ${formatTime(result.recallSeconds)}`,
    pad,
    pad + 160,
  );

  result.rounds.forEach((round, i) => {
    const x = pad + (i % cols) * (cell + gap);
    const y = pad + header + Math.floor(i / cols) * (cell + caption + gap);

    ctx.fillStyle = CARD;
    roundRect(ctx, x, y, cell, cell + caption, 22);
    ctx.fill();

    renderDrawing(ctx, round.drawing, x + 16, y + 12, cell - 32);

    ctx.fillStyle = ACCENT[round.verdict];
    ctx.beginPath();
    ctx.arc(x + cell - 22, y + 22, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = INK;
    ctx.font = '700 30px "Caveat", cursive';
    ctx.fillText(round.word, x + 18, y + cell + 18, cell - 36);
    ctx.fillStyle = MUTED;
    ctx.font = '400 15px "Geist", system-ui, sans-serif';
    ctx.fillText(round.guess.trim() ? `you said “${round.guess.trim()}”` : "no guess", x + 18, y + cell + 44, cell - 36);
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
