'use strict';
/* ============================================================
 * entities/gremlin.js — гремлины: разбегаются, паникуют, гибнут
 * ============================================================ */

const Gremlins = {
  list: [],
  spawnT: 0,
  cap: 20,
  panicSpd: 88,

  /* ed — эффективные параметры давления (effDiff: сложность + город, этап A4) */
  reset(ed) {
    this.list = [];
    this.graves = [];
    CityMap.graves = this.graves;
    this.cap = ed.gremCap;
    this.panicSpd = ed.gremPanic;
    this.spawnT = 0;
    const pts = CityMap.gremSpawns;
    for (let i = 0; i < Math.min(this.cap, pts.length); i++)
      this.list.push(this.make(pts[i].x, pts[i].y));
  },

  make(x, y) {
    return { x, y, dir: rand(0, TAU), t: rand(.5, 2), phase: rand(0, TAU), panic: 0, spd: rand(38, 58) };
  },

  update(dt) {
    const pl = Player;
    /* поддержание популяции — спавн подальше от игрока */
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.list.length < this.cap) {
      this.spawnT = 2.4;
      let pool = CityMap.gremSpawns.filter(p => dist2(p.x, p.y, pl.x, pl.y) > 560 * 560);
      if (!pool.length) pool = CityMap.gremSpawns.filter(p => dist2(p.x, p.y, pl.x, pl.y) > 380 * 380);
      if (pool.length) {
        const p = pool[(Math.random() * pool.length) | 0];
        this.list.push(this.make(p.x, p.y));
        Particles.spawn(P.POP, p.x, p.y, 0, 0, .3, 6, { color: '#c7d0dc' });
      }
    }

    for (let i = this.list.length - 1; i >= 0; i--) {
      const g = this.list[i];
      const d = Math.hypot(g.x - pl.x, g.y - pl.y);
      if (!pl.dead && d < 230 && (Math.abs(pl.speed) > 90 || d < 150))
        g.panic = Math.max(g.panic, 1.6);
      if (g.panic > 0) g.panic -= dt;

      let sp;
      if (g.panic > 0 && !pl.dead) {
        g.dir = Math.atan2(g.y - pl.y, g.x - pl.x) + Math.sin(g.phase * 3) * .6;
        sp = this.panicSpd;
      } else {
        g.t -= dt;
        if (g.t <= 0) { g.t = rand(.8, 2.4); g.dir = rand(0, TAU); }
        sp = g.spd;
      }
      g.phase += dt * (sp > 70 ? 14 : 8);

      const nx = g.x + Math.cos(g.dir) * sp * dt;
      const ny = g.y + Math.sin(g.dir) * sp * dt;
      const res = CityMap.collideCircle(nx, ny, 9);
      if (res.hit) {
        g.x += res.x; g.y += res.y;
        g.dir = Math.atan2(res.y, res.x) + rand(-.5, .5);
        g.t = Math.min(g.t, .4);
      } else { g.x = nx; g.y = ny; }
    }
  },

  kill(g, cause) {
    const i = this.list.indexOf(g);
    if (i < 0) return;
    this.list.splice(i, 1);
    if (this.graves.length < 48) this.graves.push({ x: g.x, y: g.y });
    Sound.kill();
    Decals.blood(g.x, g.y, 1);
    for (let k = 0; k < 10; k++)
      Particles.spawn(P.BLOOD, g.x, g.y, rand(-160, 160), rand(-160, 160), rand(.25, .6), rand(1.5, 3.5), { drag: 3 });
    Game.addKill('gremlin', g.x, g.y);
  },

  /** Могилки на месте гибели гремлинов — как в аркаде 1976 */
  drawGraves(ctx) {
    for (const gv of this.graves) {
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.ellipse(gv.x + 3, gv.y + 7, 9, 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#78808c';
      rrect(ctx, gv.x - 7, gv.y - 10, 14, 17, 5); ctx.fill();
      ctx.strokeStyle = '#4c525c'; ctx.lineWidth = 1.5;
      rrect(ctx, gv.x - 7, gv.y - 10, 14, 17, 5); ctx.stroke();
      ctx.strokeStyle = '#565e6a';
      ctx.beginPath();
      ctx.moveTo(gv.x - 3.5, gv.y - 4); ctx.lineTo(gv.x + 3.5, gv.y - 4);
      ctx.moveTo(gv.x, gv.y - 7.5); ctx.lineTo(gv.x, gv.y);
      ctx.stroke();
    }
  },

  draw(ctx) {
    for (const g of this.list) {
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath(); ctx.ellipse(g.x + 3, g.y + 6, 8, 4, 0, 0, TAU); ctx.fill();

      const c = Math.cos(g.dir), s = Math.sin(g.dir);
      const px = -s, py = c;
      const sw = Math.sin(g.phase) * (g.panic > 0 ? 5 : 3.4);
      ctx.strokeStyle = '#e3e8ef';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(g.x, g.y + 7); ctx.lineTo(g.x, g.y - 4);                       /* тело */
      if (g.panic > 0) {                                                        /* руки вверх */
        ctx.moveTo(g.x, g.y - 3); ctx.lineTo(g.x + px * 7 - sw, g.y - 11);
        ctx.moveTo(g.x, g.y - 3); ctx.lineTo(g.x - px * 7 + sw, g.y - 11);
      } else {
        ctx.moveTo(g.x, g.y - 3); ctx.lineTo(g.x + px * 6 - sw, g.y + 2);
        ctx.moveTo(g.x, g.y - 3); ctx.lineTo(g.x - px * 6 + sw, g.y + 2);
      }
      ctx.moveTo(g.x, g.y + 7); ctx.lineTo(g.x + px * sw, g.y + 13);            /* ноги */
      ctx.moveTo(g.x, g.y + 7); ctx.lineTo(g.x - px * sw, g.y + 13);
      ctx.stroke();
      /* голова и глаза */
      ctx.fillStyle = '#e3e8ef';
      ctx.beginPath(); ctx.arc(g.x, g.y - 8, 4.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff4038';
      ctx.beginPath();
      ctx.arc(g.x + c * 1.6 - 1.4, g.y - 9, 1.2, 0, TAU);
      ctx.arc(g.x + c * 1.6 + 1.8, g.y - 9, 1.2, 0, TAU);
      ctx.fill();
    }
    ctx.lineCap = 'butt';
  },
};
