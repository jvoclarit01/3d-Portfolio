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

function makeGridTexture() {
  const cv = document.createElement("canvas");
  cv.width = 256; cv.height = 256;
  const ctx = cv.getContext("2d");
  // Dark carbon background
  ctx.fillStyle = "#0d0f12";
  ctx.fillRect(0, 0, 256, 256);
  // Grid lines
  ctx.strokeStyle = "rgba(0, 243, 255, 0.15)";
  ctx.lineWidth = 1;
  const step = 32;
  for (let x = 0; x < 256; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, x); ctx.lineTo(256, x); ctx.stroke();
  }
  // Neon cyan borders/highlights
  ctx.strokeStyle = "#00f3ff";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, 256, 256);
  
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeCircuitTexture() {
  const cv = document.createElement("canvas");
  cv.width = 256; cv.height = 256;
  const ctx = cv.getContext("2d");
  // Dark slate background
  ctx.fillStyle = "#14151b";
  ctx.fillRect(0, 0, 256, 256);
  
  // Draw circuit lines (hot pink pathways)
  ctx.strokeStyle = "#ff007f";
  ctx.lineWidth = 1.5;
  
  const pathways = [
    [[16, 16], [80, 16], [112, 48], [112, 128]],
    [[112, 48], [208, 48], [224, 64]],
    [[32, 192], [96, 192], [128, 224], [224, 224]],
    [[80, 96], [80, 128], [32, 176]],
    [[176, 112], [176, 176], [192, 192], [192, 240]]
  ];
  
  pathways.forEach(p => {
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) {
      ctx.lineTo(p[i][0], p[i][1]);
    }
    ctx.stroke();
  });
  
  // Draw cyan points/nodes
  ctx.fillStyle = "#00f3ff";
  const points = [
    [16, 16], [112, 128], [224, 64], [32, 176], [224, 224], [80, 96], [192, 240], [176, 112]
  ];
  points.forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt[0], pt[1], 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Glow
    ctx.fillStyle = "rgba(0, 243, 255, 0.35)";
    ctx.beginPath();
    ctx.arc(pt[0], pt[1], 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#00f3ff";
  });
  
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const texGrid = makeGridTexture();
const texCircuit = makeCircuitTexture();

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
  const fontFam = opt.font || "'Inter', sans-serif";
  ctx.font = `500 ${fs}px ${fontFam}`;
  let w = 0;
  lines.forEach((l) => { w = Math.max(w, ctx.measureText(l).width); });
  cv.width = Math.ceil(w + pad * 2);
  cv.height = Math.ceil(lines.length * lh + pad * 2);
  
  const c2 = cv.getContext("2d");
  c2.font = `500 ${fs}px ${fontFam}`;
  c2.textBaseline = "middle";
  
  const textColor = opt.color || "#202022";
  
  if (opt.isCarbon) {
    // Dark carbon background
    c2.fillStyle = "#12131c"; c2.fillRect(0, 0, cv.width, cv.height);
    // Draw subtle grid
    c2.strokeStyle = "rgba(0, 243, 255, 0.1)"; c2.lineWidth = 1;
    for (let gx = 0; gx < cv.width; gx += 20) {
      c2.beginPath(); c2.moveTo(gx, 0); c2.lineTo(gx, cv.height); c2.stroke();
    }
    for (let gy = 0; gy < cv.height; gy += 20) {
      c2.beginPath(); c2.moveTo(0, gy); c2.lineTo(cv.width, gy); c2.stroke();
    }
    // Glowing neon border
    c2.strokeStyle = textColor; c2.lineWidth = 3;
    c2.strokeRect(4, 4, cv.width - 8, cv.height - 8);
  } else if (opt.box) {
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
  apt.add(box(7.5, 0.4, 13, std(C.floor, { map: texGrid }), -13.25, 0.2, 0.3)); // Foyer/Kitchen
  apt.add(box(6.5, 0.4, 13, std(C.floor, { map: texGrid }), -2.75, 0.2, 0.3));  // Workspace
  apt.add(box(7.0, 0.4, 13, std(C.floor, { map: texGrid }), 4.0, 0.2, 0.3));   // Gallery
  apt.add(box(9.5, 0.4, 13, std(0xdcdad5, { rough: 0.7 }), 12.25, 0.2, 0.3)); // Terrace (Concrete)
  
  // Sunken Lounge segment
  apt.add(box(3.5, 0.1, 13, std(C.floor, { map: texGrid }), -7.75, 0.05, 0.3));
  
  // Steps details
  apt.add(box(0.3, 0.2, 13, std(C.wood, { map: texGrid }), -9.65, 0.2, 0.3));
  apt.add(box(0.3, 0.2, 13, std(C.wood, { map: texGrid }), -5.85, 0.2, 0.3));

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

  // Glowing baseboard LED strips
  apt.add(box(40, 0.03, 0.03, new THREE.MeshStandardMaterial({ color: 0x050505, emissive: C.wood, emissiveIntensity: 1.8 }), 0, 0.52, -6.0));

  // Baseboards (dark metal)
  apt.add(box(40, 0.2, 0.08, std(C.charcoal, { metal: 0.8, rough: 0.2 }), 0, 0.5, -6.05));
  apt.add(box(3.5, 0.2, 0.08, std(C.charcoal, { metal: 0.8, rough: 0.2 }), -7.75, 0.2, -6.05));

  // Ceiling Beams (dark metal)
  for (let cx = -16; cx <= 16; cx += 4) {
    apt.add(box(0.3, 0.4, 13, std(C.charcoal, { metal: 0.8, rough: 0.2 }), cx, 6.8, 0.3));
  }
  
  // Ceiling LED glow strip
  apt.add(box(40, 0.03, 0.03, new THREE.MeshStandardMaterial({ color: 0x050505, emissive: C.wood, emissiveIntensity: 1.2 }), 0, 6.9, 2.4));

  // Pendant lights
  const lampX = [-13, -8, -2.5, 3.5];
  lampX.forEach(x => {
    apt.add(place(cyl(0.012, 0.012, 2.0, std(C.charcoal)), x, 5.8, -1.5));
    apt.add(place(cyl(0.24, 0.08, 0.32, std(C.wood, { map: texGrid }), 12), x, 4.8, -1.5));
    
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00f3ff }));
    bulb.position.set(x, 4.62, -1.5);
    apt.add(bulb);
    
    // Increased intensity and range to match neon values
    const pl = new THREE.PointLight(0x00f3ff, 1.8, 12, 1.2);
    pl.position.set(x, 4.4, -1.5);
    scene.add(pl);
  });
})();

