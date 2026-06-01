// ============================================================
//  apartment.js — Jan Vincent Oclarit
//  A scroll-driven 3D studio apartment.
//  Rendered at a low resolution to create a retro 3D pixelated game look.
// ============================================================
import * as THREE from "three";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none)").matches;

// ---------- Interactive raycasting & Zoom camera state ----------
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
const interactiveObjects = [];
const spinners = [];

let zoomTarget = 0; // 0 = scroll-driven curve, 1 = zoom to screen
let zoomProgress = 0; // interpolated 0 to 1
const zoomPos = new THREE.Vector3();
const zoomLook = new THREE.Vector3();
let currentZoomedId = "";

// ---------- Pixelated Rendering Configuration ----------
const PIXEL_SCALE = 1.0; // Render at full resolution

// ---------- Scandinavian Palette & Design System ----------
const C = {
  bg:       0x07080d, // OLED Midnight Black
  wall:     0x14151b, // Dark metal wall panels
  wallHi:   0x1a1c24, // Highlighted metal framework
  floor:    0x111218, // Matte carbon fiber floor
  wood:     0x00f3ff, // Neon Cyan glow accent
  woodDark: 0xa855f7, // Electric Violet glow accent
  charcoal: 0x12131c, // Dark slate metal structure
  cream:    0x1a1b24, // Dark synth-leather cushions
  green:    0x39ff14, // Glowing acid-green foliage
  marble:   0x23253b, // Tech grid marble/slate base
  sunlight: 0xff007f, // Neon Magenta ambient glow
  sky:      0x0a0c16, // Cyberpunk night sky
  muted:    0x6e7282, // Slate gray
};

// ============================================================
//  renderer / scene / camera
// ============================================================
const canvas = document.getElementById("apt-scene");
// Disable antialias for crisp retro polygon edges
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Dynamic pixel ratio capped at 2 for performance on high-DPI screens
renderer.setSize(Math.round(window.innerWidth * PIXEL_SCALE), Math.round(window.innerHeight * PIXEL_SCALE), false);
canvas.style.width = window.innerWidth + "px";
canvas.style.height = window.innerHeight + "px";

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

// Enable soft shadow mapping (will render as beautifully blocky/pixelated shadows!)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.bg);
scene.fog = new THREE.FogExp2(C.bg, 0.022);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(-15, 2.7, 5);

// ============================================================
//  lighting
// ============================================================
scene.add(new THREE.AmbientLight(0x110f1e, 1.25));

// Strong morning light
const sunLight = new THREE.DirectionalLight(C.sunlight, 1.8);
sunLight.position.set(18, 10, 8);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048; // High shadow map size
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 40;
sunLight.shadow.camera.left = -10;
sunLight.shadow.camera.right = 25;
sunLight.shadow.camera.top = 10;
sunLight.shadow.camera.bottom = -10;
sunLight.shadow.bias = -0.0004;
scene.add(sunLight);

// per-zone camera coordinates
const ZONE_X = [-13, -8, -2.5, 3.5, 12];

// ============================================================
//  procedural textures (oak wood, white marble, cream bouclé)
// ============================================================

function makeOakTexture() {
  const cv = document.createElement("canvas");
  cv.width = 256; cv.height = 256;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#cca37a"; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "#b48e65"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 30; i++) {
    const y = Math.random() * 256;
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) {
      ctx.lineTo(x, y + Math.sin(x / 30 + y) * 3);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeMarbleTexture() {
  const cv = document.createElement("canvas");
  cv.width = 256; cv.height = 256;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#faf9f6"; ctx.fillRect(0, 0, 256, 256);
  
  ctx.strokeStyle = "rgba(100, 100, 110, 0.15)"; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let cx = Math.random() * 256, cy = 0;
    ctx.moveTo(cx, cy);
    while (cy < 256) {
      cx += (Math.random() - 0.5) * 30; cy += 20 + Math.random() * 20;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

function makeBoucleTexture() {
  const cv = document.createElement("canvas");
  cv.width = 64; cv.height = 64;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#f5f3ef"; ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(200, 195, 185, 0.2)" : "rgba(255, 255, 255, 0.5)";
    ctx.fillRect(Math.random() * 64, Math.random() * 64, 1.2, 1.2);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

const texOak = makeOakTexture();
const texMarble = makeMarbleTexture();
const texBoucle = makeBoucleTexture();

// ============================================================
//  geometry helpers
// ============================================================
function std(color, o = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    metalness: o.metal != null ? o.metal : 0.05,
    roughness: o.rough != null ? o.rough : 0.8,
    transparent: o.opacity != null,
    opacity: o.opacity != null ? o.opacity : 1,
  });
  if (o.map) m.map = o.map;
  return m;
}

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  if (x != null) m.position.set(x, y, z);
  return m;
}

function cyl(rt, rb, h, mat, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function makeLabel(lines, opt = {}) {
  const pad = 24, lh = 64, fs = opt.fs || 42;
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d");
  ctx.font = `500 ${fs}px 'Inter', sans-serif`;
  let w = 0;
  lines.forEach((l) => { w = Math.max(w, ctx.measureText(l).width); });
  cv.width = Math.ceil(w + pad * 2);
  cv.height = Math.ceil(lines.length * lh + pad * 2);
  
  const c2 = cv.getContext("2d");
  c2.font = `500 ${fs}px 'Inter', sans-serif`;
  c2.textBaseline = "middle";
  
  const textColor = opt.color || "#202022";
  
  if (opt.isWood) {
    c2.fillStyle = "#cca37a"; c2.fillRect(0, 0, cv.width, cv.height);
    c2.strokeStyle = "#b48e65"; c2.lineWidth = 1;
    for (let i = 0; i < 15; i++) {
      const y = Math.random() * cv.height;
      c2.beginPath(); c2.moveTo(0, y); c2.lineTo(cv.width, y); c2.stroke();
    }
  }

  if (opt.box && !opt.isWood) {
    c2.strokeStyle = textColor; c2.lineWidth = 2;
    c2.strokeRect(6, 6, cv.width - 12, cv.height - 12);
  }
  
  c2.fillStyle = textColor;
  lines.forEach((l, i) => c2.fillText(l, pad, pad + lh * (i + 0.5)));
  
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, ratio: cv.width / cv.height };
}

function labelPlane(lines, height, opt = {}) {
  const { tex, ratio } = makeLabel(lines, opt);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(height * ratio, height), mat);
}

