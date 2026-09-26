'use strict';
/* ============================================================
 * entities/weapons.js — пули, самонаводящиеся ракеты, ящики,
 * флаги, взрывы
 * ============================================================ */

const Weapons = {
  bullets: [],
  missiles: [],
  crates: [],
  flags: [],

  reset(diff) {
    this.bullets = []; this.missiles = []; this.crates = []; this.flags = [];
    /* число флагов — по текущему городу кампании (этап A1/A2) */
    const nf = (Game.city && Game.city.flags) || CITY.flags;
    CityMap.flagSpots.slice(0, nf).forEach(p =>
      this.flags.push({ x: p.x, y: p.y, taken: false, ph: rand(0, TAU) }));
    CityMap.crateSpots.slice(0, 6).forEach((p, i) =>
      this.crates.push({ x: p.x, y: p.y, type: i % 3 === 2 ? 'msl' : 'ammo', active: true, respawnT: 0, bob: rand(0, TAU) }));
  },

  dropCrate(x, y, type) {
    this.crates.push({ x, y, type, active: true, respawnT: -1, bob: rand(0, TAU) });
  },

  fireGun() {
    const pl = Player;
    const perf = pl.perf || { gunCd: CFG.GUN_CD, gunSpread: CFG.GUN_SPREAD, gunDmg: 1 };
    pl.ammo--; pl.gunCd = perf.gunCd;
    const mx = pl.x + Math.cos(pl.angle) * 20, my = pl.y + Math.sin(pl.angle) * 20;
    const a = pl.angle + rand(-perf.gunSpread, perf.gunSpread);
    this.bullets.push({ x: mx, y: my, vx: Math.cos(a) * CFG.GUN_SPD, vy: Math.sin(a) * CFG.GUN_SPD, life: CFG.GUN_LIFE, friendly: true, dmg: perf.gunDmg });
    Sound.gun();
    Particles.spawn(P.FLAME, mx, my, Math.cos(pl.angle) * 120, Math.sin(pl.angle) * 120, .08, 2.5);
    Draw.cam.shake = Math.min(4, Draw.cam.shake + .25);
  },

  fireMissile() {
    const pl = Player;
    pl.missiles--; pl.mslCd = CFG.MSL_CD;
    /* цель: ближайший живой вертолёт, иначе ближайшая шахта */
    let target = null, best = 1e18;
    for (const h of Helis.list) {
      if (h.dying) continue;
      const d = dist2(pl.x, pl.y, h.x, h.y);
      if (d < best) { best = d; target = h; }
    }
    if (!target) {
      for (const s of Silos.list) {
        const d = dist2(pl.x, pl.y, s.x, s.y);
        if (d < best) { best = d; target = s; }
      }
    }
    const a = target ? Math.atan2(target.y - pl.y, target.x - pl.x) : pl.angle;
    this.missiles.push({
      x: pl.x + Math.cos(pl.angle) * 18, y: pl.y + Math.sin(pl.angle) * 18,
      angle: a, spd: CFG.MSL_SPD * .55, life: CFG.MSL_LIFE,
      enemy: false, target, smokeT: 0,
    });
    Sound.launch();
    Draw.cam.shake = Math.min(6, Draw.cam.shake + 2);
  },

  spawnEnemyBullet(x, y, a) {
    this.bullets.push({ x, y, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, life: 1.6, friendly: false });
  },

  spawnEnemyMissile(x, y) {
    this.missiles.push({
      x, y, angle: Math.atan2(Player.y - y, Player.x - x),
      spd: Game.diff.mslSpeed * .6, life: 7,
      enemy: true, target: null, smokeT: 0,
    });
  },

  explosionFx(x, y, r) {
    Particles.spawn(P.FLASH, x, y, 0, 0, .18, r * .9);
    Particles.spawn(P.RING, x, y, 0, 0, .45, r);
    for (let i = 0; i < 22; i++) {
      const a = rand(0, TAU), s = rand(80, 340);
      Particles.spawn(P.SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s, rand(.2, .5), rand(1.5, 3), { drag: 2.4 });
    }
    for (let i = 0; i < 16; i++)
      Particles.spawn(P.FLAME, x + rand(-10, 10), y + rand(-10, 10), rand(-150, 150), rand(-150, 150), rand(.25, .6), rand(2.5, 5), { drag: 2.6 });
    for (let i = 0; i < 12; i++)
      Particles.spawn(P.DEBRIS, x, y, rand(-240, 240), rand(-240, 240), rand(.4, .9), rand(2, 3.5), { drag: 1.8 });
    for (let i = 0; i < 14; i++)
      Particles.spawn(P.SMOKE, x + rand(-14, 14), y + rand(-14, 14), rand(-60, 60), rand(-60, 60), rand(.6, 1.3), rand(3, 6), { grow: 6, drag: 1.2 });
    Decals.scorch(x, y, r * .55);
    Draw.cam.shake = Math.min(13, Draw.cam.shake + Math.min(9, r * .09));
  },

  blast(x, y, opt = {}) {
    const r = opt.r || 100;
    const friendly = opt.friendly !== false; // вражеские взрывы не трогают свою технику
    this.explosionFx(x, y, r);
    Sound.explosion(r > 90);
    for (let i = Gremlins.list.length - 1; i >= 0; i--) {
      const g = Gremlins.list[i];
      if (dist2(g.x, g.y, x, y) < r * r) Gremlins.kill(g, 'blast');
    }
    if (friendly) {
      for (let i = Silos.list.length - 1; i >= 0; i--) {
        const s = Silos.list[i];
        if (dist2(s.x, s.y, x, y) < (r + 24) * (r + 24)) Silos.damage(s, 99, 'blast');
      }
      for (let i = Helis.list.length - 1; i >= 0; i--) {
        const h = Helis.list[i];
        if (!h.dying && dist2(h.x, h.y, x, y) < (r + 55) * (r + 55)) Helis.hitH(h);
      }
    }
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      if (dist2(m.x, m.y, x, y) < r * r) this.missiles.splice(i, 1);
    }
    if (opt.selfDmg !== false && !Player.dead) {
      const d = Math.hypot(Player.x - x, Player.y - y);
      if (d < r) Player.damage(10 + 14 * (1 - d / r), 'blast');
    }
  },
  update(dt) {
    /* --- пули --- */
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0;

      if (!dead && b.friendly) {
        /* пуля игрока ломается о здания */
        const res = CityMap.collideCircle(b.x, b.y, 2);
        if (res.hit) {
          dead = true;
          for (let k = 0; k < 3; k++)
            Particles.spawn(P.SPARK, b.x, b.y, rand(-100, 100), rand(-100, 100), rand(.1, .25), 1.5);
        }
      }
      if (!dead && b.friendly) {
        /* сбивать вражеские ракеты из пулемёта */
        for (let j = this.missiles.length - 1; j >= 0; j--) {
          const m = this.missiles[j];
          if (m.enemy && dist2(m.x, m.y, b.x, b.y) < 15 * 15) {
            this.missiles.splice(j, 1); dead = true; Sound.clank();
            for (let k = 0; k < 6; k++)
              Particles.spawn(P.POP, m.x, m.y, rand(-100, 100), rand(-100, 100), rand(.15, .35), 2.5, { color: '#ffb45e' });
            break;
          }
        }
      }
      if (!dead && b.friendly) {
        for (const g of Gremlins.list) {
          if (dist2(g.x, g.y, b.x, b.y) < 12 * 12) { Gremlins.kill(g, 'bullet'); dead = true; break; }
        }
        if (!dead) for (const s of Silos.list) {
          if (dist2(s.x, s.y, b.x, b.y) < 26 * 26) {
            Silos.damage(s, b.dmg || 1, 'gun'); dead = true;
            Particles.spawn(P.SPARK, b.x, b.y, rand(-90, 90), rand(-90, 90), rand(.1, .25), 1.5);
            break;
          }
        }
        if (!dead) for (const h of Helis.list) {
          if (!h.dying && dist2(h.x, h.y, b.x, b.y) < 20 * 20) {
            dead = true; Sound.clank();
            Texts.add(h.x, h.y - 34, 'БРОНЯ', '#9aa3b2', 12);
            Particles.spawn(P.SPARK, b.x, b.y, rand(-90, 90), rand(-90, 90), rand(.12, .28), 1.8);
            break;
          }
        }
      }
      if (!dead && !b.friendly && !Player.dead && Player.invuln <= 0 &&
          dist2(Player.x, Player.y, b.x, b.y) < 16 * 16) {
        Player.damage(CFG.BULLET_DMG, 'heli');
        dead = true;
      }
      if (dead) this.bullets.splice(i, 1);
    }

    /* --- ракеты --- */
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt; m.smokeT -= dt;

      let want = null;
      if (m.enemy) {
        if (!Player.dead) want = Math.atan2(Player.y - m.y, Player.x - m.x);
      } else if (m.target) {
        const t = m.target;
        const alive = t.dying !== undefined ? (!t.dying && Helis.list.includes(t)) : Silos.list.includes(t);
        if (alive) want = Math.atan2(t.y - m.y, t.x - m.x);
      }
      if (want != null) {
        let dv = want - m.angle;
        while (dv > Math.PI) dv -= TAU;
        while (dv < -Math.PI) dv += TAU;
        const tr = (m.enemy ? 2.7 : CFG.MSL_TURN) * dt;
        m.angle += clamp(dv, -tr, tr);
      }
      const topSpd = m.enemy ? Game.diff.mslSpeed : CFG.MSL_SPD;
      m.spd = Math.min(topSpd, m.spd + 900 * dt);
      m.x += Math.cos(m.angle) * m.spd * dt;
      m.y += Math.sin(m.angle) * m.spd * dt;
      if (m.smokeT <= 0) {
        m.smokeT = .03;
        Particles.spawn(P.SMOKE, m.x, m.y, rand(-15, 15), rand(-15, 15), rand(.3, .6), rand(1.5, 2.5), { grow: 3, drag: 1.5 });
        Particles.spawn(P.FLAME, m.x, m.y, 0, 0, .08, 2);
      }

      let boom = m.life <= 0;
      if (!boom && CityMap.collideCircle(m.x, m.y, 4).hit) boom = true;
      if (!boom) {
        if (m.enemy) {
          if (!Player.dead && Player.invuln <= 0 && dist2(Player.x, Player.y, m.x, m.y) < 22 * 22) boom = true;
        } else if (m.target && dist2(m.target.x, m.target.y, m.x, m.y) < 30 * 30) boom = true;
      }
      if (boom) {
        this.missiles.splice(i, 1);
        this.blast(m.x, m.y, { r: m.enemy ? 80 : (Player.perf ? Player.perf.mslBlast : CFG.MSL_BLAST_R), selfDmg: true, friendly: !m.enemy });
      }
    }

    /* --- ящики: респавн дорожных --- */
    for (const c of this.crates) {
      if (!c.active && c.respawnT > 0) {
        c.respawnT -= dt;
        if (c.respawnT <= 0) c.active = true;
      }
    }
    for (const f of this.flags) f.ph += dt * 6;
  },
  drawGround(ctx) {
    /* ящики с припасами */
    for (const c of this.crates) {
      if (!c.active) continue;
      const bob = Math.sin(Game.time * 3 + c.bob) * 1.5;
      const x = c.x, y = c.y + bob;
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath(); ctx.ellipse(c.x + 3, c.y + 10, 12, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = c.type === 'ammo' ? '#3f6b46' : '#7a4b2a';
      rrect(ctx, x - 11, y - 9, 22, 18, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.stroke();
      if (c.type === 'ammo') {
        ctx.fillStyle = '#ffd75e';
        ctx.fillRect(x - 6, y - 4, 3, 8); ctx.fillRect(x - 1.5, y - 4, 3, 8); ctx.fillRect(x + 3, y - 4, 3, 8);
      } else {
        ctx.fillStyle = '#ffb45e';
        ctx.beginPath();
        ctx.moveTo(x, y - 6); ctx.lineTo(x + 4, y + 4); ctx.lineTo(x - 4, y + 4);
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = `rgba(255,255,255,${.18 + .14 * Math.sin(Game.time * 5 + c.bob)})`;
      ctx.lineWidth = 1.5;
      rrect(ctx, x - 13, y - 11, 26, 22, 4); ctx.stroke();
    }
    /* флаги */
    for (const f of this.flags) {
      if (f.taken) continue;
      const wave = Math.sin(f.ph) * 3;
      /* пульсирующий маяк */
      ctx.strokeStyle = `rgba(255,85,70,${.28 + .16 * Math.sin(f.ph * 1.4)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(f.x, f.y, 26 + Math.sin(f.ph * 1.4) * 4, 0, TAU); ctx.stroke();
      /* тень и шест */
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath(); ctx.ellipse(f.x + 3, f.y + 11, 7, 3.4, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#b9c0ca'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(f.x, f.y + 10); ctx.lineTo(f.x, f.y - 22); ctx.stroke();
      /* полотнище */
      const g = ctx.createLinearGradient(f.x, 0, f.x + 16, 0);
      g.addColorStop(0, '#ff5546'); g.addColorStop(1, '#c22b20');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y - 22);
      ctx.quadraticCurveTo(f.x + 8, f.y - 20 + wave, f.x + 16, f.y - 18 + wave);
      ctx.lineTo(f.x + 15, f.y - 13 + wave);
      ctx.quadraticCurveTo(f.x + 8, f.y - 15 + wave, f.x, f.y - 13);
      ctx.closePath(); ctx.fill();
    }
  },

  drawAir(ctx) {
    /* пули */
    for (const b of this.bullets) {
      if (b.friendly) {
        ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * .012, b.y - b.vy * .012);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#ff5d4a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * .014, b.y - b.vy * .014);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,93,74,.25)';
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, TAU); ctx.fill();
      }
    }
    ctx.lineCap = 'butt';
    /* ракеты */
    for (const m of this.missiles) {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.angle);
      ctx.fillStyle = m.enemy ? '#8a3d33' : '#5a6270';
      rrect(ctx, -8, -3, 16, 6, 3); ctx.fill();
      ctx.strokeStyle = '#12151b'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = m.enemy ? '#ff5d4a' : '#8ef2a8';
      ctx.beginPath();
      ctx.moveTo(8, -3); ctx.lineTo(13, 0); ctx.lineTo(8, 3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd75e';
      ctx.beginPath();
      ctx.moveTo(-8, -2.4); ctx.lineTo(-13 - rand(0, 5), 0); ctx.lineTo(-8, 2.4);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  },
};
