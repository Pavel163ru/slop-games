'use strict';
/* ============================================================
 * main.js — стейт-машина игры и главный цикл
 * ============================================================ */

const Game = {
  state: 'menu',            // menu | citymap | briefing | play | paused | shop | win | gameover | finale
  diffIdx: 0,
  diff: DIFFS[0],
  stateT: 0,
  time: 0,
  last: 0,
  score: 0, kills: 0, gremlinsKilled: 0, helisKilled: 0, silosKilled: 0,
  timer: 0, lives: CFG.LIVES, flagsTaken: 0, flagsOpen: false,
  timeBonus: 0,
  cityIdx: 0, lapStarted: false, campScore: 0,
  msgs: [],
  hi: 0,
  canvas: null, ctx: null,

  /* ==================== инициализация ==================== */
  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    Input.init();
    Decals.init();
    Shop.load();
    try { this.hi = parseInt(localStorage.getItem('deathrace_remake_hi') || '0', 10) || 0; } catch (e) {}
    this.loadProgress();
    CityMap.generate((Math.random() * 1e9) | 0);
    CityMap.buildStatic();
    CityMap.buildMini();
    window.addEventListener('resize', () => this.resize());
    this.resize();
    Draw.snapCamera();
    requestAnimationFrame(t => this.loop(t));
  },

  resize() {
    const s = Math.min((window.innerWidth - 20) / WORLD.VW, (window.innerHeight - 20) / WORLD.VH);
    this.canvas.style.width = Math.floor(WORLD.VW * s) + 'px';
    this.canvas.style.height = Math.floor(WORLD.VH * s) + 'px';
  },

  /* ==================== главный цикл ==================== */
  loop(t) {
    requestAnimationFrame(tt => this.loop(tt));
    const dt = Math.min((t - this.last) / 1000, .033);
    this.last = t;
    this.stateT += dt;
    if (Input.pressed('KeyM')) Sound.toggleMute();
    this.update(dt);
    this.render(this.ctx);
    Input.update();
  },

  /* ==================== обновление ==================== */
  update(dt) {
    switch (this.state) {
      case 'menu': {
        if (Input.pressed('ArrowUp', 'KeyW')) { this.diffIdx = (this.diffIdx + DIFFS.length - 1) % DIFFS.length; Sound.uiMove(); }
        if (Input.pressed('ArrowDown', 'KeyS')) { this.diffIdx = (this.diffIdx + 1) % DIFFS.length; Sound.uiMove(); }
        if (Input.pressed('Enter', 'Space')) { Sound.uiOk(); this.startRun(); }
        break;
      }
      case 'citymap': {
        if (Input.pressed('Enter', 'Space')) { Sound.uiOk(); this.state = 'briefing'; this.stateT = 0; }
        if (Input.pressed('Escape')) this.toMenu();
        break;
      }
      case 'briefing': {
        if (Input.pressed('Enter', 'Space') || this.stateT > 4.5) this.enterShop();
        break;
      }
      case 'play': {
        if (Input.pressed('Escape', 'KeyP')) { this.state = 'paused'; Sound.engineOn(false); break; }
        this.updatePlay(dt);
        break;
      }
      case 'paused': {
        if (Input.pressed('Escape', 'KeyP', 'Enter')) { this.state = 'play'; Sound.engineOn(true); }
        if (Input.pressed('KeyR')) { Sound.engineOn(false); this.restartRun(); }
        if (Input.pressed('KeyQ')) this.toMenu();
        break;
      }
      case 'win': case 'gameover': {
        if (Input.pressed('Enter')) { if (this.state === 'win') this.startRun(); else this.toMenu(); }
        if (Input.pressed('KeyR')) this.restartRun();
        break;
      }
      case 'finale': {
        if (Input.pressed('Enter', 'Space', 'Escape')) this.toMenu();
        if (Input.pressed('KeyR')) this.restartRun();
        break;
      }
      case 'shop': {
        Shop.update(dt);
        break;
      }
    }
  },
  updatePlay(dt) {
    this.time += dt;
    const prevCeil = Math.ceil(this.timer);
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0;
      if (!Player.dead) { this.flash('ВРЕМЯ ВЫШЛО', '#ff5546'); Player.die(); }
    } else if (this.timer <= 10 && Math.ceil(this.timer) !== prevCeil) {
      Sound.tick();
    }

    Player.update(dt);
    Gremlins.update(dt);
    Helis.update(dt);
    Silos.update(dt);
    Weapons.update(dt);
    Particles.update(dt);
    Texts.update(dt);
    Draw.updateCamera(dt);
    Sound.engineSet(Player.speed, !!Player.throttle, !Player.dead);

    for (let i = this.msgs.length - 1; i >= 0; i--) {
      const m = this.msgs[i];
      m.t += dt;
      if (m.t > m.max) this.msgs.splice(i, 1);
    }
  },

  /* ==================== переходы ==================== */
  startRun() {
    this.diff = DIFFS[this.diffIdx];
    this.score = 0; this.kills = 0;
    this.gremlinsKilled = 0; this.helisKilled = 0; this.silosKilled = 0;
    this.lives = CFG.LIVES;
    this.earnedVisit = 0;
    this.clearedCity = null;
    this.msgs = [];
    /* кампания: продолжаем с сохранённого города либо начинаем с первого */
    if (!this.lapStarted) {
      this.cityIdx = 0;
      this.campScore = 0;
    }
    this.lapStarted = true;
    this.saveProgress();
    /* новый город на каждый заезд */
    CityMap.generate((Math.random() * 1e9) | 0);
    CityMap.buildStatic();
    CityMap.buildMini();
    /* перед городом — карта маршрута (как в оригинале) */
    this.state = 'citymap';
    this.stateT = 0;
  },

  restartRun() { this.startRun(); },

  get city() { return CITIES[this.cityIdx] || CITIES[0]; },

  /** Кампанийный прогресс: текущий город живёт между сессиями (этап A2) */
  saveProgress() {
    try {
      localStorage.setItem('deathrace_remake_camp',
        JSON.stringify({ city: this.cityIdx, diff: this.diffIdx,
          lapStarted: this.lapStarted, campScore: this.campScore || 0 }));
    } catch (e) {}
  },

  loadProgress() {
    try {
      const s = JSON.parse(localStorage.getItem('deathrace_remake_camp') || 'null');
      if (s) {
        this.cityIdx = clamp(s.city | 0, 0, CITIES.length - 1);
        this.lapStarted = !!s.lapStarted;
        this.campScore = s.campScore | 0;
        if (typeof s.diff === 'number' && DIFFS[s.diff]) { this.diffIdx = s.diff; this.diff = DIFFS[s.diff]; }
      }
    } catch (e) {}
  },

  startLevel() {
    const city = this.city;
    this.timer = this.diff.timer * city.timerK;
    this.flagsTaken = 0;
    this.flagsOpen = false;
    this.time = 0;
    /* давление города (этап A4): номер города + визит магазина */
    const eff = effDiff(this.diff, city);
    const visit = Shop.visit - 1;
    const ed = Object.assign({}, eff, {
      helis: Math.min(eff.helis + Math.floor(visit / 2), 4),
      silos: Math.min(eff.silos + Math.floor(visit / 3), 4),
    });
    Player.reset(this.diff);
    Gremlins.reset(ed);
    Helis.reset(ed);
    Silos.reset(ed);
    Weapons.reset(this.diff);
    Particles.clear();
    Texts.clear();
    Decals.reset();
    Draw.snapCamera();
    this.state = 'play';
    this.stateT = 0;
    Sound.engineOn(true);
    this.flash(city.title, '#f2f5f9', 2.6);
  },

  /** Мягкий перезапуск города после гибели (очки/убийства сохраняются) */
  afterDeath() {
    this.timer = this.diff.timer * this.city.timerK;
    this.flagsTaken = 0;
    this.flagsOpen = false;
    Player.reset(this.diff);
    /* то же давление города, что и при первом старте уровня */
    const eff = effDiff(this.diff, this.city);
    const visit = Shop.visit - 1;
    const ed = Object.assign({}, eff, {
      helis: Math.min(eff.helis + Math.floor(visit / 2), 4),
      silos: Math.min(eff.silos + Math.floor(visit / 3), 4),
    });
    Gremlins.reset(ed);
    Helis.reset(ed);
    Silos.reset(ed);
    Weapons.reset(this.diff);
    Particles.clear();
    Texts.clear();
    Decals.reset();
    Draw.snapCamera();
    this.flash('НОВАЯ ПОПЫТКА', '#ffb45e', 2);
  },

  toMenu() {
    this.state = 'menu';
    this.stateT = 0;
    Sound.engineOn(false);
    Particles.clear();
    Texts.clear();
  },

  enterShop() {
    this.state = 'shop';
    this.stateT = 0;
    Shop.openUI();
    Sound.uiOk();
  },
  /* ==================== игровые события ==================== */
  flash(txt, color = '#f2f5f9', max = 2.4) {
    this.msgs.push({ txt, color, t: 0, max });
    if (this.msgs.length > 3) this.msgs.shift();
  },

  addKill(type, x, y) {
    const base = { gremlin: 100, heli: 1000, silo: 500 }[type] || 0;
    const pts = Math.round(base * this.diff.scoreMul);
    this.score += pts;
    Shop.addMoney(pts);
    this.earnedVisit += pts;
    this.kills++;
    if (type === 'gremlin') this.gremlinsKilled++;
    else if (type === 'heli') this.helisKilled++;
    else if (type === 'silo') this.silosKilled++;
    if (x != null) Texts.add(x, y - 20, '+' + pts, type === 'gremlin' ? '#ffd75e' : '#8ef2a8');
  },

  onFlag(f) {
    this.flagsTaken++;
    Sound.flag();
    const pts = Math.round(500 * this.diff.scoreMul);
    this.score += pts;
    Shop.addMoney(pts);
    this.earnedVisit += pts;
    Texts.add(f.x, f.y - 32, '+' + pts, '#ffd75e');
    this.flash(`ФЛАГ ${this.flagsTaken}/${this.city.flags}`);
    if (this.flagsTaken >= this.city.flags) {
      this.flagsOpen = true;
      Sound.siren();
      this.flash('ВЫХОД ОТКРЫТ — СЕВЕРНЫЕ ВОРОТА', '#8ef2a8', 3.2);
    }
  },

  onPlayerDeath() {
    this.lives--;
    if (this.lives <= 0) {
      /* game over завершает кампанию — новый заезд начнётся с первого города */
      this.lapStarted = false;
      this.saveProgress();
      this.state = 'gameover';
      this.stateT = 0;
      Sound.engineOn(false);
      Sound.lose();
      this.saveHi();
    }
  },

  winLevel() {
    this.timeBonus = Math.round(this.timer * 10 * this.diff.scoreMul);
    this.score += this.timeBonus;
    Shop.addMoney(this.timeBonus);
    this.earnedVisit += this.timeBonus;
    Shop.visit++;
    Shop.save();
    this.clearedCity = this.city;   /* для экрана победы (cityIdx ниже инкрементится) */
    this.campScore = (this.campScore || 0) + this.score;
    this.cityIdx++;
    /* конец кампании: после 8-го города — финал (один круг по городам) */
    if (this.cityIdx >= CITIES.length) {
      this.cityIdx = 0;
      this.lapStarted = false;   /* «ещё раз» начнёт новую кампанию */
      this.saveProgress();
      this.state = 'finale';
      this.stateT = 0;
      Sound.engineOn(false);
      Sound.win();
      this.saveHi();
      return;
    }
    this.saveProgress();
    this.state = 'win';
    this.stateT = 0;
    Sound.engineOn(false);
    Sound.win();
    this.saveHi();
  },

  saveHi() {
    if (this.score > this.hi) {
      this.hi = this.score;
      try { localStorage.setItem('deathrace_remake_hi', String(this.hi)); } catch (e) {}
    }
  },
  /* ==================== отрисовка ==================== */
  render(ctx) {
    const W = WORLD.VW, H = WORLD.VH;
    switch (this.state) {
      case 'menu': this.drawMenu(ctx); break;
      case 'citymap': CityMapScreen.draw(ctx); break;
      case 'briefing': this.drawBriefing(ctx); break;
      case 'shop': Shop.draw(ctx); break;
      case 'play': Draw.world(ctx); HUD.draw(ctx); break;
      case 'paused':
        Draw.world(ctx); HUD.draw(ctx);
        this.dim(ctx, .62);
        this.centerTitle(ctx, 'ПАУЗА', '#f2f5f9', H * .42);
        this.centerText(ctx, 'ESC — ПРОДОЛЖИТЬ · R — НАЧАТЬ ЗАНОВО · Q — В МЕНЮ', H * .42 + 44, '#c8cedb', 15);
        break;
      case 'win': this.drawEnd(ctx, true); break;
      case 'gameover': this.drawEnd(ctx, false); break;
      case 'finale': this.drawFinale(ctx); break;
    }
  },

  /** Финал кампании: 8 городов — титры (этап A5) */
  drawFinale(ctx) {
    const W = WORLD.VW, H = WORLD.VH, t = this.stateT;
    ctx.fillStyle = '#0b0d13'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H * .32, 60, W / 2, H * .32, 560);
    g.addColorStop(0, 'rgba(142,242,168,.16)');
    g.addColorStop(1, 'rgba(142,242,168,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = '900 58px "Segoe UI", sans-serif';
    ctx.fillStyle = '#8ef2a8';
    ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 14;
    ctx.fillText('КАМПАНИЯ ПРОЙДЕНА', W / 2, H * .20);
    ctx.shadowBlur = 0;
    ctx.font = '700 15px "Segoe UI", sans-serif';
    ctx.fillStyle = '#9aa3b2';
    ctx.fillText('ВСЕ 8 ГОРОДОВ · СЛОЖНОСТЬ: ' + this.diff.name, W / 2, H * .20 + 34);
    const rows = [
      ['ОЧКОВ ЗА КАМПАНИЮ', fmtScore(this.campScore || 0)],
      ['РЕКОРД', fmtScore(this.hi)],
      ['В КАРМАНЕ', '$' + fmtScore(Shop.money)],
    ];
    ctx.font = '700 17px Consolas, monospace';
    rows.forEach((r, i) => {
      const y = H * .34 + i * 32;
      ctx.textAlign = 'left'; ctx.fillStyle = '#9aa3b2';
      ctx.fillText(r[0], W / 2 - 170, y);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffd75e';
      ctx.fillText(r[1], W / 2 + 170, y);
    });
    const credits = [
      ['DEATH RACE — РЕМЕЙК', '#f2f5f9'],
      ['ОРИГИНАЛ: EXIDY, 1976 · NES: AMERICAN GAME CARTRIDGES, 1990', '#8f97a5'],
      ['ДИЗАЙН: J. FERGUSON · K. RUPP · J. DUNN · D. FORBES · S. SCHRYVER', '#8f97a5'],
      ['МУЗЫКА: D. WOOD · D. FORBES', '#8f97a5'],
    ];
    credits.forEach((c, i) => {
      ctx.font = i === 0 ? '800 15px "Segoe UI", sans-serif' : '600 12px "Segoe UI", sans-serif';
      ctx.fillStyle = c[1];
      ctx.fillText(c[0], W / 2, H * .55 + i * 26);
    });
    ctx.textAlign = 'center';
    ctx.font = '800 17px "Segoe UI", sans-serif';
    ctx.fillStyle = Math.sin(t * 4) > -0.3 ? '#f2f5f9' : '#7b8290';
    ctx.fillText('ENTER — В МЕНЮ · R — ЕЩЁ РАЗ', W / 2, H * .86);
  },

  dim(ctx, a) {
    ctx.fillStyle = `rgba(5,7,10,${a})`;
    ctx.fillRect(0, 0, WORLD.VW, WORLD.VH);
  },

  centerTitle(ctx, txt, color, y) {
    ctx.textAlign = 'center';
    ctx.font = '900 56px "Segoe UI", sans-serif';
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 14;
    ctx.fillText(txt, WORLD.VW / 2, y);
    ctx.shadowBlur = 0;
  },

  centerText(ctx, txt, y, color, size = 16) {
    ctx.textAlign = 'center';
    ctx.font = `700 ${size}px "Segoe UI", sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(txt, WORLD.VW / 2, y);
  },

  drawMenu(ctx) {
    const W = WORLD.VW, H = WORLD.VH, t = this.stateT;
    ctx.fillStyle = '#0b0d13';
    ctx.fillRect(0, 0, W, H);
    /* красное свечение + сетка */
    const g = ctx.createRadialGradient(W / 2, H * .40, 60, W / 2, H * .40, 540);
    g.addColorStop(0, 'rgba(224,72,54,.30)');
    g.addColorStop(1, 'rgba(224,72,54,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    /* логотип */
    ctx.textAlign = 'center';
    ctx.font = '900 86px "Segoe UI", sans-serif';
    const tg = ctx.createLinearGradient(0, H * .12, 0, H * .30);
    tg.addColorStop(0, '#ff8a70'); tg.addColorStop(.55, '#ff5546'); tg.addColorStop(1, '#8f1508');
    ctx.fillStyle = tg;
    ctx.shadowColor = 'rgba(224,72,54,.5)'; ctx.shadowBlur = 34;
    ctx.fillText('DEATH RACE', W / 2, H * .27);
    ctx.shadowBlur = 0;
    ctx.font = '700 14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#9aa3b2';
    ctx.fillText('РЕМЕЙК · СОВРЕМЕННОЕ ИЗДАНИЕ', W / 2, H * .27 + 34);
    ctx.fillStyle = '#6b7280';
    ctx.fillText(this.lapStarted
      ? 'КАМПАНИЯ: ' + this.city.name + ' (' + (this.cityIdx + 1) + '/8)'
      : 'КАМПАНИЯ: 8 ГОРОДОВ США', W / 2, H * .27 + 56);

    /* выбор сложности */
    ctx.textAlign = 'left';
    ctx.font = '700 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#8f97a5';
    ctx.fillText('СЛОЖНОСТЬ (↑/↓, КАК НА NES):', W / 2 - 210, H * .44 - 22);
    DIFFS.forEach((d, i) => {
      const y = H * .44 + i * 36;
      const sel = i === this.diffIdx;
      if (sel) {
        ctx.fillStyle = 'rgba(224,72,54,.14)';
        rrect(ctx, W / 2 - 226, y - 24, 452, 32, 8); ctx.fill();
        ctx.strokeStyle = 'rgba(224,72,54,.55)'; ctx.lineWidth = 1;
        rrect(ctx, W / 2 - 226, y - 24, 452, 32, 8); ctx.stroke();
      }
      ctx.font = '800 19px "Segoe UI", sans-serif';
      ctx.fillStyle = sel ? '#ffb4a8' : '#aab2c0';
      ctx.fillText(d.name, W / 2 - 200, y);
      ctx.font = '600 12px "Segoe UI", sans-serif';
      ctx.fillStyle = sel ? '#d8dde6' : '#767e8c';
      ctx.fillText(d.desc, W / 2 - 200 + 200, y);
      if (sel && Math.sin(t * 6) > -0.2) {
        ctx.fillStyle = '#ff5546';
        ctx.beginPath();
        ctx.moveTo(W / 2 - 216, y - 12); ctx.lineTo(W / 2 - 206, y - 6); ctx.lineTo(W / 2 - 216, y);
        ctx.closePath(); ctx.fill();
      }
    });
    /* низ меню: рекорд, управление, старт */
    ctx.textAlign = 'center';
    ctx.font = '700 14px Consolas, monospace';
    ctx.fillStyle = '#ffd75e';
    ctx.fillText('РЕКОРД: ' + fmtScore(this.hi), W / 2, H * .84 - 44);
    ctx.font = '600 13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#8f97a5';
    ctx.fillText('WASD / СТРЕЛКИ — ЕЗДА   ·   Z / J — ПУЛЕМЁТЫ   ·   X / K — РАКЕТА   ·   SPACE — РУЧНИК', W / 2, H * .84 - 16);
    ctx.fillText('M — ЗВУК   ·   ESC / P — ПАУЗА', W / 2, H * .84 + 6);
    ctx.font = '800 17px "Segoe UI", sans-serif';
    ctx.fillStyle = Math.sin(t * 4) > -0.3 ? '#f2f5f9' : '#7b8290';
    ctx.fillText('ENTER — СТАРТ', W / 2, H * .92);
    ctx.font = '600 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#565e6c';
    ctx.fillText('СЛОЖНОСТЬ КАК НА NES: ТОРМОЗИШЬ — ГОРИШЬ', W / 2, H - 14);
  },

  drawBriefing(ctx) {
    const W = WORLD.VW, H = WORLD.VH;
    ctx.fillStyle = '#0b0d13'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H * .38, 40, W / 2, H * .38, 460);
    g.addColorStop(0, 'rgba(224,72,54,.16)'); g.addColorStop(1, 'rgba(224,72,54,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const city = this.city;
    this.centerTitle(ctx, city.title, '#f2f5f9', H * .24);
    ctx.textAlign = 'center';
    ctx.font = '700 13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#8f97a5';
    ctx.fillText('СЛОЖНОСТЬ: ' + this.diff.name + ' · МНОЖИТЕЛЬ ОЧКОВ ×' + this.diff.scoreMul, W / 2, H * .24 + 30);
    ctx.fillText('ГОРОД ' + (this.cityIdx + 1) + ' ИЗ ' + CITIES.length + ' · ВИЗИТ ' + Shop.visit + ' · В КАРМАНЕ $' + fmtScore(Shop.money), W / 2, H * .24 + 50);

    const lines = [
      ['ДАВИ ГРЕМЛИНОВ КОРПУСОМ ИЛИ ПУЛЕМЁТАМИ', '#f2f5f9'],
      [`ГОРОД ОБНЕСЁН ЗАБОРОМ — СОБЕРИ ${city.flags} ФЛАГОВ, ОТКРОЮТСЯ ВОРОТА`, '#ffd75e'],
      [`ВЫЕЗЖАЙ ЗА ТАЙМЕР: ${Math.round(this.diff.timer * city.timerK)} СЕКУНД`, '#8ef2a8'],
      ['ВЕРТОЛЁТЫ БЬЮТ С ВОЗДУХА — ИХ ТОЛЬКО РАКЕТАМИ', '#ff8a70'],
      ['ШАХТЫ ПУСКАЮТ САМОНАВОДЯЩИЕСЯ РАКЕТЫ — УНИЧТОЖАЙ ПЕРВЫМИ', '#ff8a70'],
    ];
    lines.forEach((l, i) => {
      ctx.font = '700 17px "Segoe UI", sans-serif';
      ctx.fillStyle = l[1];
      ctx.fillText(l[0], W / 2, H * .40 + i * 34);
    });
    ctx.font = '800 17px "Segoe UI", sans-serif';
    ctx.fillStyle = Math.sin(this.stateT * 4) > -0.3 ? '#f2f5f9' : '#7b8290';
    ctx.fillText('ENTER — СНАБЖЕНИЕ', W / 2, H * .80);
  },

  drawEnd(ctx, win) {
    const W = WORLD.VW, H = WORLD.VH;
    Draw.world(ctx);
    this.dim(ctx, .68);
    const city = this.clearedCity || this.city;
    const nextCity = CITIES[this.cityIdx] || CITIES[0];
    this.centerTitle(ctx, win ? city.name + ' ЗАЧИЩЕН' : 'МАШИНЫ ЗАКОНЧИЛИСЬ', win ? '#8ef2a8' : '#ff5546', H * .28);
    this.centerText(ctx, win
      ? 'ДАЛЬШЕ: ' + nextCity.name
      : 'КАМПАНИЯ НАЧНЁТСЯ ЗАНОВО', H * .28 + 34, '#9aa3b2', 13);
    ctx.textAlign = 'center';
    const rows = [
      ['ГРЕМЛИНОВ УНИЧТОЖЕНО', String(this.gremlinsKilled)],
      ['ВЕРТОЛЁТОВ СБИТО', String(this.helisKilled)],
      ['ШАХТ УНИЧТОЖЕНО', String(this.silosKilled)],
    ];
    if (win) {
      rows.push(['БОНУС ЗА ВРЕМЯ', '+' + fmtScore(this.timeBonus)]);
      rows.push(['ЗАРАБОТАНО ЗА ВИЗИТ', '+$' + fmtScore(this.earnedVisit)]);
    }
    rows.push(['В КАРМАНЕ', '$' + fmtScore(Shop.money)]);
    rows.push(['ЗА КАМПАНИЮ', fmtScore(this.campScore || 0)]);
    rows.push(['РЕКОРД', fmtScore(this.hi)]);
    ctx.font = '700 16px Consolas, monospace';
    rows.forEach((r, i) => {
      const y = H * .38 + i * 30;
      ctx.textAlign = 'left'; ctx.fillStyle = '#9aa3b2';
      ctx.fillText(r[0], W / 2 - 190, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = i >= rows.length - 2 ? '#ffd75e' : '#f2f5f9';
      ctx.fillText(r[1], W / 2 + 190, y);
    });
    ctx.textAlign = 'center';
    ctx.font = '800 17px "Segoe UI", sans-serif';
    ctx.fillStyle = Math.sin(this.stateT * 4) > -0.3 ? '#f2f5f9' : '#7b8290';
    ctx.fillText(this.state === 'win' ? 'ENTER — НА КАРТУ · R — ЕЩЁ РАЗ' : 'ENTER — В МЕНЮ · R — ЕЩЁ РАЗ', W / 2, H * .86);
  },
};

Game.init();