// ============================================================
//  ZONE 0 — FOYER
// ============================================================
(function foyer() {
  const x = -13;
  // Entrance door frame and panels (metallic cyber sliding door frame & glowing border lines)
  apt.add(box(0.1, 4.4, 2.6, std(C.charcoal, { metal: 0.9, rough: 0.15 }), -16.9, 2.6, 0.3));
  apt.add(box(0.18, 4.6, 0.14, std(C.charcoal, { metal: 0.8, rough: 0.2 }), -16.82, 2.6, -1.0));
  apt.add(box(0.18, 4.6, 0.14, std(C.charcoal, { metal: 0.8, rough: 0.2 }), -16.82, 2.6, 1.6));
  apt.add(box(0.18, 0.14, 2.7, std(C.charcoal, { metal: 0.8, rough: 0.2 }), -16.82, 4.9, 0.3));
  
  // Glowing cyan border lines
  apt.add(box(0.19, 4.6, 0.02, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: C.wood, emissiveIntensity: 1.5 }), -16.8, 2.6, -0.92));
  apt.add(box(0.19, 4.6, 0.02, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: C.wood, emissiveIntensity: 1.5 }), -16.8, 2.6, 1.52));
  apt.add(box(0.19, 0.02, 2.5, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: C.wood, emissiveIntensity: 1.5 }), -16.8, 4.82, 0.3));

  // Welcome Mat (Re-textured with texGrid)
  apt.add(box(3.2, 0.02, 2.0, std(C.charcoal, { map: texGrid }), x, 0.41, 3.2));

  // Framed poster (glowing grid schematic)
  poster(x, 3.4, 2.4, 3.0, "COGNITIVE_OS", "CONDO_UNIT_01");

  // Logo tag
  const logo = labelPlane(["J V", "EST. 2026"], 0.8, { color: "#202022", fs: 32 });
  logo.position.set(x + 3.2, 4.5, -5.7);
  apt.add(logo);

  // Table (wood top replaced with dark grid metal)
  apt.add(box(2.4, 0.08, 0.7, std(C.charcoal, { map: texGrid, metal: 0.9, rough: 0.15 }), x, 1.25, -5.2));
  apt.add(box(0.06, 0.85, 0.06, std(C.charcoal), x - 1.1, 0.825, -5.45));
  apt.add(box(0.06, 0.85, 0.06, std(C.charcoal), x + 1.1, 0.825, -5.45));
  apt.add(box(0.06, 0.85, 0.06, std(C.charcoal), x - 1.1, 0.825, -4.95));
  apt.add(box(0.06, 0.85, 0.06, std(C.charcoal), x + 1.1, 0.825, -4.95));

  // Mirror ring (metallic cyan chrome frame)
  const frameGeo = new THREE.TorusGeometry(0.8, 0.02, 8, 36);
  const frame = new THREE.Mesh(frameGeo, std(C.wood, { metal: 1.0, rough: 0.05 }));
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
  // Counter base wood replaced with brushed dark metal
  apt.add(box(1.8, 0.9, 0.8, std(C.charcoal, { metal: 0.85, rough: 0.25 }), x, yBase + 0.45, -5.5));
  apt.add(box(0.18, 0.03, 0.04, std(C.charcoal), x - 0.4, yBase + 0.75, -5.08));
  apt.add(box(0.18, 0.03, 0.04, std(C.charcoal), x + 0.4, yBase + 0.75, -5.08));
  
  // Counter top marble replaced with dark slate circuit board pattern
  apt.add(box(1.84, 0.06, 0.84, std(C.charcoal, { map: texCircuit, rough: 0.3, metal: 0.4 }), x, yBase + 0.93, -5.5));

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
  
  // Large rug (using Grid texture now)
  apt.add(box(4.6, 0.01, 7.8, std(C.charcoal, { map: texGrid }), x, yBase + 0.01, 0));

  // Sofa (replaced cream boucle with dark synth-leather std(C.cream))
  apt.add(box(1.2, 0.4, 2.0, std(C.cream, { rough: 0.4, metal: 0.15 }), x - 0.7, yBase + 0.2, -1.0));
  apt.add(box(1.2, 0.4, 2.0, std(C.cream, { rough: 0.4, metal: 0.15 }), x - 0.7, yBase + 0.2, 1.0));
  apt.add(box(1.2, 0.4, 1.8, std(C.cream, { rough: 0.4, metal: 0.15 }), x + 0.5, yBase + 0.2, 1.1));
  apt.add(box(0.6, 0.7, 4.0, std(C.cream, { rough: 0.4, metal: 0.15 }), x - 1.2, yBase + 0.55, 0));

  // cushions
  apt.add(box(0.2, 0.4, 0.6, std(C.charcoal), x - 0.8, yBase + 0.5, -1.0));
  apt.add(box(0.2, 0.4, 0.6, std(C.woodDark), x - 0.8, yBase + 0.5, 0.8));

  // Coffee Table with dark metallic slate top
  apt.add(place(cyl(0.7, 0.7, 0.06, std(C.charcoal, { metal: 0.85, rough: 0.15 })), x + 0.4, yBase + 0.43, -1.2));
  apt.add(box(0.04, 0.4, 0.04, std(C.charcoal), x + 0.1, yBase + 0.2, -1.5));
  apt.add(box(0.04, 0.4, 0.04, std(C.charcoal), x + 0.7, yBase + 0.2, -1.5));
  apt.add(box(0.04, 0.4, 0.04, std(C.charcoal), x + 0.4, yBase + 0.2, -0.9));
  apt.add(place(cyl(0.05, 0.05, 0.1, std(C.cream)), x + 0.3, yBase + 0.51, -1.1));

  // Arched Floor Lamp (sleek cyber-black pole with glowing magenta light)
  const lampGroup = new THREE.Group();
  const cyberBlack = std(0x08090c, { metal: 0.9, rough: 0.1 });
  lampGroup.add(place(cyl(0.02, 0.02, 2.2, cyberBlack), -1.0, 1.1, -2.6));
  lampGroup.add(place(cyl(0.22, 0.22, 0.04, cyberBlack), -1.0, 0.02, -2.6));
  lampGroup.add(box(0.02, 0.02, 1.2, cyberBlack, -1.0, 2.2, -2.0));
  lampGroup.add(box(0.02, 1.0, 0.02, cyberBlack, -1.0, 2.6, -1.4));
  
  const domeGeo = new THREE.SphereGeometry(0.18, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, cyberBlack);
  dome.rotation.x = Math.PI;
  dome.position.set(-1.0, 2.1, -1.4);
  lampGroup.add(dome);

  const bulbGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const bulb = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: 0xff007f }));
  bulb.position.set(-1.0, 2.0, -1.4);
  lampGroup.add(bulb);

  const pl = new THREE.PointLight(0xff007f, 1.8, 8, 1.5);
  pl.position.set(-1.0, 1.9, -1.4);
  lampGroup.add(pl);
  lampGroup.position.set(x, yBase, 0);
  apt.add(lampGroup);

  // Digital Art Frame TV (Interactive screen)
  apt.add(box(4.8, 2.8, 0.12, std(C.charcoal, { metal: 0.9, rough: 0.1 }), x, 3.6, -6.04));
  
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
  apt.add(box(0.9, 1.4, 0.8, std(C.charcoal, { map: texGrid }), cbX, cbY + 0.7, -5.3));
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
  
  // Tech Desk (carbon fiber top and matte black steel legs)
  apt.add(box(5.0, 0.06, 1.4, std(C.charcoal, { map: texGrid, metal: 0.9, rough: 0.2 }), x, yBase + 0.75, -5.0));
  apt.add(box(0.05, 0.75, 1.3, std(C.charcoal, { metal: 0.95, rough: 0.1 }), x - 2.3, yBase + 0.375, -5.0));
  apt.add(box(0.05, 0.75, 1.3, std(C.charcoal, { metal: 0.95, rough: 0.1 }), x + 2.3, yBase + 0.375, -5.0));

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

  // Glowing mesh ergonomic command seat
  const chairGroup = new THREE.Group();
  chairGroup.add(box(1.0, 0.08, 1.0, std(C.charcoal, { map: texGrid, rough: 0.3 }), 0, 0.45, 0));
  chairGroup.add(box(1.0, 0.6, 0.08, std(C.charcoal, { map: texGrid, rough: 0.3 }), 0, 0.75, -0.46));
  
  // Glowing cyan border light tube on seat back
  chairGroup.add(box(1.02, 0.04, 0.1, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: C.wood, emissiveIntensity: 1.5 }), 0, 1.04, -0.46));
  chairGroup.add(box(0.04, 0.62, 0.1, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: C.wood, emissiveIntensity: 1.5 }), -0.49, 0.75, -0.46));
  chairGroup.add(box(0.04, 0.62, 0.1, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: C.wood, emissiveIntensity: 1.5 }), 0.49, 0.75, -0.46));

  // Steel support legs
  chairGroup.add(place(cyl(0.025, 0.025, 0.45, std(C.charcoal, { metal: 0.95, rough: 0.1 })), -0.42, 0.225, 0.42));
  chairGroup.add(place(cyl(0.025, 0.025, 0.45, std(C.charcoal, { metal: 0.95, rough: 0.1 })), 0.42, 0.225, 0.42));
  chairGroup.add(place(cyl(0.025, 0.025, 0.45, std(C.charcoal, { metal: 0.95, rough: 0.1 })), -0.42, 0.225, -0.42));
  chairGroup.add(place(cyl(0.025, 0.025, 0.45, std(C.charcoal, { metal: 0.95, rough: 0.1 })), 0.42, 0.225, -0.42));
  chairGroup.position.set(x, yBase, -3.4);
  apt.add(chairGroup);

  apt.add(box(0.3, 0.5, 0.3, std(C.charcoal), x - 2.2, yBase + 1.0, -5.1));
  apt.add(box(0.3, 0.5, 0.3, std(C.charcoal), x + 2.2, yBase + 1.0, -5.1));
  apt.add(box(0.48, 0.02, 0.32, std(C.charcoal, { metal: 0.9, rough: 0.25 }), x - 1.2, yBase + 0.79, -4.6));
  apt.add(place(cyl(0.04, 0.04, 0.1, std(C.cream)), x + 1.2, yBase + 0.83, -4.6));

  // Orbitron Text Sign: CONDO TERMINAL // SECURE_PORTFOLIO
  const sign = labelPlane(["CONDO TERMINAL", "SECURE_PORTFOLIO"], 0.6, { color: "#00f3ff", fs: 34, font: "'Orbitron', 'JetBrains Mono', sans-serif" });
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
  
  // Slats screen wall partitions (dark slate metal)
  for (let sx = 0.6; sx <= 6.8; sx += 0.4) {
    apt.add(box(0.04, 3.0, 0.04, std(C.charcoal, { metal: 0.8, rough: 0.2 }), sx, yBase + 1.5, -4.2));
  }

  // Skills display dark carbon fiber plaques with Orbitron text
  const skills = [
    ["THREE.JS", "WEBGL"], ["JAVASCRIPT", "TYPESCRIPT"], ["REACT", "NEXT.JS"],
    ["GSAP", "CSS MOTION"], ["HTML5", "CSS3"], ["UI / UX", "FIGMA"],
  ];
  skills.forEach((s, i) => {
    const cx = x - 2.8 + (i % 3) * 2.8;
    const cy = yBase + 1.8 - Math.floor(i / 3) * 1.0;
    
    // Carbon fiber look, Orbitron typography, neon cyan borders
    const plaqueMat = makeLabel(s, { isCarbon: true, fs: 30, color: "#00f3ff", font: "'Orbitron', 'JetBrains Mono', sans-serif" }).tex;
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.72), new THREE.MeshBasicMaterial({ map: plaqueMat, side: THREE.DoubleSide }));
    plaque.position.set(cx, cy, -5.96);
    apt.add(plaque);
    
    // Backing plate (glowing cyan borders)
    apt.add(box(2.4, 0.8, 0.05, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: C.wood, emissiveIntensity: 0.8 }), cx, cy, -5.99));
  });

  const stackTag = labelPlane(["SKILLS & TOOLING"], 0.28, { color: "#6e7282", fs: 36 });
  stackTag.position.set(x, yBase + 2.5, -5.8);
  apt.add(stackTag);

  // LOFT platform columns and mezzanine ladder set to dark slate metal
  apt.add(box(0.12, 1.2, 0.12, std(C.charcoal, { metal: 0.9, rough: 0.15 }), 0.8, yBase + 0.6, -1.0));
  apt.add(box(0.12, 1.2, 0.12, std(C.charcoal, { metal: 0.9, rough: 0.15 }), 6.8, yBase + 0.6, -1.0));
  apt.add(box(0.12, 1.2, 0.12, std(C.charcoal, { metal: 0.9, rough: 0.15 }), 0.8, yBase + 0.6, -4.0));
  apt.add(box(0.12, 1.2, 0.12, std(C.charcoal, { metal: 0.9, rough: 0.15 }), 6.8, yBase + 0.6, -4.0));

  apt.add(box(6.2, 0.1, 3.4, std(C.charcoal, { map: texGrid, metal: 0.8, rough: 0.2 }), 3.8, yBase + 1.25, -2.5));
  apt.add(box(6.2, 0.04, 0.04, std(C.charcoal), 3.8, yBase + 1.85, -0.85));
  for (let rx = 1.0; rx <= 6.6; rx += 0.8) {
    apt.add(box(0.02, 0.6, 0.02, std(C.charcoal), rx, yBase + 1.55, -0.85));
  }

  // Mezzanine Ladder (dark slate metal)
  const ladderGroup = new THREE.Group();
  const darkSlateMat = std(C.charcoal, { metal: 0.9, rough: 0.2 });
  ladderGroup.add(place(cyl(0.02, 0.02, 1.6, darkSlateMat), -0.25, 0.8, 0));
  ladderGroup.add(place(cyl(0.02, 0.02, 1.6, darkSlateMat), 0.25, 0.8, 0));
  for (let r = 0.25; r <= 1.4; r += 0.25) {
    ladderGroup.add(box(0.5, 0.02, 0.04, darkSlateMat, 0, r, 0));
  }
  ladderGroup.rotation.x = 0.18;
  ladderGroup.position.set(1.4, yBase, -0.8);
  apt.add(ladderGroup);

  // Bed (dark metallic gray sheets and neon cyan accent sheets)
  const bedX = 4.4;
  const bedY = yBase + 1.3;
  const bedZ = -2.6;
  // Bed base
  apt.add(box(2.8, 0.22, 1.8, std(C.cream, { metal: 0.7, rough: 0.3 }), bedX, bedY + 0.11, bedZ));
  // Dark metallic gray main sheet
  apt.add(box(2.0, 0.23, 1.82, std(0x282b35, { metal: 0.8, rough: 0.3 }), bedX + 0.4, bedY + 0.11, bedZ));
  // Neon cyan accent sheet
  apt.add(box(0.8, 0.24, 1.84, std(C.wood, { metal: 0.5, rough: 0.4 }), bedX + 1.0, bedY + 0.11, bedZ));
  // Pillows
  apt.add(box(0.5, 0.12, 0.6, std(C.charcoal), bedX - 1.0, bedY + 0.26, bedZ - 0.4));
  apt.add(box(0.5, 0.12, 0.6, std(C.charcoal), bedX - 1.0, bedY + 0.26, bedZ + 0.4));
  // Nightstand (dark metal grid)
  apt.add(box(0.5, 0.35, 0.5, std(C.charcoal, { map: texGrid, metal: 0.9, rough: 0.15 }), bedX - 1.0, bedY + 0.175, bedZ - 1.1));
  // Nightstand lamp
  apt.add(place(cyl(0.04, 0.04, 0.12, std(C.wood, { metal: 0.8, rough: 0.2 })), bedX - 1.0, bedY + 0.41, bedZ - 1.1));
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

  // Table & Bench (tops changed to steel grid plates)
  apt.add(box(1.8, 0.05, 1.1, std(C.charcoal, { map: texGrid, metal: 0.95, rough: 0.15 }), x + 1.2, yBase + 0.72, 1.8));
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

  // Spinning wireframe hologram globe
  const holoGeo = new THREE.IcosahedronGeometry(0.22, 1);
  const holoMat = new THREE.MeshBasicMaterial({ color: C.wood, wireframe: true, transparent: true, opacity: 0.55 });
  const holoMesh = new THREE.Mesh(holoGeo, holoMat);
  holoMesh.position.set(x + 1.2, yBase + 1.1, 1.8);
  apt.add(holoMesh);
  spinners.push({ mesh: holoMesh, rx: 0.008, ry: 0.012, rz: 0.004 });

  const holoLight = new THREE.PointLight(C.wood, 0.6, 3, 1.5);
  holoLight.position.set(x + 1.2, yBase + 1.1, 1.8);
  scene.add(holoLight);

  // Bench top changed to steel grid plates
  apt.add(box(1.4, 0.04, 0.4, std(C.charcoal, { map: texGrid, metal: 0.95, rough: 0.15 }), x + 1.2, yBase + 0.42, 0.8));
  apt.add(box(0.04, 0.4, 0.3, std(C.charcoal), x + 0.6, yBase + 0.2, 0.8));
  apt.add(box(0.04, 0.4, 0.3, std(C.charcoal), x + 1.8, yBase + 0.2, 0.8));

  plant(x + 2.8, yBase, -1.5, "leafy", 0.7);

  // Orbitron Text Sign: LET'S BUILD // TOGETHER
  const sign = labelPlane(["LET'S BUILD", "TOGETHER"], 1.1, { color: "#00f3ff", fs: 36, font: "'Orbitron', 'JetBrains Mono', sans-serif" });
  sign.position.set(x - 2.8, 4.5, -5.6);
  apt.add(sign);
  plant(x - 3.8, yBase, -5.2, "leafy", 0.6);

  // Skyline (dark concrete monoliths with glowing neon window stripes)
  const cityscape = new THREE.Group();
  const monolithMat = std(0x111218, { rough: 0.9, metal: 0.1 }); // Dark concrete
  const neonMats = [
    new THREE.MeshBasicMaterial({ color: 0x00f3ff }), // neon cyan window stripe
    new THREE.MeshBasicMaterial({ color: 0xff007f })  // neon magenta window stripe
  ];
  
  for (let i = 0; i < 18; i++) {
    const h = 5 + Math.random() * 12;
    const w = 2.0 + Math.random() * 3.0;
    const bx = 24 + Math.random() * 20;
    const bz = -20 + Math.random() * 40;
    const by = h / 2 - 3;
    
    // The building block
    cityscape.add(box(w, h, w, monolithMat, bx, by, bz));
    
    // Add glowing window stripes on the front face (facing the apartment, towards negative X direction)
    const stripesCount = 2 + Math.floor(Math.random() * 3);
    const stripeMat = neonMats[i % neonMats.length];
    for (let s = 0; s < stripesCount; s++) {
      const stripeH = 0.8 + Math.random() * 1.5;
      const stripeW = 0.08 + Math.random() * 0.15;
      const sy = by - h/2 + Math.random() * (h - 1);
      const sz = bz - w/2 + Math.random() * w;
      
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, stripeH, stripeW), stripeMat);
      stripe.position.set(bx - w/2 - 0.02, sy, sz);
      cityscape.add(stripe);
    }
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
  // Poster backing frame: dark metal
  apt.add(box(w + 0.06, h + 0.06, 0.02, std(C.charcoal, { metal: 0.9, rough: 0.1 }), x, y, -6.04));
  
  const canvasP = document.createElement("canvas");
  canvasP.width = 256; canvasP.height = 360;
  const ctx = canvasP.getContext("2d");
  
  // OLED Dark mode background for poster
  ctx.fillStyle = "#07080d";
  ctx.fillRect(0, 0, 256, 360);
  
  // Draw thin cyan grid schematic lines
  ctx.strokeStyle = "rgba(0, 243, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx < 256; gx += 20) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, 360); ctx.stroke();
  }
  for (let gy = 0; gy < 360; gy += 20) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(256, gy); ctx.stroke();
  }
  
  // Draw simple schematic shapes (circles/lines in cyan/pink)
  ctx.strokeStyle = "rgba(0, 243, 255, 0.3)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(128, 150, 60, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(128, 150, 40, 0, Math.PI * 2); ctx.stroke();
  
  ctx.strokeStyle = "#ff007f"; // pink pathway
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, 150); ctx.lineTo(198, 150); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(128, 80); ctx.lineTo(128, 220); ctx.stroke();
  
  // Glowing title texts
  ctx.fillStyle = "#00f3ff"; // Glowing neon cyan
  ctx.textAlign = "center";
  ctx.font = "bold 16px 'Orbitron', 'JetBrains Mono', monospace";
  ctx.fillText(titleText, 128, 255);
  
  ctx.fillStyle = "#6e7282";
  ctx.font = "11px monospace";
  ctx.fillText(subtitleText, 128, 285);
  
  ctx.fillStyle = "#ff007f"; // hot pink OS label
  ctx.font = "bold 10px monospace";
  ctx.fillText("// SECURE_OS_LOADED", 128, 305);

  const posterTex = new THREE.CanvasTexture(canvasP);
  // Basic material is self-illuminating, which gives it that "glowing schematic" look
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: posterTex, side: THREE.DoubleSide }));
  m.position.set(x, y, -6.02);
  apt.add(m);
}

