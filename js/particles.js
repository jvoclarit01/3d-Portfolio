// ============================================================
//  WebGL background — a cloud of small 3D CUBES (each a real box
//  with a 0 or 1 on its faces). The cubes are STILL and UNIFORM
//  (all share one orientation + size); they do not spin. The
//  cloud morphs between formations as you scroll:
//
//    Hero                 -> Cube
//    About                -> Sphere
//    Work .. Tools&Stack  -> Scatter (spread across the screen)
//    Contact              -> Sphere
//
//  Cursor hover gives the cubes a springy, bouncy push (then
//  they settle back to perfectly still).
//  Two InstancedMesh (one per digit) => two draw calls.
//  Canvas is fixed + aria-hidden + pointer-events:none.
// ============================================================
import * as THREE from "three";

const canvas = document.getElementById("scene");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 767px)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const FOV = 60;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 14;

scene.add(new THREE.AmbientLight(0xffffff, 0.72));
const dir = new THREE.DirectionalLight(0xffffff, 0.95); dir.position.set(3, 5, 6); scene.add(dir);

const N = isMobile ? 420 : 760;
const SCALE = 0.34;                                // uniform cube size
// one shared orientation for every cube -> uniform, still, but still reads as 3D
const SHARED_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.45, 0.6, 0));

// three-colour gradient mapped vertically across the cloud (green -> blue -> violet)
const GRAD_A = new THREE.Color(0x10b981);  // green
const GRAD_B = new THREE.Color(0x3b82f6);  // blue
const GRAD_C = new THREE.Color(0xa855f7);  // violet
const GRAD_H = 5.0;                         // half-height the gradient spans
const gradTmp = new THREE.Color();
function gradAt(y) {
  let t = (y + GRAD_H) / (2 * GRAD_H);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  if (t < 0.5) gradTmp.copy(GRAD_A).lerp(GRAD_B, t * 2);
  else gradTmp.copy(GRAD_B).lerp(GRAD_C, (t - 0.5) * 2);
  return gradTmp;
}

// ------------------------------------------------------------
//  shape generators -> Float32Array(N*3)
// ------------------------------------------------------------
function spherePt() {
  const u = Math.random(), v = Math.random();
  const th = Math.acos(2 * u - 1), ph = 2 * Math.PI * v;
  return [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
}
function sCube(s) {
  const side = Math.ceil(Math.cbrt(N)), total = side * side * side;
  const idx = []; for (let i = 0; i < total; i++) idx.push(i);
  for (let i = total - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  const a = new Float32Array(N * 3), step = (2 * s) / (side - 1);
  for (let n = 0; n < N; n++) {
    const id = idx[n], ix = id % side, iy = ((id / side) | 0) % side, iz = (id / (side * side)) | 0;
    a[n * 3] = -s + ix * step;
    a[n * 3 + 1] = -s + iy * step;
    a[n * 3 + 2] = -s + iz * step;
  }
  return a;
}
function sSphere(R) {
  const a = new Float32Array(N * 3), phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = phi * i;
    a[i * 3] = Math.cos(th) * r * R; a[i * 3 + 1] = y * R; a[i * 3 + 2] = Math.sin(th) * r * R;
  }
  return a;
}
// spread across the whole screen, biased far into -z for depth
function sScatter() {
  const a = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    a[i * 3] = (Math.random() - 0.5) * 38;
    a[i * 3 + 1] = (Math.random() - 0.5) * 23;
    a[i * 3 + 2] = 2 - Math.pow(Math.random(), 0.7) * 22;
  }
  return a;
}

const cubeArr = sCube(3.3);
const sphereArr = sSphere(4.5);
const scatterArr = sScatter();
// hero, about, work, philosophy, activity, stack, contact
const SH = [cubeArr, sphereArr, scatterArr, scatterArr, scatterArr, scatterArr, sphereArr];

// ------------------------------------------------------------
//  per-cube data (no spin)
// ------------------------------------------------------------
const zeros = [], ones = [];
for (let k = 0; k < N; k++) {
  const p = SH.map((arr) => new THREE.Vector3(arr[k * 3], arr[k * 3 + 1], arr[k * 3 + 2]));
  const cube = { p: p, disp: new THREE.Vector3(), vel: new THREE.Vector3() };
  (Math.random() > 0.5 ? ones : zeros).push(cube);
}

function digitTexture(ch) {
  const s = 128, c = document.createElement("canvas"); c.width = c.height = s;
  const x = c.getContext("2d");
  x.fillStyle = "#3a3a54"; x.fillRect(0, 0, s, s);
  x.strokeStyle = "rgba(0,0,0,0.55)"; x.lineWidth = 9; x.strokeRect(5, 5, s - 10, s - 10);
  x.fillStyle = "#ffffff"; x.font = "700 86px 'Inter','Courier New',monospace";
  x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(ch, s / 2, s / 2 + 4);
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); return tex;
}
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const dummy = new THREE.Object3D();
function buildMesh(arr, ch) {
  const mat = new THREE.MeshLambertMaterial({ map: digitTexture(ch) });
  const mesh = new THREE.InstancedMesh(boxGeo, mat, arr.length);
  for (let i = 0; i < arr.length; i++) {
    const cu = arr[i];
    dummy.position.copy(cu.p[0]); dummy.quaternion.copy(SHARED_QUAT); dummy.scale.setScalar(SCALE);
    dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, gradAt(cu.p[0].y));
  }
  mesh.instanceColor.needsUpdate = true; mesh.frustumCulled = false;
  return { mesh, arr, mat };
}
const cubeGroup = new THREE.Group();
const mZero = buildMesh(zeros, "0"), mOne = buildMesh(ones, "1");
cubeGroup.add(mZero.mesh, mOne.mesh);
scene.add(cubeGroup);

