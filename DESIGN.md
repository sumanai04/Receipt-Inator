# Receipt-Inator — Design Direction

> The contract for how this app looks, feels, and behaves. Read this **before** generating UI or adding any color. Tokens here override habit.
>
> Companion to `.omo/plans/receipt-inator-findings.md` (§11 "UI discussion").

---

## 0. The one-line thesis

**Leaders, not averages.** A model left unconstrained returns the statistical mean of its training data — the "AI slop" look. This app does the opposite: every choice is *made*, and the direction is *derived from the product's own material* — **receipts**.

The direction is **Ledger**: thermal-paper restraint, monospaced figures, hairline rules, one ink accent. Restrained, legible, and nobody-generated.

---

## 1. What "AI slop" is (and our counter-rules)

Slop is not ugliness. It is **decisions nobody made**: a UI that is technically competent and refers to nothing. It comes from a model sampling the centre of its corpus (Tailwind defaults → shadcn defaults → B2B SaaS landing pages). The tells are symptoms.

**The nevers** (each is a corpus-mean trap):

| Never | Instead |
|---|---|
| Blue→purple / neon-violet gradient | One ink accent (emerald). Gradients are earned or absent. |
| Gradient text (`bg-clip-text`) | Solid ink headline; hierarchy from size/weight, not color. |
| Inter / system default with no typographic decision | A real type pairing with defined roles (§5). |
| Centered body text, centered everything | Flush-left body; asymmetry carries structure. |
| Card → card → card, nested boxes | Hairline rules and space. Don't box every idea. |
| `rounded-2xl` + `shadow-lg` on every surface | Radius varies by element class; depth via border, not shadow. |
| Glassmorphism / `backdrop-blur` decoration | Flat surfaces. Glass only over real moving content — we have none. |
| Identical `fade-in-up` on every section | No scroll-entrance animation. Motion = state change only. |
| Emoji as icons | Hand-authored SVG only (§6). |
| "Supercharge / Elevate / Seamless" copy | Specific, literal copy. If a line could sit on a competitor's site, rewrite it. |
| Pure `#000` + pure `#fff` | Near-black ground + off-white ink (§3). |
| A second decorative accent | One accent. Red/amber/blue are **semantic only**. |
| Untouched defaults | Override the token layer (§4) and add a signature (mono dot-leaders). |

**Why we're already ahead:** no shadows, no blur, no emoji, no icon library, border-based depth, one legitimate gradient (a functional image fade). Keep it that way. The two real risks are typographic defaultness and stock palette — both addressed below.

**The second-wave trap.** Banning purple + Inter does not create originality; the model just drifts to the next default (cream + terracotta, acid-green-on-black, tracked all-caps eyebrows). Do **not** swap one fixed palette for another. Derive from the material.

---

## 2. Direction: "Ledger"

A receipt is already a design language: monospace, tabular figures, ledger rules, dot leaders, thermal warmth, red-ink totals. We lean in.

- **Signature primitive:** the **dot-leader line-item row** — `Rendang Sapi ·············· Rp 215.000`. Nobody generates this. It is ours.
- **Voice:** literal, quiet, a little dry. "Reading your bill…" not "Extracting your data with AI ✨".
- **Restraint as character:** the unpaid, undecorated receipt is the aesthetic. Legibility is the point.

Distinctiveness pays on brand/trust surfaces (upload, results, save); utility surfaces (number grids) stay plain and fast. Don't brutalist-mangle a tool.

---

## 3. Color theory — the applied primer

### 3.1 Use OKLCH, not HSL

HSL's "lightness" is geometric, so equal `L` across hues looks wildly uneven (yellow reads ~2× lighter than blue). **OKLCH `L` is perceptually uniform** — one lightness ladder works for every hue, and a ramp becomes a *formula* instead of 11 hand-picked swatches. (Björn Ottosson, [OKLab](https://bottosson.github.io/posts/oklab/); Tailwind v4 now ships OKLCH.)

```
L  0→1   perceptually linear
C  0→~0.4 (sRGB)   ~0 grey · 0.05 subtle · 0.10–0.20 colorful · 0.20+ vivid
H  0→360°  perceptual wheel (NOT interchangeable with HSL degrees)
```

