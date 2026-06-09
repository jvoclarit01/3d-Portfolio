# Jan Vincent Oclarit — Creative Engineer & 3D Web Developer

A refined, minimalist creative portfolio website featuring a WebGL particle hero, dynamic grids, and clean layout design. Built with a focus on polished typography, seamless interactions, and high-performance frontend engineering.

👉 **Live Site:** [jvoclarit.pages.dev](https://jvoclarit.pages.dev/)

---

## 🚀 Features

* **WebGL Particle Hero** — A morphing, interactive particle sphere (Three.js) that responds to cursor drift and fades out smoothly on scroll.
* **Binary Particle Field** — Floating `0` and `1` glyphs in the brand palette, reacting to mouse parallax coordinates.
* **Intro Loader** — A progressive loading sequence with a `0 → 100` counter, reveal transitions, and text wipes.
* **Dynamic Header & Footer** — A sticky glassmorphic navigation bar that becomes compact and blurred on scroll, matching a solid blurred footer.
* **Interactive Connect Form** — A fully-functioning AJAX message form integrated with **Web3Forms** for client-side messaging with custom success/error visual states.
* **Responsive & Accessible** — Features keyboard-accessible navigation, a skips link, focus indicators, and fully-responsive typography.

---

## 🛠️ Tech Stack

* **Core:** Vanilla HTML5, CSS3 Custom Properties (CSS variables), Modern JavaScript (ES Modules).
* **3D Graphics:** [Three.js](https://threejs.org/) (via importmap and CDN).
* **Form Services:** [Web3Forms API](https://web3forms.com/) for serverless form submissions.
* **Typography:** Orbitron (Display) + JetBrains Mono (Sanskrit Monospace).

---

## 💻 Local Development

Since the project uses ES Modules and the Three.js CDN, you must serve the site over HTTP rather than opening the file directly:

```bash
# Python 3
python -m http.server 8099
```
Then open `http://localhost:8099` in your browser.

---

## 📦 Deployment

The project is configured for deployment on **Cloudflare Pages**. To deploy your own copy:
1. Push your repository to GitHub or GitLab.
2. Connect your repository to **Cloudflare Pages** in the Cloudflare dashboard.
3. Keep the build settings default/empty (since it is a static HTML/JS site) and click **Save and Deploy**.
