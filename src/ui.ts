// Small DOM helpers, icons, hand-drawn marks and doodles shared by every screen.

export function html(markup: string): HTMLElement {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as HTMLElement;
}

export function $<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const svg = (path: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

export const ICONS = {
  arrow: svg('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'),
  back: svg('<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>'),
  sound: svg('<path d="M4 9.5h3l5-4v13l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/>'),
  mute: svg('<path d="M4 9.5h3l5-4v13l-5-4H4z"/><path d="m16 9.5 5 5"/><path d="m21 9.5-5 5"/>'),
};

/** Hand-drawn doodles (40×40) used inline in the headline. pathLength=1 lets CSS draw them on. */
export const DOODLES = {
  fish: '<path pathLength="1" d="M5 20.5c5.5-8.5 17-9.2 24.2-.6-6.6 8.2-18.3 8.6-24.2.6Z"/><path pathLength="1" d="M29 20c2.5-2.7 4.6-4.6 6.5-5.4-.6 3.6-.6 7.4.2 11-2.3-1.2-4.4-3.1-6.7-5.6Z"/><path pathLength="1" d="M11.5 18.6h.2"/>',
  cat: '<path pathLength="1" d="M9.5 31.5c-2.8-6-2.2-13.2.6-19.4l4.6 5.1c3.3-1.3 7.4-1.3 10.6.1l4.5-5.3c3 6.3 3.4 13.6.5 19.5-5 3.4-15.7 3.5-20.8 0Z"/><path pathLength="1" d="M15.4 23.2h.1M24.6 23.2h.1"/><path pathLength="1" d="M18.4 27.4c1 .8 2.2.8 3.2 0"/>',
  house: '<path pathLength="1" d="M7 33.5V18.2L20.2 6.8l12.9 11.6v15.1Z"/><path pathLength="1" d="M16.5 33.5v-8.6h7.2v8.6"/>',
};

export function doodle(name: keyof typeof DOODLES, label: string): string {
  return `<span class="inline-doodle" role="img" aria-label="${label}"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${DOODLES[name]}</svg></span>`;
}

/** Grease-pencil grading marks drawn over contact-sheet frames. */
export const MARKS = {
  exact:
    '<path pathLength="1" d="M52 6C27 3 6 17 5 45c-1 27 21 47 47 46 27-1 45-22 43-48C93 19 74 4 47 7"/>',
  close:
    '<path pathLength="1" stroke-dasharray=".055 .045" d="M52 6C27 3 6 17 5 45c-1 27 21 47 47 46 27-1 45-22 43-48C93 19 74 4 47 7"/>',
  wrong: '<path pathLength="1" d="M10 88C34 63 60 38 90 11"/>',
} as const;

export function primaryButton(label: string, attrs = ""): string {
  return `<button class="btn" type="button" ${attrs}><span>${label}</span>${ICONS.arrow}</button>`;
}

export function textButton(label: string, attrs = ""): string {
  return `<button class="textbtn" type="button" ${attrs}>${label}</button>`;
}

/** Fade + lift elements with [data-reveal] into view, staggered. */
export function reveal(root: ParentNode): () => void {
  const els = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-in"));
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -4% 0px" },
  );
  els.forEach((el, i) => {
    if (!el.style.getPropertyValue("--d")) el.style.setProperty("--d", `${Math.min(i, 8) * 70}ms`);
    io.observe(el);
  });
  return () => io.disconnect();
}

const scoreFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export function formatScore(score: number): string {
  return scoreFormat.format(score);
}

export function formatTime(seconds: number): string {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
}

/** Film-style frame code: 1 → "01A". */
export function frameCode(index: number): string {
  return `${String(index + 1).padStart(2, "0")}A`;
}
