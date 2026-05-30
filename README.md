# 3D Portfolio

An animated, dark-theme portfolio website with a WebGL particle hero and a drifting field of binary `0` / `1` glyphs. Built as a faithful, reusable recreation of the motion and layout language of [dala.craftedbygc.com](https://dala.craftedbygc.com/), adapted into a portfolio template with placeholder content.

## Features

- **Intro loader** — gradient spinner, wipe-in name heading, `0 → 100` progress counter
- **WebGL hero** — a morphing particle blob (Three.js) that drifts and fades on scroll
- **Binary particle field** — floating `0` and `1` glyphs in the brand palette, with cursor parallax
- **Expressive motion** — per-character heading reveals, per-line rotate-in paragraphs, nav char-wipe hover, pill buttons with fill-up hover, scroll-triggered reveals
- **Accessible & responsive** — skip link, visible focus rings, keyboard-operable carousel, readability scrim, full `prefers-reduced-motion` fallback, no horizontal overflow

## Tech

- Vanilla HTML / CSS / JavaScript (no build step)
- [Three.js](https://threejs.org/) via ES-module CDN + importmap
- Inter (display/body) + Georgia (italic emphasis)

## Run locally

ES modules and the Three.js CDN require the site to be served over HTTP (not opened as a `file://`):

```bash
python -m http.server 8099
# then open http://127.0.0.1:8099/
```

## Customize

Replace the placeholders throughout `index.html`:

- `[ Your Name ]` — name / brand
- `[ Project One ]` … `[ Project Four ]` — case studies in **Selected work**
- `[ Company One ]` … `[ Company Three ]` — roles in **Experience**
- `you@email.com` — contact email
- `Tools & stack` items and footer social links (`href="#"`)

## Credits

Motion and layout inspired by the Dala marketing site. All content here is placeholder.