const apt = new THREE.Group();
scene.add(apt);

// ============================================================
//  Room Structural Shell & Floor Zoning
// ============================================================
(function shell() {
  // Stepped platforms
  apt.add(box(7.5, 0.4, 13, std(C.floor, { map: texOak }), -13.25, 0.2, 0.3)); // Foyer/Kitchen
  apt.add(box(6.5, 0.4, 13, std(C.floor, { map: texOak }), -2.75, 0.2, 0.3));  // Workspace
  apt.add(box(7.0, 0.4, 13, std(C.floor, { map: texOak }), 4.0, 0.2, 0.3));   // Gallery
  apt.add(box(9.5, 0.4, 13, std(0xdcdad5, { rough: 0.7 }), 12.25, 0.2, 0.3)); // Terrace (Concrete)
  
  // Sunken Lounge segment
  apt.add(box(3.5, 0.1, 13, std(C.floor, { map: texOak }), -7.75, 0.05, 0.3));
  
  // Oak steps details
  apt.add(box(0.3, 0.2, 13, std(C.wood, { map: texOak }), -9.65, 0.2, 0.3));
  apt.add(box(0.3, 0.2, 13, std(C.wood, { map: texOak }), -5.85, 0.2, 0.3));

  // Holographic layout grids (Low opacity warm oak)
  const gridColor = new THREE.Color(C.wood);
  const gridColorDark = new THREE.Color(C.woodDark);

  const gridR = new THREE.GridHelper(40, 50, gridColor, gridColorDark);
  gridR.material.transparent = true;
  gridR.material.opacity = 0.1;
  gridR.position.set(0, 0.402, 0.3);
  apt.add(gridR);

  const gridL = new THREE.GridHelper(3.5, 6, gridColor, gridColorDark);
  gridL.material.transparent = true;
  gridL.material.opacity = 0.07;
  gridL.position.set(-7.75, 0.102, 0.3);
  apt.add(gridL);

  // Plaster walls
  apt.add(box(40, 7.2, 0.3, std(C.wall), 0, 3.6, -6.2));
  apt.add(box(0.3, 7.2, 13, std(C.wallHi), -17, 3.6, 0.3));

  // Glowing baseboard LED strips (warm oak light)
  apt.add(box(40, 0.03, 0.03, new THREE.MeshStandardMaterial({ color: 0x050505, emissive: C.wood, emissiveIntensity: 1.8 }), 0, 0.52, -6.0));

  // Wood baseboards
  apt.add(box(40, 0.2, 0.08, std(C.wood, { map: texOak }), 0, 0.5, -6.05));
  apt.add(box(3.5, 0.2, 0.08, std(C.wood, { map: texOak }), -7.75, 0.2, -6.05));

  // Ceiling Beams
  for (let cx = -16; cx <= 16; cx += 4) {
    apt.add(box(0.3, 0.4, 13, std(C.wood, { map: texOak }), cx, 6.8, 0.3));
  }
  
  // Ceiling LED glow strip
  apt.add(box(40, 0.03, 0.03, new THREE.MeshStandardMaterial({ color: 0x050505, emissive: C.wood, emissiveIntensity: 1.2 }), 0, 6.9, 2.4));

  // Pendant lights
  const lampX = [-13, -8, -2.5, 3.5];
  lampX.forEach(x => {
    apt.add(place(cyl(0.012, 0.012, 2.0, std(C.charcoal)), x, 5.8, -1.5));
    apt.add(place(cyl(0.24, 0.08, 0.32, std(C.wood, { map: texOak }), 12), x, 4.8, -1.5));
    
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff3e5 }));
    bulb.position.set(x, 4.62, -1.5);
    apt.add(bulb);
    
    const pl = new THREE.PointLight(0xfff0dd, 0.6, 8, 1.8);
    pl.position.set(x, 4.4, -1.5);
    scene.add(pl);
  });
})();

// ============================================================
//  ZONE 0 — FOYER
// ============================================================
(function foyer() {
  const x = -13;
  // Entrance door frame and panels
  apt.add(box(0.1, 4.4, 2.6, std(C.charcoal), -16.9, 2.6, 0.3));
  apt.add(box(0.18, 4.6, 0.14, std(C.wood, { map: texOak }), -16.82, 2.6, -1.0));
  apt.add(box(0.18, 4.6, 0.14, std(C.wood, { map: texOak }), -16.82, 2.6, 1.6));
  apt.add(box(0.18, 0.14, 2.7, std(C.wood, { map: texOak }), -16.82, 4.9, 0.3));

  // Mat
  apt.add(box(3.2, 0.02, 2.0, std(C.cream, { map: texBoucle }), x, 0.41, 3.2));

  // Framed poster
  poster(x, 3.4, 2.4, 3.0, "UNIT 01", "STUDIO_OS");

  // Logo tag
  const logo = labelPlane(["J V", "EST. 2026"], 0.8, { color: "#202022", fs: 32 });
  logo.position.set(x + 3.2, 4.5, -5.7);
  apt.add(logo);

  // Table
  apt.add(box(2.4, 0.08, 0.7, std(C.wood, { map: texOak }), x, 1.25, -5.2));
  apt.add(box(0.06, 0.85, 0.06, std(C.charcoal), x - 1.1, 0.825, -5.45));
  apt.add(box(0.06, 0.85, 0.06, std(C.charcoal), x + 1.1, 0.825, -5.45));
  apt.add(box(0.06, 0.85, 0.06, std(C.charcoal), x - 1.1, 0.825, -4.95));
  apt.add(box(0.06, 0.85, 0.06, std(C.charcoal), x + 1.1, 0.825, -4.95));

  // Mirror ring
  const frameGeo = new THREE.TorusGeometry(0.8, 0.02, 8, 36);
  const frame = new THREE.Mesh(frameGeo, std(C.charcoal, { metal: 0.2 }));
  frame.position.set(x, 2.4, -5.96);
  apt.add(frame);
  
  const mirrorGeo = new THREE.CircleGeometry(0.79, 32);
  const mirror = new THREE.Mesh(mirrorGeo, new THREE.MeshStandardMaterial({ color: 0xdde2e5, metalness: 0.95, roughness: 0.02 }));
  mirror.position.set(x, 2.4, -5.95);
  apt.add(mirror);

  plant(x + 0.95, 1.29, -5.2, "snake", 0.65);
})();

