'use strict';
/* ============================================================
 * render/citymap.js — экран карты США между городами (как в
 * оригинале): пройденные города отмечены, текущий выделен.
 * Контур США рисуется упрощённым polyline в координатах
 * [долгота, широта], проецируется равнопромежуточно.
 * ============================================================ */

const CityMapScreen = {
  /* Упрощённый контур США (без Аляски/Гавайев), [lon, lat] */
  US: [
    [-124.7, 48.4], [-123.2, 46.2], [-124.1, 43.4], [-123.9, 39.8],   // западное побережье
    [-120.6, 34.6], [-117.1, 32.5], [-114.7, 32.7], [-114.6, 34.9],   // Калифорния → Аризона
    [-111.1, 31.3], [-108.2, 31.3], [-108.2, 31.8], [-106.5, 31.8],   // южная граница 1
    [-105.0, 30.6], [-103.1, 29.0], [-101.4, 29.8], [-99.2, 26.4],    // Техас: Большой изгиб
    [-97.4, 25.9], [-97.1, 27.8], [-97.2, 29.7], [-94.7, 29.7],       // Техас → Луизиана
    [-91.9, 29.5], [-89.6, 29.0], [-89.2, 30.3], [-88.0, 30.2],       // побережье Мексиканского залива
    [-85.5, 29.7], [-84.3, 30.0], [-83.0, 29.0], [-82.7, 27.8],       // Флорида: запад
    [-81.8, 25.9], [-80.1, 25.2], [-80.0, 26.8], [-81.1, 29.0],       // Флорида: юг и восток
    [-79.0, 33.0], [-76.5, 34.6], [-75.9, 36.6], [-75.9, 38.4],       // восточное побережье
    [-74.0, 40.6], [-71.9, 41.3], [-70.0, 41.7], [-70.7, 43.0],       // Нью-Йорк → Мэн
    [-66.9, 44.8], [-67.8, 47.1], [-71.5, 45.0], [-76.9, 44.2],       // север Новой Англии (грубo)
    [-79.0, 43.3], [-82.4, 45.0], [-83.0, 46.5], [-84.6, 46.5],       // Великие озёра (юг, грубо)
    [-87.6, 44.6], [-90.5, 46.6], [-92.0, 46.7], [-95.1, 49.0],       // озёра → северная граница
    [-104.0, 49.0], [-116.0, 49.0], [-123.0, 49.0], [-124.7, 48.4],   // северная граница → замыкание
  ],

  /* Равнопромежуточная проекция по долготе/широте */
  project(lon, lat, box) {
    return {
      x: box.x + (lon + 125) / 60 * box.w,      // -125…-65
      y: box.y + (50 - lat) / 22 * box.h,       // 50…28
    };
  },

  /** Полный кадр экрана карты (state 'citymap') */
  draw(ctx) {
    const W = WORLD.VW, H = WORLD.VH, t = Game.stateT;
    const city = Game.city;
    ctx.fillStyle = '#0b0d13'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H * .44, 80, W / 2, H * .44, 560);
    g.addColorStop(0, 'rgba(224,72,54,.12)');
    g.addColorStop(1, 'rgba(224,72,54,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    /* шапка */
    ctx.textAlign = 'center';
    ctx.font = '900 34px "Segoe UI", sans-serif';
    ctx.fillStyle = '#f2f5f9';
    ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 10;
    ctx.fillText('МАРШРУТ ЗАЕЗДА', W / 2, 56);
    ctx.shadowBlur = 0;
    ctx.font = '700 13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#8f97a5';
    ctx.fillText('ГОРОД ' + (Game.cityIdx + 1) + ' ИЗ ' + CITIES.length + ' · СЛОЖНОСТЬ: ' + Game.diff.name, W / 2, 80);

    /* рамка карты */
    const box = { x: W / 2 - 330, y: 110, w: 660, h: 380 };
    ctx.fillStyle = 'rgba(16,22,18,.55)';
    rrect(ctx, box.x - 14, box.y - 14, box.w + 28, box.h + 28, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1.5;
    rrect(ctx, box.x - 13.5, box.y - 13.5, box.w + 27, box.h + 27, 14); ctx.stroke();

    /* сетка на фоне карты */
    ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.lineWidth = 1;
    for (let gx = box.x; gx <= box.x + box.w; gx += 44) {
      ctx.beginPath(); ctx.moveTo(gx, box.y); ctx.lineTo(gx, box.y + box.h); ctx.stroke();
    }
    for (let gy = box.y; gy <= box.y + box.h; gy += 44) {
      ctx.beginPath(); ctx.moveTo(box.x, gy); ctx.lineTo(box.x + box.w, gy); ctx.stroke();
    }

    /* контур США */
    const pts = this.US.map(([lon, lat]) => this.project(lon, lat, box));
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(66,92,58,.30)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,200,150,.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    /* маршрут: пройденное — зелёным, впереди — пунктиром */
    const geo = CITIES.map(c => this.project(c.geo[0], c.geo[1], box));
    ctx.strokeStyle = 'rgba(88,224,125,.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= Game.cityIdx && i < geo.length; i++) {
      const p = geo[i];
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    if (Game.cityIdx < geo.length - 1) {
      ctx.strokeStyle = 'rgba(255,215,94,.45)';
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      for (let i = Game.cityIdx; i < geo.length; i++) {
        const p = geo[i];
        if (i === Game.cityIdx) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /* города: пройден — зелёный флажок, текущий — пульсирующий маркер, далее — точка */
    CITIES.forEach((c, i) => {
      const p = geo[i];
      const done = i < Game.cityIdx;
      const cur = i === Game.cityIdx;
      const name = c.name;
      ctx.textAlign = 'left';
      ctx.font = cur ? '800 13px "Segoe UI", sans-serif' : '700 11px "Segoe UI", sans-serif';
      const nx = p.x + 10, ny = p.y + 4;
      if (done) {
        ctx.fillStyle = '#58e07d';
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#9aa3b2';
        ctx.fillText(name, nx, ny);
      } else if (cur) {
        const pr = 6 + Math.sin(t * 5) * 1.6;
        ctx.fillStyle = 'rgba(255,85,70,.22)';
        ctx.beginPath(); ctx.arc(p.x, p.y, pr + 7, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ff5546';
        ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 9.5 + Math.sin(t * 5) * 2, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#ffe98a';
        ctx.fillText(name, nx, ny);
      } else {
        ctx.fillStyle = 'rgba(200,206,219,.55)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(154,163,178,.6)';
        ctx.fillText(name, nx, ny);
      }
    });

    /* легенда */
    ctx.textAlign = 'left';
    ctx.font = '600 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#58e07d';
    ctx.beginPath(); ctx.arc(box.x + 16, box.y + box.h + 34, 4.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8f97a5'; ctx.fillText('ПРОЙДЕНО', box.x + 26, box.y + box.h + 38);
    ctx.fillStyle = '#ff5546';
    ctx.beginPath(); ctx.arc(box.x + 130, box.y + box.h + 34, 4.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8f97a5'; ctx.fillText('ТЕКУЩИЙ', box.x + 140, box.y + box.h + 38);
    ctx.fillStyle = 'rgba(200,206,219,.55)';
    ctx.beginPath(); ctx.arc(box.x + 236, box.y + box.h + 34, 3.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8f97a5'; ctx.fillText('ВПЕРЕДИ', box.x + 246, box.y + box.h + 38);

    /* подсказка внизу */
    ctx.textAlign = 'center';
    ctx.font = '800 17px "Segoe UI", sans-serif';
    ctx.fillStyle = Math.sin(t * 4) > -0.3 ? '#f2f5f9' : '#7b8290';
    ctx.fillText('ENTER — В ' + city.name, W / 2, H - 34);
  },
};
