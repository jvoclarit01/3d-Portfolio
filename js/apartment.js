// ============================================================
//  apartment.js — Jan Vincent Oclarit
//  Scroll-driven 3D studio apartment. Each room is a portfolio
//  section; scrolling flies the camera between zones (scroll-
//  linked) while CSS snap gives the scroll-jacked feel.
//  Style: Cyberpunk UI (neon-on-dark) · see design-system/MASTER.md
//  Accessibility: full prefers-reduced-motion fallback (camera
//  JUMPS between rooms instead of scrubbing — no nausea), visible
//  focus, keyboard-operable overlays.
// ============================================================
import * as THREE from "three";

let composer = null, bloomPass = null, useBloom = false;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none)").matches;

// ---------- palette (design-system/MASTER.md) ----------
const C = {
  cyan: 0x00f3ff, magenta: 0xff007f, violet: 0xa855f7,
  bg: 0x06060c, wall: 0x0d0e1a, wallHi: 0x12131f,
  floor: 0x090a12, wood: 0x17121d, metal: 0x1b1e2c,
  fabric: 0x1d2030, white: 0xdfe4ff,
};
const ZONE_GLOW = [C.cyan, C.magenta, C.violet, C.cyan, C.magenta];
const ZONE_X = [-13, -8, -2.5, 3.5, 12];

// ============================================================
//  renderer / scene / camera
// ============================================================
const canvas = document.getElementById("apt-scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.bg);
scene.fog = new THREE.FogExp2(C.bg, 0.028);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(-15, 2.7, 5);

// lighting
scene.add(new THREE.AmbientLight(0x3a3f63, 0.9));
const moon = new THREE.DirectionalLight(0x8fb4ff, 0.5); moon.position.set(18, 16, 8); scene.add(moon);
ZONE_X.forEach((x, i) => { const pl = new THREE.PointLight(ZONE_GLOW[i], 1.4, 16, 1.6); pl.position.set(x, 4.4, -1.5); scene.add(pl); });
const windowLight = new THREE.PointLight(C.magenta, 2.2, 24, 1.4); windowLight.position.set(16, 3, 0); scene.add(windowLight);

// ============================================================
//  helpers
// ============================================================
function std(color, o = {}) {
  return new THREE.MeshStandardMaterial({
    color, metalness: o.metal != null ? o.metal : 0.25, roughness: o.rough != null ? o.rough : 0.85,
    emissive: o.emissive != null ? o.emissive : 0x000000, emissiveIntensity: o.ei != null ? o.ei : 1,
    transparent: o.opacity != null, opacity: o.opacity != null ? o.opacity : 1,
  });
}
function neon(color, ei = 2.4) { return new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: color, emissiveIntensity: ei }); }
function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); if (x != null) m.position.set(x, y, z); return m; }
function cyl(rt, rb, h, mat, seg = 18) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); }
function place(mesh, x, y, z) { mesh.position.set(x, y, z); return mesh; }

function makeLabel(lines, opt = {}) {
  const pad = 24, lh = 64, fs = opt.fs || 46;
  const cv = document.createElement("canvas"); const ctx = cv.getContext("2d");
  ctx.font = `700 ${fs}px 'JetBrains Mono', monospace`;
  let w = 0; lines.forEach((l) => { w = Math.max(w, ctx.measureText(l).width); });
  cv.width = Math.ceil(w + pad * 2); cv.height = Math.ceil(lines.length * lh + pad * 2);
  const c2 = cv.getContext("2d"); c2.font = `700 ${fs}px 'JetBrains Mono', monospace`; c2.textBaseline = "middle";
  const col = opt.color || "#00f3ff";
  if (opt.box) { c2.strokeStyle = col; c2.lineWidth = 4; c2.strokeRect(6, 6, cv.width - 12, cv.height - 12); }
  c2.fillStyle = col; c2.shadowColor = col; c2.shadowBlur = 22;
  lines.forEach((l, i) => c2.fillText(l, pad, pad + lh * (i + 0.5)));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return { tex, ratio: cv.width / cv.height };
}
function labelPlane(lines, height, opt = {}) {
  const { tex, ratio } = makeLabel(lines, opt);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(height * ratio, height), mat);
}
const texLoader = new THREE.TextureLoader();
function screenMat(url) {
  const tex = texLoader.load(url); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return new THREE.MeshBasicMaterial({ map: tex, color: 0xc2c6d4 }); // tint < white so bloom never blows it out
}
function plant(x, baseY, z, scale = 1) {
  const g = new THREE.Group();
  g.add(place(cyl(0.28, 0.34, 0.5, std(C.metal, { metal: 0.5 })), 0, 0.25, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.4, 6), std(0x0a1a12, { emissive: C.cyan, ei: 0.4 }));
    blade.position.set(Math.cos(a) * 0.18, 1.0, Math.sin(a) * 0.18);
    blade.rotation.z = Math.cos(a) * 0.5; blade.rotation.x = Math.sin(a) * 0.5;
    g.add(blade);
  }
  g.position.set(x, baseY, z); g.scale.setScalar(scale); apt.add(g);
}

