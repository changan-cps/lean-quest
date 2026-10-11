// Lean Quest — code-authored 3D assets for the Assembly vertical slice.
//
// Every mesh here is generated from parameters in this file (no third-party
// models, scans or photos), so the exported GLBs are original work of this
// project. Run tools/assets/build_glb.py to (re)export assets/factory/*.glb.
//
// Conventions: metres, +Y up, the assembly line flows along +X, car nose = +X.
// Materials are named M_* — the runtime (scene3d/assets.mjs) attaches the KTX2
// texture sets listed in assets/factory/manifest.json by these names.
import * as THREE from '../../three.module.min.js';
import { mergeGeometries, mergeVertices } from '../../vendor/three/BufferGeometryUtils.js';
import { GLTFExporter } from './lib/GLTFExporter.js';
import { MeshoptSimplifier } from './lib/meshopt_simplifier.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- materials
const MATS = {};
function std(name, color, rough = 0.6, metal = 0, extra = {}) {
  if (MATS[name]) return MATS[name];
  const m = new THREE.MeshStandardMaterial({ name, color, roughness: rough, metalness: metal, ...extra });
  return (MATS[name] = m);
}
function phys(name, color, opts) {
  if (MATS[name]) return MATS[name];
  const m = new THREE.MeshPhysicalMaterial({ name, color, ...opts });
  return (MATS[name] = m);
}
const M = {
  paint: () => phys('M_CarPaint', '#1d4f91', { metalness: 0.55, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.06 }),
  glass: () => phys('M_Glass', '#0e171d', { metalness: 0.1, roughness: 0.03, transparent: true, opacity: 0.78 }),
  blackTrim: () => std('M_BlackTrim', '#15181b', 0.55, 0),
  gloss: () => phys('M_GlossBlack', '#0b0d0f', { roughness: 0.15, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }),
  chrome: () => std('M_Chrome', '#d9dde2', 0.12, 1),
  headlamp: () => std('M_Headlamp', '#e9f2ff', 0.1, 0.2, { emissive: new THREE.Color('#cfe4ff'), emissiveIntensity: 0.35 }),
  taillamp: () => std('M_Taillamp', '#8e0f16', 0.25, 0, { emissive: new THREE.Color('#ff2a2a'), emissiveIntensity: 0.25 }),
  tyre: () => std('M_Tyre', '#1c1d1f', 0.9, 0),
  alloy: () => std('M_Alloy', '#8d949b', 0.28, 0.9),
  disc: () => std('M_BrakeDisc', '#6d7175', 0.45, 0.8),
  seat: () => std('M_SeatFabric', '#26292d', 0.85, 0),
  dash: () => std('M_Dash', '#202326', 0.7, 0),
  steel: () => std('M_Steel', '#9aa3ab', 0.4, 0.85),
  steelDark: () => std('M_SteelDark', '#4c545b', 0.5, 0.75),
  slat: () => std('M_Slat', '#ffffff', 0.5, 0.8),
  safetyYellow: () => std('M_SafetyYellow', '#f2c230', 0.45, 0),
  safetyBlack: () => std('M_SafetyBlack', '#1b1b1b', 0.6, 0),
  beamBlue: () => std('M_BeamBlue', '#2d5f8f', 0.45, 0.4),
  pipeIvory: () => std('M_PipeIvory', '#e7e0cf', 0.4, 0.1),
  joint: () => std('M_JointBlack', '#232425', 0.5, 0.3),
  roller: () => std('M_Roller', '#c4c9cd', 0.35, 0.8),
  binBlue: () => std('M_BinBlue', '#1f5fa8', 0.55, 0),
  binGrey: () => std('M_BinGrey', '#8b9298', 0.55, 0),
  label: () => std('M_Label', '#f4f2ea', 0.8, 0),
  partZinc: () => std('M_PartZinc', '#b7b9a8', 0.35, 0.9),
  partBlack: () => std('M_PartBlack', '#2a2b2d', 0.5, 0.2),
  andonR: () => std('M_AndonRed', '#7a1010', 0.3, 0, { emissive: new THREE.Color('#ff2020'), emissiveIntensity: 0 }),
  andonY: () => std('M_AndonAmber', '#7a5a08', 0.3, 0, { emissive: new THREE.Color('#ffb000'), emissiveIntensity: 0 }),
  andonG: () => std('M_AndonGreen', '#0d5a22', 0.3, 0, { emissive: new THREE.Color('#20e060'), emissiveIntensity: 0 }),
  ledPanel: () => std('M_LEDPanel', '#ffffff', 0.4, 0, { emissive: new THREE.Color('#f4f8ff'), emissiveIntensity: 1.6 }),
  screen: () => std('M_Screen', '#0c1a26', 0.3, 0, { emissive: new THREE.Color('#2b7bd6'), emissiveIntensity: 0.6 }),
  ptl: () => std('M_PickLight', '#355a2f', 0.4, 0, { emissive: new THREE.Color('#38ff6a'), emissiveIntensity: 0 }),
  mat: () => std('M_RubberMat', '#2b2e31', 0.95, 0),
  toolBody: () => std('M_ToolBody', '#2b3138', 0.45, 0.3),
  toolAccent: () => std('M_ToolAccent', '#e2a21a', 0.45, 0.1),
  cable: () => std('M_Cable', '#151515', 0.6, 0),
  cartBlue: () => std('M_CartBlue', '#285e9c', 0.5, 0.3),
  wheelCastor: () => std('M_Castor', '#2e2f31', 0.7, 0),
  // worker / PPE
  shirt: () => std('M_UniformShirt', '#1f2b47', 0.85, 0),
  piping: () => std('M_UniformPiping', '#c4202e', 0.7, 0),
  pants: () => std('M_UniformPants', '#b49d76', 0.88, 0),
  skin: () => std('M_Skin', '#c99470', 0.62, 0),
  hair: () => std('M_Hair', '#1a1411', 0.7, 0),
  helmet: () => std('M_Helmet', '#1e63c4', 0.32, 0),
  helmetLeader: () => std('M_HelmetWhite', '#eef1f4', 0.32, 0),
  glasses: () => phys('M_SafetyGlasses', '#2a3540', { roughness: 0.08, metalness: 0, transparent: true, opacity: 0.55 }),
  gloves: () => std('M_Gloves', '#d4d7d1', 0.9, 0),
  shoes: () => std('M_SafetyShoes', '#1d1e20', 0.6, 0),
  badge: () => std('M_Badge', '#f5f5f0', 0.6, 0),
  eye: () => std('M_Eye', '#16120f', 0.3, 0),
  walkway: () => std('M_Walkway', '#3d7a58', 0.55, 0),
  floor: () => std('M_FloorEpoxy', '#ffffff', 0.4, 0),
  wall: () => std('M_Wall', '#c9d0d6', 0.85, 0),
  wallLow: () => std('M_WallLow', '#3c5468', 0.8, 0),
  window: () => std('M_Window', '#a9c6db', 0.2, 0.1, { emissive: new THREE.Color('#bcd6ea'), emissiveIntensity: 0.55 }),
  truss: () => std('M_Truss', '#7c8791', 0.5, 0.6),
  oil: () => phys('M_OilSpill', '#0f0d0a', { roughness: 0.05, metalness: 0, transparent: true, opacity: 0.85 }),
  cardboard: () => std('M_Cardboard', '#b18a5a', 0.9, 0),
};

