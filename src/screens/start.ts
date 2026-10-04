import { getBest, getHistory, getSettings, setSettings } from "../storage";
import { DRAW_TIMES, WORD_COUNT_MAX, WORD_COUNT_MIN, type GameConfig, type Settings } from "../types";
import { $, doodle, escapeHtml, formatScore, formatTime, html, primaryButton, reveal, textButton } from "../ui";

interface Options {
  /** A config from a shared link; locks the settings to match. */
  shared: GameConfig | null;
  onPlay: (settings: Settings) => void;
}

export function renderStart(root: HTMLElement, { shared, onPlay }: Options): () => void {
  let settings: Settings = shared ? { count: shared.count, drawTime: shared.drawTime } : getSettings();
  const locked = shared !== null;
  const challenge = shared?.challenge ?? null;

  const banner = challenge
    ? `<div class="challenge" role="status">
         <p class="label">Challenge received</p>
         <p class="challenge__text"><span translate="no">${escapeHtml(challenge.name)}</span> named
           <strong>${formatScore(challenge.score)}&#8239;/&#8239;${shared!.count}</strong> of these frames
           in ${formatTime(challenge.time)}. Beat it.</p>
       </div>`
    : locked
      ? `<div class="challenge" role="status"><p class="label">Shared roll</p>
           <p class="challenge__text">You're playing the same words as whoever sent this link.</p></div>`
      : "";

  const el = html(`
    <main class="screen start" id="main">
      <section class="start__hero" aria-labelledby="title">
        <p class="kicker" data-reveal><span class="safelight" aria-hidden="true"></span>
          <span><span translate="no">Doodle Recall</span> — a memory game for fast hands</span></p>
        <h1 class="headline" id="title" data-reveal>
          Draw it ${doodle("fish", "doodle of a fish")} in two seconds. Name it ${doodle("cat", "doodle of a cat")} later.
        </h1>
        <p class="lede" data-reveal>
          Each word gets one quick exposure: a couple of seconds to scribble it. After the last frame,
          your drawings come back out of order, and you name each one from memory.
        </p>
        <ol class="process" data-reveal>
          <li><span class="num">01</span><strong>Expose</strong>Draw each word before the bar runs out</li>
          <li><span class="num">02</span><strong>Develop</strong>Your doodles return, shuffled</li>
          <li><span class="num">03</span><strong>Name</strong>Type what each one was meant to be</li>
        </ol>
      </section>

      <div class="start__side">
      <section class="lighttable" aria-labelledby="setup-title" data-reveal>
        <h2 class="label label--ink" id="setup-title">Load the roll</h2>
        ${banner}
        <div class="field">
          <div class="field__row">
            <label for="count">Frames</label>
            <output for="count" id="count-out" class="num field__value">${settings.count}</output>
          </div>
          <input id="count" name="count" class="range" type="range" min="${WORD_COUNT_MIN}" max="${WORD_COUNT_MAX}"
            step="1" value="${settings.count}" ${locked ? "disabled" : ""} />
        </div>
        <fieldset class="field" ${locked ? "disabled" : ""}>
          <legend class="field__row">Exposure per frame</legend>
          <div class="segmented">
            ${DRAW_TIMES.map(
              (t) => `<label><input type="radio" name="time" value="${t}" ${t === settings.drawTime ? "checked" : ""} />
                <span class="num">${t}s</span></label>`,
            ).join("")}
          </div>
        </fieldset>
        <p class="best" id="best" aria-live="polite"></p>
        ${primaryButton(challenge ? "Accept Challenge" : "Start Drawing", 'id="play"')}
        ${locked ? textButton("Play a fresh roll instead", 'id="fresh"') : ""}
      </section>

      <section class="log" id="log" aria-labelledby="log-title" hidden data-reveal>
        <h2 class="label" id="log-title">Exposure log</h2>
        <table>
          <thead><tr><th scope="col">Roll</th><th scope="col">Score</th><th scope="col">Recall</th></tr></thead>
          <tbody id="log-rows"></tbody>
        </table>
      </section>
      </div>
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
      ? `<span>Your best on this roll</span><span class="num">${formatScore(b.score)}&#8239;/&#8239;${settings.count} · ${formatTime(b.time)}</span>`
      : `<span>No best yet for ${settings.count} frames at ${settings.drawTime}s</span>`;
  };

  const update = (next: Partial<Settings>) => {
    settings = { ...settings, ...next };
    if (!locked) setSettings(settings);
    countOut.textContent = String(settings.count);
    paintRange();
    renderBest();
  };

  countInput.addEventListener("input", () => update({ count: Number(countInput.value) }));
  el.querySelectorAll<HTMLInputElement>('input[name="time"]').forEach((r) =>
    r.addEventListener("change", () => update({ drawTime: Number(r.value) as Settings["drawTime"] })),
  );
  $(el, "#play").addEventListener("click", () => onPlay(settings));
  el.querySelector("#fresh")?.addEventListener("click", () => {
    history.replaceState(null, "", location.pathname);
    location.reload();
  });

  // Redraw a headline doodle when hovered.
  el.querySelectorAll<HTMLElement>(".inline-doodle").forEach((d) =>
    d.addEventListener("pointerenter", () => {
      d.classList.remove("is-drawn");
      void d.offsetWidth;
      d.classList.add("is-drawn");
    }),
  );
  requestAnimationFrame(() => el.querySelectorAll(".inline-doodle").forEach((d) => d.classList.add("is-drawn")));

  const games = getHistory();
  if (games.length) {
    $(el, "#log").hidden = false;
    $(el, "#log-rows").innerHTML = games
      .slice(0, 5)
      .map(
        (g) => `<tr><td>${g.count} frames · ${g.drawTime}s</td>
          <td class="num">${formatScore(g.score)}&#8239;/&#8239;${g.count}</td><td class="num">${formatTime(g.time)}</td></tr>`,
      )
      .join("");
  }

  paintRange();
  renderBest();
  root.replaceChildren(el);
  return reveal(el);
}
