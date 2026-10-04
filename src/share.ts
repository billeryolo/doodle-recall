import { DRAW_TIMES, WORD_COUNT_MAX, WORD_COUNT_MIN, type DrawTime, type GameConfig } from "./types";

// Query params: s=seed n=count t=drawTime c=score*2 ct=recall seconds by=name

export function buildChallengeUrl(
  base: string,
  config: Pick<GameConfig, "seed" | "count" | "drawTime">,
  score: number,
  seconds: number,
  name: string,
): string {
  const url = new URL(base);
  url.search = "";
  url.hash = "";
  const p = url.searchParams;
  p.set("s", config.seed);
  p.set("n", String(config.count));
  p.set("t", String(config.drawTime));
  p.set("c", String(Math.round(score * 2)));
  p.set("ct", String(Math.round(seconds)));
  const trimmed = name.trim().slice(0, 20);
  if (trimmed) p.set("by", trimmed);
  return url.toString();
}

/** Parse a shared link. Returns null if it has no usable seed. */
export function parseShareParams(search: string): Omit<GameConfig, "challenge"> & {
  challenge: GameConfig["challenge"];
} | null {
  const p = new URLSearchParams(search);
  const seed = p.get("s") ?? "";
  if (!/^[a-z0-9]{1,16}$/i.test(seed)) return null;

  const count = clampInt(p.get("n"), WORD_COUNT_MIN, WORD_COUNT_MAX, 25);
  const t = Number(p.get("t"));
  const drawTime: DrawTime = (DRAW_TIMES as readonly number[]).includes(t) ? (t as DrawTime) : 2;

  let challenge = null;
  const c = p.get("c");
  if (c !== null && /^\d+$/.test(c)) {
    const score = Math.min(Number(c) / 2, count);
    const time = clampInt(p.get("ct"), 0, 99999, 0);
    const name = (p.get("by") ?? "").trim().slice(0, 20) || "Your friend";
    challenge = { name, score, time };
  }
  return { seed, count, drawTime, challenge };
}

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  const n = Number(raw);
  if (raw === null || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