**Gamut warning:** max in-gamut chroma shrinks at the light/dark extremes. Taper `C` at the ends or the browser clips and hue-shifts. Keep midtone `C ≤ ~0.22` for cross-display safety.

**Ramp recipe** (fix `H`, vary `L`, taper `C`):

```
50 97%   200 87%   400 70%   600 54%   800 36%
100 93%  300 78%   500 62%★  700 45%  900 27%   950 15%
★ anchor
```

### 3.2 Proportions & roles

- **60-30-10:** ~60% ground, ~30% structure, ~10% accent. Neutrals don't count against the budget. If the accent exceeds ~15% of a screen, it has stopped being an accent.
- **One accent. Two = confusion, three = chaos.** Status colors (danger/success/warning) are a *separate functional system*, never extra accents.
- **Color encodes function.** Red is reserved for destructive/error. Using it decoratively triggers false alarm.

### 3.3 Contrast — WCAG is the floor, APCA is the instrument

- **WCAG 2.2 AA (legal floor):** text ≥ **4.5:1**; large text (≥24px, or ≥18.66px bold) ≥ **3:1**; UI components/borders ≥ **3:1** (SC 1.4.11). No rounding — 4.499 fails.
- **APCA (design instrument, polarity-aware):** body `Lc ≥ 75` (preferred 90), large/secondary ≥ 60, faint/non-essential ≥ 30. **On dark, keep large/bold text *below* Lc 90** — beyond that it glares/halates.

**The mistake WCAG hides:** its math overstates contrast for dark colors, so `#fff` on `#030712` scores 19:1 and *hurts*. Test both; design to APCA on dark.

### 3.4 Dark-mode rules

- **Never pure black.** `#000` + white = 21:1 halation, no room for depth. Ground lives ~`L 12–15%`.
- **Elevation = a lighter surface, not a shadow.** Shadows vanish on dark; step each tier up ~4–6% `L` and pair with a `1px` hairline border.
- **Desaturate + lighten accents** vs. their light-mode form (down ~15–25% chroma; use the 300–400 weight, not 500–600).
- **Match neutral temperature to accent temperature.** Ours is cool (grey hue ~262) + cool emerald (~163) — coherent. Don't mix warm neutrals with the cool accent.
- Muted text via **opacity** silently drops below AA — always test against the *lightest* surface it can sit on.

### 3.5 Harmony

A utility app wants a **monochromatic neutral ground + a single complementary-style accent** (~80/20 weighting). Emerald leads, which leaves red/amber/blue free for status. Never distribute many colors evenly ("rainbow UI" = no hierarchy).

**Grayscale audit:** desaturate the screen. If the primary action isn't obvious in ~1 second, the hierarchy is broken and color is being used as a crutch.

---

## 4. Token plan for this app

Author primitives in `oklch()` in `globals.css` (`:root`); expose semantic roles to components via `tailwind.config.ts` `theme.extend`. **Components consume roles only — never raw ramps.**

### 4.1 Measured contrast (verified against `#030712`)

Computed from Tailwind v4 OKLCH → sRGB → WCAG + APCA:

| Role | Approx | WCAG | APCA `Lc` | Use |
|---|---|---|---|---|
| text (primary) | gray-200 | 16.3:1 | −92 | body |
| text-muted | gray-400 | 7.7:1 | −53 | secondary/labels |
| text-faint | gray-500 | **4.16:1** | −30 | ⚠ fails AA body — non-essential only |
| gray-50 | — | 19.3:1 | **−104** | too hot — avoid for body |
| accent-text | emerald-400 | 10.4:1 | −67 | links/accent text |
| accent | emerald-500 | 8.2:1 | −55 | solid accent |
| accent-strong | emerald-600 | 5.5:1 | −40 | AA-passing emerald |

**Verdict: body text is `gray-200` (~16:1 / Lc −92), not `gray-50`.** `gray-500` is a trap (4.16:1, fails a strict reading).

**Elevation — a real finding:** stock `gray-900` on `gray-950` is **Lc −0.2** (invisible); `gray-800` is −3.7 (barely). Tailwind's dark end is too tight to build depth. **Use a dedicated surface ramp:**

