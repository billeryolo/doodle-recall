import { DrawingPad } from "../canvas";
import { swoosh, tick } from "../sound";
import type { Drawing, GameConfig } from "../types";
import { $, escapeHtml, frameCode, html, ICONS } from "../ui";

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
    <main class="screen focus draw" id="main">
      <h1 class="sr-only">Drawing round</h1>
      <header class="focusbar">
        <button class="textbtn textbtn--icon" type="button" id="quit" aria-label="Quit to start">${ICONS.back}<span>Quit</span></button>
        <p class="cue" id="word" aria-live="polite">&nbsp;</p>
        <p class="framecount num"><span class="safelight" aria-hidden="true"></span><span>Frame <b id="idx">01</b>&#8239;/&#8239;${String(words.length).padStart(2, "0")}</span></p>
      </header>

      <div class="stage">
        <div class="stage__inner">
          <div class="film">
            <p class="film__edge num" aria-hidden="true"><span translate="no">DR-${words.length}</span><span id="edge">01A</span><span>▸</span></p>
            <div class="print">
              <canvas id="pad" aria-label="Drawing canvas"></canvas>
              <div class="overlay" id="overlay"></div>
            </div>
            <div class="timer" aria-hidden="true"><div class="timer__fill" id="bar"></div></div>
          </div>
        </div>
      </div>
    </main>
  `);

  const canvas = $<HTMLCanvasElement>(el, "#pad");
  const overlay = $(el, "#overlay");
  const wordEl = $(el, "#word");
  const idxEl = $(el, "#idx");
  const edgeEl = $(el, "#edge");
  const bar = $(el, "#bar");

  root.replaceChildren(el);

  // Space taken by the header, film borders and timer around the print.
  const sizeFor = () =>
    Math.floor(Math.max(200, Math.min(window.innerWidth - (window.innerWidth <= 480 ? 16 : 32) - 24, window.innerHeight - 174, 680)));
  const pad = new DrawingPad(canvas, sizeFor());

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
      edgeEl.textContent = frameCode(index);
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
        showOverlay(`<span class="count" data-n="${n}">${n}</span><span class="overlay__hint">Get ready</span>`, "count");
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
      `<span class="label label--ink">Paused</span>
       <button class="btn" type="button">Resume</button>
       <span class="overlay__hint">Frame ${index + 1} restarts with a fresh exposure</span>`,
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
  const onResize = () => pad.resize(sizeFor());

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