// ------------------------------------------------------------ mesh builder
// Collects primitives, then merges them into one mesh per material per node
// (fewer draw calls on phones) and adds a simplified *_LOD1 sibling.
class Kit {
  constructor() { this.buckets = new Map(); }
  add(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
    const m = new THREE.Matrix4().compose(V(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), V(...scale));
    return this.addM(geo, mat, m);
  }
  addM(geo, mat, matrix) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(matrix);
    if (!this.buckets.has(mat)) this.buckets.set(mat, []);
    this.buckets.get(mat).push(g);
    return this;
  }
  build(name, parent, { lod = true } = {}) {
    for (const [mat, list] of this.buckets) {
      const merged = mergeVertices(mergeGeometries(list), 1e-4);
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = name + '__' + mat.name.replace('M_', '');
      parent.add(mesh);
      const tris = merged.index.count / 3;
      if (lod && tris > 400) {
        const pos = new Float32Array(merged.attributes.position.array);
        const target = Math.floor((merged.index.count * 0.3) / 3) * 3;
        const [idx] = MeshoptSimplifier.simplify(new Uint32Array(merged.index.array), pos, 3, target, 0.01, ['LockBorder']);
        if (idx.length < merged.index.count * 0.85) {
          const g1 = new THREE.BufferGeometry();
          for (const k of ['position', 'normal', 'uv']) g1.setAttribute(k, merged.attributes[k]);
          g1.setIndex(new THREE.BufferAttribute(idx, 1));
          const m1 = new THREE.Mesh(g1, mat);
          m1.name = mesh.name + '_LOD1';
          parent.add(m1);
        }
      }
    }
    this.buckets.clear();
  }
}
const node = (name, parent, pos = [0, 0, 0], rot = [0, 0, 0]) => {
  const g = new THREE.Group(); g.name = name; g.position.set(...pos); g.rotation.set(...rot);
  if (parent) parent.add(g); return g;
};

// loft: rings of points along X -> tube-like surface with UVs (closed ring, open ends capped)
function loft(sections, ringPts, cap = true) {
  // sections: [{x, pts:[[y,z]...]}]; ringPts = points per ring
  const pos = [], uv = [], idx = [];
  const S = sections.length;
  for (let i = 0; i < S; i++) {
    const s = sections[i];
    for (let j = 0; j <= ringPts; j++) {
      const p = s.pts[j % ringPts];
      pos.push(s.x, p[0], p[1]);
      uv.push(i / (S - 1), j / ringPts);
    }
  }
  const row = ringPts + 1;
  for (let i = 0; i < S - 1; i++) for (let j = 0; j < ringPts; j++) {
    const a = i * row + j, b = a + row, c = b + 1, d = a + 1;
    idx.push(a, b, d, b, c, d);
  }
  if (cap) for (const [i, flip] of [[0, true], [S - 1, false]]) {
    const s = sections[i];
    let cy = 0, cz = 0; for (const p of s.pts) { cy += p[0]; cz += p[1]; }
    const c = pos.length / 3; pos.push(s.x, cy / ringPts, cz / ringPts); uv.push(0.5, 0.5);
    for (let j = 0; j < ringPts; j++) {
      const a = i * row + j, b = i * row + j + 1;
      flip ? idx.push(c, a, b) : idx.push(c, b, a);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// rounded-rect / superellipse ring in the YZ plane
function superRing(cy, hh, hw, n, count, bottomFlat = 0) {
  const pts = [];
  for (let j = 0; j < count; j++) {
    const t = (j / count) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const z = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * hw;
    let y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * hh;
    if (bottomFlat && y < 0) y *= 1 - bottomFlat;
    pts.push([cy + y, z]);
  }
  return pts;
}

// ------------------------------------------------------------------- car
// Compact electric SUV proportions: 4.40 L x 1.82 W x 1.60 H, wheelbase 2.70.
export const CAR = { L: 4.4, W: 1.82, wheelbase: 2.7, track: 1.56, tyreR: 0.345, tyreW: 0.225, wheelX: [1.33, -1.37] };

function carBodyProfile(x) {
  const half = CAR.L / 2, u = x / half;
  const endF = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 9)), 0.42); // rounds nose & tail
  const hw = (0.905 - 0.06 * Math.pow(Math.max(0, u), 2) - 0.04 * Math.pow(Math.max(0, -u), 2)) * (0.55 + 0.45 * endF);
  // beltline / hood / deck heights
  const hood = 0.88 + 0.105 * smooth(2.05, 0.95, x);     // nose 0.88 -> 0.985 at cowl
  const deck = 1.00 - 0.10 * smooth(-1.6, -2.2, x);      // tail drops a little
  let top = x > 0.95 ? hood : x < -1.6 ? deck : 0.985;
  let bot = 0.30 + 0.12 * smooth(1.85, 2.2, x) + 0.14 * smooth(-1.95, -2.2, x);
  // wheel arches: lift the lower edge around each axle
  for (const wx of CAR.wheelX) {
    const d = Math.abs(x - wx), r = CAR.tyreR + 0.07;
    if (d < r) bot = Math.max(bot, 0.33 + Math.sqrt(r * r - d * d) * 1.02);
  }
  top = bot + (top - bot) * (0.6 + 0.4 * endF);
  return { hw, top, bot };
}
function roofY(x) {
  // windshield 1.00 -> 0.28, roof to -0.95, tailgate glass to -1.62
  if (x > 1.0 || x < -1.66) return 0;
  if (x > 0.28) return 0.985 + (1.585 - 0.985) * smooth(1.0, 0.28, x);
  if (x > -0.95) return 1.585 - 0.03 * smooth(0.28, -0.95, x);
  return 1.555 - (1.555 - 0.99) * smooth(-0.95, -1.66, x) * smooth(-0.95, -1.66, x);
}

// x of the body surface at (|z|, y) at the nose / tail (numeric search)
function surfX(z, y, dir) {
  let x = dir * CAR.L / 2;
  for (let i = 0; i < 500; i++, x -= dir * 0.003) {
    const p = carBodyProfile(x); if (y > p.top || y < p.bot) continue;
    const cy = (p.top + p.bot) / 2, hh = (p.top - p.bot) / 2, n = 4.6;
    const ty = Math.min(1, Math.abs((y - cy) / hh));
    if (p.hw * Math.pow(1 - Math.pow(ty, n), 1 / n) >= z) return x;
  }
  return x;
}
const noseX = (z, y) => surfX(z, y, 1), tailX = (z, y) => surfX(z, y, -1);

