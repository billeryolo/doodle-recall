import { fitCanvas, isBlank, renderDrawing } from "../canvas";
import { downloadCollage } from "../collage";
import { buildChallengeUrl } from "../share";
import { chime } from "../sound";
import type { GameResult } from "../types";
import {
  $, escapeHtml, formatScore, formatTime, frameCode, html, MARKS, primaryButton, reveal, textButton,
} from "../ui";

interface Options {
  result: GameResult;
  isBest: boolean;
  onPlayAgain: () => void;
  onRetry: () => void;
}

export function verdictLine(pct: number): string {
  if (pct >= 100) return "A perfect roll. Suspiciously so.";
  if (pct >= 85) return "Gallery-ready memory.";
  if (pct >= 70) return "Sharp pencil, sharper mind.";
  if (pct >= 50) return "Half artist, half amnesiac.";
  if (pct >= 30) return "Abstract expressionism.";
  if (pct >= 10) return "Overexposed and underremembered.";
  return "Who drew these?";
}

const VERDICT_LABEL = { exact: "Correct", close: "Close", wrong: "Missed" } as const;

export function renderResults(root: HTMLElement, { result, isBest, onPlayAgain, onRetry }: Options): () => void {
  const { config, rounds, score, recallSeconds } = result;
  const total = rounds.length;
  const pct = Math.round((score / total) * 100);
  const verdict = verdictLine(pct);
  const count = (v: string) => rounds.filter((r) => r.verdict === v).length;

  const challenge = config.challenge;
  let duel = "";
  if (challenge) {
    const won = score > challenge.score || (score === challenge.score && recallSeconds < challenge.time);
    const tie = score === challenge.score && Math.round(recallSeconds) === challenge.time;
    const headline = tie ? "Dead heat." : won ? "You win." : `${escapeHtml(challenge.name)} wins.`;
    duel = `
      <section class="duel" aria-labelledby="duel-title" data-reveal>
        <h2 class="label" id="duel-title">Head to head</h2>
        <p class="duel__headline">${headline}</p>
        <table class="duel__table">
          <thead><tr><th scope="col">Player</th><th scope="col">Score</th><th scope="col">Recall</th></tr></thead>
          <tbody>
            <tr class="${won ? "is-lead" : ""}"><td>You</td><td class="num">${formatScore(score)}</td><td class="num">${formatTime(recallSeconds)}</td></tr>
            <tr class="${!won && !tie ? "is-lead" : ""}"><td translate="no">${escapeHtml(challenge.name)}</td>
              <td class="num">${formatScore(challenge.score)}</td><td class="num">${formatTime(challenge.time)}</td></tr>
          </tbody>
        </table>
      </section>`;
  }

  const el = html(`
    <main class="screen results" id="main">
      <header class="results__head">
        <div class="results__score" data-reveal>
          <p class="kicker"><span class="safelight" aria-hidden="true"></span><span>${isBest ? "New personal best" : "Contact sheet"}
            · roll <span translate="no">${escapeHtml(config.seed)}</span></span></p>
          <h1 class="score">
            <span class="sr-only">You scored </span><span class="score__value num">${formatScore(score)}</span><span class="score__total num"><span aria-hidden="true">/</span><span class="sr-only"> out of </span>${total}</span>
          </h1>
          <p class="verdict">${verdict}</p>
        </div>
        <dl class="stats" data-reveal>
          <div><dt>Accuracy</dt><dd class="num">${pct}%</dd></div>
          <div><dt>Recall time</dt><dd class="num">${formatTime(recallSeconds)}</dd></div>
          <div><dt>Exposure</dt><dd class="num">${config.drawTime}s per frame</dd></div>
          <div><dt>Correct / close / missed</dt><dd class="num">${count("exact")} / ${count("close")} / ${count("wrong")}</dd></div>
        </dl>
      </header>

      ${duel}

      <section class="next" aria-label="What next" data-reveal>
        <div class="next__actions">
          ${primaryButton("Play Again", 'id="again"')}
          ${textButton("Retry Same Words", 'id="retry"')}
          ${textButton("Download Contact Sheet", 'id="download"')}
        </div>
        <form class="share" id="share">
          <label class="label" for="name">Your name, shown to your friend</label>
          <div class="share__row">
            <input id="name" name="nickname" class="share__input" type="text" maxlength="20"
              autocomplete="nickname" spellcheck="false" placeholder="e.g. Noor…" />
            <button class="btn btn--ghost" type="submit"><span>Copy Challenge Link</span></button>
          </div>
          <p class="hint" id="copy-hint" aria-live="polite">Your friend gets the same ${total} words and your score to beat.</p>
        </form>
      </section>

      <section class="sheet" aria-labelledby="sheet-title">
        <h2 class="label" id="sheet-title">Your roll, graded</h2>
        <ol class="sheet__grid">
          ${rounds
            .map(
              (r, i) => `
            <li class="frame frame--${r.verdict}" data-reveal style="--tilt:${((i * 37) % 9) - 4}deg">
              <p class="frame__code num" aria-hidden="true">${frameCode(i)}</p>
              <div class="frame__print">
                <canvas data-i="${i}" aria-label="Your drawing of ${escapeHtml(r.word)}"></canvas>
                ${isBlank(r.drawing) ? `<span class="blank-note blank-note--sm">Blank frame</span>` : ""}
                <svg class="mark" viewBox="0 0 100 100" fill="none" aria-hidden="true">${MARKS[r.verdict]}</svg>
              </div>
              <p class="frame__word">${escapeHtml(r.word)}</p>
              <p class="frame__guess"><span class="sr-only">${VERDICT_LABEL[r.verdict]}. </span>${
                r.guess.trim() ? `You said “${escapeHtml(r.guess.trim())}”` : "No guess"
              }</p>
            </li>`,
            )
            .join("")}
        </ol>
      </section>
    </main>
  `);

  root.replaceChildren(el);

  const paintThumbs = () => {
    el.querySelectorAll<HTMLCanvasElement>("canvas[data-i]").forEach((c) => {
      const size = c.parentElement!.clientWidth;
      const ctx = fitCanvas(c, size);
      renderDrawing(ctx, rounds[Number(c.dataset.i)].drawing, 0, 0, size);
    });
  };
  paintThumbs();
  window.addEventListener("resize", paintThumbs);

  $(el, "#again").addEventListener("click", onPlayAgain);
  $(el, "#retry").addEventListener("click", onRetry);
  const download = $<HTMLButtonElement>(el, "#download");
  download.addEventListener("click", async () => {
    download.disabled = true;
    download.textContent = "Rendering…";
    try {
      await downloadCollage(result, verdict);
    } finally {
      download.disabled = false;
      download.textContent = "Download Contact Sheet";
    }
  });

  const hint = $(el, "#copy-hint");
  $(el, "#share").addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = buildChallengeUrl(
      location.origin + location.pathname,
      config,
      score,
      recallSeconds,
      $<HTMLInputElement>(el, "#name").value,
    );
    try {
      await navigator.clipboard.writeText(url);
      hint.textContent = "Link copied. Send it to someone who thinks they can draw.";
    } catch {
      hint.innerHTML = `Your browser blocked copying. Select and copy this link: <span class="select num">${escapeHtml(url)}</span>`;
    }
    hint.classList.remove("is-flash");
    void hint.offsetWidth;
    hint.classList.add("is-flash");
  });

  chime();
  window.scrollTo({ top: 0 });
  const stopReveal = reveal(el);
  return () => {
    stopReveal();
    window.removeEventListener("resize", paintThumbs);
  };
}