// ============================================================
//  KITCHEN COUNTER
// ============================================================
(function kitchen() {
  const x = -10.8;
  const yBase = 0.4;
  apt.add(box(1.8, 0.9, 0.8, std(C.wood, { map: texOak }), x, yBase + 0.45, -5.5));
  apt.add(box(0.18, 0.03, 0.04, std(C.charcoal), x - 0.4, yBase + 0.75, -5.08));
  apt.add(box(0.18, 0.03, 0.04, std(C.charcoal), x + 0.4, yBase + 0.75, -5.08));
  
  // Marble top
  apt.add(box(1.84, 0.06, 0.84, std(C.marble, { map: texMarble, rough: 0.15, metal: 0.1 }), x, yBase + 0.93, -5.5));

  // Faucet
  const faucetGroup = new THREE.Group();
  faucetGroup.add(place(cyl(0.02, 0.02, 0.28, std(C.charcoal)), 0, 0.14, 0));
  const spigot = box(0.1, 0.03, 0.03, std(C.charcoal));
  spigot.position.set(0, 0.28, 0.04);
  faucetGroup.add(spigot);
  faucetGroup.position.set(x - 0.5, yBase + 0.96, -5.5);
  apt.add(faucetGroup);

  // canister details
  apt.add(box(0.3, 0.02, 0.24, std(C.woodDark), x + 0.3, yBase + 0.97, -5.4));
  apt.add(place(cyl(0.06, 0.06, 0.18, std(C.cream)), x + 0.6, yBase + 1.05, -5.6));
})();

// ============================================================
//  ZONE 1 — SUNKEN LOUNGE
// ============================================================
(function lounge() {
  const x = -7.8;
  const yBase = 0.05;
  
  // Large rug
  apt.add(box(4.6, 0.01, 7.8, std(C.cream, { map: texBoucle }), x, yBase + 0.01, 0));

  // Cream sofa
  apt.add(box(1.2, 0.4, 2.0, std(C.cream, { map: texBoucle }), x - 0.7, yBase + 0.2, -1.0));
  apt.add(box(1.2, 0.4, 2.0, std(C.cream, { map: texBoucle }), x - 0.7, yBase + 0.2, 1.0));
  apt.add(box(1.2, 0.4, 1.8, std(C.cream, { map: texBoucle }), x + 0.5, yBase + 0.2, 1.1));
  apt.add(box(0.6, 0.7, 4.0, std(C.cream, { map: texBoucle }), x - 1.2, yBase + 0.55, 0));

  // cushions
  apt.add(box(0.2, 0.4, 0.6, std(C.charcoal), x - 0.8, yBase + 0.5, -1.0));
  apt.add(box(0.2, 0.4, 0.6, std(C.woodDark), x - 0.8, yBase + 0.5, 0.8));

  // Coffee Table
  apt.add(place(cyl(0.7, 0.7, 0.06, std(C.floor, { map: texOak })), x + 0.4, yBase + 0.43, -1.2));
  apt.add(box(0.04, 0.4, 0.04, std(C.charcoal), x + 0.1, yBase + 0.2, -1.5));
  apt.add(box(0.04, 0.4, 0.04, std(C.charcoal), x + 0.7, yBase + 0.2, -1.5));
  apt.add(box(0.04, 0.4, 0.04, std(C.charcoal), x + 0.4, yBase + 0.2, -0.9));
  apt.add(place(cyl(0.05, 0.05, 0.1, std(C.cream)), x + 0.3, yBase + 0.51, -1.1));

  // Arched Floor Lamp
  const lampGroup = new THREE.Group();
  lampGroup.add(place(cyl(0.02, 0.02, 2.2, std(C.charcoal)), -1.0, 1.1, -2.6));
  lampGroup.add(place(cyl(0.22, 0.22, 0.04, std(C.charcoal)), -1.0, 0.02, -2.6));
  lampGroup.add(box(0.02, 0.02, 1.2, std(C.charcoal), -1.0, 2.2, -2.0));
  lampGroup.add(box(0.02, 1.0, 0.02, std(C.charcoal), -1.0, 2.6, -1.4));
  
  const domeGeo = new THREE.SphereGeometry(0.18, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, std(C.charcoal, { metal: 0.8, rough: 0.2 }));
  dome.rotation.x = Math.PI;
  dome.position.set(-1.0, 2.1, -1.4);
  lampGroup.add(dome);

  const pl = new THREE.PointLight(0xfff3e0, 0.6, 6, 2.0);
  pl.position.set(-1.0, 1.9, -1.4);
  lampGroup.add(pl);
  lampGroup.position.set(x, yBase, 0);
  apt.add(lampGroup);

  // Digital Art Frame TV (Interactive screen)
  apt.add(box(4.8, 2.8, 0.12, std(C.wood, { map: texOak }), x, 3.6, -6.04));
  
  const tvArtTexture = makeTVArtTexture();
  const tvMat = new THREE.MeshBasicMaterial({ map: tvArtTexture, color: 0xe1ded9 });
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.4), tvMat);
  tv.position.set(x, 3.6, -5.96);
  tv.userData = { projectId: "about", type: "tv" };
  interactiveObjects.push(tv);
  apt.add(tv);

  const tvTag = labelPlane(["// UNIT_01 ABOUT SYSTEM"], 0.26, { color: "#6e7282", fs: 34 });
  tvTag.position.set(x - 1.2, 1.9, -5.8);
  apt.add(tvTag);

  // Credenza
  const cbX = x - 3.4;
  const cbY = 0.4;
  apt.add(box(0.9, 1.4, 0.8, std(C.wood, { map: texOak }), cbX, cbY + 0.7, -5.3));
  apt.add(place(cyl(0.08, 0.08, 0.35, std(C.cream)), cbX, cbY + 1.57, -5.3));
  apt.add(place(cyl(0.06, 0.06, 0.22, std(C.charcoal)), cbX + 0.2, cbY + 1.51, -5.4));

  // Floating rotating wireframe octahedron hologram (cyberpunk art piece)
  const octGeo = new THREE.OctahedronGeometry(0.24, 0);
  const octMat = new THREE.MeshBasicMaterial({ color: C.woodDark, wireframe: true, transparent: true, opacity: 0.5 });
  const octMesh = new THREE.Mesh(octGeo, octMat);
  octMesh.position.set(cbX - 0.15, cbY + 1.9, -5.3);
  apt.add(octMesh);
  spinners.push({ mesh: octMesh, rx: 0.006, ry: 0.010, rz: 0.003 });

  plant(x + 2.4, yBase, -3.2, "monstera", 0.75);
  bookStack(x + 2.0, yBase, 2.8, 0.5);
})();

