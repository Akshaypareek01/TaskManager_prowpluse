# Impact Wall — Design System

Light, professional, B2B/internal tooling. Everything below is implemented; this
file is the contract, not a wish list.

**Token sources of truth**
- Colour / type / spacing / radius / elevation / motion → `tailwind.config.js`
- Base styles + component primitives → `app/globals.css`
- framer-motion tokens → `lib/motion.js`
- Per-member identity colour maths → `lib/colors.js`

Never introduce a new colour, font size, radius, shadow or duration inline.
Extend the token file, then use the token.

---

## Principles

1. **One accent.** Brand indigo. Colour means something; it never decorates.
2. **Neutrals carry the layout.** 1px hairlines, soft elevation, generous whitespace.
3. **Semantic colour is status only** — success / warning / danger never appear as branding.
4. **Motion is 150–250ms on one curve.** Nothing bounces for fun. `prefers-reduced-motion` is honoured everywhere.
5. **Every screen has five states**: loading, empty, error, partial/edge, success.

---

## Colour

### Accent — `brand`
`50 #EEF2FF · 100 #E0E7FF · 200 #C7D2FE · 300 #A5B4FC · 400 #818CF8 · 500 #6366F1 · 600 #4F46E5 · 700 #4338CA · 800 #3730A3 · 900 #312E81`

- **Primary action** = `brand-600` + white text (7.0:1). Hover `brand-700`.
- **Selected state** = `brand-600` border + `brand-50` fill.

### Text — `ink`
| Token | Hex | Contrast on white | Use |
|---|---|---|---|
| `ink` | `#101828` | 16.9:1 | headings, values, primary text |
| `ink-700` | `#344054` | 10.4:1 | body |
| `ink-600` | `#475467` | 7.6:1 | secondary / meta |
| `ink-500` | `#667085` | 4.9:1 | tertiary — still AA |
| `ink-400` | `#98A2B3` | 2.8:1 | **decorative / disabled only, never body text** |

### Surfaces & lines
`canvas #F6F7F9` (page) · `surface #FFFFFF` (cards) · `surface-sunken #F2F4F7` (wells, segmented track, skeletons) · `surface-hover #F9FAFB`
`line #E4E7EC` (hairline) · `line-strong #D0D5DD` (inputs, dividers that must read) · `line-soft #F0F1F4`

### Status
Each has `bg` / `border` / `fg` / `solid`; `fg` on `bg` clears 5.3:1 or better.

| Tone | bg | border | fg | solid |
|---|---|---|---|---|
| success | `#ECFDF3` | `#A9EFC5` | `#067647` | `#12B76A` |
| warning | `#FFFAEB` | `#FEDF89` | `#B54708` | `#F79009` |
| danger | `#FEF3F2` | `#FECDCA` | `#B42318` | `#F04438` |
| info | `#EEF2FF` | `#C7D2FE` | `#3730A3` | `#4F46E5` |

Task status mapping lives in one place — `TASK_STATUS` in `app/components/ui/Badge.js`:
`completed → success` · `overdue → danger` · `in_progress → brand` · `pending → neutral`.

### Member identity colours
`lib/team.js` colours were authored for a dark theme and are too bright for white.
Always route them through `lib/colors.js`:
- `avatarStyle(hex)` → deepened fill + a foreground picked by contrast
- `deepen(hex, amount)` → for meters/bars
Never render a raw `member.color` as a background with hard-coded text colour.

---

## Typography

Plus Jakarta Sans (`next/font`, `--font-plus-jakarta`). Body 15px.

| Token | Size / line-height | Use |
|---|---|---|
| `text-display-md` | 36 / 44, -0.025em | reserved |
| `text-display-sm` | 30 / 38, -0.022em | reserved |
| `text-display-xs` | 24 / 32, -0.02em | page heading |
| `text-lg` | 18 | dialog / section heading |
| `text-[15px]` | 15 | body, card titles, panel titles |
| `text-sm` | 14 | buttons |
| `text-[13px]` | 13 | dense UI, table cells, secondary buttons |
| `text-xs` | 12 | meta |
| `text-2xs` | 11, +0.01em | eyebrows, badges, counts |

Helpers: `.eyebrow` (11px uppercase, tracking .06em, `ink-500`), `.section-title` (15px semibold), `.meta` (12px `ink-500`), `.truncate-2` (2-line clamp).
Numbers in tables, KPIs and timers always use `tabular-nums`.

---

## Spacing, radius, elevation

- **Spacing**: 4px scale (Tailwind default) plus `4.5` (18px), `18` (72px), `22` (88px).
  Card padding 16px, panel padding 16/20px, page gutters 16 → 24 → 32px, section gap 20px (`mb-5`).