| Token | OKLCH | Pair |
|---|---|---|
| `ground` | `oklch(13% 0.028 262)` | — |
| `surface-1` | `oklch(18% 0.024 262)` | `+ 1px rgba(255,255,255,0.10)` |
| `surface-2` | `oklch(23% 0.022 262)` | `+ 1px rgba(255,255,255,0.12)` |
| `surface-3` | `oklch(28% 0.020 262)` | `+ 1px rgba(255,255,255,0.14)` |

Each step ≈ Lc 5–8 — finally readable as depth.

### 4.2 Semantic roles

```
--ground · --surface-1..3 · --outline-subtle · --outline · --outline-strong
--text · --text-muted · --text-faint
--accent · --accent-text · --on-accent
--success · --warning · --danger · --info
```

> **Implemented.** These live as OKLCH channel triplets in `globals.css` (`:root`) and are exposed to components via `tailwind.config.ts` as `oklch(var(--token) / <alpha-value>)`, so opacity modifiers (`bg-accent/10`, `border-accent/30`) work. All app components now consume roles — no raw `gray-*`/`emerald-*` remain outside the person-identity arrays.

Mapping rules: `--success` reuses the emerald accent (green = good, and the brand); `--danger`/`--warning` are functional only. Person-identity colors are **data**, not decoration — collapse the three duplicated 8-color arrays (`BillEditor`, `PeopleManager`, `SplitSummary`) into one `--person-1..8` set.

### 4.3 Radius, spacing, elevation

- **Radius by class:** inputs/buttons `rounded-lg` (8px), cards `rounded-xl` (12px), containers/rare `rounded-2xl` (16px). Varying it is intentional hierarchy — not one radius everywhere.
- **Spacing:** a real scale (4/8/12/16/24/32/48). Space implies grouping; generous gaps separate sections. Avoid uniform gaps between everything.
- **Borders:** hairlines carry structure. Depth comes from border + the surface ramp — **not shadows**.

---

## 5. Typography

Currently there is **no font decision** (default system stack) — the single biggest "default" tell. Fix:

- **Display/UI:** one humanist sans for prose and labels.
- **Data:** a **monospace** for all money, quantities, and ledger figures — we already do this with `font-mono`; formalize it as the signature.
- **Weights:** display at 400–500, *not* 700. Hierarchy from size + spacing, not from boldness. **Tabular numerals** (`font-variant-numeric: tabular-nums`) so columns align.
- Load via `next/font` (self-hosted, no external request, no layout shift). No second display font "for flair".

**Signature:** the money column is monospace, right-aligned, tabular — it reads like a printed receipt. That is the identity; protect it.

---

## 6. Icons & affordances

- **Icons:** hand-authored SVG only (24×24, `stroke="currentColor"`, round caps). No icon library. Semantic, not decorative — if an icon says nothing specific, remove it.
- **The scan CTA** uses a **receipt** glyph (not an upload/tray), because the action is "scan a receipt", not "upload a file".
- **Inputs must look editable.** An input that is `bg-transparent` + `focus:outline-none` inside a card is indistinguishable from display text. Every editable field gets: a visible border, a hover state, a focus ring, a label associated via `htmlFor`/`id`, and a `Rp` prefix for money. Focus is a designed state, not `outline-none`.
- **Eight designed states** for interactive elements: default · hover · focus · active · disabled · loading · empty · error. Empty/error states are where trust is built or lost — never ship only the happy path.

---

## 7. Copy

Literal and specific. "Scan a receipt", "Each person owes", "Add a person…" — all good. Keep the honest privacy line ("Runs on your device — nothing is uploaded"). Ban the weightless register (supercharge/elevate/seamless/unlock) and the em-dash-aphorism-per-section cadence.

---

## 8. Checklist (run before shipping any screen)

- [ ] Grayscale audit passes — primary action obvious without color.
- [ ] Accent ≤ ~15% of the screen; no second decorative accent.
- [ ] Body text ≥ 4.5:1 WCAG **and** ≥ Lc 75 APCA; nothing relies on `gray-500` for body.
- [ ] Elevation uses the surface ramp + hairline, not shadows.
- [ ] Every input has border + hover + focus ring + associated label.
- [ ] No pure black/white; no glass; no gradient text; no emoji icons.
- [ ] Empty / loading / error states exist.
- [ ] Copy is specific — could not sit on a competitor's site.

**One line to remember:** *the tell is never a technique — it's a technique nobody chose. Make every choice, and derive it from the receipt.*