function wheelGeometry(kit, mat = {}) {
  // tyre: lathe of a rounded section, axis = Y (rotated to Z by the caller)
  const R = CAR.tyreR, W = CAR.tyreW, r0 = 0.235;
  const prof = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;                       // across the section
    const a = (t - 0.5) * Math.PI;              // -90..90deg
    const bulge = Math.cos(a);
    prof.push(new THREE.Vector2(r0 + (R - r0) * (0.55 + 0.45 * Math.pow(bulge, 0.35)), (t - 0.5) * W * (0.92 + 0.08 * bulge)));
  }
  prof.unshift(new THREE.Vector2(r0, -W * 0.46)); prof.push(new THREE.Vector2(r0, W * 0.46));
  const tyre = new THREE.LatheGeometry(prof.reverse(), 48);
  // lathe UV: u around circumference, v across width -> tread map
  kit.add(tyre, M.tyre(), [0, 0, 0], [Math.PI / 2, 0, 0]);
  // rim barrel + face
  kit.add(new THREE.CylinderGeometry(r0 + 0.004, r0 + 0.004, W * 0.82, 40, 1, true), M.alloy(), [0, 0, 0], [Math.PI / 2, 0, 0]);
  kit.add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 40), M.blackTrim(), [0, 0, W * 0.05], [Math.PI / 2, 0, 0]);
  kit.add(new THREE.TorusGeometry(0.21, 0.014, 6, 40), M.alloy(), [0, 0, W * 0.33]);
  kit.add(new THREE.CylinderGeometry(0.065, 0.075, 0.05, 20), M.alloy(), [0, 0, W * 0.34], [Math.PI / 2, 0, 0]);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    kit.add(new THREE.BoxGeometry(0.045, 0.16, 0.03), M.alloy(), [Math.cos(a) * 0.13, Math.sin(a) * 0.13, W * 0.3], [0, 0, a + Math.PI / 2]);
    kit.add(new THREE.CylinderGeometry(0.011, 0.011, 0.03, 8), M.chrome(), [Math.cos(a + 0.6) * 0.05, Math.sin(a + 0.6) * 0.05, W * 0.37], [Math.PI / 2, 0, 0]);
  }
  kit.add(new THREE.CylinderGeometry(0.17, 0.17, 0.025, 32), M.disc(), [0, 0, -W * 0.05], [Math.PI / 2, 0, 0]);
}

export function buildWheel() {
  const root = node('Wheel'); const k = new Kit(); wheelGeometry(k); k.build('Wheel', root); return root;
}

export function buildCar() {
  const root = node('Car');
  const kit = new Kit();
  // lower body
  const secs = [];
  const NS = 64, RP = 40;
  for (let i = 0; i < NS; i++) {
    const x = -CAR.L / 2 + (i / (NS - 1)) * CAR.L;
    const p = carBodyProfile(x);
    const cy = (p.top + p.bot) / 2, hh = (p.top - p.bot) / 2;
    secs.push({ x, pts: superRing(cy, hh, p.hw, 4.6, RP, 0.15) });
  }
  const body = node('Body', root);
  kit.add(loft(secs, RP), M.paint());
  // greenhouse (glass) + roof skin + pillars
  const gsecs = [], rsecs = [];
  const NG = 40;
  for (let i = 0; i < NG; i++) {
    const x = -1.66 + (i / (NG - 1)) * 2.66;
    const ry = Math.max(roofY(x), 0.995);
    const hh = Math.max((ry - 0.97) / 2, 0.004);
    const bw = carBodyProfile(x).hw - 0.05;
    const pts = [];
    for (let j = 0; j < RP; j++) {
      const t = (j / RP) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      const yy = 0.97 + hh + Math.sign(s) * Math.pow(Math.abs(s), 2 / 4) * hh;
      const taper = 1 - 0.24 * ((yy - 0.97) / 0.62);             // tumblehome
      pts.push([yy, Math.sign(c) * Math.pow(Math.abs(c), 2 / 4) * bw * taper]);
    }
    gsecs.push({ x, pts });
    if (x < 0.36 && x > -1.02) rsecs.push({ x, pts: pts.slice(Math.round(RP * 0.1), Math.round(RP * 0.4) + 1).map(([y, z]) => [y + 0.01, z * 1.01]) });
  }
  kit.build('Body', body);
  const glass = node('Glass', root);
  kit.add(loft(gsecs, RP), M.glass());
  kit.build('Glass', glass, { lod: false });
  // roof panel: only the top band of the ring
  const roof = node('Roof', root);
  kit.add(loft(rsecs, rsecs[0].pts.length - 1, false), M.paint());
  // A / B / C pillars as tubes over the glass
  for (const side of [-1, 1]) {
    const pillar = (pts, r) => kit.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, r * 0.7, 8, false), M.gloss());
    const edge = (x, f = 0.985) => { const ry = roofY(x); const bw = carBodyProfile(x).hw - 0.05; return V(x, ry - 0.02, side * bw * (1 - 0.24 * ((ry - 0.97) / 0.62)) * f); };
    pillar([V(0.98, 0.99, side * 0.82), edge(0.62), edge(0.3)], 0.045);
    pillar([edge(0.3), edge(-0.3), edge(-0.95)], 0.04);
    pillar([V(-0.28, 0.99, side * 0.845), V(-0.28, 1.3, side * 0.79), edge(-0.28)], 0.05);
    pillar([edge(-0.95), edge(-1.3), V(-1.6, 1.02, side * 0.76)], 0.07);
  }
  kit.build('Roof', roof);
  // trim: grille, valances, side cladding, mirrors, seams, handles
  const trim = node('Trim', root);
  kit.add(new THREE.BoxGeometry(0.05, 0.1, 0.7), M.gloss(), [noseX(0.35, 0.6) - 0.012, 0.6, 0]);
  kit.add(new THREE.BoxGeometry(0.05, 0.08, 1.2), M.blackTrim(), [noseX(0.6, 0.45) - 0.015, 0.45, 0]);
  kit.add(new THREE.BoxGeometry(0.05, 0.1, 1.2), M.blackTrim(), [tailX(0.6, 0.5) + 0.015, 0.5, 0]);
  for (const side of [-1, 1]) {
    kit.add(new THREE.BoxGeometry(2.0, 0.08, 0.03), M.blackTrim(), [-0.02, 0.35, side * 0.9]);
    kit.add(new THREE.SphereGeometry(0.08, 12, 8), M.gloss(), [0.84, 1.06, side * 0.94], [0, 0, 0], [0.9, 0.6, 1.1]);
    kit.add(new THREE.BoxGeometry(0.1, 0.03, 0.08), M.gloss(), [0.88, 1.01, side * 0.88]);
    for (const sx of [0.96, -0.28, -1.32]) kit.add(new THREE.BoxGeometry(0.006, 0.5, 0.008), M.blackTrim(), [sx, 0.7, side * (carBodyProfile(sx).hw - 0.002)]);
    for (const hx of [0.42, -0.72]) kit.add(new THREE.BoxGeometry(0.16, 0.025, 0.02), M.chrome(), [hx, 0.9, side * (carBodyProfile(hx).hw + 0.01)]);
  }
  kit.build('Trim', trim);
  // lamps
  const lamps = node('Lamps', root);
  // EV-style full-width light bars that hug the nose / tail surface
  const bar = (y, zs, fn, out, mat, r) => kit.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(zs.map(z => V(fn(Math.abs(z), y) + out, y, z))), 40, r, 6, false), mat, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
  const zs = Array.from({ length: 13 }, (_, i) => -0.8 + i * (1.6 / 12));
  bar(0.84, zs, noseX, 0.002, M.headlamp(), 0.018);
  bar(0.94, zs, tailX, -0.002, M.taillamp(), 0.022);
  for (const side of [-1, 1]) {
    const z = side * 0.62;
    kit.add(new THREE.SphereGeometry(0.1, 14, 10), M.headlamp(), [noseX(Math.abs(z), 0.73) - 0.035, 0.73, z], [0, side * 0.5, 0], [0.45, 0.35, 1]);
    kit.add(new THREE.SphereGeometry(0.1, 14, 10), M.taillamp(), [tailX(Math.abs(z), 0.86) + 0.035, 0.86, z], [0, -side * 0.5, 0], [0.45, 0.45, 1.1]);
  }
  kit.build('Lamps', lamps, { lod: false });
  // interior: seats + dash + wheel
  const inter = node('Interior', root);
  for (const sx of [0.05, -0.85]) for (const side of [-1, 1]) {
    kit.add(new THREE.BoxGeometry(0.5, 0.12, 0.48), M.seat(), [sx, 0.62, side * 0.38]);
    kit.add(new THREE.BoxGeometry(0.12, 0.62, 0.46), M.seat(), [sx - 0.25, 0.95, side * 0.38], [0, 0, -0.18]);
    kit.add(new THREE.BoxGeometry(0.1, 0.16, 0.26), M.seat(), [sx - 0.33, 1.32, side * 0.38]);
  }
  kit.add(new THREE.BoxGeometry(0.45, 0.22, 1.5), M.dash(), [0.78, 0.93, 0]);
  kit.add(new THREE.TorusGeometry(0.17, 0.02, 8, 28), M.dash(), [0.55, 1.03, 0.38], [0, Math.PI / 2, -0.4]);
  kit.build('Interior', inter, { lod: false });
  // wheels
  for (const [nm, x, z] of [['Wheel_FL', CAR.wheelX[0], 1], ['Wheel_FR', CAR.wheelX[0], -1], ['Wheel_RL', CAR.wheelX[1], 1], ['Wheel_RR', CAR.wheelX[1], -1]]) {
    const w = node(nm, root, [x, CAR.tyreR, z * (CAR.track / 2)], [0, z < 0 ? Math.PI : 0, 0]);
    wheelGeometry(kit); kit.build(nm, w);
  }
  return root;
}

