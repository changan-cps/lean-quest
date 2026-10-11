// Station anchors, hitboxes and the read-only mapping from training-core state
// to what each station should *look* like. Kept separate from the visual
// geometry so artists can replace models without touching gameplay, and so it
// can be unit-tested in Node without a GPU.
//
// Nothing in this file mutates the state object it is given.

export const PITCH = 6.4;          // m between station centres (matches assets/factory/station.glb)
export const PRODUCT_Y = 0.37;     // car sits on the skid pads
export const OPERATOR_Z = 1.6;     // operator stands on the mat, facing the car (-Z)

const rackZ = { near: 2.55, side: 3.25, far: 4.15 };

export const STATIONS = [0, 1, 2, 3].map(j => {
  const x = (j - 1.5) * PITCH;
  return Object.freeze({
    index: j,
    x,
    product: Object.freeze([x, PRODUCT_Y, 0]),
    operator: Object.freeze([x + 0.15, 0, OPERATOR_Z]),
    rackX: x - 1.75,
    rack: Object.freeze({ ...rackZ }),
    wipSpot: Object.freeze([x - PITCH / 2 + 0.55, 0, -1.45]),
    // generous invisible hit volume: the whole station cell, floor to frame
    hitbox: Object.freeze({ center: Object.freeze([x, 1.6, 0.6]), size: Object.freeze([PITCH - 0.2, 3.2, 6.2]) }),
    pin: Object.freeze([x, 3.0, 0.2]),
    // close-up camera: orbit target + distance hint (the scene fits it to the screen)
    view: Object.freeze({ target: Object.freeze([x - 0.3, 0.95, 0.35]), width: 8.6, angle: 0.3, elevation: 0.52 }),
  });
});

export const OVERVIEW = Object.freeze({ target: Object.freeze([0, 0.8, 0.6]), width: 4 * PITCH + 2, angle: 0.62, elevation: 0.56 });
// portrait phones: look down the line so it runs into depth instead of shrinking to fit the width
export const OVERVIEW_PORTRAIT = Object.freeze({ target: Object.freeze([-1.5, 0.8, 0.4]), width: 12.5, angle: 1.08, elevation: 0.5 });

// hand-tool / animation per station of the Assembly factory
export const ROLE = Object.freeze([
  { clip: 'Pick', hand: null, fixture: 'KitCart' },
  { clip: 'Install', hand: null, fixture: null },
  { clip: 'Fasten', hand: 'Nutrunner', fixture: 'TyreRack' },
  { clip: 'Inspect', hand: 'Tablet', fixture: 'LightTunnel' },
]);

export function rackPosition(j, layoutValue) {
  const s = STATIONS[j];
  return [s.rackX, 0, s.rack[layoutValue] ?? s.rack.far];
}

// Same breakdown window as training-core step(): level >= 4, not maintained,
// time in [240 + 20j, 270 + 20j). Duplicated read-only so the core stays the
// single writer of production results; training-scene.test.mjs checks they agree.
export function isDown(s, j) {
  return s.level >= 4 && !s.maintained[j] && s.time >= 240 + j * 20 && s.time < 270 + j * 20;
}

export function stationVisual(s, j, ct) {
  const down = isDown(s, j);
  const active = s.active[j] !== null;
  const blocked = s.blocked[j] !== null;
  const running = s.status === 'running';
  const working = running && active && !down;
  const andon = down ? 'red' : blocked ? 'amber' : working ? 'green' : 'off';
  const cycle = ct && ct[j] ? ct[j] : 1;
  const progress = active ? Math.max(0, Math.min(1, 1 - (s.busy[j] || 0) / cycle)) : blocked ? 1 : 0;
  return {
    index: j,
    hasProduct: active || blocked || s.status === 'ready',
    working, blocked, down, andon, progress,
    wip: Math.max(0, s.queues[j] | 0),
    layout: s.layout[j],
    sorted: !!s.sorted[j],
    poka: !!s.poka[j],
    maintained: !!s.maintained[j],
    clip: working ? ROLE[j].clip : 'Idle',
  };
}

export function visuals(s, ct) {
  return [0, 1, 2, 3].map(j => stationVisual(s, j, ct));
}

// Camera distance that fits `width` metres across the viewport for a vertical FOV (deg) and aspect.
export function fitDistance(width, fovDeg, aspect, margin = 1.08) {
  const v = (fovDeg * Math.PI) / 180;
  const h = 2 * Math.atan(Math.tan(v / 2) * aspect);
  return (width * margin) / 2 / Math.tan(h / 2);
}
