'use strict';
/* ============================================================
 * render/hud.js — интерфейс: панели, таймер, миникарта, указатели
 * ============================================================ */

const HUD = {
  panel(ctx, x, y, w, h, a = .55) {
    ctx.fillStyle = `rgba(10,12,17,${a})`;
    rrect(ctx, x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1;
    rrect(ctx, x + .5, y + .5, w - 1, h - 1, 10); ctx.stroke();
  },

  carIcon(ctx, x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#e8622d';
    rrect(ctx, -9, -4.5, 18, 9, 3); ctx.fill();
    ctx.fillStyle = '#9fd3ea';
    ctx.fillRect(1, -3, 4, 6);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(7.5, -3.5, 2, 2); ctx.fillRect(7.5, 1.5, 2, 2);
    ctx.restore();
  },

  flagIcon(ctx, x, y, s = 1, color = '#ff5546') {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#b9c0ca'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(0, -7); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(9, -4.5); ctx.lineTo(0, -2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  draw(ctx) {
    const W = WORLD.VW, H = WORLD.VH, G = Game, PL = Player;

    /* --- левая верхняя панель: убийства / очки / деньги --- */
    this.panel(ctx, 14, 12, 240, 80);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = '700 11px "Segoe UI", sans-serif'; ctx.fillStyle = '#8f97a5';
    ctx.fillText('УБИЙСТВА', 28, 32);
    ctx.fillText('ОЧКИ', 140, 32);
    ctx.font = '800 22px Consolas, monospace'; ctx.fillStyle = '#f2f5f9';
    ctx.fillText(String(G.kills), 28, 56);
    ctx.fillText(fmtScore(G.score), 140, 56);
    ctx.font = '800 16px Consolas, monospace'; ctx.fillStyle = '#ffd75e';
    ctx.fillText('$ ' + fmtScore(Shop.money), 28, 78);
    ctx.font = '700 11px "Segoe UI", sans-serif'; ctx.fillStyle = '#8f97a5';
    ctx.textAlign = 'right';
    ctx.fillText('РЕКОРД ' + fmtScore(G.hi), 246, 74);

    /* --- таймер --- */
    const mm = Math.floor(Math.max(0, G.timer) / 60);
    const ss = Math.floor(Math.max(0, G.timer) % 60);
    const low = G.timer <= 10 && G.state === 'play';
    const pulse = low ? 1 + Math.sin(G.time * 10) * .08 : 1;
    ctx.save();
    ctx.translate(W / 2, 40);
    ctx.scale(pulse, pulse);
    ctx.textAlign = 'center';
    ctx.font = '800 34px Consolas, monospace';
    ctx.fillStyle = low ? '#ff5546' : '#f2f5f9';
    ctx.fillText(`${mm}:${String(ss).padStart(2, '0')}`, 0, 12);
    ctx.restore();
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#8f97a5'; ctx.textAlign = 'center';
    ctx.fillText(G.city.name + ' (' + (G.cityIdx + 1) + '/8) · ' + G.diff.name + ' ×' + G.diff.scoreMul, W / 2, 72);

    /* --- правая верхняя панель: жизни и флаги --- */
    this.panel(ctx, W - 198, 12, 184, 62);
    ctx.textAlign = 'left';
    ctx.font = '700 11px "Segoe UI", sans-serif'; ctx.fillStyle = '#8f97a5';
    ctx.fillText('МАШИНЫ', W - 182, 32);
    for (let i = 0; i < G.lives; i++) this.carIcon(ctx, W - 176 + i * 34, 46, 1.1);
    ctx.fillText('ФЛАГИ', W - 182, 68 - 8);
    ctx.textAlign = 'left';
    this.flagIcon(ctx, W - 122, 56, 1.2);
    ctx.font = '800 18px Consolas, monospace'; ctx.fillStyle = '#ffd75e';
    ctx.fillText(`${G.flagsTaken}/${G.city.flags}`, W - 108, 62);
      /* --- нижняя правая панель: броня / патроны / ракеты --- */
    this.panel(ctx, W - 236, H - 88, 222, 74);
    ctx.textAlign = 'left';
    ctx.font = '700 11px "Segoe UI", sans-serif'; ctx.fillStyle = '#8f97a5';
    ctx.fillText('БРОНЯ', W - 220, H - 68);
    const bw = 150, frac = clamp(PL.hp / PL.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    rrect(ctx, W - 220, H - 62, bw, 10, 5); ctx.fill();
    ctx.fillStyle = `hsl(${Math.round(118 * frac)},70%,55%)`;
    if (frac > 0) { rrect(ctx, W - 220, H - 62, bw * frac, 10, 5); ctx.fill(); }
    ctx.font = '800 15px Consolas, monospace'; ctx.fillStyle = '#f2f5f9';
    ctx.fillText(String(Math.ceil(PL.hp)), W - 62, H - 52);
    ctx.font = '700 11px "Segoe UI", sans-serif'; ctx.fillStyle = '#8f97a5';
    ctx.fillText('ПАТРОНЫ', W - 220, H - 34);
    ctx.font = '800 16px Consolas, monospace'; ctx.fillStyle = '#8ef2a8';
    ctx.fillText(String(PL.ammo), W - 156, H - 34);
    ctx.font = '700 11px "Segoe UI", sans-serif'; ctx.fillStyle = '#8f97a5';
    ctx.fillText('РАКЕТЫ', W - 220, H - 18);
    for (let i = 0; i < PL.missiles; i++) {
      const mx = W - 160 + i * 13;
      ctx.fillStyle = '#ffb45e';
      ctx.beginPath();
      ctx.moveTo(mx, H - 28); ctx.lineTo(mx + 4, H - 20); ctx.lineTo(mx - 4, H - 20);
      ctx.closePath(); ctx.fill();
    }

    /* --- миникарта --- */
    const mw = 172, mh = 129, mxx = 14, myy = H - mh - 14;
    ctx.fillStyle = 'rgba(10,12,17,.6)';
    rrect(ctx, mxx - 5, myy - 5, mw + 10, mh + 10, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
    rrect(ctx, mxx - 4.5, myy - 4.5, mw + 9, mh + 9, 8); ctx.stroke();
    if (CityMap.miniCanvas) ctx.drawImage(CityMap.miniCanvas, mxx, myy);
    const s = CityMap.miniScale || mw / WORLD.W;
    const dot = (wx, wy, col, r = 2.5) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(mxx + wx * s, myy + wy * s, r, 0, TAU); ctx.fill();
    };
    for (const f of Weapons.flags) if (!f.taken) dot(f.x, f.y, '#ffd75e');
    for (const sl of Silos.list) dot(sl.x, sl.y, '#ff9d3b', 2.2);
    for (const h of Helis.list) dot(h.x, h.y, '#ff4038', 2.2);
    const exitBlink = Game.flagsOpen && Math.sin(Game.time * 6) > 0;
    dot(CityMap.exit.x + CityMap.exit.w / 2, CityMap.exit.y + 28, exitBlink ? '#c2ffd2' : '#58e07d', 3);
    /* игрок — стрелка по направлению */
    ctx.save();
    ctx.translate(mxx + Player.x * s, myy + Player.y * s);
    ctx.rotate(Player.angle);
    ctx.fillStyle = '#f2f5f9';
    ctx.beginPath();
    ctx.moveTo(5, 0); ctx.lineTo(-4, 3.4); ctx.lineTo(-4, -3.4);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    /* --- указатели к целям --- */
    if (G.state === 'play') {
      if (G.flagsOpen) {
        this.pointer(ctx, CityMap.exit.x + CityMap.exit.w / 2, 40, '#58e07d', 'ВЫХОД');
      } else {
        let best = null, bd = 1e18;
        for (const f of Weapons.flags) {
          if (f.taken) continue;
          const d = dist2(Player.x, Player.y, f.x, f.y);
          if (d < bd) { bd = d; best = f; }
        }
        if (best) this.pointer(ctx, best.x, best.y, '#ffd75e', 'ФЛАГ');
      }
    }

    /* --- сообщения по центру --- */
    ctx.textAlign = 'center';
    G.msgs.forEach((m, i) => {
      const a = m.t < .15 ? m.t / .15 : (m.t > m.max - .4 ? (m.max - m.t) / .4 : 1);
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.font = '800 26px "Segoe UI", sans-serif';
      ctx.fillStyle = m.color;
      ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 8;
      ctx.fillText(m.txt, W / 2, H * .26 + i * 36);
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    /* --- подсказка управления в начале заезда --- */
    if (G.state === 'play' && G.time < 7) {
      ctx.globalAlpha = clamp(7 - G.time, 0, 1) * .8;
      ctx.font = '700 13px "Segoe UI", sans-serif';
      ctx.fillStyle = '#c8cedb';
      ctx.fillText('WASD / СТРЕЛКИ — ЕЗДА · Z — ПУЛЕМЁТЫ · X — РАКЕТА · SPACE — РУЧНИК · M — ЗВУК', W / 2, H - 18);
      ctx.globalAlpha = 1;
    }
  },

  /** Стрелка к цели у края экрана + пульсирующее кольцо, если цель видна */
  pointer(ctx, wx, wy, color, label) {
    const W = WORLD.VW, H = WORLD.VH;
    const cx = Draw.cam.x, cy = Draw.cam.y;
    const sx = wx - cx + W / 2, sy = wy - cy + H / 2;
    const onScreen = sx > 50 && sx < W - 50 && sy > 90 && sy < H - 110;
    if (onScreen) {
      const r = 22 + Math.sin(Game.time * 5) * 4;
      ctx.strokeStyle = color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.stroke();
      ctx.font = '700 11px "Segoe UI", sans-serif';
      ctx.fillStyle = color; ctx.textAlign = 'center';
      ctx.fillText(label, sx, sy - r - 8);
      return;
    }
    const a = Math.atan2(wy - cy, wx - cx);
    const px = clamp(sx, 46, W - 46), py = clamp(sy, 84, H - 96);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    ctx.fillStyle = color;
    ctx.globalAlpha = .85 + .15 * Math.sin(Game.time * 6);
    ctx.beginPath();
    ctx.moveTo(12, 0); ctx.lineTo(-7, 7.5); ctx.lineTo(-3, 0); ctx.lineTo(-7, -7.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  },
};
