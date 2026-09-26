/* 00_core.js — ядро: константы, утилиты, RNG, ввод, фиксированный игровой цикл. */
window.G = window.G || {};
(function (G) {
  'use strict';

  G.STEP = 1 / 60;
  G.VW = 320;
  G.VH = 180;

  /* ---------- утилиты ---------- */
  G.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  G.sign = function (v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); };
  G.lerp = function (a, b, t) { return a + (b - a) * t; };
  G.approach = function (v, t, d) { return v < t ? Math.min(v + d, t) : Math.max(v - d, t); };

  /* mulberry32 — детерминированный RNG, чтобы спавн и дроп не зависели от Math.random */
  G.rng = function (seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  G.ri = function (r, a, b) { return a + Math.floor(r() * (b - a + 1)); };
  G.pick = function (r, arr) { return arr[Math.floor(r() * arr.length) % arr.length]; };
  G.chance = function (r, p) { return r() < p; };

  G.pad = function (n, w) { var s = String(n); while (s.length < w) s = ' ' + s; return s; };

  /* ---------- ввод ---------- */
  /* Нажатия складываются в pending и доставляются первому же фикс-шагу.
     Так они не теряются на 144 Гц, где часть кадров рендерится без шага физики. */
  var Input = {
    held: Object.create(null),
    pending: Object.create(null),
    step: Object.create(null),
    used: Object.create(null),

    init: function () {
      var self = this;
      var block = {
        ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1,
        Space: 1, Tab: 1, Enter: 1, KeyE: 1,
        KeyJ: 1, KeyK: 1, KeyL: 1, KeyZ: 1, KeyX: 1, KeyC: 1, KeyV: 1
      };
      window.addEventListener('keydown', function (e) {
        if (block[e.code]) e.preventDefault();
        if (!e.repeat && !self.held[e.code]) self.pending[e.code] = true;
        self.held[e.code] = true;
        if (G.Audio) G.Audio.unlock();
      }, { passive: false });
      window.addEventListener('keyup', function (e) { self.held[e.code] = false; });
      window.addEventListener('blur', function () { self.held = Object.create(null); });
    },

    /* вызывается в начале каждого фикс-шага */
    deliver: function () {
      this.step = this.pending;
      this.pending = Object.create(null);
      this.used = Object.create(null);
    },

    down: function (c) { return !!this.held[c]; },
    /* hit() срабатывает один раз на нажатие, даже если за кадр прошло несколько шагов */
    hit: function (c) {
      if (this.step[c] && !this.used[c]) { this.used[c] = true; return true; }
      return false;
    },
    peek: function (c) { return !!this.step[c]; },

    /* то же самое, но для списка кодов-синонимов (например SHIFT LEFT/RIGHT) */
    hitAny: function (codes) {
      if (!codes) return false;
      for (var i = 0; i < codes.length; i++) {
        if (this.step[codes[i]] && !this.used[codes[i]]) { this.used[codes[i]] = true; return true; }
      }
      return false;
    },
    downAny: function (codes) {
      if (!codes) return false;
      for (var i = 0; i < codes.length; i++) if (this.held[codes[i]]) return true;
      return false;
    },

    axis: function (out) {
      var x = 0, y = 0;
      if (this.down('ArrowLeft') || this.down('KeyA')) x -= 1;
      if (this.down('ArrowRight') || this.down('KeyD')) x += 1;
      if (this.down('ArrowUp') || this.down('KeyW')) y -= 1;
      if (this.down('ArrowDown') || this.down('KeyS')) y += 1;
      out = out || { x: 0, y: 0 };
      out.x = x; out.y = y;
      return out;
    },
    any: function () {
      for (var k in this.frame) if (this.frame[k]) return true;
      return false;
    }
  };
  G.Input = Input;

  /* ---------- цикл с фиксированным шагом ---------- */
  var Loop = {
    acc: 0,
    last: 0,
    fps: 60,
    _acc: 0,
    _n: 0,

    start: function (update, render) {
      var self = this;
      this.last = performance.now();
      /* игровой цикл не должен умирать от одного исключения — иначе игра просто встанет */
      var seen = Object.create(null);
      function guard(fn, arg) {
        try { fn(arg); } catch (e) {
          var msg = String(e && e.message || e);
          if (!seen[msg]) { seen[msg] = 1; console.error('[loop]', e); }
        }
      }

      function frame(now) {
        var dt = (now - self.last) / 1000;
        self.last = now;
        if (!(dt > 0)) dt = 0;
        if (dt > 0.25) dt = 0.25;          // после сворачивания вкладки не догоняем вечность

        self.acc += dt;
        var steps = 0;
        while (self.acc >= G.STEP && steps < 5) {
          G.Input.deliver();
          guard(update, G.STEP);
          self.acc -= G.STEP;
          steps++;
        }
        if (steps === 5) self.acc = 0;     // не даём аккумулятору расти (спираль смерти)

        guard(render, dt);

        self._acc += dt; self._n++;
        if (self._acc >= 0.5) { self.fps = Math.round(self._n / self._acc); self._acc = 0; self._n = 0; }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
  };
  G.Loop = Loop;

  /* ---------- экран: масштаб, canvas'ы ---------- */
  var Screen = {
    scale: 3,
    dpr: 1,
    game: null, gctx: null,
    fx: null, fctx: null,

    init: function () {
      this.game = document.getElementById('game');
      this.gctx = this.game.getContext('2d');
      this.fx = document.getElementById('fx');
      this.fctx = this.fx.getContext('2d');
      this.gctx.imageSmoothingEnabled = false;

      var self = this;
      window.addEventListener('resize', function () { self.resize(); });
      this.resize();
    },

    resize: function () {
      var wrap = document.getElementById('wrap');
      var pad = 24;
      var aw = Math.max(160, window.innerWidth - pad);
      var ah = Math.max(90, window.innerHeight - 70);
      var s = Math.min(aw / G.VW, ah / G.VH);
      s = s >= 1 ? Math.floor(s) : s;              // целочисленный масштаб — пиксели остаются квадратными
      if (s < 1) s = Math.max(0.4, s);
      this.scale = s;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);

      var w = Math.round(G.VW * s), h = Math.round(G.VH * s);
      wrap.style.width = w + 'px';
      wrap.style.height = h + 'px';
      wrap.style.setProperty('--s', s);
      document.documentElement.style.setProperty('--s', s);

      this.fx.width = Math.round(w * this.dpr);
      this.fx.height = Math.round(h * this.dpr);
      this.fctx.setTransform(s * this.dpr, 0, 0, s * this.dpr, 0, 0);
      this.fctx.textBaseline = 'alphabetic';
    },

    clearFx: function () {
      this.fctx.save();
      this.fctx.setTransform(1, 0, 0, 1, 0, 0);
      this.fctx.clearRect(0, 0, this.fx.width, this.fx.height);
      this.fctx.restore();
    }
  };
  G.Screen = Screen;

})(window.G);