// ------------------------------------------------------------
//  scroll -> stage mapping
// ------------------------------------------------------------
const STAGE_IDS  = ["hero", "about", "work", "philosophy", "activity", "stack", "contact"];
const stageX      = [4.5, -4.5, 0.0, 0.0, 0.0, 0.0, 0.0]; // scatter + contact centered
const stageBright = [1.0, 1.0, 0.55, 0.72, 0.55, 0.55, 1.0];
let anchors = [];
function computeAnchors() {
  const vh = window.innerHeight;
  anchors = STAGE_IDS.map(function (id) {
    const el = document.getElementById(id); if (!el) return 0;
    const r = el.getBoundingClientRect();
    return r.top + window.scrollY + r.height / 2 - vh / 2;
  });
}
function targetStage(y) {
  if (!anchors.length) return 0;
  if (y <= anchors[0]) return 0;
  for (let k = 1; k < anchors.length; k++) {
    if (y < anchors[k]) { const span = Math.max(1, anchors[k] - anchors[k - 1]); return (k - 1) + (y - anchors[k - 1]) / span; }
  }
  return anchors.length - 1;
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const mouse = { nx: 0, ny: 0, tnx: 0, tny: 0 };
window.addEventListener("pointermove", (e) => {
  mouse.tnx = e.clientX / window.innerWidth * 2 - 1;
  mouse.tny = -(e.clientY / window.innerHeight * 2 - 1);
}, { passive: true });
let scrollY = window.scrollY;
window.addEventListener("scroll", () => { scrollY = window.scrollY; }, { passive: true });
function resize() {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); computeAnchors();
}
window.addEventListener("resize", resize);
window.addEventListener("load", computeAnchors);
computeAnchors();

// ------------------------------------------------------------
//  render
// ------------------------------------------------------------
const xScale = isMobile ? 0.42 : 1;
let dispStage = 0, stageVel = 0;
const STIFF = 0.025, DAMP = 0.84;                  // morph spring (smooth + slight bounce)
let curX = stageX[0] * xScale, curB = stageBright[0];
const HOV_R = 3.4, HOV_R2 = HOV_R * HOV_R, HOV_STR = 0.13, HOV_SPRING = 0.10, HOV_DAMP = 0.86, HOV_MAX = 2.2;

function morphMesh(part, i, te, interactive, lmx, lmy) {
  const arr = part.arr, mesh = part.mesh;
  for (let n = 0; n < arr.length; n++) {
    const c = arr[n], pa = c.p[i], pb = c.p[i + 1];
    let bx = pa.x + (pb.x - pa.x) * te, by = pa.y + (pb.y - pa.y) * te, bz = pa.z + (pb.z - pa.z) * te;
    if (interactive) {
      const dx = bx - lmx, dy = by - lmy, d2 = dx * dx + dy * dy;
      let fx = 0, fy = 0;
      if (d2 < HOV_R2 && d2 > 1e-3) { const d = Math.sqrt(d2), f = (1 - d / HOV_R) * HOV_STR; fx = (dx / d) * f; fy = (dy / d) * f; }
      c.vel.x += fx - c.disp.x * HOV_SPRING; c.vel.y += fy - c.disp.y * HOV_SPRING;
      c.vel.x *= HOV_DAMP; c.vel.y *= HOV_DAMP;
      c.disp.x += c.vel.x; c.disp.y += c.vel.y;
      const dl = Math.hypot(c.disp.x, c.disp.y);
      if (dl > HOV_MAX) { c.disp.x *= HOV_MAX / dl; c.disp.y *= HOV_MAX / dl; }
      bx += c.disp.x; by += c.disp.y;
    }
    dummy.position.set(bx, by, bz);
    dummy.quaternion.copy(SHARED_QUAT);            // uniform orientation; no spin
    dummy.scale.setScalar(SCALE);
    dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix);
    mesh.setColorAt(n, gradAt(by));                // vertical gradient follows position
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
}

function draw(staticFrame) {
  const tgt = targetStage(scrollY);
  if (staticFrame) { dispStage = tgt; stageVel = 0; }
  else { stageVel += (tgt - dispStage) * STIFF; stageVel *= DAMP; dispStage += stageVel; }

  const i = Math.max(0, Math.min(SH.length - 2, Math.floor(dispStage)));
  const frac = clamp01(dispStage - i);
  const te = easeInOut(frac);

  const tX = lerp(stageX[i], stageX[i + 1], frac) * xScale;
  const tB = lerp(stageBright[i], stageBright[i + 1], frac);
  const k = staticFrame ? 1 : 0.1;
  curX += (tX - curX) * k; curB += (tB - curB) * k;
  cubeGroup.position.x = curX;                     // glide; the whole cloud never rotates
  mZero.mat.color.setScalar(curB); mOne.mat.color.setScalar(curB);

  const halfH = Math.tan((FOV / 2) * Math.PI / 180) * camera.position.z, halfW = halfH * camera.aspect;
  const lmx = mouse.nx * halfW + camera.position.x - curX;
  const lmy = mouse.ny * halfH + camera.position.y;

  morphMesh(mZero, i, te, !staticFrame, lmx, lmy);
  morphMesh(mOne, i, te, !staticFrame, lmx, lmy);

  mouse.nx += (mouse.tnx - mouse.nx) * 0.06;
  mouse.ny += (mouse.tny - mouse.ny) * 0.06;
  camera.position.x = mouse.nx * 0.6;
  camera.position.y = mouse.ny * 0.45;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

if (reduceMotion) {
  computeAnchors();
  draw(true);
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { draw(true); ticking = false; });
  }, { passive: true });
} else {
  renderer.setAnimationLoop(() => draw(false));
}
