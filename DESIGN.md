# Design System: Doodle Recall — "Darkroom"

## 1. Visual Theme & Atmosphere
A photographic darkroom. Memory is treated like film: each word gets one short **exposure** (the drawing),
the prints **develop** during recall, and the results are graded on a **contact sheet** with grease-pencil marks.
The room is a soft warm charcoal, lit by a muted terracotta safelight. Contrast is deliberately gentle: no near-black, no bright white; text and paper sit in the same warm, low-glare range (body text still meets WCAG AA). The only bright surfaces are paper prints and the light table.

- Density 4 — "Daily App Balanced": focused, one task per screen.
- Variance 7 — "Offset Asymmetric": left-aligned headlines, 7/5 split hero, film strips that break the grid.
- Motion 5 — "Fluid CSS": draw-on SVG strokes, prints that develop, grease-pencil marks drawn in. Nothing loops forever.

## 2. Color Palette & Roles
- **Darkroom Charcoal** (#24211E) — Page background. Never pure black.
- **Raised Charcoal** (#2C2925) — Raised panels, the exposure log.
- **Film Base** (#1A1816) — Film strips and frames that surround prints.
- **Print Paper** (#E2DACC) — Drawing surfaces, the light table.
- **Print Ink** (#2B2723) — Strokes and text on paper.
- **Fixer White** (#DCD5CA) — Primary text on charcoal.
- **Contact Grey** (#AEA69B) — Secondary text.
- **Negative Grey** (#9A9287) — Metadata, frame numbers, hints.
- **Hairline** (rgba(220,213,202,0.10)) — Dividers and structural lines.
- **Safelight** (#C9654C) — The single accent, used sparingly: the status dot, the last half-second of the timer, and grease-pencil marks. Everything else uses ink or paper.

One warm grey family only. No second accent: "correct / close / missed" are told apart by *mark shape*
(full circle / dashed circle / strike-through), not by colour.

## 3. Typography Rules
- **Display:** Bricolage Grotesque — condensed width (wdth 75–85), weight 700–800, tracking −0.03em, `text-wrap: balance`.
- **Body:** Geist 400/500 — relaxed 1.6 leading, max 60ch.
- **Mono:** Geist Mono — frame numbers, edge codes, scores, timers. Always `tabular-nums`.
- **Handwriting:** Caveat 600/700 — every word the game shows you (the cue, the flash, contact-sheet labels).
- **Banned:** Inter, generic serifs, all-caps body copy. Small mono labels may be uppercase with positive tracking.

## 4. Component Stylings
- **Buttons:** Fully rounded pills. Primary is paper-on-charcoal (ink-on-paper inverted on the light table). Secondary
  actions are underlined text buttons, never a second filled button. Active state presses down 1px. No glows.
- **Film frame:** A Film Base surround with sprocket holes along the top and bottom edges, a mono edge code
  (`DR-25 ▸ 07A`), and a paper print inside with a 2px radius.
- **Light table:** The setup panel is lit paper with very round corners (2rem): pill-shaped segmented control, round slider thumb, ink pill button.
- **Inputs:** The label sits above the input. Recall uses an underline-only input in display type. Focus shows a Safelight underline or ring.
- **Marks:** Hand-drawn SVG paths in Safelight: a circle for correct, a dashed circle for close, a strike-through for missed.
- **Empty states:** A blank frame reads "Blank frame" in grease pencil. The exposure log is hidden until a game is played.

## 5. Layout Principles
- 12-column grid with a 1320px max width. The start screen splits 7/5 (headline, then light table).
- The game screens are a single centred film frame with a left-aligned cue above it.
- The contact sheet is a CSS grid of frames on a film-base band. Below 768px it collapses to 2 columns.
- Full-height views use `min-height: 100dvh`. No horizontal scroll at any width.

## 6. Motion & Interaction
- Easing: `cubic-bezier(0.32, 0.72, 0, 1)` for UI, `cubic-bezier(0.34, 1.4, 0.64, 1)` for small springs.
- Inline headline doodles draw on once at load and redraw on hover.
- Prints develop on recall: a white veil fades out while the print settles from a 1.5% scale-up.
- Grease marks draw on in a stagger as the contact sheet enters.
- Only `transform` and `opacity` are animated. Everything is disabled under `prefers-reduced-motion`.

## 7. Anti-Patterns (Banned)
No emojis. No Inter. No pure black. No neon glows or purple gradients. No pill-everything. No second filled button.
No three equal cards. No centred hero. No "scroll to explore". No `transition: all`. No infinite decorative loops.
