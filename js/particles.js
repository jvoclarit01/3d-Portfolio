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

// three-colour gradient mapped vertically across the cloud (cyan -> violet -> pink)
const GRAD_A = new THREE.Color(0x00f3ff);  // neon cyan
const GRAD_B = new THREE.Color(0xa855f7);  // violet
const GRAD_C = new THREE.Color(0xff007f);  // neon pink/magenta
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
function sTorus(R, r) {
  const a = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const theta = i * Math.PI * 2 * 0.618033; // golden ratio spacing
    const phi = (i / N) * Math.PI * 2;
    a[i * 3] = (R + r * Math.cos(theta)) * Math.cos(phi);
    a[i * 3 + 1] = (R + r * Math.cos(theta)) * Math.sin(phi);
    a[i * 3 + 2] = r * Math.sin(theta);
  }
  return a;
}

function sLaptop() {
  const a = new Float32Array(N * 3);
  const baseCount = Math.floor(N * 0.45);
  const screenCount = N - baseCount;
  
  // Keyboard/Base plane
  const baseRows = Math.floor(Math.sqrt(baseCount * 0.7));
  const baseCols = Math.ceil(baseCount / baseRows);
  for (let i = 0; i < baseCount; i++) {
    const col = i % baseCols, row = Math.floor(i / baseCols);
    const px = col / (baseCols - 1 || 1), pz = row / (baseRows - 1 || 1);
    a[i * 3] = (px - 0.5) * 8.2;
    a[i * 3 + 1] = -2.5;
    a[i * 3 + 2] = (pz - 0.5) * 4.2 + 0.8;
  }
  
  // Tilted Screen plane
  const screenRows = Math.floor(Math.sqrt(screenCount * 0.75));
  const screenCols = Math.ceil(screenCount / screenRows);
  for (let i = 0; i < screenCount; i++) {
    const idx = baseCount + i;
    const col = i % screenCols, row = Math.floor(i / screenCols);
    const px = col / (screenCols - 1 || 1), py = row / (screenRows - 1 || 1);
    const x = (px - 0.5) * 8.2;
    const y = (py - 0.5) * 5.2 + 0.2;
    const z = -1.2 - (y + 2.5) * 0.25; // tilted screen
    a[idx * 3] = x;
    a[idx * 3 + 1] = y;
    a[idx * 3 + 2] = z;
  }
  return a;
}

function sWaveGrid() {
  const a = new Float32Array(N * 3);
  const rows = Math.floor(Math.sqrt(N * 0.65));
  const cols = Math.ceil(N / rows);
  for (let i = 0; i < N; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const px = col / (cols - 1 || 1), pz = row / (rows - 1 || 1);
    a[i * 3] = (px - 0.5) * 22.0;
    a[i * 3 + 1] = 0.0;
    a[i * 3 + 2] = (pz - 0.5) * 12.0;
  }
  return a;
}

function sChatBubble() {
  const a = new Float32Array(N * 3);
  const bubbleCount = Math.floor(N * 0.85);
  const tailCount = N - bubbleCount;
  
  const w = 8.5, h = 5.8;
  for (let i = 0; i < bubbleCount; i++) {
    const t = (i / bubbleCount) * 2 * (w + h);
    let x, y;
    if (t < w) { x = t - w/2; y = h/2; }
    else if (t < w + h) { x = w/2; y = h/2 - (t - w); }
    else if (t < 2*w + h) { x = w/2 - (t - w - h); y = -h/2; }
    else { x = -w/2; y = -h/2 + (t - 2*w - h); }
    
    const fill = Math.random();
    a[i * 3] = x * fill;
    a[i * 3 + 1] = y * fill + 0.5;
    a[i * 3 + 2] = (Math.random() - 0.5) * 1.0;
  }
  
  for (let i = 0; i < tailCount; i++) {
    const idx = bubbleCount + i;
    const pct = i / (tailCount - 1 || 1);
    a[idx * 3] = -2.0 - pct * 1.6;
    a[idx * 3 + 1] = -2.4 - pct * 1.6 + 0.5;
    a[idx * 3 + 2] = (Math.random() - 0.5) * 1.0;
  }
  return a;
}

function sScatter() {
  const a = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const arm = i % 3;
    const theta = (i / N) * Math.PI * 6.5;
    const r = 0.8 + 1.8 * theta;
    const angle = theta + arm * (Math.PI * 2 / 3) + (Math.random() - 0.5) * 0.22;
    a[i * 3] = Math.cos(angle) * r;
    a[i * 3 + 1] = Math.sin(angle) * r;
    a[i * 3 + 2] = (Math.random() - 0.5) * 3.5;
  }
  return a;
}

function sSphere(R) {
  const a = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = i * Math.PI * 2 * 0.6180339887;
    a[i * 3] = Math.cos(theta) * radius * R;
    a[i * 3 + 1] = y * R;
    a[i * 3 + 2] = Math.sin(theta) * radius * R;
  }
  return a;
}

function sHelix() {
  const a = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const strand = i % 2;
    const theta = (i / N) * Math.PI * 12.0;
    const r = 2.0;
    const offset = strand * Math.PI;
    const y = -4.5 + 9.0 * (i / N);
    a[i * 3] = Math.cos(theta + offset) * r;
    a[i * 3 + 1] = y;
    a[i * 3 + 2] = Math.sin(theta + offset) * r;
  }
  return a;
}

