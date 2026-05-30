// ============================================================
//  WebGL background — a single pinned particle object that
//  MORPHS between shapes as you scroll, plus an ambient field
//  of drifting binary 0 / 1 glyphs.
//
//  Shape journey (per section):
//    Hero        -> Sphere
//    About       -> Torus knot     (text left,  object right)
//    Work        -> Wireframe cube  (object dim behind list)
//    Philosophy  -> Scattered deep-space  (text right, object left)
//    Activity    -> Icosahedron gem (object dim behind cards)
//    CTA         -> Sphere
//
//  Canvas is fixed (sticky) + aria-hidden + pointer-events:none.
// ============================================================
import * as THREE from "three";

const canvas = document.getElementById("scene");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 767px)").matches;

const PALETTE = [0x6d5dfc, 0x818cf8, 0x3b82f6, 0xa855f7, 0xc4b5fd, 0xffffff];

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 14;

const N = isMobile ? 1600 : 2800; // points in the morphing object

// ------------------------------------------------------------
//  shape generators — each returns a Float32Array(N*3)
// ------------------------------------------------------------
function makeSphere(R) {
  const a = new Float32Array(N * 3);
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = phi * i;
    a[i * 3] = Math.cos(th) * r * R;
    a[i * 3 + 1] = y * R;
    a[i * 3 + 2] = Math.sin(th) * r * R;
  }
  return a;
}

function makeTorusKnot(p, q, scale) {
  const a = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const cs = 2 + Math.cos(q * t);
    let x = cs * Math.cos(p * t);
    let y = cs * Math.sin(p * t);
    let z = Math.sin(q * t) * 2;
    // small tube scatter for volume
    x += (Math.random() - 0.5) * 0.5;
    y += (Math.random() - 0.5) * 0.5;
    z += (Math.random() - 0.5) * 0.5;
    a[i * 3] = x * scale; a[i * 3 + 1] = y * scale; a[i * 3 + 2] = z * scale;
  }
  return a;
}

function makeCube(s) {
  const v = [
    [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
    [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s],
  ];
  const e = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const a = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const ed = e[(Math.random() * e.length) | 0];
    const p0 = v[ed[0]], p1 = v[ed[1]], t = Math.random();
    a[i * 3]     = p0[0] + (p1[0] - p0[0]) * t + (Math.random() - 0.5) * 0.12;
    a[i * 3 + 1] = p0[1] + (p1[1] - p0[1]) * t + (Math.random() - 0.5) * 0.12;
    a[i * 3 + 2] = p0[2] + (p1[2] - p0[2]) * t + (Math.random() - 0.5) * 0.12;
  }
  return a;
}

// scattered, deep — wide spread, biased far into -z so it reads as distant space
function makeScatter() {
  const a = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    a[i * 3]     = (Math.random() - 0.5) * 26;
    a[i * 3 + 1] = (Math.random() - 0.5) * 17;
    a[i * 3 + 2] = -6 - Math.pow(Math.random(), 0.55) * 32; // mostly far away
  }
  return a;
}

// faceted gem — random points across icosahedron faces
function makeIcosa(R) {
  const g = new THREE.IcosahedronGeometry(R, 0);
  const pos = g.attributes.position;
  const tris = pos.count / 3;
  const a = new Float32Array(N * 3);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const tri = (Math.random() * tris) | 0;
    A.fromBufferAttribute(pos, tri * 3);
    B.fromBufferAttribute(pos, tri * 3 + 1);
    C.fromBufferAttribute(pos, tri * 3 + 2);
    let u = Math.random(), v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    a[i * 3]     = A.x + (B.x - A.x) * u + (C.x - A.x) * v;
    a[i * 3 + 1] = A.y + (B.y - A.y) * u + (C.y - A.y) * v;
    a[i * 3 + 2] = A.z + (B.z - A.z) * u + (C.z - A.z) * v;
  }
  g.dispose();
  return a;
}

// one entry per stage (same order as the section list below)
const shapes = [
  makeSphere(4.6),       // hero
  makeTorusKnot(2, 3, 1.5), // about
  makeCube(3.4),         // work
  makeScatter(),         // philosophy  (scattered / far)
  makeIcosa(4.9),        // activity
  makeSphere(4.6),       // cta
];
const stageOpacity = [0.95, 0.95, 0.42, 0.9, 0.5, 0.95];
const stageX       = [0,    3.4,  -2.6, -3.4, 2.6, 0];

// ------------------------------------------------------------
//  geometry + material
// ------------------------------------------------------------
const geo = new THREE.BufferGeometry();
const cur = new Float32Array(shapes[0]); // start at sphere
const colors = new Float32Array(N * 3);
const cBlue = new THREE.Color(0x3b82f6), cIndigo = new THREE.Color(0x6d5dfc), cViolet = new THREE.Color(0xa855f7);
const tmp = new THREE.Color();
for (let i = 0; i < N; i++) {
  const c = i / N;                       // stable gradient across the cloud
  if (c < 0.5) tmp.copy(cBlue).lerp(cIndigo, c * 2);
  else tmp.copy(cIndigo).lerp(cViolet, (c - 0.5) * 2);
  colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
}
geo.setAttribute("position", new THREE.BufferAttribute(cur, 3));
geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

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

const mat = new THREE.PointsMaterial({
  size: 0.09, map: dotTexture(), vertexColors: true,
  transparent: true, opacity: 0.95, depthWrite: false,
  blending: THREE.AdditiveBlending, sizeAttenuation: true,
});
const points = new THREE.Points(geo, mat);
scene.add(points);