- **Radius**: `md 8` inputs · `lg 10` buttons · `xl 12` cards · `2xl 16` panels/modal · `full` chips & avatars.
- **Elevation** (all cool-grey, never black):
  `shadow-xs` resting cards · `shadow-sm` panels · `shadow-md` card hover · `shadow-lg` toasts · `shadow-2xl` modal · `shadow-focus` focus ring glow.
- **App shell**: `max-w-shell` = 1312px.

---

## Motion

Tokens in `lib/motion.js`; the CSS mirror is in `app/globals.css`.

- Curve: `EASE = [0.16, 1, 0.3, 1]` (Tailwind: `ease-smooth`)
- Durations: `fast 150ms` (hover, press, colour) · `base 200ms` (element enter/exit) · `slow 250ms` (panel/tab change, meters)
- `spring` (stiffness 420 / damping 34) is reserved for the tab pill and the modal only.
- Travel distance is 4–8px. Nothing slides across the screen.
- Helpers: `rise()`, `staggerParent()` + `riseItem()` (35ms stagger), `collapse()`, `pressable()`.

**Reduced motion**: every animating component calls framer's `useReducedMotion()` and
passes it into the helpers, which collapse to opacity-only. A global
`@media (prefers-reduced-motion: reduce)` block in `globals.css` neutralises all
CSS transitions/animations. Both layers are required.

---

## Component primitives

Defined in `app/globals.css` (`@layer components`) and wrapped by React components in
`app/components/ui/`. Reuse > extend > create.

| Primitive | Class / component | Notes |
|---|---|---|
| Button | `.btn` + `.btn-{primary,secondary,ghost,danger,link}` + `.btn-{sm,md,lg,icon}` → `ui/Button.js` | `loading` swaps in a spinner and disables. Heights 36/40/44. |
| Card | `.card`, `.card-interactive` | interactive = hover lift 1px + `shadow-md` |
| Panel | `.panel` → `ui/Card.js` (`Panel`, `PanelHeader`, `PanelBody`) | page-level container |
| Input | `.input` + `.input-h`, `.input-invalid`, `.select` → `ui/Field.js` | `Field` wires `id`/`aria-invalid`/`aria-describedby` onto its child |
| Badge | `.badge` + `.badge-{neutral,success,warning,danger,brand}` → `ui/Badge.js` | `StatusBadge` for task status |
| Modal | `ui/Modal.js` | portalled to `<body>`, focus trap, Escape, scroll lock, focus restore |
| Toast | `ui/Toast.js` | `ToastProvider` + `useToast()`; max 3, auto-dismiss 4s |
| Empty state | `ui/EmptyState.js` | **must** carry an action — an empty state without a next step is a dead end |
| Skeleton | `.skeleton` → `ui/Skeleton.js` | shimmer; mirrors real box sizes so nothing shifts |
| Progress | `ui/Progress.js` | animates from 0, eases between values |
| Icons | `ui/Icon.js` | the only icon set: 24px grid, 1.75 stroke, round caps. Add paths here, never inline an `<svg>`. |
| Tabs | `components/Tabs.js` | shared `layoutId` pill + full ARIA tabs keyboard contract |

---

## Accessibility baseline

- Body text ≥ 4.5:1. `ink-400` is decorative only.
- One focus treatment: `ring-2 ring-brand-600 ring-offset-2` on `:focus-visible`, applied globally in `globals.css`.
- Buttons are `<button>`. Toggles carry `aria-pressed`; tabs implement roving tabindex + Arrow/Home/End.
- Skip link to `#main` in `app/layout.js`.
- Errors are `role="alert"` and tied to their input via `aria-describedby`.
- Touch targets ≥ 36px, primary actions 40–44px.

---

## Form rules

- Validate on blur **and** on submit; never on first keystroke.
- Errors are derived from live state — never snapshot validation into a separate
  store inside a blur handler (it is one render stale and drops the error).
- Messages say what to do: "Use at least 3 characters", never "Invalid input".
- Trim before validating; whitespace-only is empty.
- Disable submit while in flight, show the spinner, and **keep every value on failure**.
- Character counters on any capped field (title 200, notes 600).

---

## Responsive

Mobile-first; verified at 360 / 768 / 1024 / 1440 with zero horizontal page scroll.
- KPI grid: 2-up → 4-up at `lg`.
- Task grid: 1 → 2 (`sm`) → 3 (`xl`).
- Roster: horizontal scroll with a gradient edge below `lg`, wraps at `lg`+.
- Task history: real `<table>` at `md`+, stacked cards below.
- Never use a viewport breakpoint to lay out the inside of a card that sits in a
  multi-column grid — the breakpoint knows the window, not the container.

---

## Deliberately not used

- `three` / `ThreeBackground.js` — still on disk, no longer mounted. Built for the
  old dark theme, ~150KB JS plus a per-frame render loop, reads as a demo.
- Dark mode — the product is light-only for now. Tokens are semantic, so adding a
  dark theme later means remapping `canvas` / `surface` / `ink` / `line`, not a rewrite.