// ============================================================
//  ZONE 2 — WORKSPACE
// ============================================================
(function workspace() {
  const x = -2.5;
  const yBase = 0.4;
  
  // Desk
  apt.add(box(5.0, 0.06, 1.4, std(C.charcoal, { rough: 0.7 }), x, yBase + 0.75, -5.0));
  apt.add(box(0.05, 0.75, 1.3, std(C.charcoal), x - 2.3, yBase + 0.375, -5.0));
  apt.add(box(0.05, 0.75, 1.3, std(C.charcoal), x + 2.3, yBase + 0.375, -5.0));

  // Curved Monitor screen
  const screenMatIDE = makeIDETexture();
  apt.add(box(3.8, 1.5, 0.08, std(C.charcoal), x, yBase + 1.8, -5.06));
  
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.64, 1.36), screenMatIDE);
  screen.position.set(x, yBase + 1.8, -5.01);
  screen.userData = { projectId: "showcase", type: "computer" };
  interactiveObjects.push(screen);
  apt.add(screen);
  
  apt.add(box(0.28, 0.75, 0.12, std(C.charcoal), x, yBase + 1.1, -5.0));
  apt.add(box(1.0, 0.02, 0.4, std(C.charcoal), x, yBase + 0.79, -4.8));

  const chip = labelPlane(["[ CLICK MONITOR FOR SELECTED PROJECTS ]"], 0.14, { color: "#6e7282", fs: 30 });
  chip.position.set(x, yBase + 0.94, -4.9);
  apt.add(chip);

  // Danish Leather Chair
  const chairGroup = new THREE.Group();
  chairGroup.add(box(1.0, 0.08, 1.0, std(0xd2b48c, { rough: 0.45 }), 0, 0.45, 0));
  chairGroup.add(box(1.0, 0.6, 0.08, std(0xd2b48c, { rough: 0.45 }), 0, 0.75, -0.46));
  chairGroup.add(place(cyl(0.02, 0.02, 0.45, std(C.charcoal)), -0.42, 0.225, 0.42));
  chairGroup.add(place(cyl(0.02, 0.02, 0.45, std(C.charcoal)), 0.42, 0.225, 0.42));
  chairGroup.add(place(cyl(0.02, 0.02, 0.45, std(C.charcoal)), -0.42, 0.225, -0.42));
  chairGroup.add(place(cyl(0.02, 0.02, 0.45, std(C.charcoal)), 0.42, 0.225, -0.42));
  chairGroup.position.set(x, yBase, -3.4);
  apt.add(chairGroup);

  apt.add(box(0.3, 0.5, 0.3, std(C.charcoal), x - 2.2, yBase + 1.0, -5.1));
  apt.add(box(0.3, 0.5, 0.3, std(C.charcoal), x + 2.2, yBase + 1.0, -5.1));
  apt.add(box(0.48, 0.02, 0.32, std(C.charcoal, { metal: 0.9, rough: 0.25 }), x - 1.2, yBase + 0.79, -4.6));
  apt.add(place(cyl(0.04, 0.04, 0.1, std(C.cream)), x + 1.2, yBase + 0.83, -4.6));

  const sign = labelPlane(["PROJECTS", "SHOWCASE"], 0.72, { color: "#202022", fs: 38 });
  sign.position.set(x + 3.2, 4.3, -5.7);
  apt.add(sign);

  poster(x + 1.0, 3.4, 1.4, 2.0, "SPATIAL", "DEVELOPER");
  bookStack(x + 2.8, yBase, -0.6, 0.3);
})();

// ============================================================
//  ZONE 3 — SLEEPING LOFT & SKILLS BASE
// ============================================================
(function sleepingLoft() {
  const x = 3.5;
  const yBase = 0.4;
  
  // Slats screen wall partitions
  for (let sx = 0.6; sx <= 6.8; sx += 0.4) {
    apt.add(box(0.04, 3.0, 0.04, std(C.wood, { map: texOak }), sx, yBase + 1.5, -4.2));
  }

  // Skills display wood plaques with charcoal print text
  const skills = [
    ["THREE.JS", "WEBGL"], ["JAVASCRIPT", "TYPESCRIPT"], ["REACT", "NEXT.JS"],
    ["GSAP", "CSS MOTION"], ["HTML5", "CSS3"], ["UI / UX", "FIGMA"],
  ];
  skills.forEach((s, i) => {
    const cx = x - 2.8 + (i % 3) * 2.8;
    const cy = yBase + 1.8 - Math.floor(i / 3) * 1.0;
    
    const plaqueMat = makeLabel(s, { isWood: true, box: true, fs: 32, color: "#202022" }).tex;
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.72), new THREE.MeshBasicMaterial({ map: plaqueMat, side: THREE.DoubleSide }));
    plaque.position.set(cx, cy, -5.96);
    apt.add(plaque);
    
    apt.add(box(2.4, 0.8, 0.05, std(C.woodDark), cx, cy, -5.99));
  });

  const stackTag = labelPlane(["SKILLS & TOOLING"], 0.28, { color: "#6e7282", fs: 36 });
  stackTag.position.set(x, yBase + 2.5, -5.8);
  apt.add(stackTag);

  // LOFT platform at yBase + 1.25 = 1.65
  apt.add(box(0.12, 1.2, 0.12, std(C.wood, { map: texOak }), 0.8, yBase + 0.6, -1.0));
  apt.add(box(0.12, 1.2, 0.12, std(C.wood, { map: texOak }), 6.8, yBase + 0.6, -1.0));
  apt.add(box(0.12, 1.2, 0.12, std(C.wood, { map: texOak }), 0.8, yBase + 0.6, -4.0));
  apt.add(box(0.12, 1.2, 0.12, std(C.wood, { map: texOak }), 6.8, yBase + 0.6, -4.0));

  apt.add(box(6.2, 0.1, 3.4, std(C.wood, { map: texOak }), 3.8, yBase + 1.25, -2.5));
  apt.add(box(6.2, 0.04, 0.04, std(C.charcoal), 3.8, yBase + 1.85, -0.85));
  for (let rx = 1.0; rx <= 6.6; rx += 0.8) {
    apt.add(box(0.02, 0.6, 0.02, std(C.charcoal), rx, yBase + 1.55, -0.85));
  }

  // Ladder
  const ladderGroup = new THREE.Group();
  ladderGroup.add(place(cyl(0.02, 0.02, 1.6, std(C.woodDark)), -0.25, 0.8, 0));
  ladderGroup.add(place(cyl(0.02, 0.02, 1.6, std(C.woodDark)), 0.25, 0.8, 0));
  for (let r = 0.25; r <= 1.4; r += 0.25) {
    ladderGroup.add(box(0.5, 0.02, 0.04, std(C.woodDark), 0, r, 0));
  }
  ladderGroup.rotation.x = 0.18;
  ladderGroup.position.set(1.4, yBase, -0.8);
  apt.add(ladderGroup);

  // Bed
  const bedX = 4.4;
  const bedY = yBase + 1.3;
  const bedZ = -2.6;
  apt.add(box(2.8, 0.22, 1.8, std(C.cream, { map: texBoucle }), bedX, bedY + 0.11, bedZ));
  apt.add(box(2.0, 0.23, 1.82, std(0xffffff), bedX + 0.4, bedY + 0.11, bedZ));
  apt.add(box(0.8, 0.24, 1.84, std(C.muted), bedX + 1.0, bedY + 0.11, bedZ));
  apt.add(box(0.5, 0.12, 0.6, std(C.cream), bedX - 1.0, bedY + 0.26, bedZ - 0.4));
  apt.add(box(0.5, 0.12, 0.6, std(C.cream), bedX - 1.0, bedY + 0.26, bedZ + 0.4));
  apt.add(box(0.5, 0.35, 0.5, std(C.wood, { map: texOak }), bedX - 1.0, bedY + 0.175, bedZ - 1.1));
  apt.add(place(cyl(0.04, 0.04, 0.12, std(0xffffff, { opacity: 0.3, rough: 0.1 })), bedX - 1.0, bedY + 0.41, bedZ - 1.1));
})();