// ------------------------------------------------------------
//  binary 0 / 1 field
// ------------------------------------------------------------
function glyphTexture(char, hex) {
  const s = 128;
  const c = document.createElement("canvas"); c.width = c.height = s;
  const x = c.getContext("2d");
  x.font = "700 92px 'Inter', 'Courier New', monospace";
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillStyle = "#" + hex.toString(16).padStart(6, "0");
  x.fillText(char, s / 2, s / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const BIN = isMobile ? 40 : 90;
const binGroup = new THREE.Group();
const bits = [];
for (let i = 0; i < BIN; i++) {
  const char = Math.random() > 0.5 ? "1" : "0";
  const hex = PALETTE[(Math.random() * PALETTE.length) | 0];
  const m = new THREE.SpriteMaterial({ map: glyphTexture(char, hex), transparent: true, opacity: 0.16 + Math.random() * 0.36, depthWrite: false });
  const sp = new THREE.Sprite(m);
  sp.position.set((Math.random() - 0.5) * 34, (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 18);
  const sc = 0.4 + Math.random() * 0.9; sp.scale.set(sc, sc, sc);
  sp.userData = { vy: 0.004 + Math.random() * 0.012, vx: (Math.random() - 0.5) * 0.006, spin: (Math.random() - 0.5) * 0.01 };
  binGroup.add(sp); bits.push(sp);
}
scene.add(binGroup);

// ------------------------------------------------------------
//  scroll -> stage mapping (anchored to section centers)
// ------------------------------------------------------------
const STAGE_IDS = ["hero", "about", "work", "philosophy", "activity", "contact"];
let anchors = [];
function computeAnchors() {
  const vh = window.innerHeight;
  anchors = STAGE_IDS.map(function (id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return r.top + window.scrollY + r.height / 2 - vh / 2;
  });
}
function stageFloat(y) {
  if (!anchors.length) return 0;
  if (y <= anchors[0]) return 0;
  for (let k = 1; k < anchors.length; k++) {
    if (y < anchors[k]) {
      const span = Math.max(1, anchors[k] - anchors[k - 1]);
      return (k - 1) + (y - anchors[k - 1]) / span;
    }
  }
  return anchors.length - 1;
}
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------
//  interaction
// ------------------------------------------------------------
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener("pointermove", (e) => {
  mouse.tx = e.clientX / window.innerWidth - 0.5;
  mouse.ty = e.clientY / window.innerHeight - 0.5;
}, { passive: true });

let scrollY = window.scrollY;
window.addEventListener("scroll", () => { scrollY = window.scrollY; }, { passive: true });

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  computeAnchors();
}
window.addEventListener("resize", resize);
window.addEventListener("load", computeAnchors);
computeAnchors();

// ------------------------------------------------------------
//  render
// ------------------------------------------------------------
const clock = new THREE.Clock();
let curX = 0, curOp = 0.95;

function draw(staticFrame) {
  const t = clock.getElapsedTime();
  const sf = stageFloat(scrollY);
  const i = Math.max(0, Math.min(shapes.length - 2, Math.floor(sf)));
  const tt = smooth(Math.max(0, Math.min(1, sf - i)));
  const A = shapes[i], B = shapes[i + 1];

  // morph + gentle living wobble (skip wobble on static frame)
  const wob = staticFrame ? 0 : 0.06;
  for (let k = 0; k < N; k++) {
    const x = lerp(A[k * 3], B[k * 3], tt);
    const y = lerp(A[k * 3 + 1], B[k * 3 + 1], tt);
    const z = lerp(A[k * 3 + 2], B[k * 3 + 2], tt);
    if (wob) {
      const n = Math.sin(t * 0.5 + x) * Math.cos(t * 0.4 + y) * 0.5;
      cur[k * 3] = x + n * wob;
      cur[k * 3 + 1] = y + n * wob;
      cur[k * 3 + 2] = z + n * wob;
    } else {
      cur[k * 3] = x; cur[k * 3 + 1] = y; cur[k * 3 + 2] = z;
    }
  }
  geo.attributes.position.needsUpdate = true;

  // per-stage object position + opacity (eased toward target)
  const tgtX = lerp(stageX[i], stageX[i + 1], tt);
  const tgtOp = lerp(stageOpacity[i], stageOpacity[i + 1], tt);
  curX += (tgtX - curX) * (staticFrame ? 1 : 0.08);
  curOp += (tgtOp - curOp) * (staticFrame ? 1 : 0.08);
  points.position.x = curX;
  mat.opacity = curOp;
  points.rotation.y = t * 0.06 + mouse.x * 0.4;
  points.rotation.x = mouse.y * 0.25;

  // binary field drift
  if (!staticFrame) {
    for (const sp of bits) {
      sp.position.y += sp.userData.vy;
      sp.position.x += sp.userData.vx;
      sp.material.rotation += sp.userData.spin;
      if (sp.position.y > 14) sp.position.y = -14;
      if (sp.position.x > 18) sp.position.x = -18;
      else if (sp.position.x < -18) sp.position.x = 18;
    }
  }
  binGroup.rotation.y = mouse.x * 0.15;
  binGroup.position.y = scrollY * 0.0016;

  mouse.x += (mouse.tx - mouse.x) * 0.05;
  mouse.y += (mouse.ty - mouse.y) * 0.05;
  camera.position.x = mouse.x * 1.4;
  camera.position.y = -mouse.y * 1.0;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

if (reduceMotion) {
  computeAnchors();
  draw(true); // single static frame at current scroll
  // keep the shape in sync if the user scrolls, but without continuous animation
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { draw(true); ticking = false; });
  }, { passive: true });
} else {
  renderer.setAnimationLoop(() => draw(false));
}
