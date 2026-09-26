'use strict';
/* ============================================================
 * entities/heli.js — вертолёты: преследуют, стреляют, сбиваются
 * только ракетами; подбитый падает и взрывается
 * ============================================================ */

const Helis = {
  list: [],

  reset(diff, count) {
    this.list = [];
    const corners = [
      { x: 200, y: 200 }, { x: CityMap.roadsX[3], y: 200 },
      { x: 200, y: CityMap.roadsY[3] }, { x: CityMap.roadsX[3], y: CityMap.roadsY[3] },
    ];
    for (let i = 0; i < (count || diff.helis); i++) {
      const c = corners[i % 4];
      this.list.push({
        x: c.x, y: c.y, vx: 0, vy: 0, hd: rand(0, TAU),
        orbA: rand(0, TAU), orbDir: i % 2 ? 1 : -1,
        fireCd: rand(2.5, 4.5), burst: 0, burstT: 0,
        rotor: rand(0, TAU), dying: false, alt: 130, spin: 0, lightT: rand(0, 1),
      });
    }
  },

  update(dt) {
    const pl = Player, diff = Game.diff, t = Game.time;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const h = this.list[i];
      h.rotor += dt * (h.dying ? 6 : 26);
      h.lightT += dt;

      if (h.dying) {
        h.alt = Math.max(0, h.alt - 150 * dt);
        h.spin += dt * 9;
        h.x += h.vx * dt; h.y += h.vy * dt;
        h.vx *= .985; h.vy *= .985;
        if (Math.random() < .55)
          Particles.spawn(P.SMOKE, h.x + rand(-10, 10), h.y + rand(-10, 10) - h.alt * .5,
            rand(-30, 30), rand(-30, 30), rand(.4, .9), rand(2, 4), { grow: 3, drag: 1 });
        if (h.alt <= 0) {
          const hx = h.x, hy = h.y;
          this.list.splice(i, 1);
          Weapons.blast(hx, hy, { r: 90, selfDmg: true });
          Weapons.dropCrate(hx, hy, 'msl');
          Game.addKill('heli', hx, hy);
        }
        continue;
      }

      /* --- маневрирование: погоня с упреждением / бой на кольце --- */
      const dx = pl.x - h.x, dy = pl.y - h.y;
      const d = Math.hypot(dx, dy) || 1;
      let want, turnMax, spdMul;
      if (d > 300) {
        /* ПОГОНЯ: летим на прогнозируемую позицию игрока;
           резинка 1.3× при большом отрыве — полностью не убежать */
        const lead = clamp(d / 600, 0, .8);
        const tx = pl.x + pl.vx * lead, ty = pl.y + pl.vy * lead;
        want = Math.atan2(ty - h.y, tx - h.x);
        turnMax = 3.2;
        spdMul = d > 700 ? 1.3 : 1.05;
      } else {
        /* БОЙ: касательная орбита — держим кольцо ~200px и стреляем;
           слишком далеко → доворот к игроку, слишком близко → отвал */
        const ring = 200;
        const phi = Math.atan2(dy, dx);
        const err = clamp((d - ring) / ring, -1, 1);
        want = phi + h.orbDir * (Math.PI / 2) * (1 - .85 * err);
        turnMax = 2.6;
        spdMul = .85;
      }
      /* курс хранится в состоянии и доворачивается к цели. Нельзя брать
         курс из фактической скорости (atan2(vy,vx)): скорость следует к
         желаемому направлению лишь частично, обратная связь не сходится,
         и вертолёт вечно кружит на месте вместо погони */
      if (!isFinite(h.hd)) h.hd = want;
      let dv = want - h.hd;
      while (dv > Math.PI) dv -= TAU;
      while (dv < -Math.PI) dv += TAU;
      h.hd += clamp(dv, -turnMax * dt, turnMax * dt);
      const spd = diff.heliSpeed * spdMul * (.92 + .08 * Math.sin(t * .5 + i * 3));
      const k = 1 - Math.exp(-2.4 * dt);
      h.vx = lerp(h.vx, Math.cos(h.hd) * spd, k);
      h.vy = lerp(h.vy, Math.sin(h.hd) * spd, k);
      h.x = clamp(h.x + h.vx * dt, 40, WORLD.W - 40);
      h.y = clamp(h.y + h.vy * dt, 40, WORLD.H - 40);

      /* стрельба очередями */
      if (h.burst > 0) {
        h.burstT -= dt;
        if (h.burstT <= 0) {
          h.burstT = .11; h.burst--;
          const lead = .28;
          const aim = Math.atan2(pl.y + pl.vy * lead - h.y, pl.x + pl.vx * lead - h.x) + rand(-.06, .06);
          Weapons.spawnEnemyBullet(h.x, h.y, aim);
        }
      } else {
        h.fireCd -= dt;
        if (h.fireCd <= 0 && d < 620 && !pl.dead) {
          h.burst = diff.heliBurst;
          h.burstT = 0;
          h.fireCd = diff.heliFire * rand(.8, 1.3);
        }
      }
    }
  },

  hitH(h) {
    if (h.dying) return;
    h.dying = true;
    h.vx *= .4; h.vy *= .4;
    Sound.explosion(false);
    for (let i = 0; i < 8; i++)
      Particles.spawn(P.FLAME, h.x, h.y, rand(-120, 120), rand(-120, 120), rand(.3, .6), rand(2, 4), { drag: 2 });
  },
  draw(ctx) {
    for (const h of this.list) {
      /* тень на земле — под точкой, куда упадёт */
      ctx.fillStyle = 'rgba(0,0,0,.30)';
      ctx.beginPath();
      ctx.ellipse(h.x + 26 + h.alt * .12, h.y + 30 + h.alt * .16, 20, 12, 0, 0, TAU);
      ctx.fill();

      ctx.save();
      ctx.translate(h.x, h.y - h.alt * .55);
      if (h.dying) ctx.rotate(h.spin);
      const a = Math.atan2(h.vy, h.vx);
      /* корпус фюзеляжа */
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = '#2f3540';
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 9, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#161a20'; ctx.lineWidth = 2; ctx.stroke();
      /* хвост */
      ctx.strokeStyle = '#2f3540'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-34, -6); ctx.stroke();
      ctx.fillStyle = '#2f3540';
      ctx.fillRect(-38, -12, 4, 9);
      /* кабина */
      ctx.fillStyle = '#86d7ff';
      ctx.beginPath(); ctx.ellipse(9, 0, 6.5, 5, 0, 0, TAU); ctx.fill();
      ctx.restore();
      /* несущий винт — размытый диск */
      ctx.globalAlpha = .30;
      ctx.fillStyle = '#cfd6df';
      ctx.beginPath(); ctx.arc(0, -4, 26, 0, TAU); ctx.fill();
      ctx.globalAlpha = .8;
      ctx.strokeStyle = '#e8ecf2'; ctx.lineWidth = 2;
      const ra = h.rotor;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ra) * 26, -4 + Math.sin(ra) * 26);
      ctx.lineTo(-Math.cos(ra) * 26, -4 - Math.sin(ra) * 26);
      ctx.stroke();
      ctx.globalAlpha = 1;
      /* мигающий маячок */
      if (Math.sin(h.lightT * 6) > 0) {
        ctx.fillStyle = h.dying ? '#ffb45e' : '#ff4038';
        ctx.beginPath(); ctx.arc(0, -4, 3, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  },
};
