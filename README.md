# Jan Vincent Oclarit — Creative Engineer & 3D Web Developer

An animated, dark-theme creative portfolio website featuring a WebGL particle hero, dynamic grid systems, and a drifting field of binary parallax particles. Built with a focus on tactile digital experiences, high-fidelity typography, and expressive motion.

👉 **Live Site:** [jvoclarit01.github.io/3d-Portfolio](https://jvoclarit01.github.io/3d-Portfolio/)

---

## 🚀 Features

* **WebGL Particle Hero** — A morphing, interactive particle sphere (Three.js) that responds to cursor drift and fades out smoothly on scroll.
* **Binary Particle Field** — Floating floating `0` and `1` glyphs in the brand palette, reacting to mouse parallax coordinates.
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

The project is configured for deployment on **GitHub Pages**. To deploy your own copy:
1. Go to your repository settings on GitHub.
2. Select **Pages** from the sidebar.
3. Choose the `main` branch under **Build and deployment** and click **Save**.
