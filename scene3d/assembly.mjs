// Assembly vertical slice: builds the 4-station final-assembly line from the
// GLB asset pack and maps training-core state onto it every update (read-only).
// All motion here is cosmetic and driven by real elapsed time (dt), never by
// frame count, so production results do not depend on FPS.
import * as THREE from '../three.module.min.js';
import { STATIONS, PRODUCT_Y, ROLE, rackPosition, visuals } from './layout.mjs';
import { instance, applyLod, clipsFor, batchStatic, rigidSkin } from './assets.mjs';

const PAINTS = ['#e9ecef', '#1d4f91', '#5d6670', '#9c1d24', '#16181b', '#c7ccd1'];
const MESSY = [[0.12, 0.35, 0.05], [-0.08, -0.25, 0], [0.05, 0.5, -0.04], [-0.1, -0.4, 0.06], [0.14, 0.2, 0], [0, -0.55, 0.05], [-0.12, 0.3, -0.03], [0.09, -0.3, 0], [-0.05, 0.45, 0.04]];

function find(root, name) { let r = null; root.traverse(o => { if (!r && o.name === name) r = o; }); return r; }
function meshesUnder(root) { const a = []; root?.traverse(o => { if (o.isMesh) a.push(o); }); return a; }
// give a subtree its own copy of the materials (so one station's andon does not light another's)
function ownMaterials(root, filter = () => true) {
  const map = new Map();
  for (const m of meshesUnder(root)) {
    if (!filter(m.material)) continue;
    if (!map.has(m.material)) { const c = m.material.clone(); c.userData.own = true; map.set(m.material, c); }
    m.material = map.get(m.material);
  }
  return [...map.values()];
}
function canvasTex(w, h) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { cv, ctx: cv.getContext('2d'), tex: t };
}
function blobTexture() {
  const c = canvasTex(64, 64); if (!c) return null;
  const g = c.ctx.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.ctx.fillStyle = g; c.ctx.fillRect(0, 0, 64, 64); c.tex.needsUpdate = true; return c.tex;
}

