import "./style.css";
import { pickWords, randomSeed } from "./rng";
import { renderDraw } from "./screens/draw";
import { renderRecall } from "./screens/recall";
import { renderResults } from "./screens/results";
import { renderStart } from "./screens/start";
import { parseShareParams } from "./share";
import { isMuted, toggleMuted, unlockAudio } from "./sound";
import { recordGame } from "./storage";
import type { GameConfig, Settings } from "./types";
import { $, ICONS } from "./ui";

const root = $(document, "#app");
let cleanup: () => void = () => {};

/** Swap the current screen, running the previous screen's teardown first. */
function mount(render: () => () => void, mode: "focus" | "page"): void {
  cleanup();
  document.body.dataset.mode = mode;
  cleanup = render();
}

// A shared link pins the seed + settings; "Play again" drops it.
let shared: GameConfig | null = parseShareParams(location.search);

function home(): void {
  mount(() => renderStart(root, { shared, onPlay: (settings) => play(settings, shared?.seed ?? randomSeed()) }), "page");
}

function play(settings: Settings, seed: string): void {
  unlockAudio();
  const config: GameConfig = {
    ...settings,
    seed,
    challenge: shared && shared.seed === seed ? shared.challenge : null,
  };
  const words = pickWords(seed, config.count);

  mount(
    () =>
      renderDraw(root, {
        config,
        words,
        onQuit: home,
        onDone: (drawings) =>
          mount(
            () =>
              renderRecall(root, {
                config,
                words,
                drawings,
                onQuit: home,
                onDone: (result) => {
                  const isBest = recordGame({
                    count: config.count,
                    drawTime: config.drawTime,
                    score: result.score,
                    time: Math.round(result.recallSeconds),
                  });
                  mount(
                    () =>
                      renderResults(root, {
                        result,
                        isBest,
                        onRetry: () => play(settings, seed),
                        onPlayAgain: () => {
                          shared = null;
                          history.replaceState(null, "", location.pathname);
                          play(settings, randomSeed());
                        },
                      }),
                    "page",
                  );
                },
              }),
            "focus",
          ),
      }),
    "focus",
  );
}

// Floating mute toggle, shared across every screen.
const muteBtn = $<HTMLButtonElement>(document, "#mute");
const paintMute = () => {
  const muted = isMuted();
  muteBtn.innerHTML = muted ? ICONS.mute : ICONS.sound;
  muteBtn.setAttribute("aria-label", muted ? "Unmute sounds" : "Mute sounds");
  muteBtn.setAttribute("aria-pressed", String(muted));
};
muteBtn.addEventListener("click", () => {
  toggleMuted();
  unlockAudio();
  paintMute();
});
paintMute();

home();