function makeTVArtTexture() {
  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 300;
  const ctx = cv.getContext("2d");
  
  // OLED Dark background
  ctx.fillStyle = "#07080d";
  ctx.fillRect(0, 0, 512, 300);
  
  // Cybernetic Grid
  ctx.strokeStyle = "rgba(0, 243, 255, 0.15)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx < 512; gx += 32) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, 300); ctx.stroke();
  }
  for (let gy = 0; gy < 300; gy += 32) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(512, gy); ctx.stroke();
  }
  
  // Outer diagnostics frame
  ctx.strokeStyle = "#ff007f"; // hot pink frame
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 492, 280);
  
  // Concentric radar/diagnostic circles in center
  ctx.strokeStyle = "rgba(0, 243, 255, 0.5)";
  ctx.beginPath(); ctx.arc(256, 150, 80, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(255, 0, 127, 0.4)";
  ctx.beginPath(); ctx.arc(256, 150, 50, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(0, 243, 255, 0.8)";
  ctx.beginPath(); ctx.arc(256, 150, 20, 0, Math.PI * 2); ctx.stroke();
  
  // Radar sweeping lines or angle ticks
  ctx.strokeStyle = "rgba(0, 243, 255, 0.3)";
  for (let d = 0; d < 360; d += 45) {
    const rad = d * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(rad) * 20, 150 + Math.sin(rad) * 20);
    ctx.lineTo(256 + Math.cos(rad) * 80, 150 + Math.sin(rad) * 80);
    ctx.stroke();
  }
  
  // Cybernetic diagnostic waveform
  ctx.strokeStyle = "#39ff14"; // Acid green waveform
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let tx = 20; tx < 492; tx += 4) {
    const ty = 150 + Math.sin(tx * 0.05) * 15 * Math.cos(tx * 0.01);
    if (tx === 20) ctx.moveTo(tx, ty);
    else ctx.lineTo(tx, ty);
  }
  ctx.stroke();

  // Technical readouts / text overlays
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "#00f3ff"; // Cyan
  ctx.fillText("SYS.REF: CONDO_UNIT_01", 24, 30);
  ctx.fillText("SECTOR: lounge_cyber", 24, 45);
  ctx.fillText("MODULE: DISPLAY_MONITOR", 24, 60);
  
  ctx.fillStyle = "#ff007f"; // Magenta
  ctx.fillText("CORE_STATUS: ACTIVE", 24, 250);
  ctx.fillText("NET_INTEGRITY: 99.87%", 24, 265);
  
  ctx.fillStyle = "#39ff14"; // Acid Green
  ctx.fillText("SECURE // CONNECTION", 360, 30);
  ctx.fillText("FPS: 60.00 // BUFFER_OK", 360, 45);
  ctx.fillText("REFRESH: 144HZ", 360, 60);
  
  // Draw some random code-like numbers
  ctx.fillStyle = "rgba(0, 243, 255, 0.5)";
  ctx.font = "8px monospace";
  ctx.fillText("0x7F4A9C // MEM_OK", 390, 240);
  ctx.fillText("ADDR: 192.168.10.8", 390, 252);
  ctx.fillText("PORT: 8080 // SECURE", 390, 264);
  
  // Center label overlay
  ctx.fillStyle = "#07080d";
  ctx.fillRect(216, 140, 80, 20);
  ctx.strokeStyle = "#00f3ff";
  ctx.strokeRect(216, 140, 80, 20);
  ctx.fillStyle = "#00f3ff";
  ctx.font = "9px monospace";
  ctx.textAlign = "center";
  ctx.fillText("DIAGNOSTIC", 256, 153);
  
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

