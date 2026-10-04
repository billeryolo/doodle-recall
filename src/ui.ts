// Small DOM helpers + hairline icon set shared by every screen.

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
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

export const ICONS = {
  arrow: svg('<path d="M7 17 17 7"/><path d="M8 7h9v9"/>'),
  retry: svg('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>'),
  link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  download: svg('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'),
  sound: svg('<path d="M4 9.5h3l5-4v13l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/>'),
  mute: svg('<path d="M4 9.5h3l5-4v13l-5-4H4z"/><path d="m16 9.5 5 5"/><path d="m21 9.5-5 5"/>'),
  close: svg('<path d="M6 6l12 12"/><path d="M18 6 6 18"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  half: svg('<circle cx="12" cy="12" r="7"/><path d="M12 5v14"/>'),
  cross: svg('<path d="M7 7l10 10"/><path d="M17 7 7 17"/>'),
  enter: svg('<path d="M19 6v5a3 3 0 0 1-3 3H6"/><path d="m10 10-4 4 4 4"/>'),
};

/** Pill button with its icon nested in its own circular "island". */
export function islandButton(label: string, icon: string, variant: "primary" | "ghost" = "primary", attrs = ""): string {
  return `<button class="btn btn--${variant}" ${attrs}><span class="btn__label">${label}</span><span class="btn__icon">${icon}</span></button>`;
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
    { rootMargin: "0px 0px -6% 0px" },
  );
  els.forEach((el, i) => {
    if (!el.style.getPropertyValue("--d")) el.style.setProperty("--d", `${Math.min(i, 8) * 70}ms`);
    io.observe(el);
  });
  return () => io.disconnect();
}

export function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

export function formatTime(seconds: number): string {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
}