// ============================================================
//  ZONE 4 — TERRACE
// ============================================================
(function terrace() {
  const x = 12.0;
  const yBase = 0.4;
  
  // Window wall
  apt.add(box(0.08, 6.4, 0.08, std(C.charcoal), 8.0, yBase + 3.2, 0.3));
  apt.add(box(0.08, 6.4, 0.08, std(C.charcoal), 8.0, yBase + 3.2, -4.0));
  apt.add(box(0.08, 6.4, 0.08, std(C.charcoal), 8.0, yBase + 3.2, 4.6));
  apt.add(box(0.08, 0.08, 13, std(C.charcoal), 8.0, yBase + 6.3, 0.3));
  apt.add(box(0.08, 0.08, 13, std(C.charcoal), 8.0, yBase + 0.04, 0.3));
  
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.05, transparent: true, opacity: 0.15 });
  apt.add(box(0.02, 6.2, 4.3, glassMat, 8.0, yBase + 3.1, -1.85));
  apt.add(box(0.02, 6.2, 4.3, glassMat, 8.0, yBase + 3.1, 2.45));

  // Table & Bench
  apt.add(box(1.8, 0.05, 1.1, std(C.wood, { map: texOak }), x + 1.2, yBase + 0.72, 1.8));
  apt.add(box(0.06, 0.7, 0.06, std(C.charcoal), x + 0.4, yBase + 0.35, 1.4));
  apt.add(box(0.06, 0.7, 0.06, std(C.charcoal), x + 2.0, yBase + 0.35, 1.4));
  apt.add(box(0.06, 0.7, 0.06, std(C.charcoal), x + 0.4, yBase + 0.35, 2.2));
  apt.add(box(0.06, 0.7, 0.06, std(C.charcoal), x + 2.0, yBase + 0.35, 2.2));

  // Projection hologram on table
  const projGeo = new THREE.ConeGeometry(0.1, 0.14, 4);
  const projMesh = new THREE.Mesh(projGeo, std(C.charcoal, { metal: 0.8 }));
  projMesh.rotation.x = Math.PI;
  projMesh.position.set(x + 1.2, yBase + 0.79, 1.8);
  apt.add(projMesh);

  // Spinning wireframe hologram globe (warm oak color)
  const holoGeo = new THREE.IcosahedronGeometry(0.22, 1);
  const holoMat = new THREE.MeshBasicMaterial({ color: C.wood, wireframe: true, transparent: true, opacity: 0.55 });
  const holoMesh = new THREE.Mesh(holoGeo, holoMat);
  holoMesh.position.set(x + 1.2, yBase + 1.1, 1.8);
  apt.add(holoMesh);
  spinners.push({ mesh: holoMesh, rx: 0.008, ry: 0.012, rz: 0.004 });

  const holoLight = new THREE.PointLight(C.wood, 0.6, 3, 1.5);
  holoLight.position.set(x + 1.2, yBase + 1.1, 1.8);
  scene.add(holoLight);

  apt.add(box(1.4, 0.04, 0.4, std(C.wood, { map: texOak }), x + 1.2, yBase + 0.42, 0.8));
  apt.add(box(0.04, 0.4, 0.3, std(C.charcoal), x + 0.6, yBase + 0.2, 0.8));
  apt.add(box(0.04, 0.4, 0.3, std(C.charcoal), x + 1.8, yBase + 0.2, 0.8));

  plant(x + 2.8, yBase, -1.5, "leafy", 0.7);

  const sign = labelPlane(["LET'S BUILD", "TOGETHER"], 1.1, { color: "#202022", fs: 36 });
  sign.position.set(x - 2.8, 4.5, -5.6);
  apt.add(sign);
  plant(x - 3.8, yBase, -5.2, "leafy", 0.6);

  // Skyline
  const cityscape = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const h = 5 + Math.random() * 12;
    const w = 2.0 + Math.random() * 3.0;
    const bx = 24 + Math.random() * 20;
    const bz = -20 + Math.random() * 40;
    cityscape.add(box(w, h, w, std(0xdbe0e4), bx, h / 2 - 3, bz));
  }
  apt.add(cityscape);
})();

// ============================================================
//  plant model builder (Snake & Monstera & Leafy)
// ============================================================
function place(mesh, x, y, z) { mesh.position.set(x, y, z); return mesh; }

