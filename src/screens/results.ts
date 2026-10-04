import { fitCanvas, isBlank, renderDrawing } from "../canvas";
import { downloadCollage } from "../collage";
import { buildChallengeUrl } from "../share";
import { chime } from "../sound";
import type { GameResult } from "../types";
import { $, escapeHtml, formatScore, formatTime, html, islandButton, ICONS, reveal } from "../ui";

interface Options {
  result: GameResult;
  isBest: boolean;
  onPlayAgain: () => void;
  onRetry: () => void;
}

export function verdictLine(pct: number): string {
  if (pct >= 100) return "Photographic. Suspiciously so.";
  if (pct >= 85) return "Gallery-ready memory";
  if (pct >= 70) return "Sharp pencil, sharper mind";
  if (pct >= 50) return "Half artist, half amnesiac";
  if (pct >= 30) return "Abstract expressionism";
  if (pct >= 10) return "Picasso-level amnesia";
  return "Who drew these?";
}

const BADGE = {
  exact: { icon: ICONS.check, label: "Correct" },
  close: { icon: ICONS.half, label: "Close" },
  wrong: { icon: ICONS.cross, label: "Missed" },
};

export function renderResults(root: HTMLElement, { result, isBest, onPlayAgain, onRetry }: Options): () => void {
  const { config, rounds, score, recallSeconds } = result;
  const total = rounds.length;
  const pct = Math.round((score / total) * 100);
  const verdict = verdictLine(pct);
  const counts = {
    exact: rounds.filter((r) => r.verdict === "exact").length,
    close: rounds.filter((r) => r.verdict === "close").length,
    wrong: rounds.filter((r) => r.verdict === "wrong").length,
  };

  const challenge = config.challenge;
  let duel = "";
  if (challenge) {
    const won = score > challenge.score || (score === challenge.score && recallSeconds < challenge.time);
    const tie = score === challenge.score && Math.round(recallSeconds) === challenge.time;
    const headline = tie ? "Dead heat." : won ? "You win." : `${escapeHtml(challenge.name)} wins.`;
    duel = `
      <section class="duel" data-reveal>
        <div class="bezel"><div class="bezel__core duel__core">
          <span class="eyebrow eyebrow--accent">Head to head</span>
          <p class="duel__headline">${headline}</p>
          <div class="duel__rows">
            <div class="duel__row ${won ? "is-lead" : ""}"><span>You</span>
              <strong class="mono">${formatScore(score)}</strong><span class="mono">${formatTime(recallSeconds)}</span></div>
            <div class="duel__row ${!won && !tie ? "is-lead" : ""}"><span>${escapeHtml(challenge.name)}</span>
              <strong class="mono">${formatScore(challenge.score)}</strong><span class="mono">${formatTime(challenge.time)}</span></div>
          </div>
        </div></div>
      </section>`;
  }

  const el = html(`
    <main class="screen results">
      <section class="results__head">
        <div class="results__score" data-reveal>
          <span class="eyebrow">${isBest ? "New personal best" : "Final score"}</span>
          <p class="score"><em>${formatScore(score)}</em><span>/ ${total}</span></p>
          <p class="verdict">${verdict}</p>
        </div>
        <dl class="stats" data-reveal>
          <div><dt>Accuracy</dt><dd class="mono">${pct}%</dd></div>
          <div><dt>Recall time</dt><dd class="mono">${formatTime(recallSeconds)}</dd></div>
          <div><dt>Correct · close · missed</dt><dd class="mono">${counts.exact} · ${counts.close} · ${counts.wrong}</dd></div>
        </dl>
      </section>

      ${duel}

      <section class="actions" data-reveal>
        ${islandButton("Play again", ICONS.arrow, "primary", 'id="again"')}
        ${islandButton("Retry same words", ICONS.retry, "ghost", 'id="retry"')}
        ${islandButton("Download image", ICONS.download, "ghost", 'id="download"')}
      </section>

      <section class="share" data-reveal>
        <div class="bezel bezel--input"><div class="bezel__core share__core">
          <input id="name" class="share__name" type="text" maxlength="20" placeholder="Your name (optional)"
            aria-label="Your name for the challenge link" />
          <button class="btn btn--primary btn--compact" id="copy">
            <span class="btn__label">Copy challenge link</span><span class="btn__icon">${ICONS.link}</span>
          </button>
        </div></div>
        <p class="hint" id="copy-hint">Friends get the same ${total} words and see your score to beat.</p>
      </section>

      <section class="gallery">
        ${rounds
          .map(
            (r, i) => `
          <figure class="doodle doodle--${r.verdict}" data-reveal style="--tilt:${((i * 7) % 5) - 2}deg">
            <div class="bezel"><div class="bezel__core doodle__core">
              <canvas data-i="${i}" aria-label="Your drawing of ${escapeHtml(r.word)}"></canvas>
              ${isBlank(r.drawing) ? `<span class="blank-note blank-note--sm">blank 🙈</span>` : ""}
              <span class="badge badge--${r.verdict}" title="${BADGE[r.verdict].label}">${BADGE[r.verdict].icon}</span>
            </div></div>
            <figcaption>
              <span class="doodle__word">${escapeHtml(r.word)}</span>
              <span class="doodle__guess">${r.guess.trim() ? `you said “${escapeHtml(r.guess.trim())}”` : "no guess"}</span>
            </figcaption>
          </figure>`,
          )
          .join("")}
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
  $(el, "#download").addEventListener("click", () => void downloadCollage(result, verdict));

  const hint = $(el, "#copy-hint");
  $(el, "#copy").addEventListener("click", async () => {
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
      hint.innerHTML = `Copy this link: <span class="mono select">${escapeHtml(url)}</span>`;
    }
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
