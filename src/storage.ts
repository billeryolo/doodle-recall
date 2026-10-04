import type { DrawTime, Settings } from "./types";

const KEY = "doodle-recall:v1";
const HISTORY_LIMIT = 10;

export interface BestScore {
  score: number;
  time: number;
}

export interface HistoryEntry {
  at: number;
  count: number;
  drawTime: DrawTime;
  score: number;
  time: number;
}

interface Store {
  best: Record<string, BestScore>;
  history: HistoryEntry[];
  muted: boolean;
  settings: Settings;
}

const DEFAULTS: Store = {
  best: {},
  history: [],
  muted: false,
  settings: { count: 25, drawTime: 2 },
};

// localStorage can throw (private mode, blocked storage) — the game must still work.
function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    return { ...structuredClone(DEFAULTS), ...JSON.parse(raw) };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function save(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export const bestKey = (count: number, drawTime: number) => `${count}x${drawTime}`;

export function getBest(count: number, drawTime: number): BestScore | null {
  return load().best[bestKey(count, drawTime)] ?? null;
}

export function getHistory(): HistoryEntry[] {
  return load().history;
}

/** Records a finished game. Returns true if it set a new personal best. */
export function recordGame(entry: Omit<HistoryEntry, "at">): boolean {
  const store = load();
  const key = bestKey(entry.count, entry.drawTime);
  const prev = store.best[key];
  const isBest =
    !prev || entry.score > prev.score || (entry.score === prev.score && entry.time < prev.time);
  if (isBest) store.best[key] = { score: entry.score, time: entry.time };
  store.history = [{ ...entry, at: Date.now() }, ...store.history].slice(0, HISTORY_LIMIT);
  save(store);
  return isBest;
}

export function getMuted(): boolean {
  return load().muted;
}

export function setMuted(muted: boolean): void {
  const store = load();
  store.muted = muted;
  save(store);
}

export function getSettings(): Settings {
  return load().settings;
}

export function setSettings(settings: Settings): void {
  const store = load();
  store.settings = settings;
  save(store);
}