function plant(x, baseY, z, type, scale = 1) {
  const g = new THREE.Group();
  const pot = cyl(0.3, 0.35, 0.6, std(0xb8b6b0), 12);
  pot.position.y = 0.3;
  g.add(pot);
  
  if (type === "snake") {
    const colors = [0x4d594b, 0x5a6858, 0x3f4a3e];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const leafH = 0.9 + Math.random() * 0.5;
      const leaf = box(0.12, leafH, 0.02, std(colors[i % colors.length]));
      leaf.position.set(Math.cos(angle) * 0.16, 0.6 + leafH / 2, Math.sin(angle) * 0.16);
      leaf.rotation.y = angle;
      leaf.rotation.x = (Math.random() - 0.5) * 0.12;
      g.add(leaf);
    }
  } else if (type === "monstera") {
    const stemMat = std(0x3a4538);
    const leafMat = std(0x4d594b, { metal: 0.1 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random();
      const stemH = 0.5 + Math.random() * 0.4;
      
      const stem = cyl(0.015, 0.015, stemH, stemMat, 6);
      stem.rotation.z = Math.cos(angle) * 0.4;
      stem.rotation.x = Math.sin(angle) * 0.4;
      stem.position.set(Math.cos(angle) * 0.1, 0.6 + stemH / 2, Math.sin(angle) * 0.1);
      g.add(stem);
      
      const leafGeo = new THREE.CircleGeometry(0.38, 8);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.scale.set(1.0, 0.75, 1.0);
      leaf.rotation.x = Math.PI / 2 + Math.sin(angle) * 0.4;
      leaf.rotation.y = angle;
      leaf.position.copy(stem.position);
      leaf.position.y += stemH / 2;
      g.add(leaf);
    }
  } else {
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.2, 5), std(C.green));
      blade.position.set(Math.cos(angle) * 0.16, 0.9, Math.sin(angle) * 0.16);
      blade.rotation.z = Math.cos(angle) * 0.45;
      blade.rotation.x = Math.sin(angle) * 0.45;
      g.add(blade);
    }
  }
  g.position.set(x, baseY, z);
  g.scale.setScalar(scale);
  apt.add(g);
}

function bookStack(x, z, rotY, yHeight = 0.02) {
  const group = new THREE.Group();
  const colors = [C.charcoal, 0xf5f3ef, 0xe1ded9, 0xa58a74, 0xb89078];
  for (let i = 0; i < 4; i++) {
    const b = box(0.64, 0.08, 0.52, std(colors[i % colors.length]), 0, 0.04 + i * 0.08, 0);
    b.rotation.y = (Math.random() - 0.5) * 0.22;
    group.add(b);
  }
  group.position.set(x, yHeight, z);
  group.rotation.y = rotY;
  apt.add(group);
}

function poster(x, y, w, h, titleText, subtitleText) {
  apt.add(box(w + 0.06, h + 0.06, 0.02, std(C.charcoal), x, y, -6.04));
  const canvasP = document.createElement("canvas");
  canvasP.width = 256; canvasP.height = 360;
  const ctx = canvasP.getContext("2d");
  ctx.fillStyle = "#faf9f6"; ctx.fillRect(0, 0, 256, 360);
  ctx.fillStyle = "#202022"; ctx.textAlign = "center"; ctx.font = "italic 32px Georgia, serif";
  ctx.fillText(titleText, 128, 140);
  ctx.strokeStyle = "#cca37a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(78, 170); ctx.lineTo(178, 170); ctx.stroke();
  ctx.fillStyle = "#6e7282"; ctx.font = "14px monospace";
  ctx.fillText(subtitleText, 128, 205);
  ctx.fillText("// UNIT_01 OS", 128, 225);

  const posterTex = new THREE.CanvasTexture(canvasP);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: posterTex, side: THREE.DoubleSide }));
  m.position.set(x, y, -6.02);
  apt.add(m);
}

function makeTVArtTexture() {
  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 300;
  const ctx = cv.getContext("2d");
  
  // Plaster off-white background
  ctx.fillStyle = "#eeece8";
  ctx.fillRect(0, 0, 512, 300);
  
  // Subtle schematic background grid lines
  ctx.strokeStyle = "rgba(45, 45, 48, 0.04)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx < 512; gx += 40) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, 300); ctx.stroke();
  }
  for (let gy = 0; gy < 300; gy += 40) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(512, gy); ctx.stroke();
  }
  
  // Draw minimalist organic shapes
  ctx.fillStyle = "#cca37a"; // Warm Oak circle
  ctx.beginPath(); ctx.arc(320, 150, 90, 0, Math.PI * 2); ctx.fill();
  
  ctx.fillStyle = "#202022"; // Charcoal rectangle arch
  ctx.fillRect(140, 60, 100, 180);
  
  ctx.fillStyle = "#9a724d"; // Clay semi-circle
  ctx.beginPath(); ctx.arc(240, 190, 60, Math.PI, 0); ctx.fill();

  // Draw blueprint overlay lines
  ctx.strokeStyle = "rgba(204, 163, 122, 0.28)";
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(240, 190, 80, 0, Math.PI * 2); ctx.stroke();

  ctx.strokeStyle = "#202022"; // Minimalist pointer line
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(100, 150); ctx.lineTo(412, 150); ctx.stroke();

  // Dotted laser guidelines
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = "rgba(154, 114, 77, 0.35)";
  ctx.beginPath(); ctx.moveTo(240, 20); ctx.lineTo(240, 280); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(40, 150); ctx.lineTo(472, 150); ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  // Code readouts / technical labels
  ctx.font = "9px monospace";
  ctx.fillStyle = "rgba(45, 45, 48, 0.45)";
  ctx.fillText("SYS.REF: LOUNGE_01", 24, 26);
  ctx.fillText("COORD: X -7.80 Y 3.60 Z -5.96", 24, 38);
  ctx.fillText("AESTHETIC_SYS: SCANDINAVIAN_LOFT", 24, 50);
  ctx.fillText("[LOCK STATE: SECURE // ACTIVE]", 24, 282);
  ctx.fillText("SCALE: 1:25", 432, 282);

  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

