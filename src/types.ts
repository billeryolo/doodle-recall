import type { Verdict } from "./match";

/** Strokes stored as flat [x0, y0, x1, y1, ...] arrays in normalized 0..1 space. */
export type Stroke = number[];
export type Drawing = Stroke[];

export const WORD_COUNT_MIN = 5;
export const WORD_COUNT_MAX = 50;
export const DRAW_TIMES = [1, 2, 3, 5] as const;
export type DrawTime = (typeof DRAW_TIMES)[number];

export interface Settings {
  count: number;
  drawTime: DrawTime;
}

export interface Challenge {
  name: string;
  score: number;
  time: number;
}

export interface GameConfig extends Settings {
  seed: string;
  challenge: Challenge | null;
}

export interface RoundResult {
  word: string;
  drawing: Drawing;
  guess: string;
  verdict: Verdict;
}

export interface GameResult {
  config: GameConfig;
  rounds: RoundResult[];
  score: number;
  recallSeconds: number;
}