export class AssemblySlice {
  constructor(pack, { quality = 'medium', reducedMotion = false, stationNames = [], audio = null } = {}) {
    this.pack = pack; this.quality = quality; this.reducedMotion = reducedMotion; this.audio = audio;
    this.lod = pack.tier?.lod ?? (quality === 'low' ? 1 : 0);
    this.root = new THREE.Group(); this.root.name = 'AssemblySlice';
    this.targets = []; this.stations = []; this.disposables = [];
    this.lastAndon = ['off', 'off', 'off', 'off'];
    this.blob = quality === 'low' ? blobTexture() : null;
    const hall = this.place('hall'); if (hall) { this.root.add(hall); this.ceiling = find(hall, 'Structure'); if (this.ceiling) this.ceiling.userData.dynamic = true; }
    STATIONS.forEach((a, j) => this.buildStation(a, j, stationNames[j] || ''));
    this.buildIssue();
    // draw-call budget: merge everything static into one mesh per material
    this.batches = [batchStatic(this.root)];
    if (this.ceiling) this.batches.push(batchStatic(this.ceiling));
  }
  place(name) { const o = instance(this.pack, name); return o ? applyLod(o, this.lod) : null; }
  shadowBlob(parent, w, d, y = 0.012) {
    if (!this.blob) return;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: this.blob, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 1; parent.add(m); this.disposables.push(m.geometry, m.material);
  }
  buildStation(a, j, title) {
    const st = { index: j, anchor: a, mixer: null, actions: {}, clip: '', productId: null, vis: null };
    const g = new THREE.Group(); g.name = 'Station_' + (j + 1); g.position.set(a.x, 0, 0); this.root.add(g); st.group = g;
    const kit = this.place('station');
    if (kit) {
      g.add(kit);
      st.andon = { green: ownMaterials(find(kit, 'Andon_G'))[0], amber: ownMaterials(find(kit, 'Andon_Y'))[0], red: ownMaterials(find(kit, 'Andon_R'))[0] };
      for (const n of ['Andon_G', 'Andon_Y', 'Andon_R']) { const o = find(kit, n); if (o) o.userData.dynamic = true; }
      st.skid = find(kit, 'Skid');
      st.balancer = find(kit, 'Balancer');
      const signMesh = meshesUnder(find(kit, 'Sign'))[0];
      if (signMesh) this.signFace(g, title, j);
      const scr = meshesUnder(find(kit, 'OIS_Screen'))[0];
      if (scr) { const c = canvasTex(256, 176); if (c) { scr.material = new THREE.MeshBasicMaterial({ map: c.tex, toneMapped: false }); scr.material.userData.own = true; st.ois = c; this.disposables.push(c.tex); } }
    }
    // product carrier: skid + car move together along the station
    const carrier = new THREE.Group(); carrier.name = 'Carrier'; carrier.userData.dynamic = true; g.add(carrier); st.carrier = carrier;
    if (st.skid) { st.skid.parent.remove(st.skid); carrier.add(st.skid); }
    const car = this.place('car');
    if (car) {
      car.position.y = PRODUCT_Y; carrier.add(car); st.car = car;
      st.paint = ownMaterials(car, m => m.name === 'M_CarPaint')[0];
      st.lamps = ownMaterials(find(car, 'Lamps'));
      const wheelSrc = find(car, 'Wheel_FL');
      st.wheelProto = wheelSrc ? wheelSrc.clone(true) : null;
      // near-side pair is fitted at this line; far-side pair by the partner operator
      const near = new THREE.Group(), far = new THREE.Group(); near.name = 'WheelsNear'; far.name = 'WheelsFar';
      for (const [n, grp] of [['Wheel_FL', near], ['Wheel_RL', near], ['Wheel_FR', far], ['Wheel_RR', far]]) { const w = find(car, n); if (w) grp.add(w); }
      car.add(near, far);
      st.parts = { interior: find(car, 'Interior'), near, far };
      // what is fitted at this station is fixed by its role, so only the part that
      // changes during the cycle stays dynamic; the rest is merged into the body batch
      const fitted = { interior: j >= 2, far: j >= 2, near: j >= 3 };
      const changing = { interior: j === 1, far: false, near: j === 2 };
      for (const k of ['interior', 'far', 'near']) { const o = st.parts[k]; if (!o) continue; o.visible = fitted[k]; o.userData.dynamic = changing[k]; }
      const lamps = find(car, 'Lamps'); if (lamps) lamps.userData.dynamic = true;
      st.carBatches = [batchStatic(carrier)];   // car body + fitted parts + skid in one set of draw calls
      for (const k of ['interior', 'near']) if (changing[k] && st.parts[k]) st.carBatches.push(batchStatic(st.parts[k]));
      this.shadowBlob(carrier, 4.8, 2.3);
    }
    // operator with PPE + animation
    const w = this.place('worker');
    if (w) {
      w.position.set(...a.operator); w.position.x -= a.x; w.rotation.y = Math.PI; w.userData.dynamic = true; g.add(w); st.worker = w;
      st.mixer = new THREE.AnimationMixer(w);
      for (const c of clipsFor(this.pack, 'worker')) st.actions[c.name] = st.mixer.clipAction(c);
      this.shadowBlob(w, 0.9, 0.9);
      const role = ROLE[j];
      st.sockets = { R: find(w, 'socket_R'), L: find(w, 'socket_L') };
      if (role.hand) st.handTool = role.hand;
    }
    // flow rack (moves with the layout decision)
    const rack = this.place('flowrack');
    if (rack) {
      rack.rotation.y = Math.PI; rack.userData.dynamic = true; g.add(rack); st.rack = rack;
      st.bins = []; for (let n = 0; n < 9; n++) { const b = find(rack, 'Bin_' + n); if (b) st.bins.push({ node: b, pos: b.position.clone(), rot: b.rotation.clone() }); }
      st.ptl = ownMaterials(rack, m => m.name === 'M_PickLight');   // one material per rack: lamps pulse together
      this.shadowBlob(rack, 1.8, 1.1);
    }
    st.clutter = this.placePart('fixtures', 'Clutter', g, [-1.15, 0, 2.95], 0.3); if (st.clutter) st.clutter.userData.dynamic = true;
    if (j === 0) this.placePart('fixtures', 'KitCart', g, [1.9, 0, 2.35], Math.PI / 2);
    if (j === 2) {
      const tr = this.placePart('fixtures', 'TyreRack', g, [2.1, 0, 2.6], 0);
      const wheel = st.wheelProto;
      if (tr && wheel) for (let i = 0; i < 3; i++) { const c = wheel.clone(true); c.position.set(-0.3 + i * 0.3, 0.38, 0); c.rotation.set(0, Math.PI / 2, 0); tr.add(c); }
      const ctrl = this.placePart('tools', 'TorqueController', g, [-2.85, 1.1, 2.75], Math.PI);
      if (ctrl) { st.torqueLamp = ownMaterials(find(ctrl, 'TorqueOK'))[0]; const l = find(ctrl, 'TorqueOK'); if (l) l.userData.dynamic = true; }
    }
    if (j === 3) this.placePart('fixtures', 'LightTunnel', g, [1.2, 0, 0], 0);
    // hand tool in the operator's grip
    if (st.handTool && st.sockets) {
      const tool = this.placePart('tools', st.handTool, st.handTool === 'Tablet' ? st.sockets.L : st.sockets.R, [0, 0, 0], 0);
      if (tool) { tool.position.set(0, 0, 0); if (st.handTool === 'Nutrunner') tool.rotation.set(-Math.PI / 2, 0, 0); if (st.handTool === 'Tablet') tool.rotation.set(0.2, 0, 0); }
      st.tool = tool;
    }
    if (st.worker) st.skin = rigidSkin(st.worker);
    // balancer cable (dynamic line to the tool) for the torque station
    if (st.balancer && st.handTool === 'Nutrunner') {
      const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#111111' }));
      line.frustumCulled = false; this.root.add(line); st.cable = line; this.disposables.push(geo, line.material);
    }
    // WIP markers (kitted parts boxes waiting to enter this station)
    st.wip = [];
    for (let i = 0; i < 4; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.4), new THREE.MeshStandardMaterial({ color: '#b18a5a', roughness: 0.9 }));
      box.position.set(a.wipSpot[0] - a.x + (i % 2) * 0.55, 0.16 + Math.floor(i / 2) * 0.33, a.wipSpot[2]);
      box.castShadow = true; box.visible = false; box.userData.dynamic = true; g.add(box); st.wip.push(box); this.disposables.push(box.geometry, box.material);
    }
    // invisible hit volume (selection) — independent of the visual meshes
    const hb = new THREE.Mesh(new THREE.BoxGeometry(...a.hitbox.size), new THREE.MeshBasicMaterial({ visible: false }));
    hb.position.set(a.hitbox.center[0], a.hitbox.center[1], a.hitbox.center[2]); hb.userData.station = j; hb.userData.dynamic = true; hb.name = 'Hitbox_' + (j + 1);
    this.root.add(hb); this.targets.push(hb); this.disposables.push(hb.geometry, hb.material);
    this.stations.push(st);
  }
  placePart(model, nodeName, parent, pos, ry) {
    const src = this.pack?.models?.[model]; if (!src) return null;
    const n = find(src, nodeName); if (!n) return null;
    const c = applyLod(n.clone(true), this.lod); c.traverse(o => { o.userData.shared = true; });
    c.position.set(...pos); c.rotation.set(0, ry, 0); parent.add(c); return c;
  }
  signFace(group, title, j) {
    const c = canvasTex(512, 176); if (!c) return;
    const { ctx } = c;
    ctx.fillStyle = '#16202a'; ctx.fillRect(0, 0, 512, 176);
    ctx.fillStyle = '#f2c230'; ctx.fillRect(0, 0, 120, 176);
    ctx.fillStyle = '#16202a'; ctx.font = '700 92px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(j + 1).padStart(2, '0'), 60, 92);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.font = '600 44px "Noto Sans Thai", "Sarabun", system-ui, sans-serif';
    ctx.fillText(title.slice(0, 18), 140, 72); ctx.fillStyle = '#9fb3c4'; ctx.font = '500 30px system-ui, sans-serif'; ctx.fillText('ASSEMBLY · ST' + (j + 1), 140, 128);
    c.tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({ map: c.tex, toneMapped: false });
    for (const side of [1, -1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.53), mat);
      m.position.set(side * 0.032, 4.72, 0); m.rotation.y = side * Math.PI / 2; group.add(m);
      this.disposables.push(m.geometry);
    }
    this.disposables.push(mat, c.tex);
  }
  buildIssue() {
    const g = new THREE.Group(); g.name = 'Abnormality'; g.userData.dynamic = true; this.root.add(g); this.issue = g;
    const oil = this.placePart('fixtures', 'OilSpill', g, [STATIONS[1].x + 1.2, 0, 4.9], 0.4);
    const box = this.placePart('fixtures', 'Clutter', g, [STATIONS[1].x + 2.0, 0, 5.6], -0.5);
    return oil || box;
  }
  drawOis(st, ct, takt) {
    if (!st.ois) return;
    const key = ct + '/' + takt; if (st.oisKey === key) return; st.oisKey = key;
    const { ctx, tex } = st.ois, over = ct > takt;
    ctx.fillStyle = '#0d1b28'; ctx.fillRect(0, 0, 256, 176);
    ctx.fillStyle = '#7fb4e6'; ctx.font = '600 22px system-ui, sans-serif'; ctx.fillText('STANDARD WORK · ST' + (st.index + 1), 14, 34);
    ctx.fillStyle = over ? '#ff6b5e' : '#7ef0a0'; ctx.font = '700 44px system-ui, sans-serif'; ctx.fillText('CT ' + ct + 's', 14, 96);
    ctx.fillStyle = '#d7e3ee'; ctx.font = '500 26px system-ui, sans-serif'; ctx.fillText('Takt ' + takt + 's', 14, 140);
    const w = Math.min(1, ct / Math.max(1, takt)) * 228; ctx.fillStyle = '#22384d'; ctx.fillRect(14, 152, 228, 10); ctx.fillStyle = over ? '#ff6b5e' : '#38c172'; ctx.fillRect(14, 152, w, 10);
    tex.needsUpdate = true;
  }
  // map state -> visuals (never writes to `state`)
  update(state, ct, takt) {
    const vis = visuals(state, ct);
    this.vis = vis;
    if (this.issue) this.issue.visible = !state.issueFixed;
    vis.forEach((v, j) => {
      const st = this.stations[j];
      st.vis = v;
      if (st.rack) { const p = rackPosition(j, v.layout); st.rack.position.set(p[0] - st.anchor.x, 0, p[2]); }
      if (st.bins && st.sortedShown !== v.sorted) {
        st.sortedShown = v.sorted;
        st.rackBatch?.undo();
        st.bins.forEach((b, i) => {
          const m = MESSY[i % MESSY.length];
          if (v.sorted) { b.node.position.copy(b.pos); b.node.rotation.copy(b.rot); }
          else { b.node.position.set(b.pos.x + m[0], b.pos.y + Math.abs(m[2]), b.pos.z + m[2]); b.node.rotation.set(b.rot.x, b.rot.y + m[1], b.rot.z); }
        });
        st.rackBatch = batchStatic(st.rack);
      }
      if (st.clutter) st.clutter.visible = !v.sorted;
      if (st.torqueLamp) { st.torqueLamp.emissive.set(v.maintained ? '#20e060' : '#ffb000'); st.torqueLamp.emissiveIntensity = 1.6; }
      st.wip.forEach((b, i) => { b.visible = i < Math.min(4, v.wip); });
      // product identity: colour follows the unit id from station to station
      const id = state.active[j] ?? state.blocked[j];
      if (st.car) {
        st.carrier.visible = v.hasProduct;
        if (id !== st.productId) {
          st.productId = id;
          if (st.paint) st.paint.color.set(PAINTS[Math.abs(Math.floor((id ?? j) / 7)) % PAINTS.length]);
          st.carrier.position.x = this.reducedMotion ? 0 : -1.4;
        }
        if (st.parts) {
          if (j === 1 && st.parts.interior) st.parts.interior.visible = v.progress > 0.45;
          if (j === 2) st.parts.near.visible = v.progress > 0.35;
        }
        for (const m of st.lamps || []) m.emissiveIntensity = j === 3 && v.hasProduct ? 1.8 : 0.15;
      }
      if (st.ptl) st.ptl.forEach(m => { m.emissiveIntensity = v.poka ? 0.6 : 0; });
      if (st.andon) {
        st.andon.green.emissiveIntensity = v.andon === 'green' ? 2.4 : 0;
        st.andon.amber.emissiveIntensity = v.andon === 'amber' ? 2.4 : 0;
        st.andon.red.emissiveIntensity = v.andon === 'red' ? 2.6 : 0;
        if (v.andon !== this.lastAndon[j] && (v.andon === 'red' || v.andon === 'amber')) this.audio?.chime(v.andon);
        this.lastAndon[j] = v.andon;
      }
      this.drawOis(st, ct ? ct[j] : 0, takt || 0);
      this.setClip(st, v.clip);
    });
    return vis;
  }
  setClip(st, name) {
    if (!st.mixer || st.clip === name) return;
    const next = st.actions[name] || st.actions.Idle; if (!next) return;
    const prev = st.actions[st.clip];
    next.reset().play();
    if (prev && !this.reducedMotion) prev.crossFadeTo(next, 0.35, false); else if (prev) prev.stop();
    st.clip = name;
    if (this.reducedMotion) { st.mixer.update(0); next.time = next.getClip().duration * 0.4; next.paused = true; st.mixer.update(0); }
  }
  setReducedMotion(on) {
    this.reducedMotion = on;
    for (const st of this.stations) { const a = st.actions[st.clip]; if (a) { a.paused = on; if (on) { a.time = a.getClip().duration * 0.4; st.mixer?.update(0); } } }
  }
  // cosmetic animation; dt in seconds of real time
  tick(dt, now, camera) {
    dt = Math.min(dt, 0.1);
    // hide roof trusses when the orbit camera rises into them (keeps the view clear on phones)
    if (this.ceiling && camera) this.ceiling.visible = camera.position.y < 8.2;
    const blink = Math.floor(now / 450);
    for (const st of this.stations) {
      if (st.mixer && !this.reducedMotion) st.mixer.update(dt);
      const v = st.vis; if (!v) continue;
      if (st.car && st.carrier.visible) {
        const target = (v.progress - 0.5) * 0.9;
        if (this.reducedMotion) st.carrier.position.x = target;
        else st.carrier.position.x += (target - st.carrier.position.x) * (1 - Math.exp(-dt * 3));
      }
      if (st.ptl && v.poka && v.working && !this.reducedMotion) st.ptl.forEach(m => { m.emissiveIntensity = blink % 2 ? 2.2 : 0.6; });
      if (st.andon && v.andon === 'red' && !this.reducedMotion) st.andon.red.emissiveIntensity = blink % 2 ? 2.8 : 0.5;
      if (st.cable && st.balancer && st.tool) {
        const p = st.cable.geometry.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3();
        st.balancer.getWorldPosition(a); a.y -= 0.28; st.tool.getWorldPosition(b);
        p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y + 0.04, b.z); p.needsUpdate = true;
      }
    }
    if (this.audio && this.vis) this.audio.tick(this.vis, now);
  }
  pins() { return STATIONS.map((a, j) => ({ j, pos: a.pin, vis: this.stations[j]?.vis })); }
  dispose() {
    for (const st of this.stations) { st.mixer?.stopAllAction(); st.mixer?.uncacheRoot(st.worker); st.skin?.dispose(); st.rackBatch?.undo(); st.carBatches?.forEach(b => b.undo()); }
    this.batches?.forEach(b => b.undo());
    this.root.traverse(o => {
      if (!o.isMesh && !o.isLine) return;
      for (const m of [].concat(o.material)) if (m?.userData?.own) { m.map?.dispose?.(); m.dispose(); }
    });
    for (const d of this.disposables) d.dispose?.();
    this.blob?.dispose();
    this.root.removeFromParent();
  }
}