function sVortex() {
  const a = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const theta = (i / N) * Math.PI * 26.0;
    const r = 2.2 + Math.sin(theta * 3.0) * 0.3;
    const z = -5.0 + 10.0 * (i / N);
    a[i * 3] = Math.cos(theta) * r;
    a[i * 3 + 1] = Math.sin(theta) * r;
    a[i * 3 + 2] = z;
  }
  return a;
}

function sCloud() {
  const a = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 0.5 + 4.2 * Math.pow(Math.random(), 1.8);
    a[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    a[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
    a[i * 3 + 2] = Math.cos(phi) * r;
  }
  return a;
}

function sContactScatter() {
  const a = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    a[i * 3] = (Math.random() - 0.5) * 38;
    a[i * 3 + 1] = (Math.random() - 0.5) * 23;
    a[i * 3 + 2] = 2 - Math.pow(Math.random(), 0.7) * 22;
  }
  return a;
}

const torusArr = sTorus(4.2, 1.3);
const laptopArr = sLaptop();
const waveGridArr = sWaveGrid();
const sphereArr = sSphere(3.8);
const chatBubbleArr = sChatBubble();
const scatterArr = sScatter(); // Spiral Galaxy
const helixArr = sHelix();     // Double Helix
const vortexArr = sVortex();   // Vortex Tunnel
const cloudArr = sCloud();     // Spherical Cloud
const contactScatterArr = sContactScatter();

// Stages: 
// 0 = Home (Torus)
// 1 = Transition (Double Helix)
// 2 = About (Laptop)
// 3 = Transition (Vortex Tunnel)
// 4 = Projects (WaveGrid)
// 5 = Transition (Spiral Galaxy)
// 6 = Connect (Sphere)
// 7 = Transition (Spherical Cloud)
// 8 = Contact (Scattered)
const SH = [torusArr, helixArr, laptopArr, vortexArr, waveGridArr, scatterArr, sphereArr, cloudArr, contactScatterArr];

// ------------------------------------------------------------
//  per-cube data (no spin)
// ------------------------------------------------------------
const zeros = [], ones = [];
for (let k = 0; k < N; k++) {
  const p = SH.map((arr) => new THREE.Vector3(arr[k * 3], arr[k * 3 + 1], arr[k * 3 + 2]));
  const cube = { 
    p: p, 
    disp: new THREE.Vector3(), 
    vel: new THREE.Vector3(),
    waveBaseX: waveGridArr[k * 3],
    waveBaseZ: waveGridArr[k * 3 + 2]
  };
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
const STAGE_IDS  = ["home", "about", "projects", "connect", "contact"];
const stageX      = [4.5, 0.0, -4.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]; 
const stageBright = [1.0, 0.6, 1.0, 0.6, 0.8, 0.6, 1.0, 0.6, 1.0];
let anchors = [];
function computeAnchors() {
  const vh = window.innerHeight;
  anchors = STAGE_IDS.map(function (id) {
    const el = document.getElementById(id); if (!el) return 0;
    const r = el.getBoundingClientRect();
    const scrollTop = r.top + window.scrollY;
    if (id === "projects") {
      return scrollTop + vh / 2;
    }
    return scrollTop + r.height / 2 - vh / 2;
  });
}
function targetStage(y) {
  if (!anchors.length) return 0;
  if (y <= anchors[0]) return 0;
  if (y >= anchors[anchors.length - 1]) return 8;
  
  for (let k = 0; k < anchors.length - 1; k++) {
    const a0 = anchors[k];
    const a1 = anchors[k + 1];
    
    if (y >= a0 && y < a1) {
      if (STAGE_IDS[k] === "projects") {
        const el = document.getElementById("projects");
        if (el) {
          const r = el.getBoundingClientRect();
          const projectsTop = r.top + window.scrollY;
          const projectsBottom = projectsTop + r.height - window.innerHeight;
          if (y < projectsBottom) {
            return 4;
          } else {
            const t = (y - projectsBottom) / (a1 - projectsBottom);
            return 4 + t * 2;
          }
        }
      }
      const t = (y - a0) / (a1 - a0);
      return 2 * k + t * 2;
    }
  }
  return 8;
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

// Scroll-driven wave modulation globals
window.waveScrollOffset = 0;
window.waveIntensity = 1.0;

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

  // Dynamic wave update in the render draw loop:
  const time = performance.now() * 0.0016 + window.waveScrollOffset;
  const lists = [zeros, ones];
  for (let l = 0; l < lists.length; l++) {
    const list = lists[l];
    for (let n = 0; n < list.length; n++) {
      const c = list[n];
      const wx = c.waveBaseX;
      const wz = c.waveBaseZ;
      const height = Math.sin(wx * 0.35 + time) * Math.cos(wz * 0.35 + time * 0.8) * 1.6 
                     + Math.sin(wx * 0.12 - time * 0.5) * 0.8;
      c.p[4].y = height * window.waveIntensity;
    }
  }

  // Decay wave scroll intensity back to baseline
  if (window.waveIntensity > 1.0) {
    window.waveIntensity += (1.0 - window.waveIntensity) * 0.05;
  }

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

  // Project the WebGL cubeGroup center to screen space to align the profile picture
  const heroPic = document.querySelector('.hero-profile-pic');
  if (heroPic) {
    const tempV = new THREE.Vector3();
    tempV.copy(cubeGroup.position);
    tempV.project(camera);
    const px = (tempV.x * 0.5 + 0.5) * window.innerWidth;
    const py = (tempV.y * -0.5 + 0.5) * window.innerHeight;
    heroPic.style.left = px + 'px';
    heroPic.style.top = py + 'px';
  }

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