// ---------------------------------------------------------------- worker
// Rigid-segment character (no skinning): joints are named nodes so glTF node
// animation drives them. ~1.68 m tall, Changan Rayong uniform from the
// reference photo: navy shirt with red piping, khaki trousers, blue helmet.
export function buildWorker() {
  const root = node('Worker');
  const k = new Kit();
  const hips = node('hips', root, [0, 0.93, 0]);
  // pelvis / trousers top
  k.add(new THREE.CapsuleGeometry(0.135, 0.07, 6, 14), M.pants(), [0, 0.02, 0], [0, 0, Math.PI / 2], [1, 1, 0.75]);
  k.add(new THREE.CylinderGeometry(0.17, 0.168, 0.045, 20), M.safetyBlack(), [0, 0.1, 0], [0, 0, 0], [1, 1, 0.72]);
  k.build('hips', hips);
  const spine = node('spine', hips, [0, 0.1, 0]);
  // torso lathe (shirt), elliptical
  const tp = [[0.0, 0.0], [0.168, 0.0], [0.176, 0.12], [0.19, 0.3], [0.185, 0.4], [0.13, 0.48], [0.055, 0.51], [0.0, 0.51]].map(([r, y]) => new THREE.Vector2(r, y));
  k.add(new THREE.LatheGeometry(tp, 24), M.shirt(), [0, 0, 0], [0, 0, 0], [1, 1, 0.68]);
  // red piping: collar ring, placket, pocket edges, shoulder seams
  k.add(new THREE.TorusGeometry(0.065, 0.009, 6, 20), M.piping(), [0, 0.5, 0.0], [Math.PI / 2, 0, 0], [1, 0.85, 1]);
  k.add(new THREE.BoxGeometry(0.012, 0.42, 0.01), M.piping(), [0.0, 0.27, 0.14]);
  for (const s of [-1, 1]) {
    k.add(new THREE.BoxGeometry(0.11, 0.01, 0.01), M.piping(), [s * 0.09, 0.38, 0.139]);
    k.add(new THREE.BoxGeometry(0.1, 0.01, 0.1), M.piping(), [s * 0.12, 0.475, 0.0], [0, 0, -s * 0.5]);
    k.add(new THREE.BoxGeometry(0.1, 0.11, 0.012), M.shirt(), [s * 0.09, 0.33, 0.137]);
  }
  k.add(new THREE.BoxGeometry(0.065, 0.085, 0.006), M.badge(), [0.1, 0.31, 0.146]);
  k.build('spine', spine);
  const neck = node('neck', spine, [0, 0.49, 0]);
  k.add(new THREE.CylinderGeometry(0.046, 0.052, 0.09, 12), M.skin(), [0, 0.03, 0]);
  k.build('neck', neck);
  const head = node('head', neck, [0, 0.04, 0]);
  k.add(new THREE.SphereGeometry(0.105, 22, 16), M.skin(), [0, 0.11, 0.005], [0, 0, 0], [0.86, 1.12, 0.98]);
  k.add(new THREE.SphereGeometry(0.03, 8, 6), M.skin(), [0, 0.1, 0.105], [0, 0, 0], [0.7, 1, 0.9]);
  for (const s of [-1, 1]) {
    k.add(new THREE.SphereGeometry(0.026, 8, 6), M.skin(), [s * 0.093, 0.11, -0.005], [0, 0, 0], [0.5, 1, 0.8]);
    k.add(new THREE.SphereGeometry(0.011, 8, 6), M.eye(), [s * 0.036, 0.135, 0.092]);
  }
  k.add(new THREE.SphereGeometry(0.107, 18, 12, 0, Math.PI * 2, 0, 1.5), M.hair(), [0, 0.125, -0.01], [-0.15, 0, 0], [0.9, 1.05, 1.02]);
  // safety glasses
  k.add(new THREE.TorusGeometry(0.098, 0.016, 6, 18, 1.9), M.glasses(), [0, 0.135, 0.0], [Math.PI / 2, 0, Math.PI / 2 - 0.95], [1, 1, 0.9]);
  k.add(new THREE.TorusGeometry(0.1, 0.004, 4, 24, Math.PI), M.safetyBlack(), [0, 0.15, -0.005], [Math.PI / 2, 0, 0]);
  // chin strap
  k.add(new THREE.TorusGeometry(0.095, 0.004, 4, 20, Math.PI), M.safetyBlack(), [0, 0.12, 0.0], [0, Math.PI / 2, Math.PI], [1, 1.2, 1]);
  k.build('head', head);
  const hel = node('helmet', head, [0, 0.16, -0.005]);
  k.add(new THREE.SphereGeometry(0.135, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.helmet(), [0, 0, 0], [0, 0, 0], [0.93, 0.95, 1.08]);
  k.add(new THREE.CylinderGeometry(0.15, 0.152, 0.014, 28, 1, false), M.helmet(), [0, 0.0, 0.035], [0.06, 0, 0], [0.98, 1, 1.2]);
  k.add(new THREE.CapsuleGeometry(0.014, 0.17, 4, 8), M.helmet(), [0, 0.118, -0.005], [Math.PI / 2, 0, 0]);
  k.build('helmet', hel);
  for (const s of [-1, 1]) {
    const L = s > 0 ? 'L' : 'R';
    const sh = node('upperarm_' + L, spine, [s * 0.19, 0.42, 0]);
    k.add(new THREE.SphereGeometry(0.062, 12, 10), M.shirt(), [0, 0, 0], [0, 0, 0], [1, 0.9, 1]);
    k.add(new THREE.CapsuleGeometry(0.052, 0.2, 6, 12), M.shirt(), [0, -0.14, 0]);
    k.add(new THREE.CylinderGeometry(0.057, 0.057, 0.012, 14), M.piping(), [0, -0.25, 0]);
    k.build('upperarm_' + L, sh);
    const el = node('forearm_' + L, sh, [0, -0.28, 0]);
    k.add(new THREE.CapsuleGeometry(0.042, 0.19, 6, 12), M.shirt(), [0, -0.12, 0]);
    k.build('forearm_' + L, el);
    const hand = node('hand_' + L, el, [0, -0.26, 0]);
    k.add(new THREE.CapsuleGeometry(0.03, 0.05, 4, 8), M.gloves(), [0, -0.05, 0.0], [0, 0, 0], [1.25, 1, 0.65]);
    k.add(new THREE.CapsuleGeometry(0.017, 0.05, 4, 6), M.gloves(), [-s * 0.045, -0.04, 0.02], [0.3, 0, -s * 0.5]);
    k.add(new THREE.CapsuleGeometry(0.026, 0.035, 4, 8), M.gloves(), [0, -0.115, 0.01], [0.35, 0, 0], [1.3, 1, 0.7]);
    k.build('hand_' + L, hand);
    node('socket_' + L, hand, [0, -0.1, 0.03]);
    const th = node('thigh_' + L, hips, [s * 0.095, -0.02, 0]);
    k.add(new THREE.CapsuleGeometry(0.074, 0.3, 6, 12), M.pants(), [0, -0.2, 0]);
    k.build('thigh_' + L, th);
    const kn = node('shin_' + L, th, [0, -0.43, 0]);
    k.add(new THREE.CapsuleGeometry(0.058, 0.31, 6, 12), M.pants(), [0, -0.2, 0]);
    k.build('shin_' + L, kn);
    const ft = node('foot_' + L, kn, [0, -0.43, 0]);
    k.add(new THREE.BoxGeometry(0.11, 0.08, 0.26), M.shoes(), [0, -0.035, 0.05]);
    k.add(new THREE.SphereGeometry(0.06, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.shoes(), [0, -0.035, 0.15], [0, 0, 0], [0.95, 0.8, 1]);
    k.add(new THREE.BoxGeometry(0.115, 0.022, 0.28), M.safetyBlack(), [0, -0.075, 0.05]);
    k.build('foot_' + L, ft);
  }
  root.animations = workerClips(root);
  return root;
}

// keyframed joint poses -> AnimationClips (quaternion tracks per joint)
function workerClips(root) {
  const q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)).toArray();
  const joints = ['hips', 'spine', 'neck', 'head', 'upperarm_L', 'forearm_L', 'hand_L', 'upperarm_R', 'forearm_R', 'hand_R', 'thigh_L', 'shin_L', 'foot_L', 'thigh_R', 'shin_R', 'foot_R'];
  const rest = { upperarm_L: [0.05, 0, 0.07], upperarm_R: [0.05, 0, -0.07], forearm_L: [-0.2, 0, 0], forearm_R: [-0.2, 0, 0] };
  function clip(name, times, poses, hipY) {
    const tracks = [];
    for (const j of joints) {
      const vals = [];
      let any = false;
      for (const p of poses) {
        const e = p[j] || rest[j] || [0, 0, 0];
        if (p[j] || rest[j]) any = true;
        vals.push(...q(...e));
      }
      if (any || j === 'spine') tracks.push(new THREE.QuaternionKeyframeTrack(j + '.quaternion', times, vals));
    }
    if (hipY) tracks.push(new THREE.VectorKeyframeTrack('hips.position', times, hipY.flatMap(y => [0, y, 0])));
    return new THREE.AnimationClip(name, times[times.length - 1], tracks);
  }
  const clips = [];
  // Idle: breathing + small weight shift
  clips.push(clip('Idle', [0, 1.6, 3.2], [
    { spine: [0.02, 0, 0], head: [0.05, 0.1, 0] },
    { spine: [-0.01, 0.03, 0.01], head: [0.02, -0.12, 0] },
    { spine: [0.02, 0, 0], head: [0.05, 0.1, 0] }], [0.93, 0.935, 0.93]));
  // Pick: turn to the rack (worker's right/back), reach, grasp, return
  const reach = { spine: [0.35, -0.9, 0], head: [0.4, -0.3, 0], upperarm_R: [-1.0, 0, -0.25], forearm_R: [-0.35, 0, 0], hand_R: [0.2, 0, 0], upperarm_L: [-0.2, 0, 0.18] };
  clips.push(clip('Pick', [0, 0.6, 1.0, 1.6, 2.2], [
    {}, reach, { ...reach, hand_R: [0.6, 0, 0], forearm_R: [-0.8, 0, 0] },
    { spine: [0.15, -0.3, 0], upperarm_R: [-0.7, 0, -0.15], forearm_R: [-1.2, 0, 0], upperarm_L: [-0.5, 0, 0.1], forearm_L: [-1.0, 0, 0] }, {}],
    [0.93, 0.9, 0.9, 0.92, 0.93]));
  // Fasten: both hands on a nutrunner at hub height, short torque pulses
  const hold = (a) => ({ spine: [0.55, 0, 0], head: [0.2, 0, 0], upperarm_R: [-0.85, 0, -0.15], forearm_R: [-0.55 + a, 0, 0], upperarm_L: [-0.8, 0, 0.2], forearm_L: [-0.75 - a, 0, 0], hand_R: [0.3, 0, 0], thigh_L: [-0.22, 0, 0.03], shin_L: [0.4, 0, 0], thigh_R: [-0.22, 0, -0.03], shin_R: [0.4, 0, 0], foot_L: [-0.18, 0, 0], foot_R: [-0.18, 0, 0] });
  clips.push(clip('Fasten', [0, 0.3, 0.45, 0.6, 0.75, 1.2, 1.6], [hold(0), hold(0.08), hold(-0.04), hold(0.08), hold(-0.04), hold(0), hold(0)], [0.895, 0.895, 0.895, 0.895, 0.895, 0.895, 0.895]));
  // Install: lift a part with both hands into the car, lean in
  clips.push(clip('Install', [0, 0.7, 1.4, 2.0, 2.6], [
    {}, { spine: [0.25, 0, 0], upperarm_R: [-1.3, 0, -0.1], forearm_R: [-0.6, 0, 0], upperarm_L: [-1.3, 0, 0.1], forearm_L: [-0.6, 0, 0] },
    { spine: [0.55, 0, 0], head: [0.2, 0, 0], upperarm_R: [-1.6, 0, -0.1], forearm_R: [-0.2, 0, 0], upperarm_L: [-1.6, 0, 0.1], forearm_L: [-0.2, 0, 0] },
    { spine: [0.4, 0.15, 0], upperarm_R: [-1.2, 0, -0.1], forearm_R: [-0.5, 0, 0], upperarm_L: [-0.6, 0, 0.1], forearm_L: [-0.8, 0, 0] }, {}],
    [0.93, 0.92, 0.9, 0.92, 0.93]));
  // Inspect: scan the body with eyes, point and sweep (right hand), tablet in left
  const tab = { upperarm_L: [-0.55, 0, 0.12], forearm_L: [-1.25, 0, 0], hand_L: [0, 0.4, 0] };
  clips.push(clip('Inspect', [0, 0.8, 1.6, 2.4, 3.2], [
    { ...tab, head: [0.2, 0.5, 0] },
    { ...tab, head: [0.25, 0.1, 0], spine: [0.1, 0.15, 0], upperarm_R: [-1.25, 0.2, -0.3], forearm_R: [-0.15, 0, 0] },
    { ...tab, head: [0.3, -0.4, 0], spine: [0.1, -0.2, 0], upperarm_R: [-1.2, -0.4, -0.2], forearm_R: [-0.1, 0, 0] },
    { ...tab, head: [0.45, 0, 0] }, { ...tab, head: [0.2, 0.5, 0] }]));
  // Walk cycle (1.0 s)
  const st = (a) => ({ thigh_L: [a, 0, 0], thigh_R: [-a, 0, 0], shin_L: [a < 0 ? 0.5 : 0.1, 0, 0], shin_R: [a > 0 ? 0.5 : 0.1, 0, 0], upperarm_L: [-a * 0.8, 0, 0.1], upperarm_R: [a * 0.8, 0, -0.1], spine: [0.05, a * 0.15, 0] });
  clips.push(clip('Walk', [0, 0.25, 0.5, 0.75, 1.0], [st(0.45), st(0), st(-0.45), st(0), st(0.45)], [0.93, 0.955, 0.93, 0.955, 0.93]));
  return clips;
}