const apt = new THREE.Group();
scene.add(apt);
const interactiveObjects = [];

// register an emissive "screen" mesh as a clickable interactive object
function interactiveScreen(mesh, type, projectId) {
  mesh.userData.type = type; mesh.userData.projectId = projectId || ""; interactiveObjects.push(mesh); return mesh;
}

// ============================================================
//  room shell
// ============================================================
(function shell() {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 15), std(C.floor, { metal: 0.6, rough: 0.35 }));
  floor.rotation.x = -Math.PI / 2; apt.add(floor);
  const grid = new THREE.GridHelper(40, 60, C.magenta, C.cyan); grid.material.transparent = true; grid.material.opacity = 0.16; grid.position.y = 0.02; apt.add(grid);
  apt.add(box(40, 7.2, 0.3, std(C.wall, { rough: 0.95 }), 0, 3.6, -6.2));
  apt.add(box(0.3, 7.2, 13, std(C.wallHi, { rough: 0.95 }), -17, 3.6, 0));
  apt.add(box(40, 0.06, 0.06, neon(C.cyan, 2.0), 0, 0.16, -6.0));
  ZONE_X.forEach((x, i) => apt.add(box(0.12, 0.12, 9, neon(ZONE_GLOW[i], 2.6), x, 6.7, -1.2)));
  apt.add(box(40, 0.05, 0.05, neon(C.violet, 1.6), 0, 6.9, 2.4));
})();

// ---- monitor (desk screen) ----
function monitor(x, url, color, urlText, interactiveId) {
  apt.add(box(0.5, 0.5, 0.16, std(C.metal), x, 1.45, -5.0));
  apt.add(box(0.9, 0.06, 0.4, std(C.metal), x, 1.24, -5.0));
  apt.add(box(2.5, 1.5, 0.1, neon(color, 1.6), x, 2.45, -5.05));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.3), screenMat(url));
  screen.position.set(x, 2.45, -4.98);
  apt.add(screen);
  if (interactiveId) interactiveScreen(screen, "computer", interactiveId);
  const chip = labelPlane([urlText], 0.16, { color: color === C.magenta ? "#ff007f" : "#00f3ff", fs: 34 });
  chip.position.set(x, 1.62, -4.94); apt.add(chip);
}

// ============================================================
//  ZONE 0 — FOYER (Home)
// ============================================================
(function foyer() {
  const x = -13;
  apt.add(box(0.18, 4.6, 0.18, neon(C.cyan, 2.2), -16.85, 2.4, -1.4));
  apt.add(box(0.18, 4.6, 0.18, neon(C.cyan, 2.2), -16.85, 2.4, 1.4));
  apt.add(box(0.18, 0.18, 3.0, neon(C.cyan, 2.2), -16.85, 4.6, 0));
  apt.add(box(0.12, 4.4, 2.7, std(C.metal, { metal: 0.7, rough: 0.4 }), -16.95, 2.3, 0));
  apt.add(box(3.4, 0.04, 2.2, std(C.wood, { emissive: C.violet, ei: 0.25 }), x, 0.04, 3.2));
  apt.add(box(2.6, 3.2, 0.16, neon(C.cyan, 1.6), x, 3.4, -6.0));
  const portrait = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), screenMat("images/profile.png")); portrait.position.set(x, 3.4, -5.9); apt.add(portrait);
  const sign = labelPlane(["JV", "UNIT 01"], 1.5, { color: "#ff007f", box: true, fs: 60 }); sign.position.set(x + 3.2, 4.6, -5.7); apt.add(sign);
  apt.add(box(2.4, 0.12, 0.7, std(C.wood, { metal: 0.3 }), x, 1.0, -5.4));
  apt.add(box(0.1, 1.0, 0.1, std(C.metal), x - 1.0, 0.5, -5.4));
  apt.add(box(0.1, 1.0, 0.1, std(C.metal), x + 1.0, 0.5, -5.4));
  plant(x + 0.9, 1.06, -5.4, 0.7);
})();