function makeIDETexture() {
  const cv = document.createElement("canvas");
  cv.width = 1024; cv.height = 512;
  const ctx = cv.getContext("2d");
  
  // Off-white editor
  ctx.fillStyle = "#FAF9F8";
  ctx.fillRect(0, 0, 1024, 512);
  
  // Sidebar
  ctx.fillStyle = "#F3F1ED";
  ctx.fillRect(0, 0, 240, 512);
  
  ctx.font = "bold 15px 'Inter', sans-serif";
  ctx.fillStyle = "#6e7282";
  ctx.fillText("EXPLORER: 3D-PORTFOLIO", 20, 36);
  
  const folders = ["▸ .git", "▸ css", "▾ js", "    ▤ apartment.js", "    ▤ main.js", "▸ images", "▤ apartment.html"];
  folders.forEach((f, i) => {
    ctx.font = f.includes("apartment.js") ? "bold 15px 'Inter', sans-serif" : "15px 'Inter', sans-serif";
    ctx.fillStyle = f.includes("apartment.js") ? "#cca37a" : "#202022";
    ctx.fillText(f, 30, 80 + i * 28);
  });
  
  // Tab Bar
  ctx.fillStyle = "#EAE6E1";
  ctx.fillRect(240, 0, 784, 45);
  ctx.fillStyle = "#FAF9F8";
  ctx.fillRect(240, 0, 160, 45);
  ctx.font = "14px monospace";
  ctx.fillStyle = "#202022";
  ctx.fillText("showcase.sh", 264, 26);
  ctx.fillStyle = "#cca37a";
  ctx.fillRect(240, 41, 160, 4);
  
  const lines = [
    "#!/bin/bash",
    "echo \"Initializing Retro Pixel 3D Loft OS...\"",
    "STATUS=0",
    "for sector in renderer physics HUD_overlays; do",
    "  echo \"Configuring retro rendering scaling: 4x\"",
    "  compile_pixelated_engine --aliasing=crisp || STATUS=1",
    "done",
    "if [ $STATUS -eq 0 ]; then",
    "  echo \"SYSTEM SUCCESS: Retro pixelated 3D world ready.\"",
    "  launch_spatial_interface --interactive",
    "else",
    "  echo \"ERROR: Subpixel rasterization mismatch.\"",
    "fi",
    "",
    "jvoclarit@pixel_3d_os:~$ _"
  ];
  
  ctx.font = "17px 'JetBrains Mono', monospace";
  lines.forEach((line, i) => {
    ctx.fillStyle = "#b4b2ac";
    ctx.fillText((i + 1).toString().padStart(2), 268, 90 + i * 26);
    if (line.startsWith("#")) {
      ctx.fillStyle = "#8d91a2";
    } else if (line.includes("echo") || line.includes("compile_pixelated_engine") || line.includes("launch_spatial_interface")) {
      ctx.fillStyle = "#9a724d";
    } else if (line.includes("\"") || line.includes("jvoclarit")) {
      ctx.fillStyle = "#cca37a";
    } else if (line.includes("if ") || line.includes("for ") || line.includes("then") || line.includes("else") || line.includes("fi") || line.includes("done")) {
      ctx.fillStyle = "#202022";
    } else {
      ctx.fillStyle = "#4a4944";
    }
    ctx.fillText(line, 310, 90 + i * 26);
  });
  
  const tex = new THREE.CanvasTexture(cv);
  return new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff });
}

// ============================================================
//  scroll-driven camera path
// ============================================================
const EYE = [
  new THREE.Vector3(-15.0, 2.7, 5.0),
  new THREE.Vector3(-9.0, 2.1, 4.6),
  new THREE.Vector3(-3.0, 1.7, 3.3),
  new THREE.Vector3(3.0, 2.0, 4.4),
  new THREE.Vector3(11.5, 2.3, 4.0),
];
const LOOK = [
  new THREE.Vector3(-13.0, 1.5, -2.0),
  new THREE.Vector3(-8.0, 1.3, -5.0),
  new THREE.Vector3(-2.5, 1.35, -5.0),
  new THREE.Vector3(4.0, 1.5, -5.0),
  new THREE.Vector3(15.5, 1.7, -2.5),
];
const eyeCurve = new THREE.CatmullRomCurve3(EYE, false, "catmullrom", 0.5);
const lookCurve = new THREE.CatmullRomCurve3(LOOK, false, "catmullrom", 0.5);
const N = EYE.length;

let smoothP = 0;
const eyeV = new THREE.Vector3();
const lookV = new THREE.Vector3();
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

function scrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
}

if (!isTouch) {
  window.addEventListener("mousemove", (e) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5);
    mouse.ty = (e.clientY / window.innerHeight - 0.5);
    mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });
}

// ============================================================
//  HUD wiring
// ============================================================
const hud = {
  coords: document.getElementById("hud-coords"),
  zoneIdx: document.getElementById("hud-zone-idx"),
  zoneName: document.getElementById("hud-zone-name"),
  rail: document.getElementById("hud-rail"),
  dots: Array.prototype.slice.call(document.querySelectorAll(".map__dot")),
};
const ZONE_NAMES = ["FOYER", "LOUNGE", "STUDIO", "GALLERY", "TERRACE"];
let activeZone = -1;

function setActiveZone(i) {
  if (i === activeZone) return;
  activeZone = i;
  if (hud.zoneIdx) hud.zoneIdx.textContent = "0" + (i + 1) + " / 0" + N;
  if (hud.zoneName) {
    hud.zoneName.textContent = ZONE_NAMES[i];
    hud.zoneName.classList.remove("is-glitch");
    void hud.zoneName.offsetWidth;
    hud.zoneName.classList.add("is-glitch");
  }
  hud.dots.forEach((d, j) => d.classList.toggle("is-on", j === i));
}

const panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("is-active");
        const i = panels.indexOf(e.target);
        if (i >= 0) setActiveZone(i);
      } else {
        e.target.classList.remove("is-active");
      }
    });
  }, { threshold: 0.5 });
  panels.forEach((p) => io.observe(p));
} else {
  panels.forEach((p) => p.classList.add("is-active"));
  setActiveZone(0);
}

// ============================================================
//  Interactive Overlay Data & Zoom Logic
// ============================================================
function openProjectOverlay(id) {
  if (id === "showcase") {
    document.getElementById("project-overlay").classList.add("is-open");
  } else if (id === "about") {
    document.getElementById("about-overlay").classList.add("is-open");
  }
}

function zoomOut() {
  zoomTarget = 0;
  currentZoomedId = "";
  document.getElementById("project-overlay").classList.remove("is-open");
  document.getElementById("about-overlay").classList.remove("is-open");
}

function zoomToMonitor(xPos, id) {
  zoomTarget = 1;
  zoomPos.set(xPos, 2.2, -3.2);
  zoomLook.set(xPos, 2.2, -5.01);
  currentZoomedId = id;
  openProjectOverlay(id);
}