// ------------------------------------------------------- station equipment
export const STATION = { pitch: 6.4, conveyorW: 2.9, beamH: 4.3 };

function iBeam(kit, mat, h, x, z) {
  const s = new THREE.Shape();
  const w = 0.2, d = 0.2, tf = 0.016, tw = 0.01;
  s.moveTo(-w / 2, -d / 2); s.lineTo(w / 2, -d / 2); s.lineTo(w / 2, -d / 2 + tf); s.lineTo(tw / 2, -d / 2 + tf); s.lineTo(tw / 2, d / 2 - tf);
  s.lineTo(w / 2, d / 2 - tf); s.lineTo(w / 2, d / 2); s.lineTo(-w / 2, d / 2); s.lineTo(-w / 2, d / 2 - tf); s.lineTo(-tw / 2, d / 2 - tf);
  s.lineTo(-tw / 2, -d / 2 + tf); s.lineTo(-w / 2, -d / 2 + tf); s.closePath();
  kit.add(new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }), mat, [x, 0, z], [-Math.PI / 2, 0, 0]);
}

export function buildStation() {
  const root = node('Station');
  const k = new Kit();
  const P = STATION.pitch, W = STATION.conveyorW;
  // slat conveyor (flush pit type): slat deck + side curbs with yellow/black edge
  const conv = node('Conveyor', root);
  k.add(new THREE.BoxGeometry(P, 0.05, W), M.slat(), [0, 0.025, 0]);
  for (const s of [-1, 1]) {
    k.add(new THREE.BoxGeometry(P, 0.06, 0.12), M.steelDark(), [0, 0.03, s * (W / 2 + 0.06)]);
    for (let i = 0; i < 16; i++) k.add(new THREE.BoxGeometry(P / 32, 0.012, 0.1), i % 2 ? M.safetyBlack() : M.safetyYellow(), [-P / 2 + (i + 0.5) * (P / 16) - P / 64, 0.066, s * (W / 2 + 0.06)], [0, 0.6, 0], [1, 1, 1]);
  }
  k.build('Conveyor', conv);
  // skid carrying the car (moves with the product at runtime)
  const skid = node('Skid', root);
  for (const s of [-1, 1]) k.add(new THREE.BoxGeometry(4.0, 0.1, 0.12), M.steelDark(), [0, 0.11, s * 0.55]);
  for (const x of [-1.6, -0.5, 0.6, 1.6]) k.add(new THREE.BoxGeometry(0.1, 0.08, 1.2), M.steelDark(), [x, 0.1, 0]);
  for (const x of [-1.25, 1.2]) for (const s of [-1, 1]) {
    k.add(new THREE.BoxGeometry(0.1, 0.18, 0.1), M.steel(), [x, 0.25, s * 0.55]);
    k.add(new THREE.BoxGeometry(0.14, 0.03, 0.14), M.safetyYellow(), [x, 0.35, s * 0.55]);
  }
  k.build('Skid', skid);
  // portal frame, LED light, tool rail with balancer
  const frame = node('Frame', root);
  const H = STATION.beamH;
  for (const s of [-1, 1]) iBeam(k, M.beamBlue(), H, 0, s * 2.9);
  k.add(new THREE.BoxGeometry(0.2, 0.25, 6.0), M.beamBlue(), [0, H + 0.12, 0]);
  for (const s of [-1, 1]) {
    k.add(new THREE.BoxGeometry(0.44, 0.02, 0.44), M.steelDark(), [0, 0.01, s * 2.9]);
    k.add(new THREE.BoxGeometry(0.22, 0.22, 0.01), M.safetyYellow(), [0, 0.6, s * 2.9 + s * 0.105]);
  }
  // C-rail along the line at the operator side, with LED panels either side
  k.add(new THREE.BoxGeometry(P * 0.95, 0.1, 0.08), M.steel(), [0, H - 0.05, 1.3]);
  for (const x of [-1.6, 1.6]) for (const z of [-0.6, 1.9]) {
    k.add(new THREE.BoxGeometry(1.2, 0.05, 0.3), M.steelDark(), [x, H - 0.22, z]);
    k.add(new THREE.BoxGeometry(1.15, 0.01, 0.26), M.ledPanel(), [x, H - 0.25, z]);
    for (const dx of [-0.55, 0.55]) k.add(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 4), M.cable(), [x + dx, H - 0.12, z]);
  }
  k.build('Frame', frame);
  const bal = node('Balancer', root, [0.4, H - 0.12, 1.3]);
  k.add(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 18), M.toolAccent(), [0, -0.18, 0], [0, 0, Math.PI / 2]);
  k.add(new THREE.BoxGeometry(0.06, 0.1, 0.06), M.steelDark(), [0, -0.04, 0]);
  k.build('Balancer', bal, { lod: false });
  // andon tower (lamp materials are animated by the runtime)
  const andon = node('Andon', root, [P / 2 - 0.35, 0, 2.75]);
  k.add(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 10), M.steel(), [0, 1.05, 0]);
  k.add(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 16), M.steelDark(), [0, 0.02, 0]);
  k.add(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 14), M.safetyBlack(), [0, 2.12, 0]);
  k.build('AndonPole', andon, { lod: false });
  for (const [nm, mat, y] of [['Andon_G', M.andonG(), 2.2], ['Andon_Y', M.andonY(), 2.33], ['Andon_R', M.andonR(), 2.46]]) {
    const a = node(nm, andon);
    k.add(new THREE.CylinderGeometry(0.058, 0.058, 0.12, 16), mat, [0, y, 0]);
    k.build(nm, a, { lod: false });
  }
  const capN = node('Andon_Cap', andon);
  k.add(new THREE.CylinderGeometry(0.05, 0.06, 0.04, 14), M.safetyBlack(), [0, 2.54, 0]);
  k.build('Andon_Cap', capN, { lod: false });
  // operator zone floor: anti-fatigue mat + yellow tape boundary + work-instruction stand
  const zone = node('Zone', root);
  k.add(new THREE.BoxGeometry(3.6, 0.018, 1.0), M.mat(), [0, 0.009, 2.05]);
  for (const [w, d, x, z] of [[P - 0.1, 0.08, 0, 2.7], [P - 0.1, 0.08, 0, -2.0], [0.08, 4.7, -P / 2 + 0.05, 0.35], [0.08, 4.7, P / 2 - 0.05, 0.35]])
    k.add(new THREE.BoxGeometry(w, 0.004, d), M.safetyYellow(), [x, 0.003, z]);
  k.build('Zone', zone, { lod: false });
  const ois = node('OIS', root, [-P / 2 + 0.55, 0, 2.55], [0, 0.35, 0]);
  k.add(new THREE.CylinderGeometry(0.025, 0.03, 1.3, 10), M.steel(), [0, 0.65, 0]);
  k.add(new THREE.BoxGeometry(0.4, 0.02, 0.3), M.steelDark(), [0, 0.01, 0]);
  k.add(new THREE.BoxGeometry(0.62, 0.44, 0.04), M.steelDark(), [0, 1.45, 0], [-0.25, 0, 0]);
  k.build('OIS', ois, { lod: false });
  const oisScr = node('OIS_Screen', ois);
  k.add(new THREE.PlaneGeometry(0.56, 0.38), M.screen(), [0, 1.455, 0.024], [-0.25, 0, 0]);
  k.build('OIS_Screen', oisScr, { lod: false });
  // station sign board (text drawn at runtime on top of SignFace)
  const sign = node('Sign', root, [0, H + 0.42, 0]);
  k.add(new THREE.BoxGeometry(0.06, 0.55, 1.6), M.steelDark(), [0, 0, 0]);
  for (const z of [-0.6, 0.6]) k.add(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6), M.steel(), [0, -0.38, z]);
  k.build('Sign', sign, { lod: false });
  return root;
}