// ============================================================
//  ZONE 1 — LOUNGE (About)
// ============================================================
(function lounge() {
  const x = -8;
  apt.add(box(4.2, 0.7, 1.6, std(C.fabric), x, 0.55, -4.6));
  apt.add(box(4.2, 1.1, 0.4, std(C.fabric), x, 1.1, -5.3));
  apt.add(box(0.4, 1.0, 1.6, std(C.fabric), x - 1.9, 0.95, -4.6));
  apt.add(box(0.4, 1.0, 1.6, std(C.fabric), x + 1.9, 0.95, -4.6));
  apt.add(box(4.2, 0.05, 0.05, neon(C.magenta, 2.0), x, 0.92, -3.85));
  apt.add(box(0.8, 0.6, 0.3, std(C.violet, { emissive: C.violet, ei: 0.4 }), x - 1.1, 1.0, -4.9));
  apt.add(box(0.8, 0.6, 0.3, std(C.cyan, { emissive: C.cyan, ei: 0.4 }), x + 1.1, 1.0, -4.9));
  // wall TV — clickable → About_OS overlay
  apt.add(box(5.0, 2.7, 0.18, neon(C.cyan, 1.4), x, 3.6, -6.0));
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), screenMat("images/profile.png")); tv.position.set(x, 3.6, -5.88); apt.add(tv);
  interactiveScreen(tv, "tv", "about");
  const tvTag = labelPlane(["// ABOUT"], 0.32, { color: "#00f3ff", fs: 40 }); tvTag.position.set(x - 1.6, 2.1, -5.85); apt.add(tvTag);
  apt.add(box(2.2, 0.08, 1.1, std(0x0a0c16, { metal: 0.4, rough: 0.2, opacity: 0.7 }), x, 0.6, -2.9));
  apt.add(box(2.2, 0.03, 0.03, neon(C.violet, 1.8), x, 0.56, -2.36));
  apt.add(box(0.08, 0.6, 0.08, std(C.metal), x - 0.95, 0.3, -2.9));
  apt.add(box(0.08, 0.6, 0.08, std(C.metal), x + 0.95, 0.3, -2.9));
  apt.add(place(cyl(0.04, 0.04, 2.6, std(C.metal)), x + 2.6, 1.3, -4.6));
  apt.add(place(cyl(0.22, 0.16, 0.4, neon(C.cyan, 3.0)), x + 2.6, 2.6, -4.6));
  plant(x - 2.7, 0, -4.8, 1.3);
})();

// ============================================================
//  ZONE 2 — STUDIO (Projects)
// ============================================================
(function studio() {
  const x = -2.5;
  apt.add(box(5.4, 0.12, 1.5, std(C.wood, { metal: 0.3, rough: 0.6 }), x, 1.15, -5.0));
  apt.add(box(0.12, 1.1, 1.4, std(C.metal), x - 2.5, 0.55, -5.0));
  apt.add(box(0.12, 1.1, 1.4, std(C.metal), x + 2.5, 0.55, -5.0));
  apt.add(box(5.4, 0.04, 0.04, neon(C.cyan, 1.8), x, 1.09, -4.28));
  monitor(x - 1.45, "images/proj-portfolio.webp", C.cyan, "jvoclarit.pages.dev", "showcase");
  monitor(x + 1.45, "images/proj-phishshield.webp", C.magenta, "phishshield.pages.dev", "showcase");
  apt.add(box(1.6, 0.05, 0.5, std(0x0a0c16, { emissive: C.violet, ei: 0.5 }), x, 1.24, -4.6));
  apt.add(box(1.1, 0.12, 1.1, std(C.fabric), x, 1.0, -3.4));
  apt.add(box(1.1, 1.2, 0.14, std(C.fabric), x, 1.6, -2.9));
  apt.add(place(cyl(0.06, 0.06, 1.0, std(C.metal), 12), x, 0.5, -3.4));
  apt.add(box(0.05, 0.05, 1.0, neon(C.cyan, 1.4), x, 1.65, -2.83));
  const sign = labelPlane(["PROJECTS", "// 02"], 0.8, { color: "#a855f7", box: true, fs: 54 }); sign.position.set(x + 3.6, 4.2, -5.7); apt.add(sign);
  apt.add(box(2.6, 0.1, 0.5, std(C.wood), x - 3.2, 3.4, -5.7));
  apt.add(box(0.4, 0.7, 0.3, neon(C.cyan, 1.6), x - 3.8, 3.8, -5.7));
  apt.add(box(0.4, 0.5, 0.3, neon(C.magenta, 1.6), x - 3.1, 3.7, -5.7));
  apt.add(box(0.4, 0.9, 0.3, neon(C.violet, 1.6), x - 2.4, 3.9, -5.7));
})();

