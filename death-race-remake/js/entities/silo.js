'use strict';
/* ============================================================
 * entities/silo.js — ракетные шахты: наводят самонаводящиеся
 * ракеты; уничтожаются тараном на скорости, пулями и взрывами
 * ============================================================ */

const Silos = {
  list: [],

  reset(diff, count) {
    this.list = [];
    const spots = CityMap.siloSpots.slice(0, count || diff.silos);
    for (const p of spots)
      this.list.push({ x: p.x, y: p.y, hp: 10, maxHp: 10, cd: rand(3, 6), flash: 0, open: 0 });
  },

  update(dt) {
    const pl = Player;
    /* темп стрельбы зависит от города (этап A4): поздние города бьют чаще */
    const diff = effDiff(Game.diff, Game.city);
    for (const s of this.list) {
      if (s.flash > 0) s.flash -= dt;
      const d = Math.hypot(s.x - pl.x, s.y - pl.y);
      s.open += ((d < 820 ? 1 : 0) - s.open) * Math.min(1, dt * 3);
      s.cd -= dt;
      if (s.cd <= 0 && d < 800 && !pl.dead) {
        s.cd = diff.siloCd * rand(.85, 1.2);
        s.flash = .5;
        Weapons.spawnEnemyMissile(s.x, s.y);
        Sound.launch();
        for (let i = 0; i < 10; i++)
          Particles.spawn(P.SMOKE, s.x + rand(-8, 8), s.y + rand(-16, 2),
            rand(-40, 40), rand(-80, -20), rand(.4, .8), rand(2, 4), { grow: 3, drag: 1.5 });
      }
    }
  },

  damage(s, amt, cause) {
    if (s.hp <= 0) return;
    s.hp -= amt;
    s.flash = .35;
    if (s.hp > 0) {
      for (let i = 0; i < 5; i++)
        Particles.spawn(P.SPARK, s.x + rand(-14, 14), s.y + rand(-14, 14), rand(-120, 120), rand(-120, 120), rand(.15, .3), rand(1, 2));
      return;
    }
    const i = this.list.indexOf(s);
    if (i >= 0) this.list.splice(i, 1);
    Weapons.blast(s.x, s.y, { r: 80, selfDmg: true });
    Weapons.dropCrate(s.x, s.y, 'ammo');
    Game.addKill('silo', s.x, s.y);
  },
  draw(ctx) {
    for (const s of this.list) {
      ctx.fillStyle = 'rgba(0,0,0,.30)';
      ctx.beginPath(); ctx.ellipse(s.x + 6, s.y + 8, 24, 14, 0, 0, TAU); ctx.fill();
      /* бетонная площадка */
      ctx.fillStyle = '#454a54';
      ctx.beginPath(); ctx.arc(s.x, s.y, 24, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 3; ctx.stroke();
      /* предупреждающие секторы */
      ctx.fillStyle = '#b98a2f';
      for (let k = 0; k < 8; k += 2) {
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.arc(s.x, s.y, 21, k * TAU / 8, (k + 1) * TAU / 8);
        ctx.closePath(); ctx.fill();
      }
      /* створки шахты */
      const o = s.open;
      ctx.fillStyle = '#31363f';
      ctx.fillRect(s.x - 16 - o * 10, s.y - 8, 16, 16);
      ctx.fillRect(s.x + o * 10, s.y - 8, 16, 16);
      ctx.strokeStyle = '#22262d'; ctx.lineWidth = 2;
      ctx.strokeRect(s.x - 16 - o * 10, s.y - 8, 16, 16);
      ctx.strokeRect(s.x + o * 10, s.y - 8, 16, 16);
      /* головка ракеты в открытой шахте */
      if (o > .5) {
        ctx.fillStyle = '#8f97a3';
        ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#d24a3c';
        ctx.beginPath(); ctx.arc(s.x, s.y, 2.6, 0, TAU); ctx.fill();
      }
      /* красный маячок перед пуском */
      const blink = s.cd < 1.4 && Math.floor(Game.time * 6) % 2 === 0;
      ctx.fillStyle = blink || s.flash > 0 ? '#ff4038' : '#5a1f1c';
      ctx.beginPath(); ctx.arc(s.x, s.y - 19, 3, 0, TAU); ctx.fill();
      /* индикатор прочности */
      if (s.hp < s.maxHp) {
        const w = 34, frac = s.hp / s.maxHp;
        ctx.fillStyle = 'rgba(10,12,16,.6)';
        ctx.fillRect(s.x - w / 2, s.y - 32, w, 5);
        ctx.fillStyle = frac > .5 ? '#8ef2a8' : '#ff6a52';
        ctx.fillRect(s.x - w / 2, s.y - 32, w * frac, 5);
      }
    }
  },
};
