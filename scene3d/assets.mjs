// Asset pack loader for the 3D factory: manifest -> GLB models (phase 1, then 2)
// -> KTX2 texture sets attached by material name. One cached pack per quality
// tier so screens can be rebuilt without re-downloading. Every failure resolves
// to `null` (models) or "no texture" so the scene can keep its procedural
// fallback; nothing here throws into the game UI.
import * as THREE from '../three.module.min.js';

const BASE = new URL('../assets/factory/', import.meta.url);
const packs = new Map();          // quality -> Promise<Pack>
let ktx2 = null;                  // shared KTX2Loader (owns transcoder workers)

export function manifestUrl() { return new URL('manifest.json', BASE).href; }

async function loaders(renderer) {
  const [{ GLTFLoader }, { KTX2Loader }] = await Promise.all([
    import('../vendor/three/GLTFLoader.js'),
    import('../vendor/three/KTX2Loader.js'),
  ]);
  if (!ktx2) {
    ktx2 = new KTX2Loader().setTranscoderPath(new URL('../vendor/three/libs/basis/', import.meta.url).href).setWorkerLimit(2);
    ktx2.detectSupport(renderer);
  }
  return { gltf: new GLTFLoader(), ktx2 };
}

// Pack = { manifest, models:{name:THREE.Group}, clips:{name:[AnimationClip]}, stats, ready:{phase1,phase2,textures} }
export function loadPack(renderer, quality = 'medium', { onProgress = () => {}, models = null } = {}) {
  const key = quality + (models ? ":" + [...models].sort().join(",") : "");
  if (packs.has(key)) return packs.get(key);
  const p = (async () => {
    const t0 = performance.now();
    const res = await fetch(manifestUrl());
    if (!res.ok) throw new Error('manifest ' + res.status);
    const manifest = await res.json();
    const tier = manifest.quality[quality] || manifest.quality.medium;
    const { gltf, ktx2 } = await loaders(renderer);
    const pack = { manifest, tier, quality, models: {}, clips: {}, bytes: 0, errors: [], timings: {} };
    const selectedModels = Object.entries(manifest.models).filter(([name]) => !models || models.includes(name));
    const total = selectedModels.reduce((a, [, m]) => a + m.bytes, 0);
    let loaded = 0;
    const loadModel = async (name, m) => {
      try {
        const r = await fetch(new URL(m.url, BASE));
        if (!r.ok) throw new Error(m.url + ' ' + r.status);
        const buf = await r.arrayBuffer();
        pack.bytes += buf.byteLength; loaded += m.bytes; onProgress({ phase: 'models', loaded, total });
        const g = await gltf.parseAsync(buf, '');
        const root = g.scene;
        root.traverse(o => { o.userData.shared = true; if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        pack.models[name] = root; pack.clips[name] = g.animations || [];
      } catch (e) { pack.errors.push(String(e)); }
    };
    const byPhase = ph => selectedModels.filter(([, m]) => m.phase === ph);
    await Promise.all(byPhase(1).map(([n, m]) => loadModel(n, m)));
    pack.timings.phase1 = performance.now() - t0;
    pack.phase2 = Promise.all(byPhase(2).map(([n, m]) => loadModel(n, m))).then(() => { pack.timings.phase2 = performance.now() - t0; });
    pack.textures = pack.phase2.then(() => attachTextures(pack, ktx2)).then(() => { pack.timings.textures = performance.now() - t0; });
    return pack;
  })().catch(e => { packs.delete(key); throw e; });
  packs.set(key, p);
  return p;
}

async function attachTextures(pack, ktx2) {
  const { manifest, tier } = pack;
  const size = tier.textureSize;
  const want = new Map();               // texture key -> Promise<Texture|null>
  const get = (setName, map) => {
    const key = `${setName}_${map}_${size}`;
    const entry = manifest.textures[key];
    if (!entry) return Promise.resolve(null);
    if (!want.has(key)) want.set(key, ktx2.loadAsync(new URL(entry.url, BASE).href).then(t => {
      pack.bytes += entry.bytes;
      t.colorSpace = entry.colorSpace === 'srgb' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      return t;
    }).catch(e => { pack.errors.push('tex ' + key + ': ' + e); return null; }));
    return want.get(key);
  };
  // collect unique materials from every model
  const mats = new Map();
  for (const root of Object.values(pack.models)) root.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) mats.set(m.name, (mats.get(m.name) || new Set()).add(m)); });
  const jobs = [];
  for (const [name, spec] of Object.entries(manifest.materials)) {
    if (!mats.has(name)) continue;
    const maps = spec.maps.filter(m => tier.maps.includes(m));
    jobs.push(Promise.all(maps.map(m => get(spec.set, m))).then(texs => {
      const by = Object.fromEntries(maps.map((m, i) => [m, texs[i]]));
      for (const mat of mats.get(name)) {
        const rep = (t) => { if (!t) return null; const c = t.clone(); c.repeat.set(spec.repeat[0], spec.repeat[1]); c.needsUpdate = true; return c; };
        if (by.albedo) { mat.map = rep(by.albedo); }
        if (by.normal) { mat.normalMap = rep(by.normal); mat.normalScale.set(spec.normalScale, spec.normalScale); }
        if (by.orm) { const o = rep(by.orm); mat.roughnessMap = o; mat.aoMap = o; if (mat.metalness > 0.5) mat.metalnessMap = o; }
        mat.needsUpdate = true;
      }
    }));
  }
  await Promise.all(jobs);
}