// ============================================================
//  ZONE 3 — GALLERY (Skills)
// ============================================================
(function gallery() {
  const x = 3.5;
  const skills = [["THREE.JS","WEBGL"],["JAVASCRIPT","/ TS"],["REACT","NEXT.JS"],["GSAP","CSS MOTION"],["HTML5","CSS3"],["UI / UX","FIGMA"]];
  const cols = ["#00f3ff","#ff007f","#a855f7","#00f3ff","#ff007f","#a855f7"];
  skills.forEach((s, i) => {
    const cx = x - 3.0 + (i % 3) * 3.0; const cy = 4.4 - Math.floor(i / 3) * 1.9;
    const plaque = labelPlane(s, 0.62, { color: cols[i], box: true, fs: 40 }); plaque.position.set(cx, cy, -5.95); apt.add(plaque);
    apt.add(box(2.6, 1.5, 0.1, std(C.wallHi, { emissive: 0x05060a }), cx, cy, -6.02));
  });
  const head = labelPlane(["SKILLS & STACK"], 0.4, { color: "#dfe4ff", fs: 44 }); head.position.set(x, 1.7, -5.95); apt.add(head);
  apt.add(box(7.0, 1.0, 0.7, std(C.wood, { metal: 0.3 }), x, 0.55, -5.5));
  apt.add(box(7.0, 0.04, 0.04, neon(C.violet, 1.6), x, 1.07, -5.14));
  plant(x - 3.6, 1.05, -5.5, 0.8); plant(x + 3.6, 1.05, -5.5, 0.8);
})();

// ============================================================
//  ZONE 4 — TERRACE (Connect) + window + neon city
// ============================================================
(function terrace() {
  const x = 12;
  apt.add(box(0.2, 7.2, 13, new THREE.MeshStandardMaterial({ color: 0x081018, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.18, emissive: C.cyan, emissiveIntensity: 0.06 }), 17, 3.6, 0));
  for (let i = -1; i <= 1; i++) apt.add(box(0.18, 7.0, 0.18, neon(C.cyan, 1.2), 17, 3.6, i * 4));
  apt.add(box(0.18, 0.18, 13, neon(C.cyan, 1.2), 17, 0.5, 0));
  apt.add(box(0.18, 0.18, 13, neon(C.cyan, 1.2), 17, 6.7, 0));
  const cityCols = [C.cyan, C.magenta, C.violet];
  for (let i = 0; i < 46; i++) {
    const h = 4 + Math.random() * 22; const w = 1.2 + Math.random() * 2.4;
    const bx = 22 + Math.random() * 26; const bz = -16 + Math.random() * 32; const col = cityCols[(Math.random() * 3) | 0];
    apt.add(box(w, h, w, std(0x05060c, { emissive: col, ei: 0.5 + Math.random() * 0.7 }), bx, h / 2 - 2, bz));
  }
  const sun = new THREE.Mesh(new THREE.CircleGeometry(6, 40), neon(C.magenta, 1.6)); sun.position.set(40, 9, -2); apt.add(sun);
  apt.add(place(cyl(0.7, 0.7, 0.08, std(0x0a0c16, { metal: 0.4, rough: 0.2 })), x + 1.6, 1.1, 1.5));
  apt.add(place(cyl(0.05, 0.05, 1.1, std(C.metal)), x + 1.6, 0.55, 1.5));
  apt.add(place(cyl(0.55, 0.4, 0.06, neon(C.cyan, 1.0)), x + 1.6, 1.16, 1.5));
  apt.add(place(cyl(0.4, 0.4, 0.5, std(C.fabric)), x + 0.2, 0.5, 1.6));
  apt.add(place(cyl(0.4, 0.4, 0.5, std(C.fabric)), x + 3.0, 0.5, 1.6));
  const sign = labelPlane(["LET'S", "CONNECT"], 1.3, { color: "#00f3ff", box: true, fs: 58 }); sign.position.set(x - 2.5, 4.6, -5.6); apt.add(sign);
  plant(x - 4.0, 0, -5.2, 1.4);
})();

