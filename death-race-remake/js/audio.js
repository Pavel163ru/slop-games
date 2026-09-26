'use strict';
/* ============================================================
 * audio.js — синтез WebAudio: движок, оружие, взрывы, UI
 * ============================================================ */

const Sound = {
  ctx: null, master: null, muted: false, engine: null,

  /** Инициализация по первому жесту пользователя */
  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = .5;
        this.master.connect(this.ctx.destination);
      } catch (e) { return; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : .5;
  },

  now() { return this.ctx ? this.ctx.currentTime : 0; },

  tone(f, dur, type = 'square', vol = .15, f2 = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.now() + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f), t);
    if (f2 != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + .02);
  },

  noise(dur, vol = .3, cutoff = 1000, cutoff2 = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.now() + delay;
    const len = Math.max(1, (dur * this.ctx.sampleRate) | 0);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, t);
    if (cutoff2 != null) f.frequency.exponentialRampToValueAtTime(Math.max(20, cutoff2), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + .02);
  },

  /* --- игровые события --- */
  gun()      { this.noise(.05, .14, 2600, 300); this.tone(210, .05, 'square', .07, 90); },
  clank()    { this.tone(1500, .04, 'square', .06, 900); },
  kill()     { this.noise(.09, .2, 500, 120); this.tone(110, .12, 'sine', .18, 45); },
  crash()    { this.noise(.22, .3, 900, 150); },
  explosion(big) { this.noise(big ? .7 : .45, big ? .55 : .4, big ? 900 : 1400, 60); this.tone(big ? 150 : 200, big ? .6 : .4, 'sine', .35, 30); },
  launch()   { this.tone(160, .5, 'sawtooth', .12, 900); this.noise(.5, .12, 600, 2400); },
  pickup()   { this.tone(660, .07, 'square', .12); this.tone(990, .1, 'square', .12, null, .07); },
  flag()     { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .11, 'square', .14, null, i * .09)); },
  siren()    { for (let i = 0; i < 4; i++) { this.tone(760, .16, 'square', .14, null, i * .36); this.tone(520, .16, 'square', .14, null, i * .36 + .18); } },
  tick()     { this.tone(1100, .05, 'square', .1); },
  uiMove()   { this.tone(440, .045, 'square', .09); },
  uiOk()     { this.tone(880, .12, 'square', .12); this.tone(1320, .14, 'square', .1, null, .08); },
  lose()     { this.tone(220, .7, 'sawtooth', .2, 55); },
  win()      { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, .16, 'square', .14, null, i * .12)); },

  /* --- непрерывный гул двигателя, частота от скорости --- */
  engineOn(on) {
    if (!this.ctx) return;
    if (on && !this.engine) {
      const o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator();
      const g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
      o.type = 'sawtooth';  o.frequency.value = 55;
      o2.type = 'square';   o2.frequency.value = 28;
      f.type = 'lowpass';   f.frequency.value = 320;
      g.gain.value = 0;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
      o.start(); o2.start();
      this.engine = { o, o2, g };
    } else if (!on && this.engine) {
      try { this.engine.o.stop(); this.engine.o2.stop(); } catch (e) {}
      this.engine = null;
    }
  },

  engineSet(speed, throttle, on) {
    if (!this.engine) return;
    const target = on ? .05 + (throttle ? .03 : 0) : 0;
    this.engine.g.gain.value += (target - this.engine.g.gain.value) * .15;
    const fr = 48 + Math.abs(speed) * .2 + (throttle ? 14 : 0);
    this.engine.o.frequency.value += (fr - this.engine.o.frequency.value) * .2;
    this.engine.o2.frequency.value = this.engine.o.frequency.value * .5;
  },
};
