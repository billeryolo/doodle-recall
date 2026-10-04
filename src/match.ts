import { ALIASES } from "./words";

export type Verdict = "exact" | "close" | "wrong";

export const POINTS: Record<Verdict, number> = { exact: 1, close: 0.5, wrong: 0 };

/** Lowercase, drop leading articles, strip everything that isn't a letter. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^(a|an|the)\s+/, "")
    .replace(/[^a-z]/g, "");
}

/** The word plus its common English plural forms (all normalized). */
function forms(word: string): string[] {
  const w = normalize(word);
  const out = new Set([w, `${w}s`, `${w}es`]);
  if (w.endsWith("y")) out.add(`${w.slice(0, -1)}ies`);
  if (w.endsWith("f")) out.add(`${w.slice(0, -1)}ves`);
  if (w.endsWith("fe")) out.add(`${w.slice(0, -2)}ves`);
  // Words that are already plural (e.g. "grapes") also accept the singular.
  if (w.length > 4 && w.endsWith("s") && !/(ss|us)$/.test(w)) out.add(w.slice(0, -1));
  return [...out];
}

/** Optimal string alignment distance (Levenshtein + adjacent transpositions). */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

export function judge(word: string, guess: string): Verdict {
  const g = normalize(guess);
  if (!g) return "wrong";

  const wordForms = forms(word);
  if (wordForms.includes(g)) return "exact";

  const aliasForms = (ALIASES[word] ?? []).flatMap(forms);
  if (aliasForms.includes(g)) return "close";

  if (normalize(word).length >= 4 && wordForms.some((f) => editDistance(f, g) <= 1)) {
    return "close";
  }
  return "wrong";
}