// ============================================================
//  bloom (desktop only) — gentle, neon cores only
// ============================================================
async function initBloom() {
  if (isTouch || window.innerWidth < 820 || reduceMotion) return;
  try {
    const { EffectComposer } = await import("three/addons/postprocessing/EffectComposer.js");
    const { RenderPass } = await import("three/addons/postprocessing/RenderPass.js");
    const { UnrealBloomPass } = await import("three/addons/postprocessing/UnrealBloomPass.js");
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.5, 0.78);
    composer.addPass(bloomPass); composer.setSize(window.innerWidth, window.innerHeight); useBloom = true;
  } catch (e) { useBloom = false; }
}

// ============================================================
//  camera path
// ============================================================
const EYE = [
  new THREE.Vector3(-15.0, 2.7, 5.0), new THREE.Vector3(-9.0, 2.1, 4.6),
  new THREE.Vector3(-3.0, 1.7, 3.3), new THREE.Vector3(3.0, 2.0, 4.4), new THREE.Vector3(11.5, 2.3, 4.0),
];
const LOOK = [
  new THREE.Vector3(-13.0, 1.5, -2.0), new THREE.Vector3(-8.0, 1.3, -5.0),
  new THREE.Vector3(-2.5, 1.35, -5.0), new THREE.Vector3(4.0, 1.5, -5.0), new THREE.Vector3(15.5, 1.7, -2.5),
];
const eyeCurve = new THREE.CatmullRomCurve3(EYE, false, "catmullrom", 0.5);
const lookCurve = new THREE.CatmullRomCurve3(LOOK, false, "catmullrom", 0.5);
const N = EYE.length;

let smoothP = 0;
const eyeV = new THREE.Vector3(), lookV = new THREE.Vector3();
const finalEye = new THREE.Vector3(), finalLook = new THREE.Vector3();
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

// zoom-to-screen state
let zoomTarget = 0, zoomProgress = 0;
const zoomPos = new THREE.Vector3(), zoomLook = new THREE.Vector3();

function scrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
}
if (!isTouch && !reduceMotion) {
  window.addEventListener("mousemove", (e) => { mouse.tx = e.clientX / window.innerWidth - 0.5; mouse.ty = e.clientY / window.innerHeight - 0.5; });
}

// ============================================================
//  HUD wiring
// ============================================================
const hud = {
  coords: document.getElementById("hud-coords"), zoneIdx: document.getElementById("hud-zone-idx"),
  zoneName: document.getElementById("hud-zone-name"), rail: document.getElementById("hud-rail"),
  dots: Array.prototype.slice.call(document.querySelectorAll(".map__dot")),
};
const ZONE_NAMES = ["FOYER", "LOUNGE", "STUDIO", "GALLERY", "TERRACE"];
let activeZone = -1;
function setActiveZone(i) {
  if (i === activeZone) return; activeZone = i;
  if (hud.zoneIdx) hud.zoneIdx.textContent = "0" + (i + 1) + " / 0" + N;
  if (hud.zoneName) {
    hud.zoneName.textContent = ZONE_NAMES[i];
    if (!reduceMotion) { hud.zoneName.classList.remove("is-glitch"); void hud.zoneName.offsetWidth; hud.zoneName.classList.add("is-glitch"); }
  }
  hud.dots.forEach((d, j) => d.classList.toggle("is-on", j === i));
}

const panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-active"); const i = panels.indexOf(e.target); if (i >= 0) setActiveZone(i); }
      else e.target.classList.remove("is-active");
    });
  }, { threshold: 0.5 });
  panels.forEach((p) => io.observe(p));
} else { panels.forEach((p) => p.classList.add("is-active")); setActiveZone(0); }

