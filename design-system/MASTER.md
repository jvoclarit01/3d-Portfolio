# Design System — MASTER (Source of Truth)

> Generated for the **3D Studio Apartment** experience via the `ui-ux-pro-max` skill,
> reconciled with the live site's `css/style.css`. When building any apartment UI, read
> this file first. Page-specific overrides (if any) live in `design-system/pages/`.

## Style
**Cyberpunk UI** (ui-ux-pro-max match): neon-on-dark, HUD aesthetic, subtle glitch,
low-opacity scanlines, monospace, angular/sharp shapes. Dark mode only.
HUD information architecture references **basement.studio** (column grid, mono captions,
marquee, `actionable` arrow links, bordered cells with dotted/diagonal fills).

## Color tokens (brand — from style.css)
| Token | Value | Use |
|------|------|-----|
| `--bg` | `#06060c` | page / 3D background |
| `--bg-soft` | `#0b0c16` | raised surfaces |
| `--cyan` | `#00f3ff` | primary neon accent |
| `--magenta` | `#ff007f` | secondary neon accent |
| `--violet` | `#a855f7` | tertiary neon accent |
| `--text` | `#ffffff` | headings |
| `--text-body` | `#c8c8d4` | body copy (≥4.5:1 on `--bg`) |
| `--muted` | `#7c809b` | captions / secondary |
| `--border` | `rgba(0,243,255,0.15)` | cyan-tinted hairlines |

**Contrast rule:** neon hues are reserved for large headings, accents, and decoration
(≥3:1). Body/paragraph text must use `--text` or `--text-body` (≥4.5:1). Never set
paragraph copy in raw neon on dark.

## Typography
- **Display:** Orbitron 600–900 — zone names, card titles, brand. (ui-ux-pro-max's
  recommended futuristic header font.)
- **Mono:** JetBrains Mono 300–700 — body, captions, HUD readouts.
- Body line-height 1.5–1.65; headings ~1.05. Min body size 12px (captions) / 14px+ (copy).

## Shape & effects
- Radius 0–4px (sharp/technical).
- Neon glow via `text-shadow`/emissive — used sparingly.
- Glitch ≤0.3s on zone change only.
- Scanlines overlay at low opacity (~0.15).
- 3D: UnrealBloom **low** (strength ~0.5, radius ~0.5, threshold ~0.78). Screen textures
  tinted `0xc2c6d4` so bright UIs never blow out under bloom.

## Motion tokens (ui-ux-pro-max HIGH-severity rules)
- Micro-interactions 150–300ms; transitions ≤400ms.
- **ease-out** entering, **ease-in** exiting; never `linear` for UI.
- Animate **≤1–2 key elements per view**.
- **`prefers-reduced-motion`: mandatory fallback** — disable scroll scrubbing / parallax /
  glitch / marquee; the camera **jumps** discretely between rooms; cards appear without
  transform. (Mitigates the scroll-jacking nausea risk.)

## Accessibility (CRITICAL — non-negotiable)
- Body text contrast ≥4.5:1; large text/accents ≥3:1.
- Visible `:focus-visible` ring (2px `--cyan`), keyboard operable (minimap, links, overlay).
- `aria-label` on icon/diamond buttons; overlays closeable via Esc / backdrop / button.
- Touch targets ≥44px. Responsive 375 / 768 / 1024 / 1440 (mobile: mandatory snap, minimap
  hidden, type scaled). Respect `prefers-reduced-motion` everywhere.

## Anti-patterns (do not)
Emoji as structural icons · body text <12px · gray-on-gray · animating width/height ·
forcing scroll effects with no reduced-motion fallback · neon body copy.
