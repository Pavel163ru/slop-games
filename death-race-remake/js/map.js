'use strict';
/* ============================================================
 * map.js — генерация города: сетка дорог, кварталы, здания,
 * точки спавна, выход, статичный слой
 * ============================================================ */

const CityMap = {
  roadsX: [420, 1180, 1980, 2780],
  roadsY: [350, 1000, 1700, 2150],
  HALF: 72,
  blocks: [],
  buildings: [],
  trees: [],
  props: [],
  yards: [],
  spawn: { x: 0, y: 0, angle: 0 },
  exit: { x: 0, y: 0, w: 0, h: 0 },
  gateY: 66,
  /* забор по периметру города (как в оригинале): на север — ворота с проездом */
  fence: { x: 30, y: 72, x1: WORLD.W - 30, y1: WORLD.H - 30, gapX0: -1, gapX1: -1 },
  flagSpots: [],
  siloSpots: [],
  crateSpots: [],
  gremSpawns: [],
  graves: [],
  staticCanvas: null,

  /* активная тема города (этап A3) */
  theme: CITY_THEMES.sandiego,

  generate(seed) {
    const R = mulberry32(seed);
    this.theme = CITY_THEMES[(Game.city && Game.city.id) || 'sandiego'] || CITY_THEMES.sandiego;
    this.buildings = []; this.trees = []; this.props = []; this.yards = []; this.blocks = [];

    for (let bx = 0; bx < this.roadsX.length; bx++) {
      for (let by = 0; by < this.roadsY.length - 1; by++) {
        const x0 = this.roadsX[bx] + this.HALF + 16;
        const x1 = (bx + 1 < this.roadsX.length ? this.roadsX[bx + 1] : WORLD.W - 36) - this.HALF - 16;
        const y0 = this.roadsY[by] + this.HALF + 16;
        const y1 = this.roadsY[by + 1] - this.HALF - 16;
        if (x1 - x0 < 60 || y1 - y0 < 60) continue;
        const dens = this.theme.density != null ? this.theme.density : .95;
        /* плотность застройки: редкие дворы у «зелёных» городов, плотные — у мегаполисов */
        if (R() > dens) continue;
        this.blocks.push({ x0, y0, x1, y1, kind: R() < .16 ? 'yard' : 'city' });
      }
    }

    for (const b of this.blocks) {
      const bw = b.x1 - b.x0, bh = b.y1 - b.y0;
      if (b.kind === 'yard') {
        this.yards.push({ x: b.x0, y: b.y0, w: bw, h: bh });
        const nT = 2 + (R() * 6 | 0);
        for (let i = 0; i < nT; i++)
          this.trees.push({ x: b.x0 + 30 + R() * (bw - 60), y: b.y0 + 30 + R() * (bh - 60), r: 14 + R() * 10 });
        continue;
      }
      const cols = R() < .5 ? 1 : 2, rows = R() < .5 ? 1 : 2;
      const cw = bw / cols, ch = bh / rows;
      for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
        const gx = b.x0 + cx * cw, gy = b.y0 + cy * ch;
        /* плотный город — меньше отступа, здания крупнее */
        const m = (12 + R() * 20) / (this.theme.density || .95);
        const w = cw - m * 2, h = ch - m * 2;
        if (w < 70 || h < 70) continue;
        if (R() < .08 && cols * rows > 1) continue; /* разрыв-переулок */
        this.buildings.push({ x: gx + m, y: gy + m, w, h });
      }
    }

    /* деревья вдоль тротуаров */
    for (const rx of this.roadsX) for (let y = 140; y < WORLD.H - 120; y += 220) {
      const yy = y + (R() - .5) * 80;
      if (this.nearRoadY(yy, 1)) continue;
      this.trees.push({ x: rx + this.HALF + 26, y: yy, r: 11 + R() * 8 });
      this.trees.push({ x: rx - this.HALF - 26, y: yy + 60, r: 11 + R() * 8 });
    }

    /* уличные объекты */
    for (const ry of this.roadsY) for (let x = 160; x < WORLD.W - 160; x += 340) {
      if (R() < .5) this.props.push({ type: 'crate', x: x + (R() - .5) * 120, y: ry - this.HALF - 30 });
      if (R() < .5) this.props.push({ type: 'crate', x: x + (R() - .5) * 120, y: ry + this.HALF + 30 });
    }
    for (const rx of this.roadsX) for (let y = 200; y < WORLD.H - 200; y += 300) {
      this.props.push({ type: 'lamp', x: rx + this.HALF + 14, y });
      this.props.push({ type: 'lamp', x: rx - this.HALF - 14, y: y + 150 });
    }
    /* старт — перекрёсток левой дороги, выезд — северный край */
    this.spawn = { x: this.roadsX[0], y: this.roadsY[2], angle: 0 };
    const X2 = this.roadsX[2];
    this.exit = { x: X2 - this.HALF + 10, y: 0, w: (this.HALF - 10) * 2, h: 56 };
    /* проезд в северной стене забора — по ширине ворот */
    this.fence.gapX0 = this.exit.x + 8;
    this.fence.gapX1 = this.exit.x + this.exit.w - 8;

    /* свободная точка: спиральный поиск вокруг предпочтительного места */
    const freeSpot = (px, py, tries = 80) => {
      for (let a = 0; a < tries; a++) {
        const ang = R() * TAU, rad = a * 7;
        const x = clamp(px + Math.cos(ang) * rad, 120, WORLD.W - 120);
        const y = clamp(py + Math.sin(ang) * rad, 150, WORLD.H - 110);
        if (!this.pointInBuilding(x, y, 36)) return { x, y };
      }
      return null;
    };

    /* точки флагов — дальние углы карты, гарантированно вне зданий;
       4 приоритетных точки покрывают города с 1–4 флагами (этап A1) */
    this.flagSpots = [];
    const flagPref = [
      [this.roadsX[0] + 160, this.roadsY[0] + 160],
      [this.roadsX[3] - 160, this.roadsY[2] - 160],
      [this.roadsX[1] + 180, this.roadsY[3] - 180],
      [this.roadsX[2] - 180, this.roadsY[1] + 180],
    ];
    for (const [px, py] of flagPref) {
      const p = freeSpot(px, py);
      if (p) this.flagSpots.push(p);
    }
    const wantFlags = (Game.city && Game.city.flags) || CITY.flags;
    for (let i = 0; i < 200 && this.flagSpots.length < Math.max(4, wantFlags); i++) {
      const x = 120 + R() * (WORLD.W - 240), y = 150 + R() * (WORLD.H - 260);
      if (!this.pointInBuilding(x, y, 40)) this.flagSpots.push({ x, y });
    }

    /* ракетные шахты — у зданий в середине кварталов, гарантированно 3 */
    this.siloSpots = [];
    const siloPref = [
      [this.roadsX[1] + this.HALF + 70, this.roadsY[1] + this.HALF + 70],
      [this.roadsX[2] - this.HALF - 80, this.roadsY[3] - this.HALF - 80],
      [this.roadsX[1] - this.HALF - 90, this.roadsY[2] + this.HALF + 90],
    ];
    for (const [px, py] of siloPref) {
      const p = freeSpot(px, py);
      if (p && this.siloSpots.every(s => dist2(s.x, s.y, p.x, p.y) > 420 * 420)) this.siloSpots.push(p);
    }
    for (let i = 0; i < 200 && this.siloSpots.length < 3; i++) {
      const x = 120 + R() * (WORLD.W - 240), y = 150 + R() * (WORLD.H - 260);
      if (!this.pointInBuilding(x, y, 36) &&
          this.siloSpots.every(s => dist2(s.x, s.y, x, y) > 420 * 420)) this.siloSpots.push({ x, y });
    }

    /* ящики с припасами — вдоль дорог */
    this.crateSpots = [
      { x: this.roadsX[0], y: this.roadsY[0] + this.HALF + 160 },
      { x: this.roadsX[1], y: this.roadsY[2] - this.HALF - 160 },
      { x: this.roadsX[2] + this.HALF + 160, y: this.roadsY[2] },
      { x: this.roadsX[3] - this.HALF - 160, y: this.roadsY[1] },
      { x: this.roadsX[1], y: this.roadsY[3] },
      { x: this.roadsX[2] - this.HALF - 160, y: this.roadsY[0] },
    ];

    /* спавны гремлинов — свободные точки вне зданий */
    this.gremSpawns = [];
    for (let i = 0; i < 160 && this.gremSpawns.length < 22; i++) {
      const x = 60 + R() * (WORLD.W - 120), y = 120 + R() * (WORLD.H - 240);
      if (!this.pointInBuilding(x, y, 22)) this.gremSpawns.push({ x, y });
    }
  },

  nearRoadY(y, tol) {
    return this.roadsY.some(ry => Math.abs(y - ry) < this.HALF + tol);
  },

  pointInBuilding(x, y, pad = 0) {
    for (const b of this.buildings)
      if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
    return null;
  },
  isOnRoad(x, y) {
    for (const rx of this.roadsX) if (Math.abs(x - rx) < this.HALF) return true;
    for (const ry of this.roadsY) if (Math.abs(y - ry) < this.HALF) return true;
    return false;
  },

  /* Круг против забора/зданий/деревьев/ящиков: суммарная выталкивающая поправка */
  collideCircle(x, y, r) {
    const hit = { x: 0, y: 0, hit: false, wall: false };
    /* --- забор по периметру: удерживает круг внутри города ---
       (машина, гремлины, пули и ракеты; вертолёты летают выше) */
    const F = this.fence;
    if (x - r < F.x) { hit.hit = true; hit.x += F.x - (x - r); }
    if (x + r > F.x1) { hit.hit = true; hit.x -= (x + r) - F.x1; }
    if (y + r > F.y1) { hit.hit = true; hit.y -= (y + r) - F.y1; }
    /* северная стена: непроходима, пока ворота закрыты; в проезде — открыта */
    const inGate = x > F.gapX0 && x < F.gapX1;
    if (y - r < F.y && !(Game.flagsOpen && inGate)) { hit.hit = true; hit.y += F.y - (y - r); }
    const push = (cx, cy, cr) => {
      const dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d < cr + r && d > .001) {
        hit.hit = true;
        hit.x += dx / d * (cr + r - d);
        hit.y += dy / d * (cr + r - d);
      }
    };
    for (const b of this.buildings) {
      const nx = clamp(x, b.x, b.x + b.w), ny = clamp(y, b.y, b.y + b.h);
      if (nx === x && ny === y) {
        const l = x - b.x, rgt = b.x + b.w - x, t = y - b.y, bt = b.y + b.h - y;
        const m = Math.min(l, rgt, t, bt);
        hit.hit = true; hit.wall = true;
        if (m === l) hit.x -= (l + r); else if (m === rgt) hit.x += (rgt + r);
        else if (m === t) hit.y -= (t + r); else hit.y += (bt + r);
        continue;
      }
      push(nx, ny, 0);
    }
    for (const t of this.trees) push(t.x, t.y, t.r * .45);
    for (const p of this.props) if (p.type === 'crate') push(p.x, p.y, 13);
    for (const g of this.graves) push(g.x, g.y, 9);
    return hit;
  },
  /* ---------- статичный слой: асфальт, тротуары, здания, деревья ---------- */
  buildStatic() {
    const c = document.createElement('canvas');
    c.width = WORLD.W; c.height = WORLD.H;
    const x = c.getContext('2d');
    const R = mulberry32(1234);
    const T = this.theme || CITY_THEMES.sandiego;

    x.fillStyle = T.ground; x.fillRect(0, 0, WORLD.W, WORLD.H);
    /* дворы — трава (оттенок темы) */
    for (const y of this.yards) {
      x.fillStyle = T.yard || '#42523e'; x.fillRect(y.x, y.y, y.w, y.h);
      for (let i = 0; i < 24; i++) {
        x.fillStyle = R() < .5 ? 'rgba(56,74,48,.5)' : 'rgba(78,96,68,.4)';
        x.fillRect(y.x + R() * y.w, y.y + R() * y.h, 14 + R() * 30, 10 + R() * 22);
      }
    }
    /* тротуары вдоль дорог */
    x.fillStyle = T.sidewalk;
    for (const rx of this.roadsX) { x.fillRect(rx - this.HALF - 20, 0, 20, WORLD.H); x.fillRect(rx + this.HALF, 0, 20, WORLD.H); }
    for (const ry of this.roadsY) { x.fillRect(0, ry - this.HALF - 20, WORLD.W, 20); x.fillRect(0, ry + this.HALF, WORLD.W, 20); }
    /* асфальт */
    x.fillStyle = T.asphalt;
    for (const rx of this.roadsX) x.fillRect(rx - this.HALF, 0, this.HALF * 2, WORLD.H);
    for (const ry of this.roadsY) x.fillRect(0, ry - this.HALF, WORLD.W, this.HALF * 2);
    /* текстура асфальта */
    for (let i = 0; i < 700; i++) {
      x.fillStyle = R() < .5 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.06)';
      x.fillRect(R() * WORLD.W, R() * WORLD.H, 8 + R() * 40, 3 + R() * 8);
    }
    /* осевые линии (пунктир) между перекрёстками */
    x.strokeStyle = T.dash; x.lineWidth = 3; x.setLineDash([26, 30]);
    for (const rx of this.roadsX) for (let s = 0; s < this.roadsY.length; s++) {
      const y0 = s === 0 ? 0 : this.roadsY[s - 1] + this.HALF;
      const y1 = this.roadsY[s] - this.HALF;
      x.beginPath(); x.moveTo(rx, y0 + 8); x.lineTo(rx, y1 - 8); x.stroke();
      const yb = this.roadsY[s] + this.HALF;
      const ye = s + 1 < this.roadsY.length ? this.roadsY[s + 1] - this.HALF : WORLD.H;
      x.beginPath(); x.moveTo(rx, yb + 8); x.lineTo(rx, ye - 8); x.stroke();
    }
    x.setLineDash([]);
    /* края дороги */
    x.strokeStyle = 'rgba(220,224,230,.5)'; x.lineWidth = 2;
    for (const rx of this.roadsX) {
      x.strokeRect(rx - this.HALF + 5, -10, 1, WORLD.H + 20);
      x.strokeRect(rx + this.HALF - 6, -10, 1, WORLD.H + 20);
    }
    for (const ry of this.roadsY) {
      x.strokeRect(-10, ry - this.HALF + 5, WORLD.W + 20, 1);
      x.strokeRect(-10, ry + this.HALF - 6, WORLD.W + 20, 1);
    }
    /* зебры у перекрёстков */
    x.fillStyle = T.zebra;
    for (const rx of this.roadsX) for (const ry of this.roadsY) {
      for (let k = 0; k < 8; k++) {
        x.fillRect(rx - this.HALF + 6 + k * 17, ry - this.HALF - 26, 10, 18);
        x.fillRect(rx - this.HALF + 6 + k * 17, ry + this.HALF + 8, 10, 18);
        x.fillRect(rx - this.HALF - 26, ry - this.HALF + 6 + k * 17, 18, 10);
        x.fillRect(rx + this.HALF + 8, ry - this.HALF + 6 + k * 17, 18, 10);
      }
    }
    /* люки */
    for (const rx of this.roadsX) for (let i = 0; i < 5; i++) {
      const mx = rx + (R() - .5) * 90, my = R() * WORLD.H;
      x.fillStyle = '#23252a'; x.beginPath(); x.arc(mx, my, 9, 0, TAU); x.fill();
      x.strokeStyle = '#3b3e45'; x.lineWidth = 2; x.stroke();
    }
    /* здания: тень → корпус → детали крыши (палитра темы) */
    const ROOFS = T.roof;
    const acMax = T.ac || 1;
    this.buildings.forEach((b, i) => {
      x.fillStyle = 'rgba(0,0,0,.33)';
      x.fillRect(b.x + 14, b.y + 18, b.w, b.h);
      const col = ROOFS[i % ROOFS.length];
      x.fillStyle = col;
      x.fillRect(b.x, b.y, b.w, b.h);
      x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 3;
      x.strokeRect(b.x, b.y, b.w, b.h);
      x.strokeStyle = 'rgba(255,255,255,.10)'; x.lineWidth = 2;
      x.strokeRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20);
      /* блоки кондиционеров / вентиляция — больше в деловых городах */
      const nAC = 1 + (R() * acMax | 0);
      for (let k = 0; k < nAC; k++) {
        const ax = b.x + 18 + R() * (b.w - 52), ay = b.y + 18 + R() * (b.h - 52);
        x.fillStyle = '#7d838c'; x.fillRect(ax, ay, 26, 20);
        x.strokeStyle = '#565c66'; x.lineWidth = 2; x.strokeRect(ax, ay, 26, 20);
        x.beginPath(); x.arc(ax + 13, ay + 10, 6, 0, TAU); x.stroke();
      }
      /* световая полоса на крыше */
      if (R() < .4) {
        x.fillStyle = 'rgba(255,214,120,.5)';
        x.fillRect(b.x + 8, b.y + b.h - 8, b.w - 16, 3);
      }
      /* вертолётная площадка — только в городах с высотками */
      if ((T.hz || 0) && b.w > 180 && b.h > 160 && R() < .3) {
        const hx = b.x + b.w / 2, hy = b.y + b.h / 2;
        x.strokeStyle = 'rgba(235,238,244,.65)'; x.lineWidth = 3;
        x.beginPath(); x.arc(hx, hy, 34, 0, TAU); x.stroke();
        x.font = '900 34px "Segoe UI", sans-serif'; x.fillStyle = 'rgba(235,238,244,.65)';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('H', hx, hy + 2);
        x.textBaseline = 'alphabetic';
      }
    });
    /* уличные объекты */
    for (const p of this.props) {
      if (p.type === 'crate') {
        x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(p.x - 11 + 5, p.y - 11 + 6, 22, 22);
        x.fillStyle = '#6e5a3a'; x.fillRect(p.x - 11, p.y - 11, 22, 22);
        x.strokeStyle = '#4c3d26'; x.lineWidth = 2; x.strokeRect(p.x - 11, p.y - 11, 22, 22);
        x.beginPath(); x.moveTo(p.x - 11, p.y - 11); x.lineTo(p.x + 11, p.y + 11); x.stroke();
      } else if (p.type === 'lamp') {
        x.fillStyle = '#565c66'; x.beginPath(); x.arc(p.x, p.y, 3.4, 0, TAU); x.fill();
        x.fillStyle = 'rgba(255,232,160,.16)';
        x.beginPath(); x.arc(p.x, p.y, 26, 0, TAU); x.fill();
        x.fillStyle = 'rgba(255,232,160,.5)'; x.beginPath(); x.arc(p.x, p.y, 5, 0, TAU); x.fill();
      }
    }
    /* деревья поверх (крона выше машин визуально не мешает — коллизия по стволу) */
    for (const t of this.trees) {
      x.fillStyle = 'rgba(0,0,0,.30)';
      x.beginPath(); x.ellipse(t.x + 8, t.y + 9, t.r * .95, t.r * .7, 0, 0, TAU); x.fill();
      const g = x.createRadialGradient(t.x - 4, t.y - 5, 2, t.x, t.y, t.r);
      g.addColorStop(0, '#5d8250'); g.addColorStop(1, '#3c5a37');
      x.fillStyle = g;
      x.beginPath(); x.arc(t.x, t.y, t.r, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; x.stroke();
    }
    /* ---------- забор по периметру города (как в оригинале) ---------- */
    const F = this.fence, fh = 8;
    const seg = (sx, sy, w, h) => {
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(sx + 4, sy + 5, w, h); // тень
      x.fillStyle = '#5d646f'; x.fillRect(sx, sy, w, h);                // бетон
      x.fillStyle = 'rgba(255,255,255,.10)'; x.fillRect(sx, sy, w, 3);  // блик
      x.fillStyle = '#484e58';
      for (let px = sx; px < sx + w; px += 46) x.fillRect(px, sy, 3, h); // швы панелей
    };
    const gapOk = F.gapX0 > 0;
    /* южная, западная, восточная стены — сплошные */
    seg(F.x, F.y1 - fh, F.x1 - F.x, fh);
    seg(F.x, F.y, fh, F.y1 - F.y);
    seg(F.x1 - fh, F.y, fh, F.y1 - F.y);
    /* северная стена: проезд по ширине ворот */
    if (gapOk) {
      seg(F.x, F.y, F.gapX0 - F.x, fh);
      seg(F.gapX1, F.y, F.x1 - F.gapX1, fh);
      /* столбы-оголовки по краям проезда */
      for (const px of [F.gapX0 - 14, F.gapX1 + 2]) {
        x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px + 3, F.y - 2, 14, 16);
        x.fillStyle = '#6a7280'; x.fillRect(px, F.y - 6, 12, 20);
        x.strokeStyle = '#23262c'; x.lineWidth = 2; x.strokeRect(px, F.y - 6, 12, 20);
      }
    } else {
      seg(F.x, F.y, F.x1 - F.x, fh);
    }

    this.staticCanvas = c;
  },

  drawGround(ctx, camX, camY, vw, vh) {
    if (!this.staticCanvas) return;
    ctx.drawImage(this.staticCanvas, camX, camY, vw, vh, camX, camY, vw, vh);
  },

  /* ---------- миникарта ---------- */
  buildMini() {
    const c = document.createElement('canvas');
    c.width = 172; c.height = 129;
    const x = c.getContext('2d');
    const s = c.width / WORLD.W;
    x.fillStyle = '#191d24'; x.fillRect(0, 0, c.width, c.height);
    const MT = this.theme || CITY_THEMES.sandiego;
    /* дороги — под контуром забора */
    x.fillStyle = MT.asphalt;
    for (const rx of this.roadsX) x.fillRect((rx - this.HALF) * s, 0, this.HALF * 2 * s, c.height);
    for (const ry of this.roadsY) x.fillRect(0, (ry - this.HALF) * s, c.width, this.HALF * 2 * s);
    /* здания */
    x.fillStyle = MT.roof[0];
    for (const b of this.buildings) x.fillRect(b.x * s, b.y * s, Math.max(1, b.w * s), Math.max(1, b.h * s));
    /* контур забора поверх */
    const MF = this.fence;
    x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 1;
    x.strokeRect(MF.x * s, MF.y * s, (MF.x1 - MF.x) * s, (MF.y1 - MF.y) * s);
    this.miniCanvas = c; this.miniScale = s;
  },
};

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
