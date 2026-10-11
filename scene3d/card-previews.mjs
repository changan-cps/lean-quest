// Live 3D previews for the game cards (GitHub Pages build). Each preview is a
// small, cosmetic demo: it never touches saved games or scores.
import { mountHero } from './hero.mjs';

const INKS = ['#2356c9', '#d23a2e', '#1d2228'];

function demoPenState() {
  const names = ['หยิบชิ้นส่วน', 'ใส่ไส้ปากกา', 'ประกอบ + อัด', 'ทดสอบ + แพ็ก'];
  const tasks = [['t1', 't2'], ['t3', 't4', 't5'], ['t6', 't7', 't8', 't9'], ['t10', 't11']];
  const S = names.map((name, i) => {
    const has = {}; tasks[i].forEach(t => (has[t] = true));
    return { name, cell: { c: i + 1, r: 1 }, tasks: tasks[i], has, wc: 20, repair: 0, broken: false };
  });
  const looks = [{ skin: '#e6b993', hair: '#2b1f17', g: 'm' }, { skin: '#d9a77f', hair: '#1a1411', g: 'f' }, { skin: '#c99470', hair: '#2b1f17', g: 'm' }, { skin: '#e6b993', hair: '#3a2a1e', g: 'f' }, { skin: '#d9a77f', hair: '#1a1411', g: 'm' }];
  const workers = [0, 1, 2, 2, 3].map((st, id) => ({ id: id + 1, st, sk: id === 0 ? 1 : 0.9, job: { t: 0 }, look: looks[id], absent: false }));
  const buf = S.map(() => []).concat([[]]);
  buf[1].push({ ink: INKS[0] }); buf[2].push({ ink: INKS[1] }, { ink: INKS[2] }); buf[4].push({ ink: INKS[0] });
  const hourly = [{ plan: 60, act: 58 }, { plan: 90, act: 84 }, { plan: 120, act: 61 }];
  const goalRows = ['S', 'Q', 'D', 'C', 'P', 'M', 'E'].map((k, i) => ({ k, col: ['#2fbf6b', '#2a6df4', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#10b981'][i], ok: i !== 3 }));
  return { S, workers, buf, jph: 120, t: 600, round: 2, hourly, flow: [], shipped: 36, goalRows, noMat: false };
}

export async function penPreview(el) {
  const { mount } = await import('../pen-factory-view.mjs');
  const st = demoPenState();
  const view = await mount(el, st, {});
  let last = performance.now(), acc = 0, fid = 0, raf = 0, alive = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frame = (t) => {
    if (!alive) return;
    const dt = Math.min(0.1, (t - last) / 1000); last = t;
    if (!document.hidden) {
      st.t += dt * 6; acc += dt;
      if (acc > 1.4 && !reduce) {           // move one pen down the line
        acc = 0;
        const from = Math.floor(Math.random() * 5) - 1, to = from + 1;
        const ink = INKS[fid % 3];
        if (from >= 0 && st.buf[from].length) st.buf[from].shift();
        if (to <= 4) { st.buf[to].push({ ink }); if (st.buf[to].length > 3) st.buf[to].shift(); }
        st.flow.push({ id: ++fid, from, to, ink }); if (st.flow.length > 8) st.flow.shift();
        if (to >= 4) st.shipped++;
      }
      view.update(dt);
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const ro = new ResizeObserver(() => view.resize?.()); ro.observe(el);
  return { dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); view.dispose(); } };
}

export function autoPreview(el) { return mountHero(el); }