function makeIDETexture() {
  const cv = document.createElement("canvas");
  cv.width = 1024; cv.height = 512;
  const ctx = cv.getContext("2d");
  
  // OLED Dark Editor Background
  ctx.fillStyle = "#07080d";
  ctx.fillRect(0, 0, 1024, 512);
  
  // Dark Sidebar
  ctx.fillStyle = "#12131c";
  ctx.fillRect(0, 0, 240, 512);
  
  ctx.font = "bold 15px 'Orbitron', 'JetBrains Mono', monospace";
  ctx.fillStyle = "#00f3ff"; // Glowing cyan explorer title
  ctx.fillText("SECURE_TERM: CONDO_OS", 20, 36);
  
  const folders = ["▸ .sys_core", "▸ firmware", "▾ modules", "    ▤ condo_core.py", "    ▤ interface.js", "▸ secure_logs", "▤ config.json"];
  folders.forEach((f, i) => {
    ctx.font = f.includes("condo_core.py") ? "bold 15px 'JetBrains Mono', monospace" : "15px 'JetBrains Mono', monospace";
    ctx.fillStyle = f.includes("condo_core.py") ? "#39ff14" : "#6e7282";
    ctx.fillText(f, 30, 80 + i * 28);
  });
  
  // Tab Bar
  ctx.fillStyle = "#0a0c16";
  ctx.fillRect(240, 0, 784, 45);
  ctx.fillStyle = "#07080d";
  ctx.fillRect(240, 0, 180, 45);
  ctx.font = "14px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#00f3ff"; // Neon Cyan active tab text
  ctx.fillText("condo_core.py", 264, 26);
  ctx.fillStyle = "#39ff14"; // Acid Green active tab underline
  ctx.fillRect(240, 41, 180, 4);
  
  const lines = [
    "import time",
    "import condo_firmware as sys",
    "",
    "def initiate_condo_protocols():",
    "    print(\"Initializing Security Firewall...\")",
    "    sys.firewall.load_rules(profile='high_secure')",
    "    sys.power_grid.set_glow_state(color='cyan', intensity=1.8)",
    "    for zone in range(5):",
    "        sys.log(f\"Checking stability: Zone 0{zone+1}... OK\")",
    "        time.sleep(0.1)",
    "    ",
    "    if sys.get_auth_state() == \"AUTHORIZED\":",
    "        print(\"ACCESS GRANTED // PORTFOLIO READY.\")",
    "        return True",
    "    return False",
    "",
    "initiate_condo_protocols() # EXECUTE"
  ];
  
  ctx.font = "16px 'JetBrains Mono', monospace";
  lines.forEach((line, i) => {
    // Line number
    ctx.fillStyle = "#3a3f50";
    ctx.fillText((i + 1).toString().padStart(2), 268, 86 + i * 25);
    
    if (line.trim().startsWith("import") || line.trim().startsWith("def ") || line.trim().startsWith("return ") || line.trim().startsWith("if ") || line.trim().startsWith("for ")) {
      ctx.fillStyle = "#ff007f"; // hot pink keywords
    } else if (line.includes("\"") || line.includes("'")) {
      ctx.fillStyle = "#39ff14"; // acid green strings
    } else if (line.includes("print") || line.includes("initiate_condo_protocols")) {
      ctx.fillStyle = "#00f3ff"; // cyan functions
    } else {
      ctx.fillStyle = "#ffffff"; // white code
    }
    ctx.fillText(line, 310, 86 + i * 25);
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
