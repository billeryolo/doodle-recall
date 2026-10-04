import { getBest, getHistory, getSettings, setSettings } from "../storage";
import { DRAW_TIMES, WORD_COUNT_MAX, WORD_COUNT_MIN, type GameConfig, type Settings } from "../types";
import { $, escapeHtml, formatScore, formatTime, html, islandButton, ICONS, reveal } from "../ui";

interface Options {
  /** A config from a shared link; locks the settings to match. */
  shared: GameConfig | null;
  onPlay: (settings: Settings) => void;
}

export function renderStart(root: HTMLElement, { shared, onPlay }: Options): () => void {
  let settings: Settings = shared ? { count: shared.count, drawTime: shared.drawTime } : getSettings();
  const locked = shared !== null;
  const challenge = shared?.challenge ?? null;

  const el = html(`
    <main class="screen start">
      <section class="start__hero">
        <span class="eyebrow" data-reveal>A memory game in pencil</span>
        <h1 class="display" data-reveal>
          Draw <em>fast.</em><br/>Remember<br/><span class="display__muted">slower.</span>
        </h1>
        <p class="lede" data-reveal>
          You get a word and two seconds to doodle it. Then another. And another.
          When they're all done, your scribbles come back shuffled, and you have to name them.
        </p>
        <ol class="steps" data-reveal>
          <li><span>01</span>Doodle each word before the bar runs out</li>
          <li><span>02</span>Decode your own drawings</li>
          <li><span>03</span>Send the same words to a friend</li>
        </ol>
      </section>

      <section class="start__panel" data-reveal>
        <div class="bezel">
          <div class="bezel__core panel">
            ${
              challenge
                ? `<div class="challenge-banner">
                     <span class="eyebrow eyebrow--accent">Challenge</span>
                     <p><strong>${escapeHtml(challenge.name)}</strong> scored
                     <strong>${formatScore(challenge.score)} / ${shared!.count}</strong>
                     in ${formatTime(challenge.time)} on this set. Beat it.</p>
                   </div>`
                : locked
                  ? `<div class="challenge-banner"><span class="eyebrow eyebrow--accent">Shared set</span>
                     <p>You're playing the same words as whoever sent this link.</p></div>`
                  : ""
            }
            <div class="field">
              <div class="field__head">
                <label for="count">Words</label>
                <output id="count-out" class="mono">${settings.count}</output>
              </div>
              <input id="count" class="range" type="range" min="${WORD_COUNT_MIN}" max="${WORD_COUNT_MAX}"
                step="1" value="${settings.count}" ${locked ? "disabled" : ""} />
            </div>
            <div class="field">
              <div class="field__head"><span>Seconds per drawing</span></div>
              <div class="segmented" role="radiogroup" aria-label="Seconds per drawing">
                ${DRAW_TIMES.map(
                  (t) => `<button role="radio" data-time="${t}" aria-checked="${t === settings.drawTime}"
                    ${locked ? "disabled" : ""}>${t}s</button>`,
                ).join("")}
              </div>
            </div>
            <div class="panel__best" id="best"></div>
            ${islandButton(challenge ? "Accept challenge" : "Start drawing", ICONS.arrow, "primary", 'id="play"')}
            ${locked ? `<button class="text-link" id="fresh">Play a fresh set instead</button>` : ""}
          </div>
        </div>
        <div class="history" id="history"></div>
      </section>
    </main>
  `);

  const countInput = $<HTMLInputElement>(el, "#count");
  const countOut = $(el, "#count-out");
  const best = $(el, "#best");

  const paintRange = () => {
    const pct = ((settings.count - WORD_COUNT_MIN) / (WORD_COUNT_MAX - WORD_COUNT_MIN)) * 100;
    countInput.style.setProperty("--pct", `${pct}%`);
  };

  const renderBest = () => {
    const b = getBest(settings.count, settings.drawTime);
    best.innerHTML = b
      ? `<span>Your best here</span><strong class="mono">${formatScore(b.score)} / ${settings.count}</strong><span class="mono">${formatTime(b.time)}</span>`
      : `<span>No best yet for ${settings.count} words · ${settings.drawTime}s</span>`;
  };

  const update = (next: Partial<Settings>) => {
    settings = { ...settings, ...next };
    if (!locked) setSettings(settings);
    countOut.textContent = String(settings.count);
    el.querySelectorAll<HTMLButtonElement>("[data-time]").forEach((b) =>
      b.setAttribute("aria-checked", String(Number(b.dataset.time) === settings.drawTime)),
    );
    paintRange();
    renderBest();
  };

  countInput.addEventListener("input", () => update({ count: Number(countInput.value) }));
  el.querySelectorAll<HTMLButtonElement>("[data-time]").forEach((b) =>
    b.addEventListener("click", () => update({ drawTime: Number(b.dataset.time) as Settings["drawTime"] })),
  );
  $(el, "#play").addEventListener("click", () => onPlay(settings));
  el.querySelector("#fresh")?.addEventListener("click", () => {
    history.replaceState(null, "", location.pathname);
    location.reload();
  });

  const historyEl = $(el, "#history");
  const games = getHistory();
  if (games.length) {
    historyEl.innerHTML = `
      <span class="eyebrow">Recent games</span>
      <ul>${games
        .slice(0, 5)
        .map(
          (g) => `<li><span>${g.count} words · ${g.drawTime}s</span>
            <span class="mono">${formatScore(g.score)} / ${g.count}</span></li>`,
        )
        .join("")}</ul>`;
  }

  paintRange();
  renderBest();
  root.replaceChildren(el);
  return reveal(el);
}
