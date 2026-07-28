# PROWPLUS TaskManager — Design System

## Brand
- **Name:** PROWPLUS
- **Logo:** https://prowplus.ai/pp_icons.png
- **Accent:** Periwinkle → cyan → medium blue gradient (`#9ec5ef → #5ec8f2 → #3b8fd4`)

## Typography
- **Font:** Plus Jakarta Sans (via `next/font/google`)
- **Scale:** text-xs (11–12px), text-sm (14px), text-base (15–16px), text-xl/2xl/3xl for headings

## Colors (CSS vars in globals.css)
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deep` | `#070b14` | Page background |
| `--prow-cyan` | `#5ec8f2` | Primary accent |
| `--prow-blue` | `#3b8fd4` | Secondary accent |
| `--prow-periwinkle` | `#9ec5ef` | Gradient start |
| `--text-primary` | `#eef4fb` | Body text |
| `--text-muted` | `#8fa3bc` | Secondary text |
| `--text-faint` | `#5a708a` | Labels, captions |
| `--good` | `#34d399` | Success / completed |
| `--warn` | `#fbbf24` | Pending / reminders |
| `--bad` | `#fb7185` | Overdue / errors |

## Components
| Component | Path | Notes |
|-----------|------|-------|
| Badge | `app/components/ui/Badge.js` | `.badge` + tone classes (`badge-success`, `badge-danger`, etc.); roster chips show **pending · done · hours** in warning/success/neutral tones |
| Glass card | `.glass-card` | Frosted panel, border white/10 |
| Glass card strong | `.glass-card-strong` | Darker solid glass |
| Primary button | `.btn-primary` | Gradient pill, glow shadow |
| Ghost button | `.btn-ghost` | Outlined secondary |
| Input field | `.input-field` | Dark input with cyan focus |
| Section label | `.section-label` | Uppercase tracking label |
| Status pill | `.status-pill.*` | pending/completed/overdue |
| Daily greeting | `aside` in Wall.js | Left brand accent + faint gradient tint, inline emoji, italic quote |

## Layout
- Max width: 1400px centered
- Grid: task cards 1/2/3 cols (sm/xl)
- Spacing: gap-2 to gap-5, px-4 sm:px-8

## Charts (Recharts)
- CompletionDonut — donut with center % label
- DailyTrendChart — area chart, cyan gradient fill
- MemberBars — horizontal bars + member cards

## Animation
- Framer Motion: modal enter/exit
- CSS: `animate-in` slide-up, pulse bar width transition 700ms
