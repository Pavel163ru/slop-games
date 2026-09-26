/* 10_audio.js — процедурный звук на WebAudio: без единого файла. */
(function (G) {
  'use strict';

  var ctx = null, master = null, noiseBuf = null, ready = false, muted = false;

  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain();
    master.gain.value = 0.28;
    master.connect(ctx.destination);

    var n = ctx.sampleRate * 0.5;
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    ready = true;
    return true;
  }

  function now() { return ctx.currentTime; }

  /* один осциллятор со свипом частоты */
  function tone(o) {
    if (!ready || muted) return;
    var t = now();
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f1, t);
    if (o.f2 && o.f2 !== o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + o.dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.3, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + o.dur + 0.02);
  }

  function noise(o) {
    if (!ready || muted) return;
    var t = now();
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.f1, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.f2), t + o.dur);
    f.Q.value = o.q || 1.2;
    var g = ctx.createGain();
    g.gain.setValueAtTime(o.gain || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + o.dur + 0.02);
  }

  var SFX = {
    swing:  function () { noise({ f1: 1800, f2: 500, dur: 0.09, gain: 0.12, q: 0.7 }); },
    punch:  function () { tone({ type: 'square', f1: 320, f2: 90, dur: 0.10, gain: 0.30 }); noise({ f1: 900, f2: 200, dur: 0.10, gain: 0.26, q: 0.6 }); },
    hit:    function () { tone({ type: 'square', f1: 180, f2: 60, dur: 0.12, gain: 0.32 }); noise({ f1: 500, f2: 120, dur: 0.14, gain: 0.30, q: 0.8 }); },
    heavy:  function () { tone({ type: 'square', f1: 120, f2: 40, dur: 0.24, gain: 0.38 }); noise({ f1: 320, f2: 80, dur: 0.26, gain: 0.34, q: 0.7 }); },
    kick:   function () { tone({ type: 'triangle', f1: 220, f2: 50, dur: 0.16, gain: 0.34 }); noise({ f1: 700, f2: 150, dur: 0.16, gain: 0.28 }); },
    down:   function () { tone({ type: 'sawtooth', f1: 260, f2: 40, dur: 0.34, gain: 0.30 }); noise({ f1: 260, f2: 60, dur: 0.36, gain: 0.30, q: 0.5 }); },
    guard:  function () { tone({ type: 'square', f1: 900, f2: 700, dur: 0.07, gain: 0.18 }); },
    coin:   function () { tone({ type: 'square', f1: 988, dur: 0.06, gain: 0.22 }); var t = now(); setTimeout(function () { tone({ type: 'square', f1: 1319, dur: 0.12, gain: 0.22 }); }, 55); },
    jump:   function () { tone({ type: 'square', f1: 300, f2: 620, dur: 0.11, gain: 0.16 }); },
    land:   function () { noise({ f1: 220, f2: 90, dur: 0.09, gain: 0.18, q: 0.6 }); },
    menu:   function () { tone({ type: 'square', f1: 660, dur: 0.045, gain: 0.16 }); },
    ok:     function () { tone({ type: 'square', f1: 660, dur: 0.06, gain: 0.2 }); setTimeout(function () { tone({ type: 'square', f1: 990, dur: 0.09, gain: 0.2 }); }, 60); },
    no:     function () { tone({ type: 'square', f1: 200, f2: 130, dur: 0.18, gain: 0.22 }); },
    buy:    function () { tone({ type: 'square', f1: 523, dur: 0.07, gain: 0.2 }); setTimeout(function () { tone({ type: 'square', f1: 784, dur: 0.07, gain: 0.2 }); setTimeout(function () { tone({ type: 'square', f1: 1046, dur: 0.12, gain: 0.2 }); }, 60); }, 60); },
    levelup:function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { tone({ type: 'square', f1: f, dur: 0.13, gain: 0.22 }); }, i * 70); }); },
    yell:   function () { tone({ type: 'sawtooth', f1: 420, f2: 300, dur: 0.22, gain: 0.14 }); },
    tech:   function () { tone({ type: 'sawtooth', f1: 160, f2: 900, dur: 0.20, gain: 0.24 }); },
    boss:   function () { [220, 165, 110].forEach(function (f, i) { setTimeout(function () { tone({ type: 'sawtooth', f1: f, f2: f * 0.7, dur: 0.3, gain: 0.26 }); }, i * 130); }); }
  };

  /* ---------------- музыка ---------------- */
  var SCALE = [0, 3, 5, 7, 10];           // минорная пентатоника
  function hz(semi) { return 55 * Math.pow(2, semi / 12); }

  var PATTERNS = {
    river:  { bpm: 126, bass: [0, -1, 0, -1, 3, -1, 0, -1, 5, -1, 3, -1, 0, -1, -2, -1], lead: [12, 15, 19, 15, 12, 19, 22, 19, 12, 15, 19, 22, 19, 15, 12, -1] },
    downtown:{ bpm: 138, bass: [0, 0, -1, 0, 5, -1, 3, -1, 0, 0, -1, 7, 5, -1, 3, -1], lead: [15, 12, 19, 12, 22, 19, 15, 12, 15, 19, 22, 19, 15, 12, 10, -1] },
    school: { bpm: 132, bass: [0, 3, 5, 3, 0, -1, 5, -1, 7, 5, 3, -1, 0, -1, -2, -1], lead: [19, 17, 15, 12, 15, 17, 19, 22, 19, 17, 15, 12, 10, 12, 15, -1] },
    construction:{ bpm: 144, bass: [0, -1, 0, 3, 0, -1, -2, -1, 0, -1, 0, 3, 5, -1, 3, -1], lead: [12, -1, 15, 19, -1, 22, 19, 15, 12, -1, 19, 22, -1, 19, 15, -1] },
    tower:  { bpm: 150, bass: [0, 0, 3, 0, 5, 5, 3, 0, -2, -2, 0, 3, 5, 3, 0, -1], lead: [24, 22, 19, 22, 24, 27, 24, 22, 19, 22, 24, 19, 15, 12, 15, -1] },
    menu:   { bpm: 108, bass: [0, -1, -1, -1, 5, -1, -1, -1, 3, -1, -1, -1, 7, -1, 5, -1], lead: [12, -1, 15, -1, 19, -1, 15, -1, 22, -1, 19, -1, 15, -1, 12, -1] }
  };

  var Music = {
    id: null, pat: null, step: 0, next: 0, on: false,

    start: function (id) {
      if (!ensure()) return;
      if (this.id === id && this.on) return;
      this.id = id;
      this.pat = PATTERNS[id] || PATTERNS.river;
      this.step = 0;
      this.next = now() + 0.05;
      this.on = true;
    },
    stop: function () { this.on = false; this.id = null; },

    tick: function () {
      if (!this.on || !ready || muted) return;
      var spb = 60 / this.pat.bpm / 4;   // 16-е
      var guard = 0;
      while (this.next < now() + 0.25 && guard++ < 32) {
        var s = this.step % 16;
        var b = this.pat.bass[s];
        if (b >= 0) sched(hz(b + 24), this.next, 0.10, 'square', 0.13);
        var l = this.pat.lead[s];
        if (l >= 0) sched(hz(l + 24), this.next, 0.075, 'square', 0.055);
        if (s % 4 === 0) schedNoise(4200, this.next, 0.03, 0.05);
        this.next += spb;
        this.step++;
      }
    }
  };

  function sched(f, t, dur, type, gain) {
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }
  function schedNoise(f, t, dur, gain) {
    var src = ctx.createBufferSource(); src.buffer = noiseBuf;
    var bp = ctx.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = f;
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  G.Audio = {
    unlock: function () {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
    },
    sfx: function (name) {
      if (!ensure() || muted) return;
      var f = SFX[name];
      if (f) { try { f(); } catch (e) { /* звук не критичен */ } }
    },
    music: function (id) { if (ensure()) Music.start(id); },
    stopMusic: function () { Music.stop(); },
    tick: function () { Music.tick(); },
    toggleMute: function () {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.28;
      return muted;
    },
    isMuted: function () { return muted; }
  };
})(window.G);
