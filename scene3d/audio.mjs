// Synthesised factory ambience (no audio files): low hall rumble, conveyor hum,
// nutrunner bursts when a station is fastening, and a soft chime on andon
// changes. Created only after a user gesture (sound button). Volume is kept
// low so Thai narration (speechSynthesis) stays intelligible.
export class FactoryAudio {
  constructor() { this.ctx = null; this.on = false; this.lastBurst = [0, 0, 0, 0]; }
  start() {
    if (this.ctx) { this.ctx.resume?.(); this.on = true; this.master.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.3); return; }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
    this.master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.4);
    // brown-ish noise bed
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    this.noiseBuf = buf;
    const bed = ctx.createBufferSource(); bed.buffer = buf; bed.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    const g = ctx.createGain(); g.gain.value = 0.16; bed.connect(lp).connect(g).connect(this.master); bed.start();
    // conveyor / ventilation hum
    const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 50;
    const hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 160;
    this.humGain = ctx.createGain(); this.humGain.gain.value = 0.012; hum.connect(hf).connect(this.humGain).connect(this.master); hum.start();
    this.on = true;
  }
  stop() { if (!this.ctx) return; this.on = false; this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15); }
  // called from the render loop with station visuals (read-only)
  tick(vis, now) {
    if (!this.on || !this.ctx) return;
    const working = vis.filter(v => v.working).length;
    this.humGain.gain.setTargetAtTime(0.008 + working * 0.004, this.ctx.currentTime, 0.5);
    vis.forEach((v, j) => {
      if (v.working && v.clip === 'Fasten' && now - this.lastBurst[j] > 1600) { this.lastBurst[j] = now; this.nutrunner(); }
    });
  }
  nutrunner() {
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(1150, t + 0.35);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 2;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + 0.04); g.gain.setTargetAtTime(0, t + 0.42, 0.05);
    o.connect(bp).connect(g).connect(this.master); o.start(t); o.stop(t + 0.7);
  }
  chime(kind) {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const notes = kind === 'red' ? [659, 523] : [784];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t + i * 0.22); g.gain.linearRampToValueAtTime(0.05, t + i * 0.22 + 0.02); g.gain.setTargetAtTime(0, t + i * 0.22 + 0.15, 0.08);
      o.connect(g).connect(this.master); o.start(t + i * 0.22); o.stop(t + i * 0.22 + 0.6);
    });
  }
  dispose() { try { this.ctx?.close(); } catch (e) {} this.ctx = null; this.on = false; }
}