// ============================================================
//  overlays (zoom into a screen)
// ============================================================
function openOverlay(id) {
  const el = document.getElementById(id === "about" ? "about-overlay" : "project-overlay");
  if (el) el.classList.add("is-open");
}
function zoomOut() {
  zoomTarget = 0;
  document.getElementById("project-overlay").classList.remove("is-open");
  document.getElementById("about-overlay").classList.remove("is-open");
}
function zoomToScreen(mesh) {
  const p = mesh.position;
  zoomPos.set(p.x, p.y, p.z + 2.4); zoomLook.set(p.x, p.y, p.z); zoomTarget = 1;
  openOverlay(mesh.userData.type === "tv" ? "about" : "showcase");
}

const projClose = document.getElementById("project-overlay-close");
const projBack = document.getElementById("project-overlay-backdrop");
if (projClose) projClose.addEventListener("click", zoomOut);
if (projBack) projBack.addEventListener("click", zoomOut);
const aboutClose = document.getElementById("about-overlay-close");
const aboutBack = document.getElementById("about-overlay-backdrop");
if (aboutClose) aboutClose.addEventListener("click", zoomOut);
if (aboutBack) aboutBack.addEventListener("click", zoomOut);

const showcaseItems = document.querySelectorAll(".showcase-item");
showcaseItems.forEach((item) => {
  const header = item.querySelector(".showcase-item__header");
  if (header) header.addEventListener("click", () => { showcaseItems.forEach((i) => i.classList.remove("is-expanded")); item.classList.add("is-expanded"); });
});

window.addEventListener("keydown", (e) => { if (e.key === "Escape" && zoomTarget === 1) zoomOut(); });
window.addEventListener("wheel", () => { if (zoomTarget === 1) zoomOut(); }, { passive: true });
window.addEventListener("touchmove", () => { if (zoomTarget === 1) zoomOut(); }, { passive: true });

// raycast click → zoom into a screen
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
window.addEventListener("click", (e) => {
  if (e.target.closest(".zone-card") || e.target.closest(".project-overlay") || e.target.closest(".hud")) return;
  ndc.x = (e.clientX / window.innerWidth) * 2 - 1; ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(interactiveObjects);
  if (hits.length > 0) zoomToScreen(hits[0].object);
  else if (zoomTarget === 1) zoomOut();
});

// minimap dots → jump to room
hud.dots.forEach((d, i) => {
  d.addEventListener("click", () => { zoomOut(); if (panels[i]) panels[i].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); });
});

// ============================================================
//  render loop
// ============================================================
let frame = 0;
function tick() {
  requestAnimationFrame(tick); frame++;

  // reduced motion → jump to the discrete active zone; else scrub with scroll
  const targetP = reduceMotion ? (Math.max(activeZone, 0) / (N - 1)) : scrollProgress();
  smoothP += (targetP - smoothP) * (reduceMotion ? 1 : 0.075);
  const p = Math.min(Math.max(smoothP, 0), 1);

  eyeCurve.getPoint(p, eyeV); lookCurve.getPoint(p, lookV);

  let swayX = 0, swayY = 0;
  if (!reduceMotion) {
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    const t = performance.now() * 0.001;
    swayX = Math.sin(t * 0.4) * 0.12 + mouse.x * 0.9; swayY = Math.cos(t * 0.32) * 0.07 - mouse.y * 0.5;
  }

  // blend toward a zoomed screen when active
  zoomProgress += (zoomTarget - zoomProgress) * (reduceMotion ? 1 : 0.08);
  finalEye.set(eyeV.x + swayX, eyeV.y + swayY, eyeV.z).lerp(zoomPos, zoomProgress);
  finalLook.copy(lookV); finalLook.x += mouse.x * 1.2; finalLook.y -= mouse.y * 0.6; finalLook.lerp(zoomLook, zoomProgress);

  camera.position.copy(finalEye); camera.lookAt(finalLook);

  if (frame % 3 === 0) {
    if (hud.coords) hud.coords.textContent = "X " + camera.position.x.toFixed(2).padStart(6) + "  Y " + camera.position.y.toFixed(2) + "  Z " + camera.position.z.toFixed(2);
    if (hud.rail) hud.rail.style.transform = "scaleY(" + p + ")";
  }
  if (activeZone < 0) setActiveZone(Math.round(p * (N - 1)));

  if (useBloom && composer) composer.render(); else renderer.render(scene, camera);
}

// ============================================================
//  resize + boot
// ============================================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
});

initBloom().finally(() => {
  tick();
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("is-ready")));
});
