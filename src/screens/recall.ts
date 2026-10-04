import { fitCanvas, isBlank, renderDrawing } from "../canvas";
import { judge, POINTS } from "../match";
import { recallOrder } from "../rng";
import { swoosh } from "../sound";
import type { Drawing, GameConfig, GameResult, RoundResult } from "../types";
import { $, html, ICONS } from "../ui";

interface Options {
  config: GameConfig;
  words: string[];
  drawings: Drawing[];
  onDone: (result: GameResult) => void;
  onQuit: () => void;
}

export function renderRecall(root: HTMLElement, { config, words, drawings, onDone, onQuit }: Options): () => void {
  const order = recallOrder(config.seed, words.length);
  const guesses: string[] = new Array(words.length).fill("");
  let step = 0;
  const startedAt = performance.now();

  const el = html(`
    <main class="screen recall">
      <header class="island topbar">
        <button class="icon-btn" id="quit" aria-label="Quit to start">${ICONS.close}</button>
        <span class="mono topbar__progress"><b id="idx">01</b> / ${String(words.length).padStart(2, "0")}</span>
        <span class="topbar__word topbar__word--muted">What was this?</span>
      </header>

      <div class="stage">
        <div class="bezel bezel--canvas" id="card">
          <div class="bezel__core paper">
            <canvas id="view" aria-label="Your drawing"></canvas>
            <span class="blank-note" id="blank" hidden>you drew nothing 🙈</span>
          </div>
        </div>

        <form class="guess" id="form" autocomplete="off">
          <div class="bezel bezel--input">
            <div class="bezel__core guess__core">
              <input id="guess" class="guess__input" type="text" inputmode="text" enterkeyhint="next"
                autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="40"
                placeholder="Type the word…" aria-label="Your guess" />
              <button class="btn btn--primary btn--compact" type="submit">
                <span class="btn__label">Next</span><span class="btn__icon">${ICONS.enter}</span>
              </button>
            </div>
          </div>
          <p class="hint">Press <kbd>Enter</kbd> to continue — leave it blank to pass.</p>
        </form>
      </div>
    </main>
  `);

  const canvas = $<HTMLCanvasElement>(el, "#view");
  const input = $<HTMLInputElement>(el, "#guess");
  const card = $(el, "#card");
  const blank = $(el, "#blank");
  const idxEl = $(el, "#idx");

  root.replaceChildren(el);

  const sizeFor = () =>
    Math.floor(Math.max(200, Math.min(window.innerWidth - 32 - 16, window.innerHeight * 0.52, 520)));

  const paint = () => {
    const i = order[step];
    const size = sizeFor();
    const ctx = fitCanvas(canvas, size);
    ctx.clearRect(0, 0, size, size);
    renderDrawing(ctx, drawings[i], 0, 0, size);
    blank.hidden = !isBlank(drawings[i]);
    idxEl.textContent = String(step + 1).padStart(2, "0");
  };

  const show = () => {
    paint();
    input.value = "";
    card.classList.remove("is-swapping");
    void card.offsetWidth; // restart the entry animation
    card.classList.add("is-swapping");
    input.focus({ preventScroll: true });
  };

  const finish = () => {
    const recallSeconds = (performance.now() - startedAt) / 1000;
    const rounds: RoundResult[] = words.map((word, i) => ({
      word,
      drawing: drawings[i],
      guess: guesses[i],
      verdict: judge(word, guesses[i]),
    }));
    const score = rounds.reduce((sum, r) => sum + POINTS[r.verdict], 0);
    onDone({ config, rounds, score, recallSeconds });
  };

  $(el, "#form").addEventListener("submit", (e) => {
    e.preventDefault();
    guesses[order[step]] = input.value;
    step++;
    if (step >= words.length) return finish();
    swoosh();
    show();
  });
  $(el, "#quit").addEventListener("click", onQuit);

  const onResize = () => paint();
  window.addEventListener("resize", onResize);

  show();
  return () => window.removeEventListener("resize", onResize);
}
