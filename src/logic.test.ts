import { describe, expect, it } from "vitest";
import { editDistance, judge, normalize } from "./match";
import { pickWords, recallOrder } from "./rng";
import { buildChallengeUrl, parseShareParams } from "./share";
import { ALIASES, WORDS } from "./words";

describe("word list", () => {
  it("has ~400 unique, lowercase entries", () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(380);
    expect(new Set(WORDS).size).toBe(WORDS.length);
    for (const w of WORDS) expect(w).toMatch(/^[a-z][a-z -]*[a-z]$/);
  });

  it("only defines aliases for words in the list", () => {
    for (const key of Object.keys(ALIASES)) expect(WORDS).toContain(key);
  });
});

describe("seeded picks", () => {
  it("is deterministic per seed", () => {
    expect(pickWords("abc123", 25)).toEqual(pickWords("abc123", 25));
    expect(pickWords("abc123", 25)).not.toEqual(pickWords("xyz789", 25));
  });

  it("returns unique words of the requested count", () => {
    const words = pickWords("seed", 50);
    expect(words).toHaveLength(50);
    expect(new Set(words).size).toBe(50);
  });

  it("recall order is a permutation", () => {
    const order = recallOrder("seed", 25);
    expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i));
  });
});

describe("matching", () => {
  it("normalizes case, spaces, articles and punctuation", () => {
    expect(normalize("  The Hot-Dog! ")).toBe("hotdog");
  });

  it("counts OSA transpositions as one edit", () => {
    expect(editDistance("house", "hosue")).toBe(1);
  });

  it.each([
    ["car", "Car", "exact"],
    ["car", "cars", "exact"],
    ["butterfly", "butterflies", "exact"],
    ["hot dog", "hotdog", "exact"],
    ["ice cream", "an ice cream", "exact"],
    ["grapes", "grape", "exact"],
    ["glasses", "glasses", "exact"],
    ["bicycle", "bike", "close"],
    ["rabbit", "bunnies", "close"],
    ["house", "hosue", "close"],
    ["guitar", "guittar", "close"],
    ["car", "crar", "wrong"], // typo tolerance only for 4+ letters
    ["cat", "dog", "wrong"],
    ["cat", "", "wrong"],
    ["bus", "bu", "wrong"],
  ] as const)("judge(%s, %s) → %s", (word, guess, verdict) => {
    expect(judge(word, guess)).toBe(verdict);
  });
});

describe("share links", () => {
  it("round-trips a challenge", () => {
    const url = buildChallengeUrl("https://example.com/game/", { seed: "abc123", count: 30, drawTime: 3 }, 18.5, 74.4, " Alex ");
    const parsed = parseShareParams(new URL(url).search);
    expect(parsed).toEqual({
      seed: "abc123",
      count: 30,
      drawTime: 3,
      challenge: { name: "Alex", score: 18.5, time: 74 },
    });
  });

  it("rejects missing or hostile seeds and clamps values", () => {
    expect(parseShareParams("")).toBeNull();
    expect(parseShareParams("?s=<script>")).toBeNull();
    const p = parseShareParams("?s=ok&n=999&t=7&c=999");
    expect(p).toMatchObject({ count: 50, drawTime: 2, challenge: { score: 50, name: "Your friend" } });
  });
});
