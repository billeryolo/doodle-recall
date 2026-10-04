import { DrawingPad } from "../canvas";
import { swoosh, tick } from "../sound";
import type { Drawing, GameConfig } from "../types";
import { $, escapeHtml, html, ICONS } from "../ui";

const COUNTDOWN_STEP_MS = 650;
const FLASH_MS = 400;

type Phase = "countdown" | "flash" | "draw" | "paused" | "done";

interface Options {
  config: GameConfig;
  words: string[];
  onDone: (drawings: Drawing[]) => void;
  onQuit: () => void;
}

export function renderDraw(root: HTMLElement, { config, words, onDone, onQuit }: Options): () => void {
  const el = html(`
    <main class="screen draw">
      <header class="island topbar">
        <button class="icon-btn" id="quit" aria-label="Quit to start">${ICONS.close}</button>
        <span class="mono topbar__progress"><b id="idx">01</b> / ${String(words.length).padStart(2, "0")}</span>
        <span class="topbar__word" id="word" aria-live="polite">&nbsp;</span>
      </header>

      <div class="stage">
        <div class="bezel bezel--canvas">
          <div class="bezel__core paper">
            <canvas id="pad" aria-label="Drawing canvas"></canvas>
            <div class="overlay" id="overlay"></div>
          </div>
        </div>
        <div class="timer" aria-hidden="true"><div class="timer__fill" id="bar"></div></div>
      </div>
    </main>
  `);

  const canvas = $<HTMLCanvasElement>(el, "#pad");
  const overlay = $(el, "#overlay");
  const wordEl = $(el, "#word");
  const idxEl = $(el, "#idx");
  const bar = $(el, "#bar");

  root.replaceChildren(el);

  const sizeFor = () =>
    Math.floor(Math.max(220, Math.min(window.innerWidth - 32 - 16, window.innerHeight - 190, 640)));
  const timer = $(el, ".timer");
  const initialSize = sizeFor();
  const pad = new DrawingPad(canvas, initialSize);
  timer.style.width = `${initialSize + 16}px`;

  const drawings: Drawing[] = [];
  const durationMs = config.drawTime * 1000;
  let index = 0;
  let phase: Phase = "countdown";
  let phaseStart = performance.now();
  let raf = 0;
  let lastCount = -1;
  let ticked = 0;

  const showOverlay = (markup: string, kind: string) => {
    overlay.className = `overlay overlay--${kind} is-on`;
    overlay.innerHTML = markup;
  };
  const hideOverlay = () => overlay.classList.remove("is-on");

  const enter = (next: Phase) => {
    phase = next;
    phaseStart = performance.now();
    if (next === "countdown") {
      lastCount = -1;
      pad.setEnabled(false);
      pad.clear();
      wordEl.innerHTML = "&nbsp;";
      bar.style.transform = "scaleX(1)";
    } else if (next === "flash") {
      idxEl.textContent = String(index + 1).padStart(2, "0");
      wordEl.innerHTML = "&nbsp;";
      bar.style.transform = "scaleX(1)";
      bar.classList.remove("is-urgent");
      showOverlay(`<span class="flash-word">${escapeHtml(words[index])}</span>`, "flash");
    } else if (next === "draw") {
      ticked = 0;
      hideOverlay();
      wordEl.textContent = words[index];
      pad.setEnabled(true);
    }
  };

  const loop = (now: number) => {
    const elapsed = now - phaseStart;
    if (phase === "countdown") {
      const n = 3 - Math.floor(elapsed / COUNTDOWN_STEP_MS);
      if (n <= 0) {
        enter("flash");
      } else if (n !== lastCount) {
        lastCount = n;
        tick(n === 1);
        showOverlay(`<span class="count" data-n="${n}">${n}</span><span class="count-hint">Get ready</span>`, "count");
      }
    } else if (phase === "flash") {
      if (elapsed >= FLASH_MS) enter("draw");
    } else if (phase === "draw") {
      const left = durationMs - elapsed;
      bar.style.transform = `scaleX(${Math.max(0, left / durationMs)})`;
      bar.classList.toggle("is-urgent", left < 500);
      // Ticks at 500ms and 250ms remaining.
      if (left <= 500 && ticked === 0) { tick(); ticked = 1; }
      if (left <= 250 && ticked === 1) { tick(true); ticked = 2; }
      if (left <= 0) {
        pad.setEnabled(false);
        drawings.push(pad.take());
        index++;
        if (index >= words.length) {
          phase = "done";
          onDone(drawings);
          return;
        }
        swoosh();
        enter("flash");
      }
    }
    if (phase !== "paused") raf = requestAnimationFrame(loop);
  };

  const pause = () => {
    if (phase === "paused" || phase === "done") return;
    cancelAnimationFrame(raf);
    phase = "paused";
    pad.setEnabled(false);
    pad.clear();
    showOverlay(
      `<span class="eyebrow">Paused</span><span class="paused-title">Tap to resume</span>
       <span class="count-hint">Word ${index + 1} restarts fresh</span>`,
      "paused",
    );
  };

  const resume = () => {
    if (phase !== "paused") return;
    enter("countdown");
    raf = requestAnimationFrame(loop);
  };

  const onVisibility = () => { if (document.hidden) pause(); };
  const onOverlayClick = () => resume();
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") pause();
    else if (phase === "paused" && (e.key === " " || e.key === "Enter")) resume();
  };
  const onResize = () => {
    const size = sizeFor();
    pad.resize(size);
    timer.style.width = `${size + 16}px`;
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", onResize);
  overlay.addEventListener("click", onOverlayClick);
  $(el, "#quit").addEventListener("click", onQuit);

  enter("countdown");
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    pad.destroy();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
  };
}
