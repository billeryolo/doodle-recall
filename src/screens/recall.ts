import { fitCanvas, isBlank, renderDrawing } from "../canvas";
import { judge, POINTS } from "../match";
import { recallOrder } from "../rng";
import { swoosh } from "../sound";
import type { Drawing, GameConfig, GameResult, RoundResult } from "../types";
import { $, frameCode, html, ICONS } from "../ui";

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
    <main class="screen focus recall" id="main">
      <h1 class="sr-only">Name your drawings</h1>
      <header class="focusbar">
        <button class="textbtn textbtn--icon" type="button" id="quit" aria-label="Quit to start">${ICONS.back}<span>Quit</span></button>
        <p class="cue cue--muted" aria-hidden="true">what was this?</p>
        <p class="framecount num"><span>Print <b id="idx">01</b>&#8239;/&#8239;${String(words.length).padStart(2, "0")}</span></p>
      </header>

      <div class="stage">
        <div class="stage__inner">
          <div class="film">
            <p class="film__edge num" aria-hidden="true"><span translate="no">DR-${words.length}</span><span id="edge">01A</span><span>▸</span></p>
            <div class="print print--develop" id="print">
              <canvas id="view" aria-label="Your drawing"></canvas>
              <span class="blank-note" id="blank" hidden>Blank frame</span>
            </div>
          </div>

          <form class="guess" id="form" autocomplete="off">
            <label class="label" for="guess">What did you draw?</label>
            <div class="guess__row">
              <input id="guess" name="guess" class="guess__input" type="text" inputmode="text" enterkeyhint="next"
                autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="40"
                placeholder="Type the word…" />
              <button class="btn btn--compact" type="submit"><span>Next Print</span>${ICONS.arrow}</button>
            </div>
            <p class="hint">Press <kbd>Enter</kbd> to continue. Leave it empty to skip.</p>
          </form>
        </div>
      </div>
    </main>
  `);

  const canvas = $<HTMLCanvasElement>(el, "#view");
  const input = $<HTMLInputElement>(el, "#guess");
  const print = $(el, "#print");
  const blank = $(el, "#blank");
  const idxEl = $(el, "#idx");
  const edgeEl = $(el, "#edge");

  root.replaceChildren(el);

  const sizeFor = () =>
    Math.floor(Math.max(180, Math.min(window.innerWidth - (window.innerWidth <= 480 ? 16 : 32) - 24, window.innerHeight - 290, 560)));

  const paint = () => {
    const i = order[step];
    const size = sizeFor();
    const ctx = fitCanvas(canvas, size);
    ctx.clearRect(0, 0, size, size);
    renderDrawing(ctx, drawings[i], 0, 0, size);
    blank.hidden = !isBlank(drawings[i]);
    idxEl.textContent = String(step + 1).padStart(2, "0");
    edgeEl.textContent = frameCode(step);
  };

  const show = () => {
    paint();
    input.value = "";
    print.classList.remove("is-developing");
    void print.offsetWidth; // restart the develop animation
    print.classList.add("is-developing");
    // Only autofocus where a hardware keyboard is likely; on touch it would pop the keyboard over the print.
    if (matchMedia("(pointer: fine)").matches || step > 0) input.focus({ preventScroll: true });
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
