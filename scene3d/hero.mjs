// Live 3D hero for the Lean Quest home page: the same Assembly line as the
// Factory Training page, running a demo shift (cosmetic only, never saved).
import { FactoryScene } from '../training-scene.mjs';
import { newState, act, step } from '../training-core.mjs';

export function mountHero(el, { onSelect = () => {} } = {}) {
  const narrow = el.clientWidth < 640;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new FactoryScene(el, { quality: narrow ? 'low' : 'medium', onSelect, reducedMotion: reduce });
  let s = newState('assembly', 1);
  act(s, { type: 'run' });
  step(s, 120);                      // start with cars already on the line
  scene.update(s);
  const tick = setInterval(() => {
    if (document.hidden) return;
    if (s.status === 'done') { s = newState('assembly', 1); act(s, { type: 'run' }); step(s, 60); }
    step(s, 6);
    scene.update(s);
  }, 1000);
  // slow orbit so the scene feels alive; dragging still works
  const orbit = reduce ? null : setInterval(() => { if (!document.hidden && scene.goal) scene.goal.angle += 0.0025; }, 50);
  return { scene, dispose() { clearInterval(tick); if (orbit) clearInterval(orbit); scene.dispose(); } };
}
