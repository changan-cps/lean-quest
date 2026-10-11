// Tests for the 3D Assembly vertical slice that run in Node (no GPU):
// anchors/hitboxes, read-only state mapping, FPS independence, manifest integrity.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from './three.module.min.js';
import { newState, act, step, cycleTimes, takt, results } from './training-core.mjs';
import { STATIONS, isDown, stationVisual, visuals, rackPosition, fitDistance } from './scene3d/layout.mjs';
import { AssemblySlice } from './scene3d/assembly.mjs';
import * as A from './tools/assets/author.mjs';
import { MeshoptSimplifier } from './tools/assets/lib/meshopt_simplifier.js';

let packPromise;
async function fakePack() {
  // the same builders that produce assets/factory/*.glb, used directly (no file loading)
  if (!packPromise) packPromise = MeshoptSimplifier.ready.then(() => {
    const worker = A.buildWorker();
    return { tier: { lod: 0 }, models: { hall: A.buildHall(), station: A.buildStation(), car: A.buildCar(), worker, flowrack: A.buildFlowRack(), tools: A.buildTools(), fixtures: A.buildFixtures() }, clips: { worker: worker.animations } };
  });
  return packPromise;
}
const snapshot = s => JSON.stringify(s);

test('station anchors and hitboxes are separate from visuals and do not overlap', () => {
  assert.equal(STATIONS.length, 4);
  for (let j = 0; j < 4; j++) {
    const a = STATIONS[j], b = STATIONS[j + 1];
    assert.ok(Object.isFrozen(a) && Object.isFrozen(a.hitbox));
    if (b) assert.ok(a.hitbox.center[0] + a.hitbox.size[0] / 2 <= b.hitbox.center[0] - b.hitbox.size[0] / 2 + 1e-9, 'hitboxes overlap');
    for (const v of ['near', 'side', 'far']) assert.ok(rackPosition(j, v)[2] > a.operator[2], 'rack must be behind the operator');
  }
  assert.ok(rackPosition(0, 'near')[2] < rackPosition(0, 'side')[2] && rackPosition(0, 'side')[2] < rackPosition(0, 'far')[2]);
  // a 360 px portrait phone still frames one station at a usable distance
  const d = fitDistance(STATIONS[0].view.width, 40, 360 / 360);
  assert.ok(d > 5 && d < 20, 'close-up distance ' + d);
});

test('breakdown predicate matches training-core downtime exactly', () => {
  for (const lvl of [3, 4, 6]) {
    const s = newState('assembly', lvl); act(s, { type: 'run' });
    for (let t = 0; t < 400; t++) {
      const before = s.downTime.slice(), predicted = [0, 1, 2, 3].map(j => { const n = structuredClone(s); n.time++; return isDown(n, j); });
      step(s, 1);
      for (let j = 0; j < 4; j++) {
        // a blocked station waits instead of counting downtime, so only check the down -> counted direction
        if (s.downTime[j] > before[j]) assert.ok(predicted[j], `lvl ${lvl} t ${s.time} st ${j}`);
        if (predicted[j] && s.blocked[j] === null && before[j] === s.downTime[j]) assert.fail(`missed down lvl ${lvl} t ${s.time} st ${j}`);
      }
    }
  }
});

test('visual mapping is read-only and reports andon / clip / WIP', () => {
  const s = newState('assembly', 4); act(s, { type: 'run' }); step(s, 250);
  const frozen = snapshot(s);
  const v = visuals(s, cycleTimes(s));
  assert.equal(snapshot(s), frozen);
  assert.equal(v.length, 4);
  for (const x of v) {
    assert.ok(['green', 'amber', 'red', 'off'].includes(x.andon));
    assert.ok(x.progress >= 0 && x.progress <= 1);
    if (x.working) assert.notEqual(x.clip, 'Idle');
    if (x.down) assert.equal(x.andon, 'red');
  }
});

test('assembly slice builds from the asset builders, maps state, never mutates it', async () => {
  const pack = await fakePack();
  const slice = new AssemblySlice(pack, { quality: 'medium', stationNames: ['a', 'b', 'c', 'd'] });
  assert.equal(slice.targets.length, 4);
  slice.targets.forEach((t, j) => { assert.equal(t.userData.station, j); assert.equal(t.material.visible, false); });
  const s = newState('assembly', 2);
  s.layout[1] = 'near'; s.sorted[2] = true; s.poka[3] = true;
  const before = snapshot(s);
  slice.update(s, cycleTimes(s), takt(s));
  assert.equal(snapshot(s), before, 'update() must not write to state');
  assert.equal(slice.stations[1].rack.position.z, rackPosition(1, 'near')[2]);
  assert.equal(slice.stations[0].rack.position.z, rackPosition(0, 'far')[2]);
  assert.equal(slice.stations[2].clutter.visible, false);
  assert.equal(slice.stations[0].clutter.visible, true);
  assert.equal(slice.issue.visible, true);
  s.issueFixed = true; slice.update(s, cycleTimes(s), takt(s));
  assert.equal(slice.issue.visible, false);
  // static batching actually reduced the number of visible meshes
  let visible = 0; slice.root.traverse(o => { if (o.isMesh && o.visible && o.material.visible !== false) { let p = o, ok = true; while (p) { if (!p.visible) ok = false; p = p.parent; } if (ok) visible++; } });
  assert.ok(visible < 260, 'visible meshes after batching: ' + visible);
  slice.dispose();
});

test('production results are identical whatever the render frame rate', async () => {
  const pack = await fakePack();
  const run = (fps) => {
    const s = newState('assembly', 4); act(s, { type: 'run' });
    const slice = fps ? new AssemblySlice(pack, { quality: 'low' }) : null;
    let now = 0;
    for (let sec = 0; sec < 90; sec++) {          // the UI steps 10 simulated seconds per real second
      step(s, 10);
      if (slice) { slice.update(s, cycleTimes(s), takt(s)); for (let f = 0; f < fps; f++) { now += 1000 / fps; slice.tick(1 / fps, now, null); } }
    }
    slice?.dispose();
    return { state: snapshot(s), res: results(s) };
  };
  const base = run(0), slow = run(7), fast = run(60);
  assert.equal(slow.state, base.state);
  assert.equal(fast.state, base.state);
  assert.deepEqual(fast.res, base.res);
});

test('asset manifest: files exist, hashes match, licences recorded, first-scene budget', () => {
  const man = JSON.parse(readFileSync('assets/factory/manifest.json', 'utf8'));
  const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
  for (const [name, m] of Object.entries(man.models)) {
    const p = 'assets/factory/' + m.url;
    assert.ok(existsSync(p), p);
    assert.equal(sha(p), m.sha256, name + ' hash');
    assert.ok(m.license && m.author && m.source, name + ' licence');
  }
  for (const [name, t] of Object.entries(man.textures)) {
    const p = 'assets/factory/' + t.url;
    assert.ok(existsSync(p), p);
    assert.equal(sha(p), t.sha256, name + ' hash');
    assert.ok(t.license, name + ' licence');
  }
  for (const [q, cfg] of Object.entries(man.quality)) {
    let bytes = Object.values(man.models).reduce((a, m) => a + m.bytes, 0);
    const sets = new Set();
    for (const spec of Object.values(man.materials)) for (const mp of spec.maps) if (cfg.maps.includes(mp)) sets.add(`${spec.set}_${mp}_${cfg.textureSize}`);
    for (const k of sets) { assert.ok(man.textures[k], 'missing texture ' + k); bytes += man.textures[k].bytes; }
    assert.ok(bytes < man.budget.firstSceneBytesMax, `${q}: ${bytes} bytes`);
  }
});