function zoomToTV(xPos) {
  zoomTarget = 1;
  zoomPos.set(xPos, 3.6, -3.8);
  zoomLook.set(xPos, 3.6, -5.96);
  currentZoomedId = "about";
  openProjectOverlay("about");
}

const closeBtn = document.getElementById("project-overlay-close");
const backdrop = document.getElementById("project-overlay-backdrop");
if (closeBtn) closeBtn.addEventListener("click", zoomOut);
if (backdrop) backdrop.addEventListener("click", zoomOut);

const aboutCloseBtn = document.getElementById("about-overlay-close");
const aboutBackdrop = document.getElementById("about-overlay-backdrop");
if (aboutCloseBtn) aboutCloseBtn.addEventListener("click", zoomOut);
if (aboutBackdrop) aboutBackdrop.addEventListener("click", zoomOut);

const showcaseItems = document.querySelectorAll(".showcase-item");
showcaseItems.forEach(item => {
  const header = item.querySelector(".showcase-item__header");
  if (header) {
    header.addEventListener("click", () => {
      showcaseItems.forEach(i => i.classList.remove("is-expanded"));
      item.classList.add("is-expanded");
    });
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && zoomTarget === 1) {
    zoomOut();
  }
});

window.addEventListener("wheel", () => {
  if (zoomTarget === 1) zoomOut();
});
window.addEventListener("touchmove", () => {
  if (zoomTarget === 1) zoomOut();
});

window.addEventListener("click", (e) => {
  if (
    e.target.closest(".zone-card") || 
    e.target.closest(".project-overlay") || 
    e.target.closest(".hud") || 
    e.target.closest(".map")
  ) {
    return;
  }
  
  // Re-calculate raycast NDC dynamically to match retro buffer canvas layout coordinates
  const canvasBounds = canvas.getBoundingClientRect();
  mouseNDC.x = ((e.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
  mouseNDC.y = -((e.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;
  
  raycaster.setFromCamera(mouseNDC, camera);
  const intersects = raycaster.intersectObjects(interactiveObjects);
  
  if (intersects.length > 0) {
    const hitObj = intersects[0].object;
    const type = hitObj.userData.type;
    const id = hitObj.userData.projectId;
    
    if (type === "computer") {
      zoomToMonitor(hitObj.position.x, id);
    } else if (type === "tv") {
      zoomToTV(hitObj.position.x);
    }
  } else {
    if (zoomTarget === 1) {
      zoomOut();
    }
  }
});

hud.dots.forEach((d, i) => {
  d.addEventListener("click", () => {
    zoomOut();
    if (panels[i]) panels[i].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });
});

// ============================================================
//  render loop
// ============================================================
let frame = 0;
function tick() {
  requestAnimationFrame(tick);
  frame++;

  spinners.forEach(s => {
    if (s.mesh) {
      s.mesh.rotation.x += s.rx;
      s.mesh.rotation.y += s.ry;
      s.mesh.rotation.z += s.rz;
    }
  });

  const targetP = scrollProgress();
  smoothP += (targetP - smoothP) * (reduceMotion ? 1 : 0.075);
  const p = Math.min(Math.max(smoothP, 0), 1);

  eyeCurve.getPoint(p, eyeV);
  lookCurve.getPoint(p, lookV);

  mouse.x += (mouse.tx - mouse.x) * 0.05;
  mouse.y += (mouse.ty - mouse.y) * 0.05;
  const t = performance.now() * 0.001;
  const swayX = reduceMotion ? 0 : Math.sin(t * 0.4) * 0.12 + mouse.x * 0.9;
  const swayY = reduceMotion ? 0 : Math.cos(t * 0.32) * 0.07 - mouse.y * 0.5;

  zoomProgress += (zoomTarget - zoomProgress) * (reduceMotion ? 1 : 0.08);

  const baseEye = new THREE.Vector3(eyeV.x + swayX, eyeV.y + swayY, eyeV.z);
  const baseLook = new THREE.Vector3(lookV.x + mouse.x * 1.2, lookV.y - mouse.y * 0.6, lookV.z);

  const zoomedEye = new THREE.Vector3(zoomPos.x + swayX * 0.25, zoomPos.y + swayY * 0.25, zoomPos.z);
  const zoomedLook = new THREE.Vector3(zoomLook.x + swayX * 0.1, zoomLook.y + swayY * 0.1, zoomLook.z);

  const currentEye = new THREE.Vector3().lerpVectors(baseEye, zoomedEye, zoomProgress);
  const currentLook = new THREE.Vector3().lerpVectors(baseLook, zoomedLook, zoomProgress);

  camera.position.copy(currentEye);
  camera.lookAt(currentLook);

  // Hover Raycasting and highlight (scaled coords)
  if (!isTouch && interactiveObjects.length > 0) {
    if (zoomTarget === 0) {
      raycaster.setFromCamera(mouseNDC, camera);
      const intersects = raycaster.intersectObjects(interactiveObjects);
      if (intersects.length > 0) {
        const hitObj = intersects[0].object;
        document.body.style.cursor = "pointer";
        hitObj.material.color.setHex(0xffffff);
      } else {
        document.body.style.cursor = "default";
        interactiveObjects.forEach(obj => {
          obj.material.color.setHex(0xe1ded9);
        });
      }
    } else {
      document.body.style.cursor = "default";
      interactiveObjects.forEach(obj => {
        if (obj.userData.projectId === currentZoomedId) {
          obj.material.color.setHex(0xffffff);
        } else {
          obj.material.color.setHex(0xe1ded9);
        }
      });
    }
  }

  if (frame % 3 === 0) {
    if (hud.coords) {
      hud.coords.textContent =
        "X " + camera.position.x.toFixed(2).padStart(6) +
        "  Y " + camera.position.y.toFixed(2) +
        "  Z " + camera.position.z.toFixed(2);
    }
    if (hud.rail) hud.rail.style.transform = "scaleY(" + p + ")";
  }
  if (activeZone < 0) setActiveZone(Math.round(p * (N - 1)));

  renderer.render(scene, camera);
}

// ============================================================
//  resize + boot
// ============================================================
window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  
  // Resize renderer to low-res retro scale (without resizing HTML canvas layout footprint size)
  renderer.setSize(Math.round(w * PIXEL_SCALE), Math.round(h * PIXEL_SCALE), false);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
});

// Fade loader and tick
tick();
requestAnimationFrame(() => requestAnimationFrame(() => {
  document.body.classList.add("is-ready");
}));
