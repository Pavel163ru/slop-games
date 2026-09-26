'use strict';
/* ============================================================
 * render/world.js — камера и компоновка мирового кадра, ворота
 * ============================================================ */

const Draw = {
  cam: { x: 0, y: 0, shake: 0, sx: 0, sy: 0 },

  updateCamera(dt) {
    const pl = Player;
    const tx = pl.x + pl.vx * .3, ty = pl.y + pl.vy * .3;
    const k = 1 - Math.exp(-5 * dt);
    this.cam.x = lerp(this.cam.x, tx, k);
    this.cam.y = lerp(this.cam.y, ty, k);
    this.cam.x = clamp(this.cam.x, WORLD.VW / 2, WORLD.W - WORLD.VW / 2);
    this.cam.y = clamp(this.cam.y, WORLD.VH / 2, WORLD.H - WORLD.VH / 2);
    this.cam.shake *= Math.exp(-5.5 * dt);
    if (this.cam.shake < .05) this.cam.shake = 0;
    this.cam.sx = rand(-1, 1) * this.cam.shake;
    this.cam.sy = rand(-1, 1) * this.cam.shake;
  },

  snapCamera() {
    this.cam.x = clamp(Player.x, WORLD.VW / 2, WORLD.W - WORLD.VW / 2);
    this.cam.y = clamp(Player.y, WORLD.VH / 2, WORLD.H - WORLD.VH / 2);
    this.cam.shake = 0;
  },

  /** Полный кадр мира (уже под translate камеры) */
  world(ctx) {
    const cx = this.cam.x - WORLD.VW / 2, cy = this.cam.y - WORLD.VH / 2;
    ctx.save();
    ctx.translate(-cx + this.cam.sx, -cy + this.cam.sy);
    CityMap.drawGround(ctx, cx, cy, WORLD.VW, WORLD.VH);
    Decals.draw(ctx, cx, cy, WORLD.VW, WORLD.VH);
    Gremlins.drawGraves(ctx);
    this.drawGate(ctx);
    Weapons.drawGround(ctx);
    Silos.draw(ctx);
    Gremlins.draw(ctx);
    Player.draw(ctx);
    Weapons.drawAir(ctx);
    Helis.draw(ctx);
    Particles.draw(ctx);
    Texts.draw(ctx);
    ctx.restore();
    /* виньетка */
    const v = ctx.createRadialGradient(WORLD.VW / 2, WORLD.VH / 2, WORLD.VH * .42, WORLD.VW / 2, WORLD.VH / 2, WORLD.VH * .85);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, WORLD.VW, WORLD.VH);
  },

  /** Северные ворота в заборе: закрыты, пока не собраны флаги (как в оригинале) */
  drawGate(ctx) {
    const F = CityMap.fence, open = Game.flagsOpen, t = Game.time;
    const gx = (F.gapX0 + F.gapX1) / 2, gw = F.gapX1 - F.gapX0;
    if (open) {
      /* проезд подсвечен, путь наружу свободен */
      ctx.fillStyle = `rgba(88,224,125,${.10 + .05 * Math.sin(t * 4)})`;
      ctx.fillRect(F.gapX0, 0, gw, F.y + 16);
      /* стрелки «вверх» анимированные */
      for (let k = 0; k < 3; k++) {
        const ay = F.y + 4 - ((t * 60 + k * 26) % (F.y + 22));
        ctx.fillStyle = `rgba(88,224,125,${.75 - k * .15})`;
        ctx.beginPath();
        ctx.moveTo(gx, ay - 8);
        ctx.lineTo(gx + 9, ay + 4);
        ctx.lineTo(gx - 9, ay + 4);
        ctx.closePath(); ctx.fill();
      }
      /* поднятый шлагбаум у правой опоры проезда */
      ctx.save();
      ctx.translate(F.gapX1 + 10, F.y + 2);
      ctx.rotate(-1.15);
      ctx.fillStyle = '#58e07d';
      rrect(ctx, 0, -3, 48, 6, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      for (let sx = 6; sx < 42; sx += 14) ctx.fillRect(sx, -3, 6, 6);
      ctx.restore();
      /* зелёные огни на опорах проезда */
      for (const px of [F.gapX0 - 8, F.gapX1 + 8]) {
        ctx.fillStyle = '#58e07d';
        ctx.beginPath(); ctx.arc(px, F.y - 10, 4, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(88,224,125,.25)';
        ctx.beginPath(); ctx.arc(px, F.y - 10, 9, 0, TAU); ctx.fill();
      }
    } else {
      /* закрытый шлагбаум поперёк проезда + красные огни */
      ctx.save();
      ctx.translate(gx, F.y - 2);
      ctx.fillStyle = '#d84b3a';
      rrect(ctx, -gw / 2 - 10, -5, gw + 20, 10, 4); ctx.fill();
      ctx.fillStyle = '#f2f5f9';
      for (let sx = -gw / 2 - 6; sx < gw / 2 + 6; sx += 24) {
        ctx.beginPath();
        ctx.moveTo(sx, -5); ctx.lineTo(sx + 12, -5);
        ctx.lineTo(sx + 4, 5); ctx.lineTo(sx - 8, 5);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      const blink = Math.sin(t * 5) > 0;
      for (const px of [F.gapX0 - 8, F.gapX1 + 8]) {
        if (blink) {
          ctx.fillStyle = '#ff4038';
          ctx.beginPath(); ctx.arc(px, F.y - 10, 4, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,64,56,.22)';
          ctx.beginPath(); ctx.arc(px, F.y - 10, 9, 0, TAU); ctx.fill();
        }
      }
    }
  },
};
