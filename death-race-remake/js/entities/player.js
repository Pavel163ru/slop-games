'use strict';
/* ============================================================
 * entities/player.js — бронемашина игрока: физика, урон, отрисовка
 * ============================================================ */

const Player = {
  x: 0, y: 0, angle: 0, vx: 0, vy: 0, speed: 0, vLat: 0,
  steer: 0, steerVis: 0, throttle: 0, brake: 0, handbrake: false,
  hp: 100, maxHp: 100, ammo: 0, missiles: 0, perf: null,
  invuln: 0, gunCd: 0, mslCd: 0, crashCd: 0,
  dead: false, respawnT: 0, driftT: 0, onRoad: true,

  reset(diff) {
    Shop.applyTo(this, diff);
    this.x = CityMap.spawn.x; this.y = CityMap.spawn.y;
    this.angle = CityMap.spawn.angle;
    this.vx = this.vy = this.speed = this.vLat = 0;
    this.steer = this.steerVis = this.throttle = this.brake = 0;
    this.handbrake = false;
    this.hp = this.maxHp = this.perf.maxHp;
    this.ammo = diff.gunAmmo; this.missiles = diff.mslCount + this.perf.mslBonus;
    this.invuln = CFG.INVULN; this.gunCd = 0; this.mslCd = 0; this.crashCd = 0;
    this.dead = false; this.respawnT = 0; this.driftT = 0;
  },

  update(dt) {
    if (this.dead) {
      this.respawnT -= dt;
      if (this.respawnT <= 0 && Game.lives > 0) Game.afterDeath();
      return;
    }
    /* --- ввод --- */
    const up = Input.down('ArrowUp', 'KeyW'), dn = Input.down('ArrowDown', 'KeyS');
    const lf = Input.down('ArrowLeft', 'KeyA'), rt = Input.down('ArrowRight', 'KeyD');
    this.throttle = up ? 1 : 0;
    this.brake = dn ? 1 : 0;
    const target = (rt ? 1 : 0) - (lf ? 1 : 0);
    this.steer += (target - this.steer) * Math.min(1, dt * 8);
    this.steerVis += (this.steer - this.steerVis) * Math.min(1, dt * 12);
    this.handbrake = Input.down('Space');

    this.gunCd -= dt; this.mslCd -= dt; this.crashCd -= dt;
    if (this.invuln > 0) this.invuln -= dt;

    if (Input.down('KeyZ', 'KeyJ') && this.gunCd <= 0 && this.ammo > 0) Weapons.fireGun();
    if (Input.pressed('KeyX', 'KeyK') && this.mslCd <= 0 && this.missiles > 0) Weapons.fireMissile();

    /* --- физика (модель продольной/поперечной скорости) --- */
    const fx = Math.cos(this.angle), fy = Math.sin(this.angle), rx = -fy, ry = fx;
    let vF = this.vx * fx + this.vy * fy;
    let vL = this.vx * rx + this.vy * ry;
    this.onRoad = CityMap.isOnRoad(this.x, this.y);

    if (this.throttle > 0) {
      const p = 1 - clamp(Math.abs(vF) / this.perf.maxSpd, 0, 1);
      vF += this.perf.accel * p * dt;
    }
    if (this.brake > 0) {
      if (vF > 10) vF -= CFG.BRAKE * dt;
      else if (vF > -CFG.REVMAX) vF -= CFG.ACCEL * .6 * dt;
    }
    vF -= vF * CFG.DRAG * dt;
    vF -= Math.sign(vF) * Math.min(Math.abs(vF), CFG.ROLL * dt * (this.onRoad ? 1 : 2.2));
    if (this.handbrake) vF *= Math.exp(-.7 * dt);

    let grip = this.onRoad ? (Math.abs(vL) > CFG.SLIP_ON ? CFG.GRIP_DRIFT : this.perf.grip) : CFG.GRIP_OFF;
    if (this.handbrake) grip = Math.min(grip, CFG.GRIP_HB);
    if (this.throttle && Math.abs(vF) > 200 && Math.abs(this.steer) > .5) grip *= .55;
    vL *= Math.exp(-grip * dt);

    const spd = Math.abs(vF);
    const steerMax = .62 / (1 + spd * .0045);
    const sa = this.steer * steerMax;
    if (spd > 4) {
      const turnRate = this.perf.turn * clamp(spd / 260, 0, 1) * (1 + (this.handbrake ? .45 : 0));
      this.angle += Math.sign(vF || 1) * sa * turnRate * dt * 1.9;
    }

    const nfx = Math.cos(this.angle), nfy = Math.sin(this.angle), nrx = -nfy, nry = nfx;
    this.vx = nfx * vF + nrx * vL;
    this.vy = nfy * vF + nry * vL;
    this.speed = vF; this.vLat = vL;
    this.x += this.vx * dt; this.y += this.vy * dt;

    /* --- столкновения со зданиями/деревьями --- */
    const res = CityMap.collideCircle(this.x, this.y, CFG.CAR_R);
    if (res.hit) {
      this.x += res.x; this.y += res.y;
      const d = Math.hypot(res.x, res.y) || 1;
      const nx = res.x / d, ny = res.y / d;
      const vn = this.vx * nx + this.vy * ny;
      if (vn < 0) {
        this.vx -= vn * 1.55 * nx; this.vy -= vn * 1.55 * ny;
        this.vx *= .72; this.vy *= .72;
        const impact = -vn;
        if (impact > 70 && this.crashCd <= 0) {
          Sound.crash();
          Draw.cam.shake = Math.min(9, 2 + impact * .012);
          for (let i = 0; i < 6; i++)
            Particles.spawn(P.SPARK, this.x, this.y, rand(-160, 160), rand(-160, 160), rand(.15, .35), rand(1, 2));
          this.crashCd = .3;
        }
        if (impact > CFG.HURT_BUILD) this.damage((impact - CFG.HURT_BUILD) * .055, 'wall');
      }
    }

    /* --- таран могилок на скорости разбивает их --- */
    if (Math.abs(this.speed) > 320) {
      for (let i = Gremlins.graves.length - 1; i >= 0; i--) {
        const gv = Gremlins.graves[i];
        if (dist2(this.x, this.y, gv.x, gv.y) < 26 * 26) {
          Gremlins.graves.splice(i, 1);
          Sound.crash();
          Draw.cam.shake = Math.min(7, Draw.cam.shake + 2);
          for (let k = 0; k < 8; k++)
            Particles.spawn(P.DEBRIS, gv.x, gv.y, rand(-160, 160), rand(-160, 160), rand(.3, .7), rand(1.5, 3), { drag: 2 });
          Particles.spawn(P.POP, gv.x, gv.y, 0, 0, .3, 8, { color: '#9aa3b2' });
        }
      }
    }

    /* --- эффекты езды --- */
    const drifting = Math.abs(this.vLat) > CFG.SLIP_ON;
    if (drifting) {
      this.driftT += dt;
      if (Math.random() < .7) {
        const bx = this.x - nfx * 10, by = this.y - nfy * 10;
        Particles.spawn(P.SMOKE, bx + rand(-4, 4), by + rand(-4, 4), rand(-20, 20), rand(-20, 20), rand(.4, .8), rand(1.5, 3), { grow: 5, drag: 1.5 });
      }
      const bx = this.x - nfx * 9, by = this.y - nfy * 9;
      Decals.skid(bx - nry * 6, by + nrx * 6);
      Decals.skid(bx + nry * 6, by - nrx * 6);
    } else this.driftT = 0;
    if (!this.onRoad && spd > 60 && Math.random() < .3)
      Particles.spawn(P.DUST, this.x + rand(-8, 8), this.y + rand(-8, 8), rand(-30, 30), rand(-30, 30), rand(.4, .8), rand(2, 4), { drag: 2 });
    if (this.throttle && Math.random() < .25) {
      const bx = this.x - nfx * 20, by = this.y - nfy * 20;
      Particles.spawn(P.SMOKE, bx, by, -nfx * 40 + rand(-8, 8), -nfy * 40 + rand(-8, 8), rand(.3, .6), rand(1, 2), { grow: 2, drag: 2 });
    }
    /* --- таран гремлинов --- */
    for (let i = Gremlins.list.length - 1; i >= 0; i--) {
      const g = Gremlins.list[i];
      const d = Math.hypot(g.x - this.x, g.y - this.y);
      if (d < 24) {
        if (Math.abs(this.speed) > this.perf.ramSpd) {
          Gremlins.kill(g, 'ram');
          this.vx *= .985; this.vy *= .985;
          Draw.cam.shake = Math.min(7, Draw.cam.shake + 1.2);
        } else if (d > .01) {
          const nx = (g.x - this.x) / d, ny = (g.y - this.y) / d;
          g.x += nx * 14; g.y += ny * 14;
          g.panic = Math.max(g.panic, 1.4);
        }
      }
    }

    /* --- таран ракетных шахт --- */
    for (let i = Silos.list.length - 1; i >= 0; i--) {
      const s = Silos.list[i];
      const d = Math.hypot(s.x - this.x, s.y - this.y);
      if (d < 40) {
        if (Math.abs(this.speed) > this.perf.siloRam) {
          Silos.damage(s, 99, 'ram');
          this.damage(18, 'ram');
          this.vx *= -.35; this.vy *= -.35;
          Draw.cam.shake = 10;
        } else if (d > .01) {
          const nx = (this.x - s.x) / d, ny = (this.y - s.y) / d;
          this.x = s.x + nx * 40; this.y = s.y + ny * 40;
          this.vx *= .5; this.vy *= .5;
        }
      }
    }

    /* --- подбор ящиков --- */
    for (const c of Weapons.crates) {
      if (!c.active || dist2(this.x, this.y, c.x, c.y) > 28 * 28) continue;
      c.active = false;
      c.respawnT = c.respawnT < 0 ? -1 : CFG.CRATE_RESPAWN;
      if (c.type === 'ammo') {
        this.ammo += CFG.CRATE_AMMO;
        Texts.add(this.x, this.y - 26, '+' + CFG.CRATE_AMMO + ' ПАТРОНОВ', '#8ef2a8');
      } else {
        this.missiles = Math.min(9, this.missiles + CFG.CRATE_MSL);
        Texts.add(this.x, this.y - 26, '+' + CFG.CRATE_MSL + ' РАКЕТЫ', '#ffb45e');
      }
      Sound.pickup();
    }

    /* --- флаги --- */
    for (const f of Weapons.flags) {
      if (!f.taken && dist2(this.x, this.y, f.x, f.y) < 34 * 34) {
        f.taken = true;
        Game.onFlag(f);
      }
    }

    /* --- выход при открытых воротах --- */
    if (Game.flagsOpen) {
      const e = CityMap.exit;
      if (this.x > e.x && this.x < e.x + e.w && this.y > e.y && this.y < e.y + e.h) Game.winLevel();
    }
  },

  damage(a, cause) {
    if (this.dead || this.invuln > 0) return;
    this.hp -= a;
    Draw.cam.shake = Math.min(10, Draw.cam.shake + a * .18);
    if (this.hp <= 0) { this.hp = 0; this.die(); }
  },

  die() {
    if (this.dead) return;
    this.dead = true;
    this.respawnT = CFG.RESPAWN;
    Sound.explosion(true);
    Draw.cam.shake = 12;
    Weapons.explosionFx(this.x, this.y, 60);
    for (let i = 0; i < 22; i++)
      Particles.spawn(P.FLAME, this.x, this.y, rand(-220, 220), rand(-220, 220), rand(.3, .8), rand(2, 5), { drag: 2.5 });
    for (let i = 0; i < 14; i++)
      Particles.spawn(P.DEBRIS, this.x, this.y, rand(-260, 260), rand(-260, 260), rand(.5, 1.2), rand(2, 4), { drag: 2 });
    Decals.scorch(this.x, this.y, 46);
    Game.onPlayerDeath();
  },
  draw(ctx) {
    if (this.dead) return;
    const blink = this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0;
    /* тень */
    ctx.save();
    ctx.translate(this.x + 6, this.y + 8);
    ctx.rotate(this.angle);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    rrect(ctx, -CFG.CAR_LEN / 2, -CFG.CAR_WID / 2, CFG.CAR_LEN, CFG.CAR_WID, 6); ctx.fill();
    ctx.restore();

    ctx.save();
    if (blink) ctx.globalAlpha = .45;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    /* конус фар */
    const cone = ctx.createLinearGradient(16, 0, 150, 0);
    cone.addColorStop(0, 'rgba(255,236,170,.26)');
    cone.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(16, -7); ctx.lineTo(150, -36); ctx.lineTo(150, 36); ctx.lineTo(16, 7);
    ctx.closePath(); ctx.fill();
    /* корпус */
    const bg = ctx.createLinearGradient(0, -10, 0, 10);
    bg.addColorStop(0, '#3d4450'); bg.addColorStop(.45, '#272c35'); bg.addColorStop(1, '#171b22');
    rrect(ctx, -18, -9.5, 36, 19, 7);
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = '#0c0e12'; ctx.lineWidth = 2; ctx.stroke();
    /* лобовое стекло */
    ctx.fillStyle = '#9fd3ea';
    rrect(ctx, 2, -7, 7, 14, 3); ctx.fill();
    /* люк-турель */
    ctx.fillStyle = '#1b2027';
    ctx.beginPath(); ctx.arc(-6, 0, 5.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#e8622d'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(-6, 0, 5.5, 0, TAU); ctx.stroke();
    /* бортовая полоса */
    ctx.fillStyle = '#e8622d'; ctx.fillRect(-14, -9.5, 4, 19);
    /* фары */
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(15, -7.5, 3, 4); ctx.fillRect(15, 3.5, 3, 4);
    /* стволы пулемётов */
    ctx.fillStyle = '#11141a'; ctx.fillRect(18, -6, 6, 2); ctx.fillRect(18, 4, 6, 2);
    /* стопы */
    ctx.fillStyle = this.brake ? '#ff3b30' : '#7a1f1c';
    ctx.fillRect(-18, -7.5, 2.5, 4); ctx.fillRect(-18, 3.5, 2.5, 4);
    ctx.restore();
    ctx.globalAlpha = 1;
  },
};