// pipe & joint flow rack (3 inclined lanes x 3 bins) with pick-to-light
export function buildFlowRack() {
  const root = node('FlowRack');
  const k = new Kit();
  const Wd = 1.5, D = 0.9, H = 1.65;
  const pipe = (len, pos, rot) => k.add(new THREE.CylinderGeometry(0.014, 0.014, len, 10), M.pipeIvory(), pos, rot);
  for (const x of [-Wd / 2, Wd / 2]) for (const z of [-D / 2, D / 2]) {
    pipe(H + (z < 0 ? 0.15 : 0), [x, (H + (z < 0 ? 0.15 : 0)) / 2, z]);
    k.add(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 10), M.wheelCastor(), [x, 0.03, z], [Math.PI / 2, 0, 0]);
  }
  const levels = [0.35, 0.82, 1.29];
  for (const y of levels) {
    for (const x of [-Wd / 2, Wd / 2]) {
      // inclined side pipe (front low, back high)
      const a = Math.atan2(0.12, D);
      pipe(Math.hypot(D, 0.12), [x, y + 0.06, 0], [Math.PI / 2 - a, 0, 0]);
      k.add(new THREE.SphereGeometry(0.024, 8, 6), M.joint(), [x, y, D / 2]);
      k.add(new THREE.SphereGeometry(0.024, 8, 6), M.joint(), [x, y + 0.12, -D / 2]);
    }
    pipe(Wd, [0, y, D / 2], [0, 0, Math.PI / 2]);
    pipe(Wd, [0, y + 0.12, -D / 2], [0, 0, Math.PI / 2]);
    for (const lx of [-0.5, 0, 0.5]) for (const s of [-1, 1]) k.add(new THREE.BoxGeometry(0.03, 0.025, Math.hypot(D, 0.12)), M.roller(), [lx + s * 0.18, y + 0.07, 0], [Math.atan2(0.12, D), 0, 0]);
  }
  k.build('FlowRack', root);
  // bins (individual nodes so the runtime can show "messy" vs "sorted" 5S state)
  let n = 0;
  for (const y of levels) for (const lx of [-0.5, 0, 0.5]) {
    const b = node('Bin_' + n, root, [lx, y + 0.1, D / 2 - 0.2], [Math.atan2(0.12, D), 0, 0]);
    const bw = 0.4, bh = 0.17, bd = 0.36, t = 0.012;
    const col = n % 3 === 1 ? M.binGrey() : M.binBlue();
    k.add(new THREE.BoxGeometry(bw, t, bd), col, [0, 0, 0]);
    for (const s of [-1, 1]) {
      k.add(new THREE.BoxGeometry(t, bh, bd), col, [s * (bw / 2), bh / 2, 0]);
      k.add(new THREE.BoxGeometry(bw, bh * (s > 0 ? 0.65 : 1), t), col, [0, (bh * (s > 0 ? 0.65 : 1)) / 2, s * (bd / 2)]);
    }
    k.add(new THREE.BoxGeometry(0.16, 0.06, 0.004), M.label(), [0, 0.05, bd / 2 + 0.008]);
    // parts inside: a few fastener-like pieces
    for (let p = 0; p < 6; p++) k.add(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 6), p % 2 ? M.partZinc() : M.partBlack(), [-0.12 + (p % 3) * 0.12, 0.03, -0.06 + Math.floor(p / 3) * 0.1], [Math.PI / 2, p * 0.7, 0]);
    k.build('Bin_' + n, b, { lod: false });
    const ptl = node('PTL_' + n, root, [lx, y - 0.03, D / 2 + 0.03]);
    k.add(new THREE.BoxGeometry(0.09, 0.04, 0.03), M.ptl(), [0, 0, 0]);
    k.build('PTL_' + n, ptl, { lod: false });
    n++;
  }
  return root;
}

