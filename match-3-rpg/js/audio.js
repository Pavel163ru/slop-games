// audio.js — WebAudio без файлов: осцилляторы + огибающая.

let ctx = null;
let muted = false;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function beep(freq, dur = 0.12, type = 'square', vol = 0.06, when = 0) {
  if (muted) return;
  try {
    const a = ac();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t = a.currentTime + when;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch { /* без звука — игра продолжается */ }
}

export const sfx = {
  swap() { beep(300, 0.06); },
  error() { beep(140, 0.15, 'sawtooth', 0.07); },
  match(n = 3) { beep(440 + n * 90, 0.12); beep(660 + n * 90, 0.1, 'square', 0.06, 0.07); },
  hit() { beep(180, 0.2, 'sawtooth', 0.1); },
  hurt() { beep(120, 0.25, 'sawtooth', 0.1); },
  heal() { beep(520, 0.15, 'sine', 0.09); beep(780, 0.15, 'sine', 0.07, 0.1); },
  gold() { beep(880, 0.08, 'triangle', 0.07); beep(1320, 0.1, 'triangle', 0.06, 0.06); },
  fireball() { beep(220, 0.3, 'sawtooth', 0.1); beep(90, 0.35, 'square', 0.08, 0.05); },
  lightning() { beep(1200, 0.08, 'sawtooth', 0.09); beep(300, 0.25, 'sawtooth', 0.1, 0.05); beep(90, 0.3, 'square', 0.08, 0.1); },
  vampire() { beep(700, 0.12, 'sine', 0.08); beep(350, 0.2, 'sine', 0.09, 0.1); },
  shield() { beep(240, 0.18, 'triangle', 0.09); beep(360, 0.15, 'triangle', 0.07, 0.08); },
  potion() { beep(400, 0.1, 'sine', 0.09); beep(600, 0.1, 'sine', 0.09, 0.09); beep(800, 0.14, 'sine', 0.08, 0.18); },
  buy() { beep(660, 0.08, 'triangle', 0.08); beep(990, 0.12, 'triangle', 0.08, 0.07); },
  levelup() { [392, 523, 659, 784].forEach((f, i) => beep(f, 0.16, 'triangle', 0.09, i * 0.1)); },
  click() { beep(500, 0.05, 'square', 0.05); },
  crit() { beep(1500, 0.1, 'square', 0.08); beep(2000, 0.14, 'square', 0.07, 0.08); },
  boom() { beep(150, 0.3, 'sawtooth', 0.1); beep(70, 0.4, 'square', 0.09, 0.05); },
  shuffleSfx() { [300, 450, 600, 450, 300].forEach((f, i) => beep(f, 0.07, 'triangle', 0.06, i * 0.06)); },
  summon() { beep(200, 0.2, 'sawtooth', 0.08); beep(150, 0.25, 'sawtooth', 0.08, 0.12); },
  event() { beep(520, 0.12, 'triangle', 0.07); beep(390, 0.16, 'triangle', 0.07, 0.1); },
  ach() { [784, 988, 1175, 1568].forEach((f, i) => beep(f, 0.14, 'sine', 0.09, i * 0.09)); },
  win() { [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.18, 'triangle', 0.09, i * 0.12)); },
  lose() { [400, 300, 220, 150].forEach((f, i) => beep(f, 0.22, 'sawtooth', 0.08, i * 0.14)); },
  toggleMute() { muted = !muted; return muted; },
  setMuted(m) { muted = !!m; },
  isMuted() { return muted; },
};
