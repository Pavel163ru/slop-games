'use strict';
/* ============================================================
 * particles.js — частицы, всплывающие тексты, декали
 * ============================================================ */

const P = { SMOKE: 0, SPARK: 1, FLAME: 2, DEBRIS: 3, BLOOD: 4, POP: 5, RING: 6, FLASH: 7, DUST: 8 };
const PMAX = 1000;

const Particles = {
  list: [],
  clear() { this.list.length = 0; },
  spawn(type, x, y, vx, vy, life, size, opts = {}) {
    if (this.list.length >= PMAX) this.list.shift();
    this.list.push({ type, x, y, vx, vy, life, max: life, size,
      rot: rand(0, TAU), grow: opts.grow || 0, drag: opts.drag || 0, color: opts.color || null });
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; }
      p.size += p.grow * dt;
    }
  },
  draw(ctx) {
    for (const p of this.list) {
      const a = p.life / p.max;
      switch (p.type) {
        case P.SMOKE:
          ctx.globalAlpha = a * .32; ctx.fillStyle = '#c9ccd2';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); break;
        case P.DUST:
          ctx.globalAlpha = a * .25; ctx.fillStyle = '#8d8f96';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); break;
        case P.SPARK:
          ctx.globalAlpha = a; ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .02, p.y - p.vy * .02); ctx.stroke(); break;
        case P.FLAME:
          ctx.globalAlpha = a; ctx.fillStyle = a > .5 ? '#ffd75e' : '#ff7a3d';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (.6 + a * .6), 0, TAU); ctx.fill(); break;
        case P.DEBRIS:
          ctx.globalAlpha = a; ctx.fillStyle = '#3a3d44';
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + p.life * 9);
          ctx.fillRect(-p.size, -p.size * .6, p.size * 2, p.size * 1.2); ctx.restore(); break;
        case P.BLOOD:
          ctx.globalAlpha = a * .9; ctx.fillStyle = '#a11212';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); break;
        case P.POP:
          ctx.globalAlpha = a; ctx.fillStyle = p.color || '#ffe14d';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a + 1, 0, TAU); ctx.fill(); break;
        case P.RING:
          ctx.globalAlpha = a * .8; ctx.strokeStyle = '#ffb45e'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - a) + 8, 0, TAU); ctx.stroke(); break;
        case P.FLASH:
          ctx.globalAlpha = a * .85; ctx.fillStyle = '#fff3d6';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - a * .4), 0, TAU); ctx.fill(); break;
      }
    }
    ctx.globalAlpha = 1;
  },
};

/* --- всплывающие тексты в мировых координатах --- */
const Texts = {
  list: [],
  add(x, y, txt, color = '#fff', size = 15) {
    this.list.push({ x, y, txt, color, size, life: .95, max: .95 });
    if (this.list.length > 24) this.list.shift();
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i];
      t.life -= dt; t.y -= 36 * dt;
      if (t.life <= 0) this.list.splice(i, 1);
    }
  },
  draw(ctx) {
    ctx.textAlign = 'center';
    for (const t of this.list) {
      ctx.globalAlpha = Math.min(1, t.life / t.max * 1.6);
      ctx.font = `700 ${t.size}px Consolas, monospace`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.txt, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  },
  clear() { this.list.length = 0; },
};

/* --- декали: кровь, гарь, следы шин (полурезолюция, копятся за уровень) --- */
const Decals = {
  canvas: null, x: null, S: .5,
  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = WORLD.W * this.S;
    this.canvas.height = WORLD.H * this.S;
    this.x = this.canvas.getContext('2d');
  },
  reset() { if (this.x) this.x.clearRect(0, 0, this.canvas.width, this.canvas.height); },
  blood(x, y, scale = 1) {
    const c = this.x; if (!c) return;
    c.save(); c.scale(this.S, this.S); c.translate(x, y); c.rotate(rand(0, TAU));
    c.fillStyle = 'rgba(122,10,10,.75)';
    for (let i = 0; i < 7; i++) {
      c.globalAlpha = rand(.35, .8);
      c.beginPath(); c.arc(rand(-16, 16) * scale, rand(-16, 16) * scale, rand(2.5, 7) * scale, 0, TAU); c.fill();
    }
    c.globalAlpha = .85;
    c.beginPath(); c.arc(0, 0, 6 * scale, 0, TAU); c.fill();
    c.restore();
  },
  scorch(x, y, r = 34) {
    const c = this.x; if (!c) return;
    c.save(); c.scale(this.S, this.S);
    const g = c.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, 'rgba(12,12,14,.8)');
    g.addColorStop(1, 'rgba(12,12,14,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.restore();
  },
  skid(x, y) {
    const c = this.x; if (!c) return;
    c.save(); c.scale(this.S, this.S);
    c.fillStyle = 'rgba(15,15,18,.25)';
    c.beginPath(); c.arc(x, y, 1.8, 0, TAU); c.fill();
    c.restore();
  },
  draw(ctx, camX, camY, vw, vh) {
    if (!this.canvas) return;
    const sx = clamp(camX * this.S, 0, this.canvas.width - 1);
    const sy = clamp(camY * this.S, 0, this.canvas.height - 1);
    ctx.drawImage(this.canvas, sx, sy, vw * this.S, vh * this.S, camX, camY, vw, vh);
  },
};