// hand tools: DC nutrunner (angle/pistol), barcode scanner, inspection tablet, torque controller
export function buildTools() {
  const root = node('Tools');
  const k = new Kit();
  const nr = node('Nutrunner', root);
  k.add(new THREE.CylinderGeometry(0.036, 0.04, 0.26, 18), M.toolBody(), [0, 0, 0.0], [Math.PI / 2, 0, 0]);
  k.add(new THREE.CylinderGeometry(0.041, 0.041, 0.07, 18), M.toolAccent(), [0, 0, -0.1], [Math.PI / 2, 0, 0]);
  k.add(new THREE.BoxGeometry(0.045, 0.13, 0.05), M.toolBody(), [0, -0.08, -0.06], [0.25, 0, 0]);
  k.add(new THREE.CylinderGeometry(0.018, 0.022, 0.07, 12), M.steel(), [0, 0, 0.16], [Math.PI / 2, 0, 0]);
  k.add(new THREE.CylinderGeometry(0.016, 0.016, 0.04, 6), M.steelDark(), [0, 0, 0.21], [Math.PI / 2, 0, 0]);
  k.add(new THREE.BoxGeometry(0.03, 0.02, 0.02), M.andonG(), [0, 0.045, -0.12]);
  k.build('Nutrunner', nr, { lod: false });
  const sc = node('Scanner', root, [0.3, 0, 0]);
  k.add(new THREE.BoxGeometry(0.05, 0.05, 0.14), M.toolAccent(), [0, 0.02, 0]);
  k.add(new THREE.BoxGeometry(0.04, 0.11, 0.04), M.toolBody(), [0, -0.05, -0.04], [0.3, 0, 0]);
  k.add(new THREE.PlaneGeometry(0.035, 0.03), M.taillamp(), [0, 0.02, 0.071]);
  k.build('Scanner', sc, { lod: false });
  const tb = node('Tablet', root, [0.6, 0, 0]);
  k.add(new THREE.BoxGeometry(0.25, 0.012, 0.17), M.toolBody(), [0, 0, 0]);
  k.add(new THREE.PlaneGeometry(0.23, 0.15), M.screen(), [0, 0.007, 0], [-Math.PI / 2, 0, 0]);
  k.build('Tablet', tb, { lod: false });
  const ctrl = node('TorqueController', root, [0.9, 0, 0]);
  k.add(new THREE.BoxGeometry(0.32, 0.4, 0.18), M.steelDark(), [0, 0.2, 0]);
  k.add(new THREE.PlaneGeometry(0.2, 0.12), M.screen(), [0, 0.27, 0.091]);
  k.build('TorqueController', ctrl, { lod: false });
  const ctrlLamp = node('TorqueOK', ctrl);
  k.add(new THREE.BoxGeometry(0.06, 0.03, 0.01), M.andonG(), [0.09, 0.1, 0.091]);
  k.build('TorqueOK', ctrlLamp, { lod: false });
  return root;
}

