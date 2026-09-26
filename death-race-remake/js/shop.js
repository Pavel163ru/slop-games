'use strict';
/* ============================================================
 * shop.js — экран снабжения: деньги, каталоги, trade-in (спека §5)
 * ============================================================ */

const Shop = {
  money: 1000,
  visit: 1,
  owned: Object.assign({}, SHOP_START),
  ui: { cat: 0, open: false, cursor: 0, msg: '', msgColor: '#f2f5f9', msgT: 0 },

  save() {
    try {
      localStorage.setItem('deathrace_remake_save',
        JSON.stringify({ money: this.money, owned: this.owned, visit: this.visit }));
    } catch (e) {}
  },

  load() {
    try {
      const s = JSON.parse(localStorage.getItem('deathrace_remake_save') || 'null');
      if (s && s.owned) {
        this.money = typeof s.money === 'number' ? s.money : 1000;
        this.owned = Object.assign({}, SHOP_START, s.owned);
        this.visit = s.visit || 1;
      }
    } catch (e) {}
  },

  addMoney(m) { this.money += m; },

  item(cat) {
    const id = this.owned[cat];
    return SHOP_DATA[cat].items.find(i => i.id === id) || SHOP_DATA[cat].items[0];
  },

  /* зачёт старой детали по полной цене; стартовый SHELL зачёта не даёт */
  tradeIn(cat) {
    const inst = this.item(cat);
    return inst.trade === 0 ? 0 : inst.price;
  },

  /* применение купленного к характеристикам машины */
  applyTo(pl, diff) {
    const g = this.item('guns'), e = this.item('engine'), c = this.item('chassis');
    const t = this.item('tires'), m = this.item('missiles');
    pl.perf = {
      maxSpd: e.maxSpd, accel: CFG.ACCEL * e.accel,
      turn: CFG.TURN * t.turn, grip: CFG.GRIP * t.grip,
      ramSpd: CFG.RAM_SPD / c.ram, siloRam: CFG.SILO_RAM_SPD / c.ram,
      maxHp: c.hp,
      gunCd: CFG.GUN_CD / g.rof, gunDmg: g.dmg, gunSpread: CFG.GUN_SPREAD * g.spread,
      mslBlast: CFG.MSL_BLAST_R * m.blast, mslBonus: m.bonus,
    };
  },

  openUI() {
    this.ui.cat = 0; this.ui.open = false; this.ui.cursor = 0;
    this.ui.msg = ''; this.ui.msgT = 0;
  },

  note(msg, color) {
    this.ui.msg = msg;
    this.ui.msgColor = color || '#f2f5f9';
    this.ui.msgT = 2.2;
  },

  update(dt) {
    if (this.ui.msgT > 0) this.ui.msgT -= dt;
    const u = this.ui;
    if (!u.open) {
      if (Input.pressed('ArrowUp', 'KeyW')) { u.cat = (u.cat + SHOP_CATS.length - 1) % SHOP_CATS.length; Sound.uiMove(); }
      if (Input.pressed('ArrowDown', 'KeyS')) { u.cat = (u.cat + 1) % SHOP_CATS.length; Sound.uiMove(); }
      if (Input.pressed('Enter', 'Space')) {
        u.open = true;
        u.cursor = SHOP_DATA[SHOP_CATS[u.cat]].items.findIndex(i => i.id === this.owned[SHOP_CATS[u.cat]]);
        if (u.cursor < 0) u.cursor = 0;
        Sound.uiOk();
      }
      if (Input.pressed('Escape')) Game.startLevel();   // выезд в текущий город кампании
      if (Input.pressed('KeyQ')) Game.toMenu();
    } else {
      if (Input.pressed('ArrowLeft', 'KeyA')) { u.cursor = Math.max(0, u.cursor - 1); Sound.uiMove(); }
      if (Input.pressed('ArrowRight', 'KeyD')) { u.cursor = Math.min(3, u.cursor + 1); Sound.uiMove(); }
      if (Input.pressed('ArrowUp', 'KeyW')) { u.cursor = Math.max(0, u.cursor - 2); Sound.uiMove(); }
      if (Input.pressed('ArrowDown', 'KeyS')) { u.cursor = Math.min(3, u.cursor + 2); Sound.uiMove(); }
      if (Input.pressed('Enter', 'Space')) this.buy();
      if (Input.pressed('Escape', 'Backspace', 'KeyQ')) { u.open = false; Sound.uiMove(); }
    }
  },

  buy() {
    const cat = SHOP_CATS[this.ui.cat];
    const it = SHOP_DATA[cat].items[this.ui.cursor];
    const inst = this.item(cat);
    if (it.id === inst.id) { this.note('УЖЕ УСТАНОВЛЕНО', '#8f97a5'); return; }
    const cost = it.price - this.tradeIn(cat);
    if (cost > this.money) { this.note('НЕ ХВАТАЕТ ДЕНЕГ', '#ff5546'); Sound.clank(); return; }
    this.money -= cost;
    this.owned[cat] = it.id;
    this.save();
    Sound.pickup();
    this.note('КУПЛЕНО: ' + it.brand + (cost > 0 ? ' · −$' + fmtScore(cost) : ' · БЕЗ ДОПЛАТЫ'), '#8ef2a8');
  },
  /* ---------- пиктограммы товаров (рисуются кодом) ---------- */
  drawIcon(ctx, cat, item, cx, cy, size) {
    const k = size / 100;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    switch (cat) {
      case 'guns': this.iconGuns(ctx, item); break;
      case 'engine': this.iconEngine(ctx, item); break;
      case 'chassis': this.iconChassis(ctx, item); break;
      case 'tires': this.iconTires(ctx, item); break;
      case 'missiles': this.iconMissiles(ctx, item); break;
    }
    ctx.restore();
  },

  iconGuns(ctx, it) {
    if (it.id === 'acme') {
      ctx.fillStyle = '#2e3238'; ctx.fillRect(0, -3, 38, 6);
      ctx.fillStyle = '#454b54'; ctx.fillRect(36, -2, 6, 4);
      ctx.fillStyle = '#4a4f58'; rrect(ctx, -28, -9, 30, 18, 4); ctx.fill();
      ctx.strokeStyle = '#23262c'; ctx.lineWidth = 2;
      rrect(ctx, -28, -9, 30, 18, 4); ctx.stroke();
      ctx.fillStyle = '#2e3238'; ctx.fillRect(-8, 9, 9, 15);
      ctx.fillStyle = '#3a3f47'; ctx.fillRect(-22, 9, 7, 12);
      ctx.fillStyle = '#7d838c'; ctx.fillRect(-24, -12, 8, 3);
    } else if (it.id === 'gatlin') {
      ctx.fillStyle = '#3a3f47'; rrect(ctx, -30, -11, 24, 22, 5); ctx.fill();
      ctx.strokeStyle = '#23262c'; ctx.lineWidth = 2;
      rrect(ctx, -30, -11, 24, 22, 5); ctx.stroke();
      for (const yy of [-9, 0, 9]) { ctx.fillStyle = '#23262c'; ctx.fillRect(-8, yy - 2.5, 42, 5); }
      ctx.strokeStyle = '#7d838c'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(32, 0, 12, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#454b54';
      ctx.beginPath(); ctx.arc(32, 0, 4, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#454b54'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-30, 2); ctx.lineTo(-40, 10); ctx.stroke();
      ctx.fillStyle = '#7d838c';
      ctx.beginPath(); ctx.arc(-40, 12, 4.5, 0, TAU); ctx.fill();
    } else if (it.id === 'spandau') {
      ctx.fillStyle = '#39424e'; ctx.fillRect(-2, -6, 38, 12);
      ctx.fillStyle = '#23262c';
      for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) ctx.fillRect(3 + i * 7, -3 + j * 6, 3, 3);
      ctx.fillStyle = '#454b54'; ctx.fillRect(36, -3, 6, 6);
      ctx.fillStyle = '#4a4f58'; rrect(ctx, -28, -9, 26, 18, 4); ctx.fill();
      ctx.strokeStyle = '#23262c'; ctx.lineWidth = 2;
      rrect(ctx, -28, -9, 26, 18, 4); ctx.stroke();
      ctx.fillStyle = '#2e3238'; ctx.fillRect(-20, -15, 18, 5);
      ctx.fillStyle = '#2e3238'; ctx.fillRect(-6, 9, 9, 15);
    } else { // uzi
      ctx.fillStyle = '#3a3f47'; rrect(ctx, -24, -10, 32, 20, 4); ctx.fill();
      ctx.strokeStyle = '#23262c'; ctx.lineWidth = 2;
      rrect(ctx, -24, -10, 32, 20, 4); ctx.stroke();
      ctx.fillStyle = '#23262c'; ctx.fillRect(8, -3.5, 16, 7);
      ctx.fillStyle = '#2e3238'; rrect(ctx, -9, 10, 11, 22, 3); ctx.fill();
      ctx.fillStyle = '#454b54'; ctx.fillRect(-32, 1, 10, 6);
      ctx.fillStyle = '#7d838c'; ctx.fillRect(-18, -13, 12, 3);
    }
  },

  iconEngine(ctx, it) {
    ctx.fillStyle = '#3a3f47'; rrect(ctx, -32, -15, 46, 32, 5); ctx.fill();
    ctx.strokeStyle = '#23262c'; ctx.lineWidth = 2;
    rrect(ctx, -32, -15, 46, 32, 5); ctx.stroke();
    ctx.fillStyle = '#2e3238';
    for (let i = 0; i < 4; i++) ctx.fillRect(-27, -9 + i * 7, 36, 2.5);
    ctx.fillStyle = '#454b54'; ctx.fillRect(-14, -21, 12, 7);
    if (it.id === 'turbo') {
      ctx.fillStyle = '#4a4f58';
      ctx.beginPath(); ctx.arc(28, 0, 13, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#23262c'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(28, 0, 13, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#9aa3b2'; ctx.lineWidth = 2;
      for (let a = 0; a < 6; a++) {
        const an = a * TAU / 6 + Game.stateT * 2;
        ctx.beginPath(); ctx.moveTo(28, 0);
        ctx.lineTo(28 + Math.cos(an) * 9, Math.sin(an) * 9); ctx.stroke();
      }
      ctx.fillStyle = '#454b54'; ctx.fillRect(22, -22, 12, 8);
    } else if (it.id === 'nitrous') {
      ctx.fillStyle = '#3f7fd0'; rrect(ctx, 17, -24, 15, 36, 7); ctx.fill();
      ctx.strokeStyle = '#24507f'; ctx.lineWidth = 2;
      rrect(ctx, 17, -24, 15, 36, 7); ctx.stroke();
      ctx.fillStyle = '#c8d6ea'; ctx.fillRect(20.5, -16, 8, 9);
      ctx.fillStyle = '#7d838c'; ctx.fillRect(21, -30, 7, 6);
      ctx.strokeStyle = '#565c66'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(16, -2); ctx.lineTo(2, -2); ctx.stroke();
    } else if (it.id === 'nuclear') {
      const g = ctx.createRadialGradient(28, 0, 2, 28, 0, 22);
      g.addColorStop(0, 'rgba(126,247,120,.5)'); g.addColorStop(1, 'rgba(126,247,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(28, 0, 22, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8d44d';
      ctx.beginPath(); ctx.arc(28, 0, 13, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1c1f14';
      ctx.beginPath(); ctx.arc(28, 0, 3, 0, TAU); ctx.fill();
      for (let a = 0; a < 3; a++) {
        const an = -Math.PI / 2 + a * TAU / 3;
        ctx.beginPath(); ctx.moveTo(28, 0);
        ctx.arc(28, 0, 11, an - .55, an + .55); ctx.closePath(); ctx.fill();
      }
    } else { // fusion
      const g = ctx.createRadialGradient(28, 0, 2, 28, 0, 24);
      g.addColorStop(0, 'rgba(110,230,255,.55)'); g.addColorStop(1, 'rgba(110,230,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(28, 0, 24, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#6ee6ff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(28, 0, 13, 5.5, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(28, 0, 13, 5.5, Math.PI / 2, 0, TAU); ctx.stroke();
      const t = Game.stateT * 3;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(28 + Math.cos(t) * 13, Math.sin(t) * 5.5, 2.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(28 - Math.cos(t) * 13, -Math.sin(t) * 5.5, 2.4, 0, TAU); ctx.fill();
    }
  },
  iconChassis(ctx, it) {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(4, 8, 22, 38, 0, 0, TAU); ctx.fill();
    if (it.id === 'kilroy') {
      ctx.fillStyle = '#3d4450'; rrect(ctx, -16, -36, 32, 72, 10); ctx.fill();
      ctx.strokeStyle = '#0c0e12'; ctx.lineWidth = 2;
      rrect(ctx, -16, -36, 32, 72, 10); ctx.stroke();
      ctx.fillStyle = '#e8622d'; ctx.fillRect(-7, -36, 5, 72); ctx.fillRect(2, -36, 5, 72);
      ctx.fillStyle = '#9fd3ea'; rrect(ctx, -10, -8, 20, 16, 4); ctx.fill();
      ctx.fillStyle = '#ffe9a8'; ctx.fillRect(-13, -35, 5, 3); ctx.fillRect(8, -35, 5, 3);
    } else if (it.id === 'catspaw') {
      ctx.fillStyle = '#5d54a8';
      ctx.beginPath();
      ctx.moveTo(0, -40); ctx.quadraticCurveTo(14, -28, 14, -6);
      ctx.lineTo(13, 30); ctx.quadraticCurveTo(0, 38, -13, 30);
      ctx.lineTo(-14, -6); ctx.quadraticCurveTo(-14, -28, 0, -40);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#26204d'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#9fd3ea';
      ctx.beginPath(); ctx.ellipse(0, -6, 8, 13, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c8b6ff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-11, 24); ctx.lineTo(-11, -18); ctx.moveTo(11, 24); ctx.lineTo(11, -18); ctx.stroke();
    } else if (it.id === 'panther') {
      ctx.fillStyle = '#2f8f8a';
      ctx.beginPath();
      ctx.moveTo(0, -42); ctx.lineTo(9, -22); ctx.lineTo(17, 26);
      ctx.quadraticCurveTo(0, 34, -17, 26); ctx.lineTo(-9, -22);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#12403d'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#123036';
      ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(7, -10); ctx.lineTo(7, 10); ctx.lineTo(-7, 10); ctx.lineTo(-7, -10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8ecf2'; ctx.fillRect(-1.5, -42, 3, 66);
    } else { // pitbull
      ctx.fillStyle = '#8f3a30'; rrect(ctx, -19, -30, 38, 60, 7); ctx.fill();
      ctx.strokeStyle = '#3a130f'; ctx.lineWidth = 2;
      rrect(ctx, -19, -30, 38, 60, 7); ctx.stroke();
      ctx.fillStyle = '#565c66'; ctx.fillRect(-16, -37, 32, 7);
      ctx.fillStyle = '#3a3f47'; ctx.fillRect(-23, -22, 5, 30); ctx.fillRect(18, -22, 5, 30);
      ctx.fillStyle = '#9fd3ea'; rrect(ctx, -11, -10, 22, 14, 3); ctx.fill();
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath(); ctx.arc(-8, -20, 3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(8, -20, 3, 0, TAU); ctx.fill();
    }
  },

  iconTires(ctx, it) {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(3, 5, 26, 24, 0, 0, TAU); ctx.fill();
    if (it.id === 'cutters') {
      ctx.fillStyle = '#1a1d22';
      ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2e3238'; ctx.lineWidth = 3;
      for (let a = 0; a < 8; a++) {
        const an = a * TAU / 8;
        ctx.beginPath(); ctx.arc(0, 0, 18, an, an + .5); ctx.stroke();
      }
      ctx.fillStyle = '#4a4f58';
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#23262c';
      for (let a = 0; a < 4; a++) {
        const an = a * TAU / 4 + Math.PI / 4;
        ctx.beginPath(); ctx.arc(Math.cos(an) * 5, Math.sin(an) * 5, 1.6, 0, TAU); ctx.fill();
      }
    } else if (it.id === 'bashers') {
      ctx.fillStyle = '#2e3238';
      for (let a = 0; a < 12; a++) {
        const an = a * TAU / 12;
        ctx.save(); ctx.rotate(an); ctx.fillRect(-3.5, -28, 7, 9); ctx.restore();
      }
      ctx.fillStyle = '#1a1d22';
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
      ctx.fillStyle = '#454b54';
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#23262c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke();
    } else if (it.id === 'slicers') {
      ctx.fillStyle = '#c8ccd4';
      for (let a = 0; a < 8; a++) {
        const an = a * TAU / 8;
        ctx.save(); ctx.rotate(an);
        ctx.beginPath(); ctx.moveTo(-4, -20); ctx.lineTo(0, -33); ctx.lineTo(4, -20); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#1a1d22';
      ctx.beginPath(); ctx.arc(0, 0, 21, 0, TAU); ctx.fill();
      ctx.fillStyle = '#4a4f58';
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
      ctx.fillStyle = '#23262c';
      ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, TAU); ctx.fill();
    } else { // dicers
      ctx.fillStyle = '#1a1d22';
      ctx.beginPath(); ctx.arc(0, 0, 25, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#d24a3c'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 21, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#8a9099';
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#565c66'; ctx.lineWidth = 3;
      for (let a = 0; a < 6; a++) {
        const an = a * TAU / 6;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * 14, Math.sin(an) * 14); ctx.stroke();
      }
      ctx.fillStyle = '#ffd75e';
      ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c8ccd4';
      for (let a = 0; a < 4; a++) {
        const an = a * TAU / 4 + Math.PI / 4;
        ctx.save(); ctx.rotate(an); ctx.fillRect(-2, -26, 4, 6); ctx.restore();
      }
    }
  },
  iconMissiles(ctx, it) {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(4, 26, 12, 6, 0, 0, TAU); ctx.fill();
    if (it.id === 'fusion') {
      const g = ctx.createRadialGradient(0, -12, 4, 0, -12, 30);
      g.addColorStop(0, 'rgba(110,230,255,.4)'); g.addColorStop(1, 'rgba(110,230,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -12, 30, 0, TAU); ctx.fill();
    }
    const body = it.id === 'fusion' ? '#2f3540' : (it.id === 'armored' ? '#4a4f58' : '#5a6270');
    ctx.fillStyle = body;
    rrect(ctx, -8, -24, 16, 46, 6); ctx.fill();
    ctx.strokeStyle = '#12151b'; ctx.lineWidth = 2;
    rrect(ctx, -8, -24, 16, 46, 6); ctx.stroke();
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(-8, -24); ctx.lineTo(0, -44); ctx.lineTo(8, -24); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a3f47';
    ctx.beginPath(); ctx.moveTo(-8, 10); ctx.lineTo(-16, 24); ctx.lineTo(-8, 22); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 10); ctx.lineTo(16, 24); ctx.lineTo(8, 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#23262c'; ctx.fillRect(-5, 22, 10, 7);
    if (it.id === 'shell') {
      ctx.fillStyle = '#d24a3c';
      ctx.beginPath(); ctx.moveTo(-8, -24); ctx.lineTo(0, -44); ctx.lineTo(8, -24); ctx.closePath(); ctx.fill();
    } else if (it.id === 'armored') {
      ctx.fillStyle = '#31363f'; ctx.fillRect(-9, -26, 18, 7);
      ctx.fillStyle = '#7d838c';
      for (let i = 0; i < 4; i++) ctx.fillRect(-7 + i * 4.4, -23.5, 1.8, 1.8);
      ctx.fillStyle = '#31363f'; ctx.fillRect(-9, 6, 18, 5);
    } else if (it.id === 'nuclear') {
      ctx.fillStyle = '#7ef778';
      ctx.beginPath(); ctx.moveTo(-8, -24); ctx.lineTo(0, -44); ctx.lineTo(8, -24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8d44d';
      ctx.beginPath(); ctx.arc(0, -8, 6.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1c1f14';
      ctx.beginPath(); ctx.arc(0, -8, 1.6, 0, TAU); ctx.fill();
      for (let a = 0; a < 3; a++) {
        const an = -Math.PI / 2 + a * TAU / 3;
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.arc(0, -8, 5.5, an - .55, an + .55); ctx.closePath(); ctx.fill();
      }
    } else { // fusion
      ctx.fillStyle = '#6ee6ff';
      ctx.beginPath(); ctx.moveTo(-8, -24); ctx.lineTo(0, -44); ctx.lineTo(8, -24); ctx.closePath(); ctx.fill();
      const t = Game.stateT * 4;
      ctx.fillStyle = `rgba(110,230,255,${.5 + .3 * Math.sin(t)})`;
      ctx.fillRect(-2.5, -20, 5, 38);
      ctx.strokeStyle = '#6ee6ff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-16, 24); ctx.lineTo(-8, 10); ctx.moveTo(16, 24); ctx.lineTo(8, 10); ctx.stroke();
    }
  },

  draw(ctx) {
    const W = WORLD.VW, H = WORLD.VH, u = this.ui;
    ctx.fillStyle = '#0b0d13'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, 80, 40, W / 2, 80, 500);
    g.addColorStop(0, 'rgba(255,215,94,.10)'); g.addColorStop(1, 'rgba(255,215,94,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 220);

    /* шапка */
    ctx.textAlign = 'left';
    ctx.font = '900 34px "Segoe UI", sans-serif'; ctx.fillStyle = '#f2f5f9';
    ctx.fillText('СНАБЖЕНИЕ', 40, 64);
    ctx.font = '700 13px "Segoe UI", sans-serif'; ctx.fillStyle = '#8f97a5';
    ctx.fillText(Game.city.name + ' · ВИЗИТ ' + this.visit, 40, 88);
    ctx.textAlign = 'right';
    ctx.font = '900 34px Consolas, monospace'; ctx.fillStyle = '#ffd75e';
    ctx.fillText('$ ' + fmtScore(this.money), W - 40, 64);
    ctx.font = '700 12px "Segoe UI", sans-serif'; ctx.fillStyle = '#8f97a5';
    ctx.fillText('НАЛИЧНЫЕ', W - 40, 86);
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, 104); ctx.lineTo(W - 40, 104); ctx.stroke();

    /* список категорий */
    const y0 = 128, rowH = 64;
    SHOP_CATS.forEach((cat, i) => {
      const y = y0 + i * rowH;
      const sel = i === u.cat && !u.open;
      if (sel) {
        ctx.fillStyle = 'rgba(255,215,94,.10)';
        rrect(ctx, 40, y, W - 80, rowH - 8, 8); ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,94,.45)'; ctx.lineWidth = 1;
        rrect(ctx, 40.5, y + .5, W - 81, rowH - 9, 8); ctx.stroke();
      }
      const it = this.item(cat);
      ctx.textAlign = 'left';
      ctx.font = '800 20px "Segoe UI", sans-serif';
      ctx.fillStyle = sel ? '#ffe98a' : '#c8cedb';
      ctx.fillText(SHOP_DATA[cat].name, 64, y + 36);
      ctx.font = '800 18px Consolas, monospace';
      ctx.fillStyle = '#f2f5f9';
      ctx.fillText(it.brand, 340, y + 36);
      ctx.font = '700 16px Consolas, monospace';
      ctx.fillStyle = '#8ef2a8';
      ctx.fillText(it.stats.length ? it.stats.join('/') : '—', 560, y + 36);
      /* пиктограмма установленной детали */
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      rrect(ctx, 626, y + 7, 58, 42, 6); ctx.fill();
      this.drawIcon(ctx, cat, it, 655, y + 28, 42);
      const data = SHOP_DATA[cat];
      ctx.textAlign = 'right';
      ctx.font = '700 13px Consolas, monospace';
      ctx.fillStyle = '#8f97a5';
      ctx.fillText('$' + fmtScore(data.items[0].price) + ' – $' + fmtScore(data.items[3].price), W - 64, y + 36);
      if (sel && Math.sin(Game.stateT * 6) > -0.2) {
        ctx.fillStyle = '#ffd75e';
        ctx.beginPath();
        ctx.moveTo(50, y + 22); ctx.lineTo(58, y + 28); ctx.lineTo(50, y + 34);
        ctx.closePath(); ctx.fill();
      }
    });

    /* подсказки и заметка */
    ctx.textAlign = 'center';
    ctx.font = '700 13px "Segoe UI", sans-serif'; ctx.fillStyle = '#8f97a5';
    ctx.fillText('↑/↓ — КАТЕГОРИЯ · ENTER — КАТАЛОГ · ESC — В ГОРОД · Q — В МЕНЮ', W / 2, H - 40);
    if (u.msgT > 0) {
      ctx.globalAlpha = clamp(u.msgT / .4, 0, 1);
      ctx.font = '800 18px "Segoe UI", sans-serif';
      ctx.fillStyle = u.msgColor;
      ctx.fillText(u.msg, W / 2, H - 70);
      ctx.globalAlpha = 1;
    }

    /* каталог 2×2 */
    if (u.open) {
      ctx.fillStyle = 'rgba(5,7,10,.72)'; ctx.fillRect(0, 0, W, H);
      const cat = SHOP_CATS[u.cat], data = SHOP_DATA[cat];
      const pw = 560, ph = 380, px = (W - pw) / 2, py = (H - ph) / 2 - 10;
      ctx.fillStyle = '#12151d';
      rrect(ctx, px, py, pw, ph, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(255,215,94,.4)'; ctx.lineWidth = 1.5;
      rrect(ctx, px, py, pw, ph, 12); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = '900 22px "Segoe UI", sans-serif'; ctx.fillStyle = '#f2f5f9';
      ctx.fillText('КАТАЛОГ: ' + data.name, W / 2, py + 40);
      const cw = 250, ch = 120, gx = px + 20, gy = py + 64;
      data.items.forEach((it, i) => {
        const x = gx + (i % 2) * (cw + 20), y = gy + Math.floor(i / 2) * (ch + 16);
        const cur = u.cursor === i;
        const inst = it.id === this.owned[cat];
        ctx.fillStyle = cur ? 'rgba(255,215,94,.14)' : 'rgba(255,255,255,.04)';
        rrect(ctx, x, y, cw, ch, 8); ctx.fill();
        ctx.strokeStyle = cur ? '#ffd75e' : 'rgba(255,255,255,.14)';
        ctx.lineWidth = cur ? 2 : 1;
        rrect(ctx, x, y, cw, ch, 8); ctx.stroke();
        /* витрина: тёмный подиум + пиктограмма товара */
        ctx.fillStyle = 'rgba(0,0,0,.32)';
        rrect(ctx, x + 10, y + 12, 74, ch - 24, 8); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1;
        rrect(ctx, x + 10.5, y + 12.5, 73, ch - 25, 8); ctx.stroke();
        this.drawIcon(ctx, cat, it, x + 47, y + ch / 2, 64);
        ctx.textAlign = 'left';
        ctx.font = '800 19px Consolas, monospace';
        ctx.fillStyle = inst ? '#8ef2a8' : '#f2f5f9';
        ctx.fillText(it.brand, x + 96, y + 30);
        ctx.font = '700 14px Consolas, monospace';
        ctx.fillStyle = '#9fd3ea';
        ctx.fillText(it.stats.length ? it.stats.join(' / ') : '—', x + 96, y + 54);
        ctx.font = '800 16px Consolas, monospace';
        ctx.fillStyle = '#ffd75e';
        ctx.fillText('$' + fmtScore(it.price), x + 96, y + 80);
        ctx.font = '700 11px "Segoe UI", sans-serif';
        if (inst) {
          ctx.fillStyle = '#8ef2a8';
          ctx.fillText('УСТАНОВЛЕНО', x + 96, y + 102);
        } else {
          ctx.fillStyle = '#8f97a5';
          ctx.fillText('ЗАМЕНА: −$' + fmtScore(Math.max(0, it.price - this.tradeIn(cat))), x + 96, y + 102);
        }
      });
      const trade = this.tradeIn(cat);
      ctx.textAlign = 'center';
      ctx.font = '700 14px Consolas, monospace'; ctx.fillStyle = '#ffd75e';
      ctx.fillText('ДОСТУПНО: $' + fmtScore(this.money + trade) +
        (trade ? ' · ЗАЧЁТ СТАРОЙ $' + fmtScore(trade) : ''), W / 2, py + ph - 44);
      ctx.font = '700 12px "Segoe UI", sans-serif'; ctx.fillStyle = '#8f97a5';
      ctx.fillText('СТРЕЛКИ — КУРСОР · ENTER — КУПИТЬ · ESC — НАЗАД', W / 2, py + ph - 20);
    }
  },
};
