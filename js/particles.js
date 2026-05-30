// ============================================================
//  WebGL background — morphing particle blob + drifting binary field
//  Built with Three.js (ES module via importmap).
//  The floating field is made of 0 / 1 glyphs (not triangles).
//  Fully decorative: canvas is aria-hidden + pointer-events:none.
// ============================================================
import * as THREE from "three";

const canvas = document.getElementById("scene");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 767px)").matches;

// ---- palette (matches the dala particle colours) ----
const PALETTE = [0x8052ff, 0xa98bff, 0xffb829, 0x189b81, 0x2867b2, 0xffffff];

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 14;

// ------------------------------------------------------------
//  1. HERO BLOB — fibonacci-sphere of points that morphs
// ------------------------------------------------------------
function fibonacciSphere(count, radius) {
  const pts = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    pts.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(radius));
  }
  return pts;
}

const BLOB_COUNT = isMobile ? 1400 : 2600;
const BLOB_RADIUS = 4.6;
const basePts = fibonacciSphere(BLOB_COUNT, BLOB_RADIUS);

const blobGeo = new THREE.BufferGeometry();
const positions = new Float32Array(BLOB_COUNT * 3);
const colors = new Float32Array(BLOB_COUNT * 3);
const cTeal = new THREE.Color(0x189b81);
const cPurple = new THREE.Color(0x8052ff);
const cAmber = new THREE.Color(0xffb829);
const tmp = new THREE.Color();

for (let i = 0; i < BLOB_COUNT; i++) {
  const p = basePts[i];
  positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z;
  // vertical gradient teal -> purple -> amber
  const t = (p.y / BLOB_RADIUS + 1) / 2;
  if (t < 0.5) tmp.copy(cTeal).lerp(cPurple, t * 2);
  else tmp.copy(cPurple).lerp(cAmber, (t - 0.5) * 2);
  colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
}
blobGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
blobGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

// soft round sprite for each point
function dotTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,.7)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.beginPath(); x.arc(32, 32, 32, 0, Math.PI * 2); x.fill();
  return new THREE.CanvasTexture(c);
}

const blobMat = new THREE.PointsMaterial({
  size: 0.075, map: dotTexture(), vertexColors: true,
  transparent: true, opacity: 0.95, depthWrite: false,
  blending: THREE.AdditiveBlending, sizeAttenuation: true,
});
const blob = new THREE.Points(blobGeo, blobMat);
scene.add(blob);

// ------------------------------------------------------------
//  2. BINARY FIELD — drifting 0 / 1 glyphs
// ------------------------------------------------------------
function glyphTexture(char, hex) {
  const s = 128;
  const c = document.createElement("canvas"); c.width = c.height = s;
  const x = c.getContext("2d");
  x.clearRect(0, 0, s, s);
  x.font = "700 92px 'Inter', 'Courier New', monospace";
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillStyle = "#" + hex.toString(16).padStart(6, "0");
  x.fillText(char, s / 2, s / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const BIN_COUNT = isMobile ? 40 : 90;
const binGroup = new THREE.Group();
const bits = [];
for (let i = 0; i < BIN_COUNT; i++) {
  const char = Math.random() > 0.5 ? "1" : "0";
  const hex = PALETTE[(Math.random() * PALETTE.length) | 0];
  const mat = new THREE.SpriteMaterial({
    map: glyphTexture(char, hex), transparent: true,
    opacity: 0.18 + Math.random() * 0.4, depthWrite: false,
  });
  const sp = new THREE.Sprite(mat);
  sp.position.set((Math.random() - 0.5) * 34, (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 18);
  const sc = 0.4 + Math.random() * 0.9;
  sp.scale.set(sc, sc, sc);
  sp.userData = {
    vy: 0.004 + Math.random() * 0.012,
    vx: (Math.random() - 0.5) * 0.006,
    spin: (Math.random() - 0.5) * 0.01,
  };
  binGroup.add(sp); bits.push(sp);
}
scene.add(binGroup);

// ------------------------------------------------------------
//  interaction state
// ------------------------------------------------------------
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener("pointermove", (e) => {
  mouse.tx = (e.clientX / window.innerWidth - 0.5);
  mouse.ty = (e.clientY / window.innerHeight - 0.5);
}, { passive: true });

let scrollY = window.scrollY;
window.addEventListener("scroll", () => { scrollY = window.scrollY; }, { passive: true });

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resize);

// ------------------------------------------------------------
//  render
// ------------------------------------------------------------
const clock = new THREE.Clock();

function renderFrame() {
  const t = clock.getElapsedTime();
  const vh = window.innerHeight || 1;
  const heroProgress = Math.min(scrollY / vh, 1); // 0 at top, 1 after one screen

  // morph the blob
  const pos = blobGeo.attributes.position.array;
  for (let i = 0; i < BLOB_COUNT; i++) {
    const b = basePts[i];
    const n = Math.sin(t * 0.5 + b.x * 1.4) * Math.cos(t * 0.4 + b.y * 1.4) * Math.sin(t * 0.35 + b.z * 1.4);
    const k = 1 + n * 0.12;
    pos[i * 3] = b.x * k; pos[i * 3 + 1] = b.y * k; pos[i * 3 + 2] = b.z * k;
  }
  blobGeo.attributes.position.needsUpdate = true;

  blob.rotation.y = t * 0.08 + mouse.x * 0.4;
  blob.rotation.x = mouse.y * 0.3;
  blob.position.y = heroProgress * 6;            // drift up as you scroll past hero
  blobMat.opacity = 0.95 * (1 - heroProgress * 0.9);

  // drift the binary glyphs (wrap around)
  for (const sp of bits) {
    sp.position.y += sp.userData.vy;
    sp.position.x += sp.userData.vx;
    sp.material.rotation += sp.userData.spin;
    if (sp.position.y > 14) sp.position.y = -14;
    if (sp.position.x > 18) sp.position.x = -18;
    else if (sp.position.x < -18) sp.position.x = 18;
  }
  binGroup.rotation.y = mouse.x * 0.15;
  binGroup.position.y = scrollY * 0.0016;        // gentle parallax

  // ease camera toward mouse
  mouse.x += (mouse.tx - mouse.x) * 0.05;
  mouse.y += (mouse.ty - mouse.y) * 0.05;
  camera.position.x = mouse.x * 1.6;
  camera.position.y = -mouse.y * 1.2;
  camera.lookAt(0, blob.position.y * 0.4, 0);

  renderer.render(scene, camera);
}

if (reduceMotion) {
  // static single frame — no animation loop
  renderer.render(scene, camera);
} else {
  renderer.setAnimationLoop(renderFrame);
}