// kitting cart (station 1), tyre rack (station 3), light tunnel (station 4)
export function buildFixtures() {
  const root = node('Fixtures');
  const k = new Kit();
  const cart = node('KitCart', root);
  for (const y of [0.3, 0.75]) {
    k.add(new THREE.BoxGeometry(1.0, 0.03, 0.6), M.cartBlue(), [0, y, 0]);
    k.add(new THREE.BoxGeometry(1.0, 0.06, 0.02), M.cartBlue(), [0, y + 0.04, 0.3]);
    k.add(new THREE.BoxGeometry(1.0, 0.06, 0.02), M.cartBlue(), [0, y + 0.04, -0.3]);
  }
  for (const x of [-0.48, 0.48]) for (const z of [-0.28, 0.28]) {
    k.add(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 8), M.steel(), [x, 0.5, z]);
    k.add(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 12), M.wheelCastor(), [x, 0.05, z], [Math.PI / 2, 0, 0]);
  }
  k.add(new THREE.TorusGeometry(0.22, 0.014, 6, 12, Math.PI), M.steel(), [-0.55, 0.95, 0], [0, Math.PI / 2, 0]);
  for (let i = 0; i < 3; i++) {
    k.add(new THREE.BoxGeometry(0.28, 0.12, 0.22), i === 1 ? M.cardboard() : M.binBlue(), [-0.32 + i * 0.32, 0.38, 0]);
    k.add(new THREE.BoxGeometry(0.26, 0.05, 0.38), M.partBlack(), [-0.32 + i * 0.32, 0.8, 0]);
  }
  k.build('KitCart', cart);
  const tr = node('TyreRack', root, [0, 0, 2]);
  for (const x of [-0.6, 0.6]) for (const z of [-0.25, 0.25]) k.add(new THREE.BoxGeometry(0.05, 1.0, 0.05), M.steelDark(), [x, 0.5, z]);
  k.add(new THREE.BoxGeometry(1.25, 0.04, 0.55), M.steelDark(), [0, 0.12, 0]);
  k.add(new THREE.BoxGeometry(1.25, 0.04, 0.55), M.steelDark(), [0, 0.98, 0]);
  k.build('TyreRack', tr);
  const tun = node('LightTunnel', root, [0, 0, 4]);
  for (const s of [-1, 1]) {
    k.add(new THREE.BoxGeometry(0.16, 2.6, 0.16), M.steel(), [0, 1.3, s * 1.7]);
    for (let i = 0; i < 6; i++) k.add(new THREE.BoxGeometry(0.05, 0.32, 0.05), M.ledPanel(), [0.1, 0.35 + i * 0.38, s * 1.6]);
  }
  k.add(new THREE.BoxGeometry(0.16, 0.16, 3.56), M.steel(), [0, 2.6, 0]);
  for (let i = 0; i < 6; i++) k.add(new THREE.BoxGeometry(0.05, 0.05, 0.4), M.ledPanel(), [0.1, 2.52, -1.25 + i * 0.5]);
  k.build('LightTunnel', tun);
  // 5S problems shown when a station is not sorted / the abnormality is not fixed
  const clutter = node('Clutter', root, [0, 0, 6]);
  k.add(new THREE.BoxGeometry(0.42, 0.3, 0.32), M.cardboard(), [0, 0.15, 0], [0, 0.4, 0]);
  k.add(new THREE.BoxGeometry(0.4, 0.17, 0.36), M.binBlue(), [0.45, 0.085, 0.2], [0.0, -0.6, 0.15]);
  k.add(new THREE.TorusGeometry(0.16, 0.012, 6, 18), M.cable(), [-0.4, 0.012, 0.1], [Math.PI / 2, 0, 0]);
  k.build('Clutter', clutter, { lod: false });
  const oil = node('OilSpill', root, [0, 0, 7]);
  const os = new THREE.Shape(); for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2, r = 0.45 + 0.12 * Math.sin(a * 3) + 0.06 * Math.cos(a * 5); i ? os.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.7) : os.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.7); }
  k.add(new THREE.ShapeGeometry(os), M.oil(), [0, 0.006, 0], [-Math.PI / 2, 0, 0]);
  k.build('OilSpill', oil, { lod: false });
  return root;
}

// shell of the hall: floor plates + walkway, back wall with clerestory windows, columns, trusses
export function buildHall() {
  const root = node('Hall');
  const k = new Kit();
  const floor = node('Floor', root);
  k.add(new THREE.PlaneGeometry(44, 26, 1, 1), M.floor(), [0, 0, 1], [-Math.PI / 2, 0, 0]);
  k.build('Floor', floor, { lod: false });
  const walk = node('Walkway', root);
  k.add(new THREE.PlaneGeometry(40, 1.8), M.walkway(), [0, 0.004, 5.4], [-Math.PI / 2, 0, 0]);
  for (const z of [4.45, 6.35]) k.add(new THREE.PlaneGeometry(40, 0.1), M.safetyYellow(), [0, 0.006, z], [-Math.PI / 2, 0, 0]);
  k.build('Walkway', walk, { lod: false });
  const wall = node('Walls', root);
  k.add(new THREE.BoxGeometry(44, 1.4, 0.2), M.wallLow(), [0, 0.7, -9]);
  k.add(new THREE.BoxGeometry(44, 7.6, 0.2), M.wall(), [0, 5.2, -9.05]);
  k.build('Walls', wall, { lod: false });
  const win = node('Windows', root);
  for (let x = -19; x <= 19; x += 3.8) k.add(new THREE.PlaneGeometry(2.9, 1.3), M.window(), [x, 7.2, -8.93]);
  k.build('Windows', win, { lod: false });
  const str = node('Structure', root);
  for (let x = -18; x <= 18; x += 9) {
    for (const z of [-8.6, 9.5]) iBeam(k, M.truss(), 9, x, z);
    k.add(new THREE.BoxGeometry(0.25, 0.5, 18.4), M.truss(), [x, 8.9, 0.45]);
  }
  for (const z of [-6, -2, 2, 6]) k.add(new THREE.BoxGeometry(36.5, 0.14, 0.14), M.truss(), [0, 8.75, z]);
  k.build('Structure', str, { lod: false });
  return root;
}

// ------------------------------------------------------------- exporting
export async function exportAll() {
  await MeshoptSimplifier.ready;
  const assets = {
    car: buildCar(), worker: buildWorker(), station: buildStation(), flowrack: buildFlowRack(),
    tools: buildTools(), fixtures: buildFixtures(), hall: buildHall(),
  };
  const out = {}, stats = {};
  const ex = new GLTFExporter();
  for (const [name, obj] of Object.entries(assets)) {
    obj.updateMatrixWorld(true);
    const glb = await ex.parseAsync(obj, { binary: true, animations: obj.animations || [], onlyVisible: false });
    out[name] = new Uint8Array(glb);
    let tris = 0, tris1 = 0, meshes = 0;
    obj.traverse(o => { if (o.isMesh) { meshes++; const t = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; if (o.name.endsWith('_LOD1')) tris1 += t; else tris += t; } });
    stats[name] = { bytes: out[name].byteLength, meshes, trisLOD0: tris, trisLOD1: tris1, clips: (obj.animations || []).map(c => c.name) };
  }
  return { out, stats, assets };
}