// clone a cached model for placement (geometry + materials stay shared)
export function instance(pack, name) {
  const src = pack?.models?.[name];
  if (!src) return null;
  const c = src.clone(true);
  c.traverse(o => { o.userData.shared = true; });
  return c;
}

// pick LOD per quality: low -> *_LOD1 where present, otherwise LOD0
export function applyLod(root, lodLevel) {
  const names = new Set();
  root.traverse(o => { if (o.isMesh) names.add(o.name); });
  root.traverse(o => {
    if (!o.isMesh) return;
    const isL1 = o.name.endsWith('_LOD1');
    const hasL1 = !isL1 && names.has(o.name + '_LOD1');
    o.visible = lodLevel >= 1 ? (isL1 || !hasL1) : !isL1;
  });
  return root;
}

export function clipsFor(pack, name) { return pack?.clips?.[name] || []; }

// ---------------------------------------------------------------- batching
// Mobile GPUs are limited by draw calls more than triangles. These helpers
// merge static meshes per material (static batching) and turn the rigid-joint
// worker into one skinned mesh per material, without changing what is drawn.
import { mergeGeometries } from '../vendor/three/BufferGeometryUtils.js';

function effectivelyVisible(o, stop) { for (let p = o; p && p !== stop; p = p.parent) if (!p.visible) return false; return true; }

export function batchStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map(), originals = [];
  const walk = (o) => {
    if (o !== root && o.userData.dynamic) return;
    if (o.isMesh && !o.isSkinnedMesh && o.material && !Array.isArray(o.material) && o.material.visible !== false && effectivelyVisible(o, root)) {
      const key = o.material;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(o);
    }
    for (const c of o.children) walk(c);
  };
  walk(root);
  const made = [];
  const m = new THREE.Matrix4();
  for (const [mat, list] of groups) {
    if (list.length < 2) continue;
    const geos = list.map(o => {
      const g = new THREE.BufferGeometry();
      for (const k of ['position', 'normal', 'uv']) if (o.geometry.attributes[k]) g.setAttribute(k, o.geometry.attributes[k].clone());
      if (o.geometry.index) g.setIndex(o.geometry.index.clone());
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.attributes.normal) g.computeVertexNormals();
      g.applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld));
      return g;
    });
    const anyNonIndexed = geos.some(g => !g.index);
    const merged = mergeGeometries(anyNonIndexed ? geos.map(g => g.index ? g.toNonIndexed() : g) : geos);
    geos.forEach(g => g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = 'Batch_' + mat.name; mesh.castShadow = list.some(o => o.castShadow); mesh.receiveShadow = true;
    mesh.userData.batch = true;
    root.add(mesh); made.push(mesh);
    for (const o of list) { o.visible = false; originals.push(o); }
  }
  return {
    count: made.length, merged: originals.length,
    undo() { for (const b of made) { b.removeFromParent(); b.geometry.dispose(); } for (const o of originals) o.visible = true; made.length = 0; },
  };
}

// rigid "skinning": every vertex follows exactly one joint node; joints keep their
// names so the GLB animation clips still drive them through AnimationMixer.
export function rigidSkin(root) {
  root.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const bones = [], boneIndex = new Map();
  root.traverse(o => { if (!o.isMesh && o !== root) { boneIndex.set(o, bones.length); bones.push(o); } });
  const groups = new Map();
  root.traverse(o => { if (o.isMesh && o.visible && effectivelyVisible(o, root) && boneIndex.has(o.parent)) { (groups.get(o.material) || groups.set(o.material, []).get(o.material)).push(o); } });
  const skeleton = new THREE.Skeleton(bones);   // inverses from the current (bind) pose
  const made = [], m = new THREE.Matrix4();
  for (const [mat, list] of groups) {
    const geos = list.map(o => {
      const g = new THREE.BufferGeometry();
      for (const k of ['position', 'normal', 'uv']) if (o.geometry.attributes[k]) g.setAttribute(k, o.geometry.attributes[k].clone());
      if (o.geometry.index) g.setIndex(o.geometry.index.clone());
      g.applyMatrix4(m.multiplyMatrices(rootInv, o.matrixWorld));
      const n = g.attributes.position.count, bi = boneIndex.get(o.parent);
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(n * 4).map((_, i) => (i % 4 === 0 ? bi : 0)), 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Float32Array(n * 4).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
      return g;
    });
    const merged = mergeGeometries(geos); geos.forEach(g => g.dispose());
    if (!merged) continue;
    const sm = new THREE.SkinnedMesh(merged, mat);
    sm.name = 'Skin_' + mat.name; sm.castShadow = true; sm.frustumCulled = false; sm.userData.batch = true;
    root.add(sm); sm.updateMatrixWorld(true); sm.bind(skeleton);
    made.push(sm);
    for (const o of list) o.visible = false;
  }
  return { count: made.length, dispose() { for (const s of made) { s.geometry.dispose(); s.removeFromParent(); } skeleton.dispose(); } };
}
