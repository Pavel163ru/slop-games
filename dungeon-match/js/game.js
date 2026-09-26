(function () {
  "use strict";

  const DungeonBoard = window.DungeonBoard;
  const DungeonSprites = window.DungeonSprites;
  const WIDTH = 512;
  const HEIGHT = 940;
  const RAIL_HEIGHT = 690;
  const RAIL_WIDTH = 120;
  const CELL = 64;
  const BOARD_TOP = 134;
  const SAVE_KEY = "dungeon-match-save-v1";
  const ACH_KEY = "dungeon-match-ach-v1";
  const MUTE_KEY = "dungeon-match-muted";
  const TYPE_SPRITES = { sword: "token-sword", shield: "token-shield", mana: "token-mana", gold: "token-gold", potion: "token-potion" };
  const TYPE_COLORS = { sword: "#652e2b", shield: "#294556", mana: "#383769", gold: "#5b481f", potion: "#2b5034" };
  const SPELLS = [
    { action: "fireball", id: "spell-fireball", name: "Фаербол", cost: 15, unlock: 1, effect: "12 урона · ожог", short: "12 урона" },
    { action: "heal", id: "spell-heal", name: "Лечение", cost: 12, unlock: 1, effect: "+15 здоровья", short: "+15 HP" },
    { action: "shield", id: "spell-stone-shield", name: "Каменный щит", cost: 10, unlock: 1, effect: "+10 брони", short: "+10 брони" },
    { action: "skin", id: "spell-stone-skin", name: "Каменная кожа", cost: 14, unlock: 2, effect: "+14 брони · слабость", short: "+14 брони" },
    { action: "lightning", id: "spell-lightning", name: "Молния", cost: 20, unlock: 3, effect: "20 урона · сброс брони", short: "20 урона" },
    { action: "vampirism", id: "spell-vampirism", name: "Вампиризм", cost: 18, unlock: 4, effect: "8 урона · +8 HP", short: "урон · лечение" },
    { action: "berserk", id: "spell-berserk", name: "Берсерк", cost: 16, unlock: 4, effect: "+3 к мечам · 4 хода", short: "+3 к мечам" },
    { action: "chain", id: "spell-chain-lightning", name: "Цепная молния", cost: 26, unlock: 6, ngOnly: true, effect: "30 урона · ослабление", short: "30 урона" }
  ];
  const ENEMIES = {
    1: { id: "enemy-rat", name: "Крыса", hp: 40, atk: [6, 8], xp: 40, gold: 30, trait: "Учебный противник" },
    2: { id: "enemy-bat", name: "Летучая мышь", hp: 48, atk: [7, 9], xp: 55, gold: 35, trait: "Быстрые выпады" },
    3: { id: "enemy-skeleton-warrior", name: "Скелет-воин", hp: 62, atk: [9, 12], xp: 75, gold: 45, trait: "Элитный путь усиливает его" },
    4: { id: "enemy-skeleton-archer", name: "Скелет-лучник", hp: 58, atk: [11, 13], xp: 85, gold: 50, trait: "Пробивает 2 брони" },
    6: { id: "enemy-slime", name: "Слайм", hp: 78, atk: [8, 10], xp: 105, gold: 55, trait: "Восстанавливает 5 HP каждый третий ход" },
    7: { id: "enemy-dark-knight", name: "Тёмный рыцарь", hp: 118, atk: [14, 18], xp: 160, gold: 80, trait: "Начинает бой с 10 брони" },
    8: { id: "enemy-necromancer", name: "Некромант", hp: 110, atk: [15, 19], xp: 185, gold: 90, trait: "Призывает скелета каждые 3 хода" },
    9: { id: "enemy-dungeon-guardian", name: "Страж подземелья", hp: 148, atk: [17, 21], xp: 220, gold: 100, trait: "Каменный страж нижних рядов" },
    10: { id: "enemy-lich", name: "Лич", hp: 190, atk: [20, 25], xp: 300, gold: 180, trait: "Каждая четвёртая атака усилена" }
  };
  const SHOP = [
    { id: "potion", name: "Зелье лечения", desc: "+25 HP в бою · максимум 3", cost: 30 },
    { id: "bomb", name: "Огненная бомба", desc: "25 прямого урона · максимум 3", cost: 50 },
    { id: "shuffle", name: "Руна перемешки", desc: "Новое поле без траты хода · макс. 3", cost: 40 },
    { id: "heal", name: "Отдых у костра", desc: "Полностью восстановить здоровье", cost: 25 },
    { id: "maxHp", name: "Сердце великана", desc: "+10 к максимальному здоровью", cost: 100 }
  ];
  const ACHIEVEMENTS = [
    { id: "first", name: "Первый шаг", desc: "Победи в первом бою", test: function (s) { return s.wins >= 1; } },
    { id: "ten", name: "Зачистка", desc: "Одержи 10 побед", test: function (s) { return s.wins >= 10; } },
    { id: "casts", name: "Повелитель маны", desc: "Примени 25 заклинаний", test: function (s) { return s.casts >= 25; } },
    { id: "clean", name: "Ни царапины", desc: "Победи, не получив урона", test: function (s) { return s.cleanWins >= 1; } },
    { id: "elite", name: "Охотник на элиту", desc: "Победи элитного противника", test: function (s) { return s.eliteWins >= 1; } },
    { id: "rich", name: "Золотая жила", desc: "Собери 300 золота за один забег", test: function (s) { return s.richRuns >= 1; } },
    { id: "items", name: "Запасливый герой", desc: "Используй 5 расходников", test: function (s) { return s.consumables >= 5; } },
    { id: "lich", name: "Конец вечности", desc: "Победи Лича", test: function (s) { return s.lichWins >= 1; } }
  ];
  const ASSET_IDS = ["hero", "enemy-rat", "enemy-bat", "enemy-skeleton-warrior", "enemy-skeleton-archer", "enemy-slime", "enemy-cultist", "enemy-dark-knight", "enemy-necromancer", "enemy-dungeon-guardian", "enemy-lich", "token-sword", "token-shield", "token-mana", "token-gold", "token-potion", "spell-fireball", "spell-heal", "spell-stone-shield", "spell-stone-skin", "spell-lightning", "spell-vampirism", "spell-berserk", "spell-chain-lightning", "item-bomb", "item-shuffle", "item-chest"];

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const frame = document.getElementById("game-frame");
  const layout = document.getElementById("game-layout");
  const rail = document.getElementById("spell-rail");
  const railSpells = document.getElementById("rail-spells");
  const images = Object.create(null);
  let state = null;
  let utilityScreen = "";
  let achievementProgress = { wins: 0, casts: 0, cleanWins: 0, eliteWins: 0, consumables: 0, lichWins: 0, richRuns: 0 };
  let savedRun = readSave();
  let achievements = readAchievements();
  let muted = readMuted();
  let viewHeight = HEIGHT;
  let dpr = 1;
  let buttons = [];
  let hoverAction = "";
  let railVisible = false;
  let railSignature = "";
  let audioContext = null;
  let lastFrame = 0;

  function readSave() {
    try {
      const value = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!value || value.v !== 2 || !value.run || !value.run.player) return null;
      return value.run;
    } catch (error) { return null; }
  }

  function readAchievements() {
    try {
      const value = JSON.parse(localStorage.getItem(ACH_KEY) || "[]");
      if (Array.isArray(value)) return value.filter(function (id) { return ACHIEVEMENTS.some(function (item) { return item.id === id; }); });
      if (value && typeof value === "object") {
        if (value.progress) achievementProgress = Object.assign(achievementProgress, value.progress);
        return Array.isArray(value.unlocked) ? value.unlocked.filter(function (id) { return ACHIEVEMENTS.some(function (item) { return item.id === id; }); }) : [];
      }
      return [];
    } catch (error) { return []; }
  }

  function readMuted() {
    try { return localStorage.getItem(MUTE_KEY) === "true"; } catch (error) { return false; }
  }

  function persist() {
    if (!state) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 2, run: state }));
      savedRun = JSON.parse(JSON.stringify(state));
    } catch (error) { /* The run remains playable if storage is unavailable. */ }
  }

  function persistAchievements() {
    try { localStorage.setItem(ACH_KEY, JSON.stringify({ unlocked: achievements, progress: achievementProgress })); } catch (error) { /* Optional persistence. */ }
  }

  function playTone(kind) {
    if (muted) return;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      if (!audioContext) audioContext = new AudioCtor();
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const notes = { click: 420, match: 640, hit: 115, heal: 520, gold: 760, win: 880, lose: 150, magic: 590 };
      oscillator.type = kind === "hit" || kind === "lose" ? "sawtooth" : "sine";
      oscillator.frequency.setValueAtTime(notes[kind] || 420, now);
      oscillator.frequency.exponentialRampToValueAtTime((notes[kind] || 420) * 0.72, now + 0.11);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.16);
    } catch (error) { /* Audio is a non-essential enhancement. */ }
  }

  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function delay(ms) { return new Promise(function (resolve) { window.setTimeout(resolve, ms); }); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function createRun(hardcore) {
    return {
      screen: "map", hardcore: hardcore, dead: false, cycle: 0, row: 1, routeElite: false,
      player: { hp: 50, maxHp: 50, armor: 0, mana: 0, startMana: 0, atk: 0, gold: 0, potions: 1, bombs: 0, shuffles: 0, level: 1, xp: 1, rage: 0, rageTurns: 0, weakness: 0 },
      stats: { wins: 0, casts: 0, cleanWins: 0, eliteWins: 0, consumables: 0, lichWins: 0, richRuns: 0 },
      totalDamageTaken: 0, completedRows: [], levelUps: 0, levelupReturn: "advance", afterBattle: false,
      event: null, eventReturn: "map", board: [], enemy: null, phase: "player", selected: null,
      hint: null, log: [], battle: null, floats: [], particles: [], matchFx: null
    };
  }

  function roundedRect(x, y, w, h, radius, fill, stroke, lineWidth) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lineWidth || 1; ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function text(value, x, y, font, color, align) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(String(value), x, y);
  }

  function wrappedText(value, x, y, maxWidth, lineHeight, font, color, maxLines) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = "left";
    const words = String(value).split(/\s+/);
    let line = ""; let row = 0;
    for (let i = 0; i < words.length; i += 1) {
      const test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y + row * lineHeight); row += 1; line = words[i];
        if (row >= maxLines) return;
      } else line = test;
    }
    if (line && row < maxLines) ctx.fillText(line, x, y + row * lineHeight);
  }

  function drawSprite(id, x, y, w, h) {
    if (images[id]) ctx.drawImage(images[id], x, y, w, h);
  }

  function healthBar(x, y, w, current, max, color) {
    roundedRect(x, y, w, 7, 3, "#332d28", "#55493c", 1);
    const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
    if (ratio > 0) roundedRect(x, y, Math.max(4, (w - 2) * ratio), 5, 2, color, null, 0);
  }

  function drawButton(x, y, w, h, label, action, options) {
    const opt = options || {};
    const enabled = opt.disabled !== true;
    const hovered = (state ? state.hover : hoverAction) === action;
    const fill = ctx.createLinearGradient(x, y, x, y + h);
    fill.addColorStop(0, enabled ? (hovered ? "#49351e" : "#332719") : "#201e1b");
    fill.addColorStop(1, enabled ? "#1b1916" : "#171615");
    ctx.save();
    if (hovered && enabled) { ctx.shadowColor = "#d9a65066"; ctx.shadowBlur = 12; }
    roundedRect(x, y, w, h, opt.radius || 7, fill, enabled ? (hovered ? "#d3ae70" : (opt.primary ? "#a17a45" : "#594a36")) : "#302d29", 1);
    if (opt.icon) drawSprite(opt.icon, x + 8, y + (h - 26) / 2, 26, 26);
    const labelX = opt.icon ? x + 40 : x + w / 2;
    text(label, labelX, y + h / 2 + (opt.sub ? -2 : 4), opt.font || "600 12px system-ui, sans-serif", enabled ? (opt.color || "#eee2d0") : "#766f65", opt.icon ? "left" : "center");
    if (opt.sub) text(opt.sub, labelX, y + h / 2 + 13, "9px system-ui, sans-serif", enabled ? "#b6a58d" : "#625c54", opt.icon ? "left" : "center");
    ctx.restore();
    buttons.push({ x: x, y: y, w: w, h: h, action: action, enabled: enabled });
  }

  function drawPanel(x, y, w, h) {
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, "#28221b"); gradient.addColorStop(1, "#171615");
    roundedRect(x, y, w, h, 8, gradient, "#665239", 1);
  }

  function drawAmbient(now) {
    for (let i = 0; i < 19; i += 1) {
      const drift = now * (0.00022 + (i % 4) * 0.00006);
      const x = (i * 137 + Math.sin(drift + i) * 12 + WIDTH) % WIDTH;
      const y = (i * 89 + drift * 55 + viewHeight) % viewHeight;
      ctx.globalAlpha = 0.07 + (Math.sin(drift * 2 + i) + 1) * 0.045;
      ctx.fillStyle = i % 3 === 0 ? "#f4cc85" : "#b7a489";
      ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 1.5 : 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawRunHud() {
    if (!state) return;
    const p = state.player;
    drawPanel(12, 13, 488, 66);
    drawSprite("hero", 18, 19, 52, 52);
    text("УР. " + p.level + "  ·  РЯД " + Math.min(state.row, 10) + "/10" + (state.cycle ? "  ·  NG+" + state.cycle : ""), 77, 32, "700 10px system-ui, sans-serif", "#d8b36f");
    text(p.hp + " / " + p.maxHp + " HP", 77, 49, "10px system-ui, sans-serif", "#d2c5b2");
    healthBar(77, 54, 138, p.hp, p.maxHp, "#78b875");
    text("ATK " + p.atk + "  ·  БРОНЯ " + p.armor + "  ·  МАНА " + p.mana, 77, 70, "8px system-ui, sans-serif", "#b7a58b");
    text("G " + p.gold, 486, 34, "700 11px system-ui, sans-serif", "#f0cd82", "right");
    text("XP " + p.xp + " / " + p.level * 100, 486, 53, "9px system-ui, sans-serif", "#c4ae8e", "right");
    text((p.potions || 0) + " 🧪   " + (p.bombs || 0) + " 💣", 486, 69, "9px system-ui, sans-serif", "#b6a58d", "right");
  }

  function drawMenu() {
    text("DUNGEON", WIDTH / 2, 137, "800 15px system-ui, sans-serif", "#d9b779", "center");
    text("MATCH", WIDTH / 2, 198, "700 48px Georgia, serif", "#f4e5ca", "center");
    roundedRect(142, 218, 228, 1, 1, "#a6814c", null, 0);
    drawSprite("hero", 190, 244, 132, 132);
    text("ПРОЙДИ ПОДЗЕМЕЛЬЕ · ПОБЕДИ ЛИЧА", WIDTH / 2, 405, "700 9px system-ui, sans-serif", "#bca27c", "center");
    drawButton(76, 434, 360, 48, "НОВАЯ ИГРА", "new-game", { primary: true, sub: "Обычный режим · сохраняй прогресс между боями" });
    drawButton(76, 491, 360, 42, "ПРОДОЛЖИТЬ", "continue", { disabled: !savedRun, sub: savedRun ? "Забег сохранён на этом устройстве" : "Сохранение не найдено" });
    drawButton(76, 542, 174, 41, "ХАРДКОР", "hardcore", { sub: "Смерть стирает забег" });
    drawButton(262, 542, 174, 41, "ДОСТИЖЕНИЯ", "achievements");
    drawButton(76, 593, 174, 40, "КАК ИГРАТЬ", "howto");
    drawButton(262, 593, 174, 40, "ДЕМО ПЕРВОГО БОЯ", "demo", { font: "600 10px system-ui, sans-serif" });
    text("Офлайн-игра · прогресс сохраняется локально", WIDTH / 2, 680, "9px system-ui, sans-serif", "#827969", "center");
  }

  function rowEnemyInfo(row, elite) {
    if (row === 5) return { name: "Сокровищница", id: "item-chest", trait: "+90 золота · после неё откроется лавка" };
    if (row === 6 && elite) return { name: "Культист", id: "enemy-cultist", trait: "Проклинает героя каждые 3 хода" };
    const base = ENEMIES[row];
    if (!base) return { name: "Неизвестный зал", id: "enemy-rat", trait: "" };
    return { name: elite && (row === 3 || row === 9) ? "Элитный " + base.name : base.name, id: base.id, trait: base.trait };
  }

  function isBranch(row) { return row === 3 || row === 6 || row === 9; }

  function drawMap() {
    drawRunHud();
    text("КАРТА ПОДЗЕМЕЛЬЯ", WIDTH / 2, 105, "700 13px Georgia, serif", "#ead7b8", "center");
    text("Выбери текущую комнату. Между боями можно заглянуть в лавку.", WIDTH / 2, 121, "9px system-ui, sans-serif", "#9d907e", "center");
    for (let i = 1; i <= 10; i += 1) {
      const y = 132 + (i - 1) * 52;
      const done = state.completedRows.indexOf(i) !== -1;
      const current = state.row === i;
      const locked = i > state.row;
      const info = rowEnemyInfo(i, current && state.routeElite);
      const fill = current ? "#382a19" : (done ? "#211f1b" : "#171615");
      const border = current ? "#c39859" : (done ? "#514737" : "#302d29");
      roundedRect(28, y, 456, 43, 6, fill, border, current ? 1.5 : 1);
      if (i < 10) { ctx.strokeStyle = "#5b4c36"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(48, y + 43); ctx.lineTo(48, y + 52); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(48, y + 21, 11, 0, Math.PI * 2); ctx.fillStyle = done ? "#81704f" : (current ? "#c59b5f" : "#34302a"); ctx.fill();
      text(done ? "✓" : String(i), 48, y + 25, "700 9px system-ui, sans-serif", "#171411", "center");
      text(info.name, 69, y + 18, "700 10px system-ui, sans-serif", locked ? "#6d665c" : "#e3d6c3");
      text(info.trait, 69, y + 33, "8px system-ui, sans-serif", locked ? "#554f47" : "#a59783");
      if (i === 5) text("+90 G", 463, y + 25, "700 9px system-ui, sans-serif", "#e7c479", "right");
      else if (current && isBranch(i)) {
        const route = i === 6 ? (state.routeElite ? "КУЛЬТИСТ" : "СЛАЙМ") : (state.routeElite ? "ЭЛИТА ★" : "ОБЫЧНЫЙ");
        text(route, 463, y + 25, "700 7px system-ui, sans-serif", "#d3b47d", "right");
      }
      else if (done) text("ПРОЙДЕНО", 463, y + 25, "700 7px system-ui, sans-serif", "#97876c", "right");
    }
    const currentInfo = rowEnemyInfo(state.row, state.routeElite);
    drawButton(28, 670, 300, 47, state.row === 5 ? "ОТКРЫТЬ СОКРОВИЩНИЦУ" : "ВСТУПИТЬ В БОЙ", "enter-room", { primary: true, icon: currentInfo.id, sub: "Ряд " + state.row + " · " + currentInfo.name, font: "700 11px system-ui, sans-serif" });
    drawButton(340, 670, 144, 47, "ЛАВКА", "shop", { icon: "item-chest", sub: "Товары за золото" });
    if (isBranch(state.row)) {
      let routeLabel;
      if (state.row === 6) routeLabel = state.routeElite ? "ПУТЬ КУЛЬТИСТА · ИЗМЕНИТЬ" : "ПУТЬ СЛАЙМА · ИЗМЕНИТЬ";
      else routeLabel = state.routeElite ? "ЭЛИТНЫЙ ПУТЬ ★ · ИЗМЕНИТЬ" : "БЕЗОПАСНЫЙ ПУТЬ · ИЗМЕНИТЬ";
      drawButton(28, 728, 456, 38, routeLabel, "toggle-route", { font: "700 9px system-ui, sans-serif" });
    }
    drawButton(28, 788, 220, 38, "ДОСТИЖЕНИЯ", "achievements", { font: "700 9px system-ui, sans-serif" });
    drawButton(264, 788, 220, 38, "СОХРАНИТЬ И В МЕНЮ", "menu", { font: "700 9px system-ui, sans-serif" });
  }

  function buildEnemy() {
    const row = state.row;
    const routeCultist = row === 6 && state.routeElite;
    const base = routeCultist
      ? { id: "enemy-cultist", name: "Культист", hp: 88, atk: [12, 15], xp: 125, gold: 65, trait: "Проклинает героя каждые 3 хода" }
      : ENEMIES[row];
    const elite = state.routeElite && (row === 3 || row === 9);
    const cycleScaleHp = Math.pow(1.35, state.cycle);
    const cycleScaleAtk = Math.pow(1.25, state.cycle);
    const hp = Math.max(1, Math.round(base.hp * cycleScaleHp * (elite ? 1.5 : 1) * (state.hardcore ? 1.15 : 1)));
    const extraAttack = elite ? 2 : 0;
    return {
      id: base.id, name: base.name, hp: hp, maxHp: hp, armor: row === 7 ? Math.round(10 * cycleScaleHp) : 0,
      attackMin: Math.max(1, Math.round((base.atk[0] + extraAttack) * cycleScaleAtk)),
      attackMax: Math.max(1, Math.round((base.atk[1] + extraAttack) * cycleScaleAtk)),
      nextAttack: 0, xpReward: Math.round(base.xp * Math.pow(1.2, state.cycle) * (elite ? 2 : 1)),
      goldReward: Math.round(base.gold * Math.pow(1.2, state.cycle) * (elite ? 2 : 1)),
      elite: elite, special: row === 4 ? "pierce" : (row === 6 && !routeCultist ? "slime" : (routeCultist ? "cultist" : (row === 8 ? "necromancer" : (row === 10 ? "lich" : "")))),
      bleed: 0, burn: 0, weakness: 0, turnCount: 0, minion: null
    };
  }

  function addLog(message) {
    if (!state) return;
    state.log = state.log || [];
    state.log.unshift(message);
    if (state.log.length > 6) state.log.length = 6;
  }

  function startBattle() {
    if (state.row === 5) { enterTreasure(); return; }
    state.enemy = buildEnemy();
    state.enemy.nextAttack = randomInt(state.enemy.attackMin, state.enemy.attackMax);
    state.player.armor = 0;
    state.player.mana = state.player.startMana;
    state.player.rage = 0; state.player.rageTurns = 0; state.player.weakness = 0;
    state.board = DungeonBoard.create();
    state.phase = "player"; state.selected = null; state.hint = null;
    state.log = [state.enemy.name + " преграждает путь. " + (state.enemy.elite ? "Элитный противник!" : "")];
    state.battle = { moves: 0, cascades: 0, damageTaken: 0, extraTurns: 0, rewarded: false, rageFresh: false, startedAt: Date.now() };
    state.floats = []; state.particles = []; state.matchFx = null; state.dropFx = null; state.screen = "battle";
    playTone("click"); persist(); resizeCanvas(); render();
  }

  function enterTreasure() {
    if (state.completedRows.indexOf(5) !== -1) return;
    state.completedRows.push(5);
    state.player.gold += 90;
    addLog("Сокровищница: найдено 90 золота. Лавка теперь открыта.");
    state.screen = "treasure";
    playTone("gold"); persist(); resizeCanvas(); render();
  }

  function randomEvent() {
    const events = [
      { id: "altar", name: "Кровавый алтарь", desc: "Алтарь предлагает обменять 12 здоровья на 50 опыта.", choice: "Отдать 12 HP · получить 50 XP" },
      { id: "merchant", name: "Заблудившийся торговец", desc: "Он продаст одно зелье со скидкой.", choice: "Купить зелье за 20 золота" },
      { id: "trap", name: "Старая ловушка", desc: "Механизм сорвётся, но можно попытаться обойти его и собрать тайник.", choice: "Рискнуть: −10 HP · +35 золота" },
      { id: "cache", name: "Тайник в стене", desc: "За осыпавшимися камнями блестит золото.", choice: "Забрать 35 золота" },
      { id: "well", name: "Подземный колодец", desc: "Чистая вода возвращает силы.", choice: "Полностью восстановить HP" }
    ];
    state.event = events[randomInt(0, events.length - 1)];
  }

  function addXp(amount) {
    state.player.xp += amount;
    while (state.player.xp >= state.player.level * 100) {
      state.player.xp -= state.player.level * 100;
      state.player.level += 1;
      state.levelUps += 1;
    }
  }

  function checkAchievements() {
    ACHIEVEMENTS.forEach(function (achievement) {
      if (achievements.indexOf(achievement.id) === -1 && achievement.test(achievementProgress)) {
        achievements.push(achievement.id);
        addLog("ДОСТИЖЕНИЕ: " + achievement.name + "!");
        state.toast = "Достижение: " + achievement.name;
        state.toastAt = Date.now();
      }
    });
    persistAchievements();
  }

  function claimVictory() {
    if (state.screen === "battleResult" || !state.battle || state.battle.rewarded) return;
    state.enemy.hp = 0;
    state.battle.rewarded = true;
    state.player.gold += state.enemy.goldReward;
    addXp(state.enemy.xpReward);
    state.stats.wins += 1;
    if (state.battle.damageTaken === 0) state.stats.cleanWins += 1;
    if (state.enemy.elite) state.stats.eliteWins += 1;
    if (state.row === 10) state.stats.lichWins += 1;
    const newlyRich = state.player.gold >= 300 && state.stats.richRuns === 0;
    if (newlyRich) state.stats.richRuns = 1;
    achievementProgress.wins += 1;
    if (state.battle.damageTaken === 0) achievementProgress.cleanWins += 1;
    if (state.enemy.elite) achievementProgress.eliteWins += 1;
    if (state.row === 10) achievementProgress.lichWins += 1;
    if (newlyRich) achievementProgress.richRuns += 1;
    if (state.completedRows.indexOf(state.row) === -1) state.completedRows.push(state.row);
    state.afterBattle = true; state.phase = "won"; state.screen = "battleResult";
    addLog("Победа: +" + state.enemy.xpReward + " XP, +" + state.enemy.goldReward + " золота.");
    checkAchievements(); playTone("win"); persist(); resizeCanvas(); render();
  }

  function claimDefeat() {
    if (state.screen === "battleResult") return;
    state.phase = "lost"; state.screen = "battleResult";
    state.dead = Boolean(state.hardcore);
    addLog(state.dead ? "Хардкор: забег окончен." : "Поражение. Возвращайся на карту и попробуй снова.");
    playTone("lose"); persist(); resizeCanvas(); render();
  }

  function unlocks(spell) {
    return state && state.player.level >= spell.unlock && (!spell.ngOnly || state.cycle > 0);
  }

  function canCast(spell) {
    if (!state || state.screen !== "battle" || state.phase !== "player" || !unlocks(spell) || state.player.mana < spell.cost) return false;
    if (spell.action === "heal" && state.player.hp >= state.player.maxHp) return false;
    if (spell.action === "berserk" && state.player.rageTurns > 0) return false;
    return true;
  }

  function buildRail() {
    railSpells.textContent = "";
    SPELLS.forEach(function (spell) {
      const button = document.createElement("button");
      const image = document.createElement("img");
      const label = document.createElement("span");
      const cost = document.createElement("small");
      button.type = "button"; button.className = "rail-spell"; button.dataset.spellAction = spell.action;
      button.setAttribute("aria-label", spell.name + ": " + spell.effect + ", цена " + spell.cost + " маны");
      image.src = DungeonSprites.get(spell.id).src; image.alt = "";
      label.textContent = spell.name; cost.textContent = spell.cost;
      button.appendChild(image); button.appendChild(label); button.appendChild(cost); railSpells.appendChild(button);
    });
  }

  function syncRail() {
    if (!rail || !state) return;
    const p = state.player;
    const signature = [state.screen, state.phase, p.level, p.mana, p.hp, p.maxHp, p.potions, p.bombs, p.shuffles, state.cycle].join("/");
    if (signature === railSignature) return;
    railSignature = signature;
    railSpells.querySelectorAll("[data-spell-action]").forEach(function (button) {
      const spell = SPELLS.find(function (item) { return item.action === button.dataset.spellAction; });
      const usable = canCast(spell);
      button.disabled = !usable;
      button.title = !unlocks(spell) ? (spell.ngOnly ? "Откроется в Новой игре+ на 6 уровне" : "Откроется на " + spell.unlock + " уровне") : (p.mana < spell.cost ? "Не хватает " + (spell.cost - p.mana) + " маны" : spell.effect);
    });
    rail.querySelectorAll("[data-item-action]").forEach(function (button) {
      const action = button.dataset.itemAction;
      let usable = state.screen === "battle" && state.phase === "player";
      if (action === "potion") usable = usable && p.potions > 0 && p.hp < p.maxHp;
      if (action === "bomb") usable = usable && p.bombs > 0;
      if (action === "shuffle") usable = usable && p.shuffles > 0;
      button.disabled = !usable;
    });
    document.getElementById("rail-potions").textContent = String(p.potions);
    document.getElementById("rail-bombs").textContent = String(p.bombs);
    document.getElementById("rail-shuffles").textContent = String(p.shuffles);
    document.getElementById("rail-mana").textContent = "МАНА · " + p.mana;
  }

  function resizeCanvas() {
    const bounds = layout.getBoundingClientRect();
    const cssGap = parseFloat(window.getComputedStyle(layout).columnGap) || 0;
    const canUseRail = state && state.screen === "battle" && bounds.height < HEIGHT && bounds.width >= WIDTH + RAIL_WIDTH + cssGap;
    railVisible = Boolean(canUseRail);
    rail.classList.toggle("is-visible", railVisible);
    viewHeight = railVisible ? RAIL_HEIGHT : HEIGHT;
    const maxWidth = bounds.width - (railVisible ? RAIL_WIDTH + cssGap : 0);
    const scale = Math.max(0.1, Math.min(1, maxWidth / WIDTH, bounds.height / viewHeight));
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = WIDTH * dpr; canvas.height = viewHeight * dpr;
    canvas.style.width = "100%"; canvas.style.height = "100%";
    frame.style.width = (WIDTH * scale) + "px"; frame.style.height = (viewHeight * scale) + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    railSignature = ""; syncRail(); render();
  }

  function drawMenuScreen() { drawMenu(); }

  function drawMapScreen() { drawMap(); }

  function drawBoard() {
    roundedRect(3, BOARD_TOP - 3, 506, 518, 10, "#171615", "#463c30", 1);
    const hints = state.hint && state.hint.expires > Date.now() ? state.hint.cells : [];
    const matched = state.matchFx && Date.now() - state.matchFx.start < state.matchFx.duration ? state.matchFx.cells : [];
    const moving = state.dropFx && Date.now() - state.dropFx.start < state.dropFx.duration ? state.dropFx : null;
    const dropTargets = new Set(moving ? moving.drops.map(function (drop) { return drop.x + "," + drop.toY; }) : []);
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const type = state.board[y][x];
        const px = x * CELL + 3; const py = BOARD_TOP + y * CELL + 1;
        roundedRect(px, py, 58, 58, 8, TYPE_COLORS[type] || "#28241f", "#514638", 1);
        const fading = matched.some(function (cell) { return cell.x === x && cell.y === y; });
        if (type && !dropTargets.has(x + "," + y)) {
          ctx.save(); if (fading) ctx.globalAlpha = 0.55 + Math.sin(Date.now() / 45) * 0.35;
          drawSprite(TYPE_SPRITES[type], px + 4, py + 4, 50, 50); ctx.restore();
        }
        if (state.selected && state.selected.x === x && state.selected.y === y) {
          ctx.save(); ctx.shadowColor = "#ffd47a"; ctx.shadowBlur = 10 + Math.sin(Date.now() / 130) * 3;
          roundedRect(px + 1, py + 1, 56, 56, 8, null, "#ffe5a3", 2.5); ctx.restore();
        } else if (hints.some(function (cell) { return cell.x === x && cell.y === y; })) {
          ctx.save(); ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 150) * 0.2; ctx.shadowColor = "#67ded4"; ctx.shadowBlur = 12;
          roundedRect(px + 1, py + 1, 56, 56, 8, null, "#93fff0", 2); ctx.restore();
        }
      }
    }
    if (state.matchFx) {
      const progress = Math.min(1, (Date.now() - state.matchFx.start) / state.matchFx.duration);
      state.matchFx.pieces.forEach(function (piece) {
        const size = 50 * (1 + progress * .3);
        ctx.save(); ctx.globalAlpha = 1 - progress;
        drawSprite(TYPE_SPRITES[piece.type], piece.x * CELL + 32 - size / 2, BOARD_TOP + piece.y * CELL + 32 - size / 2, size, size);
        ctx.restore();
      });
    }
    if (moving) {
      const progress = Math.min(1, (Date.now() - moving.start) / moving.duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      ctx.save(); ctx.beginPath(); ctx.rect(3, BOARD_TOP, 506, 8 * CELL); ctx.clip();
      moving.drops.forEach(function (drop) {
        const y = BOARD_TOP + (drop.fromY + (drop.toY - drop.fromY) * eased) * CELL;
        drawSprite(TYPE_SPRITES[drop.type], drop.x * CELL + 7, y + 5, 50, 50);
      });
      ctx.restore();
    } else if (state.dropFx) state.dropFx = null;
    drawEffects();
  }

  function drawEffects() {
    const now = Date.now();
    state.particles = state.particles.filter(function (p) { return now - p.start < p.duration; });
    state.floats = state.floats.filter(function (f) { return now - f.start < f.duration; });
    state.particles.forEach(function (p) {
      const progress = (now - p.start) / p.duration;
      ctx.globalAlpha = 1 - progress; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x + p.vx * progress, p.y + p.vy * progress + 28 * progress * progress, p.size * (1 - progress * .4), 0, Math.PI * 2); ctx.fill();
    });
    state.floats.forEach(function (f) {
      const progress = (now - f.start) / f.duration;
      ctx.globalAlpha = 1 - progress; ctx.font = "800 13px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - progress * 32);
    });
    ctx.globalAlpha = 1;
  }

  function drawBattleHud() {
    const enemy = state.enemy; const p = state.player;
    text("РЯД " + state.row + "  ·  " + (enemy.elite ? "ЭЛИТНЫЙ ПРОТИВНИК ★" : (state.cycle ? "ЦИКЛ " + (state.cycle + 1) : "ПОДЗЕМЕЛЬЕ")), WIDTH / 2, 11, "700 8px system-ui, sans-serif", "#c49c61", "center");
    drawPanel(8, 18, 244, 100); drawPanel(260, 18, 244, 100);
    drawSprite("hero", 14, 27, 48, 48);
    text("ГЕРОЙ · УР. " + p.level, 69, 36, "700 10px system-ui, sans-serif", "#eadcc8");
    text(p.hp + " / " + p.maxHp + " HP", 69, 52, "9px system-ui, sans-serif", "#bdb2a4"); healthBar(69, 57, 169, p.hp, p.maxHp, "#78b875");
    text("Броня " + p.armor + " · Мана " + p.mana + " · ATK " + p.atk, 69, 75, "8px system-ui, sans-serif", "#b7a58b");
    text("Ярость " + p.rageTurns + (p.weakness ? " · Проклятие " + p.weakness : "") + " · " + p.gold + " G", 69, 94, "8px system-ui, sans-serif", "#c7ae80");
    const spriteX = enemy.minion && enemy.minion.hp > 0 ? 444 : 445;
    drawSprite(enemy.id, spriteX, 25, 49, 49);
    text(enemy.name + (enemy.elite ? " ★" : ""), 273, 36, "700 10px system-ui, sans-serif", "#eadcc8");
    text(enemy.hp + " / " + enemy.maxHp + " HP" + (enemy.armor ? " · Броня " + enemy.armor : ""), 273, 52, "9px system-ui, sans-serif", "#bdb2a4");
    healthBar(273, 57, 162, enemy.hp, enemy.maxHp, "#c65d57");
    let intent = "Следующий удар: " + enemy.nextAttack;
    if (enemy.special === "pierce") intent += " · пробой 2";
    if (enemy.special === "lich" && (enemy.turnCount + 1) % 4 === 0) intent += " · ☠ усилен";
    if (enemy.bleed) intent += " · Кровь " + enemy.bleed;
    if (enemy.burn) intent += " · Ожог " + enemy.burn;
    if (enemy.weakness) intent += " · Слабость " + enemy.weakness;
    text(intent, 273, 75, "7px system-ui, sans-serif", "#d9ad81");
    if (enemy.minion && enemy.minion.hp > 0) text("Прислужник · " + enemy.minion.hp + " HP", 273, 95, "8px system-ui, sans-serif", "#a9a0bc");
    else text(enemy.special === "slime" ? "Регенерация: " + Math.max(0, 3 - enemy.turnCount % 3) + " ход." : "", 273, 95, "8px system-ui, sans-serif", "#a9a0bc");
  }

  function drawBattleControls() {
    const active = state.phase === "player";
    const status = state.phase === "player" ? "Твой ход · собери совпадение из трёх фишек" : (state.phase === "resolving" ? "Комбинация разрешается…" : "Враг атакует…");
    text(status, WIDTH / 2, 663, "600 9px system-ui, sans-serif", state.phase === "player" ? "#d6c6ad" : "#d7a65f", "center");
    if (state.log && state.log.length) text(state.log[0], WIDTH / 2, 679, "8px system-ui, sans-serif", "#a99b86", "center");
    if (railVisible) return;
    SPELLS.forEach(function (spell, index) {
      const col = index % 2; const row = Math.floor(index / 2);
      const x = 10 + col * 250; const y = 687 + row * 38;
      const available = canCast(spell);
      const label = unlocks(spell) ? spell.name : (spell.ngOnly ? "NG+ · " + spell.name : "УР. " + spell.unlock + " · " + spell.name);
      drawButton(x, y, 242, 34, label, "spell:" + spell.action, {
        disabled: !available, icon: spell.id, font: "600 9px system-ui, sans-serif",
        sub: unlocks(spell) ? spell.cost + " маны · " + spell.short : "Заклинание пока закрыто"
      });
    });
    const y = 846;
    drawButton(10, y, 158, 36, "ЗЕЛЬЕ · " + state.player.potions, "item:potion", { disabled: !active || !state.player.potions || state.player.hp >= state.player.maxHp, icon: "token-potion", font: "600 9px system-ui, sans-serif" });
    drawButton(177, y, 158, 36, "БОМБА · " + state.player.bombs, "item:bomb", { disabled: !active || !state.player.bombs, icon: "item-bomb", font: "600 9px system-ui, sans-serif" });
    drawButton(344, y, 158, 36, "ПЕРЕМЕШКА · " + state.player.shuffles, "item:shuffle", { disabled: !active || !state.player.shuffles, icon: "item-shuffle", font: "600 9px system-ui, sans-serif" });
    drawButton(10, 888, 115, 30, "ПОДСКАЗКА", "hint", { disabled: !active, font: "700 8px system-ui, sans-serif" });
    text(state.log && state.log[1] ? state.log[1] : "M — звук", 136, 908, "8px system-ui, sans-serif", "#887d6c");
    text(state.log && state.log[2] ? state.log[2] : "Матч 4+ сохраняет ход за тобой", 136, 920, "8px system-ui, sans-serif", "#756c60");
  }

  function drawBattleScreen() {
    drawBattleHud(); drawBoard(); drawBattleControls();
  }

  function drawBattleResult() {
    drawRunHud();
    const won = state.phase === "won";
    ctx.fillStyle = "rgba(8,7,6,.79)"; ctx.fillRect(0, 0, WIDTH, viewHeight);
    const top = Math.max(90, (viewHeight - 370) / 2);
    roundedRect(36, top, 440, 370, 13, "#1d1a17", won ? "#a17a45" : "#784440", 2);
    text(won ? "ПОБЕДА" : (state.dead ? "ХАРДКОР ОКОНЧЕН" : "ПОРАЖЕНИЕ"), WIDTH / 2, top + 52, "700 27px Georgia, serif", won ? "#f0c47b" : "#d58c82", "center");
    text(won ? state.enemy.name + " повержен" : "Герой пал в " + state.enemy.name, WIDTH / 2, top + 84, "12px system-ui, sans-serif", "#ddd2c1", "center");
    if (won) {
      text("Награда", WIDTH / 2, top + 124, "700 9px system-ui, sans-serif", "#c19a61", "center");
      text("+" + state.enemy.xpReward + " XP     ·     +" + state.enemy.goldReward + " золота", WIDTH / 2, top + 148, "600 13px system-ui, sans-serif", "#e2c990", "center");
      text("Ходов " + state.battle.moves + " · каскадов " + state.battle.cascades + " · получено урона " + state.battle.damageTaken, WIDTH / 2, top + 181, "9px system-ui, sans-serif", "#a99d8b", "center");
      text("Уровень " + state.player.level + (state.levelUps ? " · доступно улучшений: " + state.levelUps : ""), WIDTH / 2, top + 208, "10px system-ui, sans-serif", "#d5b887", "center");
      drawButton(90, top + 252, 332, 54, state.row === 10 ? "ПРОДОЛЖИТЬ" : "ДАЛЬШЕ ПО ПОДЗЕМЕЛЬЮ", "advance", { primary: true, font: "700 12px system-ui, sans-serif" });
    } else {
      wrappedText(state.dead ? "В хардкоре второй попытки нет: забег будет удалён при выходе." : "Золото с матчей и потраченные предметы сохраняются. На карте здоровье восстановится, а эту комнату можно пройти снова.", 74, top + 129, 365, 18, "11px system-ui, sans-serif", "#c2b5a5", 4);
      drawButton(90, top + 236, 332, 54, state.dead ? "ВЕРНУТЬСЯ В МЕНЮ" : "НАЗАД НА КАРТУ", "leave-defeat", { primary: true, font: "700 12px system-ui, sans-serif" });
    }
  }

  function drawTreasure() {
    drawRunHud(); drawSprite("item-chest", 180, 180, 152, 152);
    text("СОКРОВИЩНИЦА", WIDTH / 2, 380, "700 24px Georgia, serif", "#f0d49f", "center");
    text("В сундуке найдено 90 золотых монет.", WIDTH / 2, 421, "12px system-ui, sans-serif", "#d2c4ae", "center");
    text("Дальше путь ведёт в лавку. Потрать золото перед следующим рядом.", WIDTH / 2, 446, "10px system-ui, sans-serif", "#9f9382", "center");
    drawButton(72, 489, 368, 56, "ПЕРЕЙТИ В ЛАВКУ", "treasure-shop", { primary: true, sub: "Следом откроется шестой ряд" });
  }

  function drawShop() {
    drawRunHud();
    text("ЛАВКА ПУТНИКА", WIDTH / 2, 111, "700 17px Georgia, serif", "#ecd9b9", "center");
    text("Золото: " + state.player.gold + " G · предметы переносятся между боями", WIDTH / 2, 132, "9px system-ui, sans-serif", "#a99b86", "center");
    SHOP.forEach(function (item, index) {
      const y = 158 + index * 104;
      roundedRect(28, y, 456, 88, 7, "#1b1916", "#504431", 1);
      const icons = { potion: "token-potion", bomb: "item-bomb", shuffle: "item-shuffle", heal: "spell-heal", maxHp: "hero" };
      drawSprite(icons[item.id], 40, y + 16, 52, 52);
      text(item.name, 102, y + 31, "700 12px system-ui, sans-serif", "#e7dbc8");
      text(item.desc, 102, y + 51, "9px system-ui, sans-serif", "#a89b88");
      const full = item.id === "potion" ? state.player.potions >= 3 : (item.id === "bomb" ? state.player.bombs >= 3 : (item.id === "shuffle" ? state.player.shuffles >= 3 : false));
      const alreadyFull = full || (item.id === "heal" && state.player.hp >= state.player.maxHp);
      drawButton(365, y + 20, 104, 48, full ? "МАКСИМУМ" : (alreadyFull ? "НЕ НУЖНО" : item.cost + " G"), "buy:" + item.id, { disabled: alreadyFull || state.player.gold < item.cost, primary: true, font: "700 10px system-ui, sans-serif", sub: full ? "инвентарь полон" : (alreadyFull ? "здоровье полное" : "купить") });
    });
    drawButton(80, 702, 352, 50, "ВЕРНУТЬСЯ НА КАРТУ", "leave-shop", { primary: true });
    text("Лавка открыта между любыми боями.", WIDTH / 2, 779, "9px system-ui, sans-serif", "#898071", "center");
  }

  function drawLevelup() {
    drawRunHud();
    text("НОВЫЙ УРОВЕНЬ", WIDTH / 2, 190, "700 12px system-ui, sans-serif", "#d9b779", "center");
    text("УРОВЕНЬ " + state.player.level, WIDTH / 2, 242, "700 32px Georgia, serif", "#f1dfc2", "center");
    text("Выбери одно постоянное улучшение", WIDTH / 2, 277, "11px system-ui, sans-serif", "#a99c89", "center");
    drawButton(52, 326, 408, 80, "+10 МАКС. ЗДОРОВЬЯ", "upgrade:hp", { primary: true, sub: "Сразу восстановить 10 HP", icon: "spell-heal" });
    drawButton(52, 421, 408, 80, "+1 СИЛА МЕЧЕЙ", "upgrade:atk", { sub: "Каждый матч мечей наносит больше урона", icon: "token-sword" });
    drawButton(52, 516, 408, 80, "+2 СТАРТОВОЙ МАНЫ", "upgrade:mana", { sub: "Столько маны будет в начале каждого боя", icon: "token-mana" });
    if (state.levelUps > 1) text("Осталось улучшений: " + state.levelUps, WIDTH / 2, 633, "10px system-ui, sans-serif", "#d4b77c", "center");
  }

  function drawEvent() {
    drawRunHud();
    text("СЛУЧАЙНАЯ ВСТРЕЧА", WIDTH / 2, 189, "700 10px system-ui, sans-serif", "#c49b61", "center");
    text(state.event.name, WIDTH / 2, 246, "700 25px Georgia, serif", "#f0dfc4", "center");
    wrappedText(state.event.desc, 83, 300, 346, 21, "12px system-ui, sans-serif", "#c3b7a6", 4);
    drawButton(74, 420, 364, 60, state.event.choice, "take-event", { primary: true, font: "600 11px system-ui, sans-serif" });
    text("События могут помочь — или потребовать плату.", WIDTH / 2, 514, "9px system-ui, sans-serif", "#8e8373", "center");
  }

  function drawHowTo() {
    text("КАК ИГРАТЬ", WIDTH / 2, 104, "700 21px Georgia, serif", "#eeddbf", "center");
    const paragraphs = [
      "ХОД: кликни по фишке, затем по соседней. Матч из трёх и более очищает поле; обмен без совпадения отменяется и не тратит ход.",
      "МЕЧИ наносят урон, щиты дают броню, мана заряжает заклинания, зелья лечат, золото остаётся у героя. Матчи-4+ дают дополнительный ход.",
      "ПОДЗЕМЕЛЬЕ: пройди 10 рядов, выбирай развилки, трать золото в лавке и усиливай героя после получения опыта. HP переносится между боями.",
      "ВРАГ ПОКАЖЕТ СЛЕДУЮЩУЮ АТАКУ. Броня поглощает урон и сгорает после удара. Заклинания и бомбы наносят прямой урон.",
      "СОХРАНЕНИЕ: прогресс хранится в localStorage этого браузера. Обычное поражение возвращает на карту; в хардкоре забег заканчивается навсегда."
    ];
    paragraphs.forEach(function (paragraph, index) {
      const y = 163 + index * 107;
      roundedRect(30, y, 452, 91, 7, "#1d1a17", "#514533", 1);
      wrappedText(paragraph, 48, y + 26, 417, 17, "10px system-ui, sans-serif", "#c5b9a8", 4);
    });
    drawButton(96, 720, 320, 48, "НАЗАД В МЕНЮ", "menu");
  }

  function drawAchievements() {
    text("ДОСТИЖЕНИЯ", WIDTH / 2, 107, "700 20px Georgia, serif", "#eeddbf", "center");
    text("Открытия сохраняются между забегами.", WIDTH / 2, 130, "9px system-ui, sans-serif", "#9e927f", "center");
    ACHIEVEMENTS.forEach(function (item, index) {
      const y = 160 + index * 70;
      const earned = achievements.indexOf(item.id) !== -1;
      roundedRect(36, y, 440, 56, 7, earned ? "#292318" : "#191816", earned ? "#927442" : "#38342d", 1);
      text(earned ? "🏆" : "◇", 58, y + 34, "16px system-ui, sans-serif", earned ? "#e3bd73" : "#625c51", "center");
      text(item.name, 84, y + 24, "700 10px system-ui, sans-serif", earned ? "#e9d3a8" : "#aaa091");
      text(item.desc, 84, y + 41, "8px system-ui, sans-serif", "#8f8576");
      text(earned ? "ОТКРЫТО" : "ЗАКРЫТО", 458, y + 32, "700 7px system-ui, sans-serif", earned ? "#d9b779" : "#665f54", "right");
    });
    drawButton(96, 740, 320, 46, "НАЗАД", state ? "menu" : "menu");
  }

  function drawEnding() {
    drawRunHud(); drawSprite("enemy-lich", 189, 156, 134, 134);
    text("ЛИЧ ПОВЕРЖЕН", WIDTH / 2, 344, "700 27px Georgia, serif", "#f0c47b", "center");
    text("Подземелье очищено. Но древняя магия всё ещё сильна…", WIDTH / 2, 382, "10px system-ui, sans-serif", "#b6a58f", "center");
    text("Твой герой готов к следующему циклу с более сильными врагами.", WIDTH / 2, 406, "9px system-ui, sans-serif", "#8e8373", "center");
    drawButton(72, 452, 368, 58, "НАЧАТЬ НОВУЮ ИГРУ+", "new-cycle", { primary: true, sub: "Сохрани уровень и золото · враги станут сильнее" });
    drawButton(72, 522, 368, 44, "ВЕРНУТЬСЯ В МЕНЮ", "menu");
  }

  function render() {
    if (!ctx) return;
    buttons = [];
    syncRail();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, WIDTH, viewHeight);
    const background = ctx.createLinearGradient(0, 0, 0, viewHeight);
    background.addColorStop(0, "#211a13"); background.addColorStop(.45, "#151412"); background.addColorStop(1, "#100f0e");
    ctx.fillStyle = background; ctx.fillRect(0, 0, WIDTH, viewHeight);
    drawAmbient(Date.now());
    const page = state ? state.screen : (utilityScreen || "menu");
    if (page === "menu") drawMenuScreen();
    else if (page === "map") drawMapScreen();
    else if (page === "battle") drawBattleScreen();
    else if (page === "battleResult") drawBattleResult();
    else if (page === "treasure") drawTreasure();
    else if (page === "shop") drawShop();
    else if (page === "levelup") drawLevelup();
    else if (page === "event") drawEvent();
    else if (page === "howto") drawHowTo();
    else if (page === "achievements") drawAchievements();
    else if (page === "ending") drawEnding();
    if (state && state.toast) {
      const age = Date.now() - (state.toastAt || Date.now());
      if (age > 2400) state.toast = "";
      else if (state.screen !== "battle") {
        const y = viewHeight - 47;
        roundedRect(105, y, 302, 34, 7, "#382d1c", "#a6814c", 1);
        text(state.toast, WIDTH / 2, y + 22, "700 9px system-ui, sans-serif", "#f0d69d", "center");
      }
    }
  }

  function animationFrame(now) {
    if (now - lastFrame > 32) { render(); lastFrame = now; }
    window.requestAnimationFrame(animationFrame);
  }

  function grantXp(amount) { addXp(amount); }

  function continueAfterWin() {
    if (state.levelUps > 0) {
      state.levelupReturn = "advance"; state.screen = "levelup"; persist(); resizeCanvas(); render(); return;
    }
    if (state.row >= 10) { state.screen = "ending"; persist(); resizeCanvas(); render(); return; }
    state.row += 1; state.routeElite = false; state.afterBattle = false;
    if (Math.random() < .35) { randomEvent(); state.eventReturn = "map"; state.screen = "event"; }
    else state.screen = "map";
    persist(); resizeCanvas(); render();
  }

  function pickUpgrade(kind) {
    const p = state.player;
    if (kind === "hp") { p.maxHp += 10; p.hp = Math.min(p.maxHp, p.hp + 10); }
    else if (kind === "atk") p.atk += 1;
    else if (kind === "mana") p.startMana += 2;
    state.levelUps = Math.max(0, state.levelUps - 1);
    playTone("heal");
    if (state.levelUps > 0) state.screen = "levelup";
    else if (state.levelupReturn === "advance") { state.screen = "battleResult"; continueAfterWin(); return; }
    else state.screen = "map";
    persist(); resizeCanvas(); render();
  }

  function applyEvent() {
    const event = state.event;
    const p = state.player;
    if (event.id === "altar") { p.hp = Math.max(1, p.hp - 12); grantXp(50); }
    else if (event.id === "merchant") { if (p.gold >= 20 && p.potions < 3) { p.gold -= 20; p.potions += 1; } else addLog("Торговец пожал плечами: не хватает золота или сумка полна."); }
    else if (event.id === "trap") { p.hp = Math.max(1, p.hp - 10); p.gold += 35; }
    else if (event.id === "cache") p.gold += 35;
    else if (event.id === "well") p.hp = p.maxHp;
    state.event = null;
    if (state.levelUps > 0) { state.levelupReturn = "map"; state.screen = "levelup"; }
    else state.screen = "map";
    playTone(event.id === "well" ? "heal" : "gold"); persist(); resizeCanvas(); render();
  }

  function buy(itemId) {
    const item = SHOP.find(function (entry) { return entry.id === itemId; });
    if (!item || state.player.gold < item.cost) return;
    const p = state.player;
    if (itemId === "potion" && p.potions >= 3) return;
    if (itemId === "bomb" && p.bombs >= 3) return;
    if (itemId === "shuffle" && p.shuffles >= 3) return;
    p.gold -= item.cost;
    if (itemId === "potion") p.potions += 1;
    else if (itemId === "bomb") p.bombs += 1;
    else if (itemId === "shuffle") p.shuffles += 1;
    else if (itemId === "heal") p.hp = p.maxHp;
    else if (itemId === "maxHp") { p.maxHp += 10; p.hp += 10; }
    state.toast = "Куплено: " + item.name; state.toastAt = Date.now();
    playTone("gold"); persist(); render();
  }

  function newGame(hardcore) {
    if (savedRun && !window.confirm("Начать новый забег? Текущее сохранение будет заменено.")) return;
    state = createRun(hardcore);
    utilityScreen = "";
    persist(); playTone("click"); resizeCanvas(); render();
  }

  function continueRun() {
    if (!savedRun) return;
    state = clone(savedRun);
    utilityScreen = "";
    if (!state.stats) state.stats = createRun(false).stats;
    if (state.screen === "menu") state.screen = state.menuReturn || "map";
    if (state.screen === "battle" && state.phase !== "player") state.phase = "player";
    state.selected = null; state.hint = null;
    resizeCanvas(); render();
  }

  function goMenu(removeSave) {
    if (removeSave) {
      try { localStorage.removeItem(SAVE_KEY); } catch (error) { /* Ignore storage restrictions. */ }
      savedRun = null;
    }
    state = null; utilityScreen = ""; resizeCanvas(); render();
  }

  function beginNgPlus() {
    const player = state.player;
    const stats = state.stats;
    const next = createRun(state.hardcore);
    next.player = player; next.player.hp = next.player.maxHp; next.player.armor = 0;
    next.stats = stats; next.cycle = state.cycle + 1; next.row = 1; next.completedRows = [];
    state = next; persist(); resizeCanvas(); render();
  }

  function beginDefeatReturn() {
    if (state.dead) { goMenu(true); return; }
    state.player.hp = state.player.maxHp; state.player.armor = 0; state.phase = "player";
    state.enemy = null; state.board = []; state.battle = null; state.screen = "map";
    persist(); resizeCanvas(); render();
  }

  function drawHint() {
    if (!state || state.screen !== "battle" || state.phase !== "player") return;
    const move = DungeonBoard.findPossibleMove(state.board);
    if (!move) { state.board = DungeonBoard.create(); addLog("Поле перемешано: ходов не осталось."); }
    else { state.hint = { cells: move, expires: Date.now() + 1600 }; addLog("Подсказка: отмечена допустимая пара."); }
    playTone("click"); render();
  }

  function spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2; const speed = 18 + Math.random() * 55;
      state.particles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 12, size: 1.4 + Math.random() * 2.8, color: color, start: Date.now(), duration: 420 + Math.random() * 220 });
    }
  }

  function addFloat(label, x, y, color) { state.floats.push({ text: label, x: x, y: y, color: color, start: Date.now(), duration: 900 }); }

  function damageEnemyWithSwords(amount) {
    let damage = amount;
    if (damage > 0 && state.enemy.minion && state.enemy.minion.hp > 0) {
      const dealt = Math.min(damage, state.enemy.minion.hp);
      state.enemy.minion.hp -= dealt; damage -= dealt;
      addFloat("−" + dealt, 404, 89, "#d9c6ec");
      if (state.enemy.minion.hp <= 0) addLog("Скелет-прислужник рассыпался.");
    }
    const blocked = Math.min(state.enemy.armor, damage);
    state.enemy.armor -= blocked; damage -= blocked;
    state.enemy.hp = Math.max(0, state.enemy.hp - damage);
    if (amount > 0) { addFloat("−" + amount, 383, 49, "#ff978c"); spawnBurst(464, 65, "#ff916c", 12); playTone("hit"); }
  }

  async function resolveMatches() {
    let extraTurn = false;
    let cascadeNumber = 0;
    while (cascadeNumber < 14) {
      const groups = DungeonBoard.findMatches(state.board);
      if (!groups.length) break;
      cascadeNumber += 1; state.battle.cascades += 1;
      let swordDamage = 0; let armorGain = 0; let manaGain = 0; let healing = 0; let goldGain = 0;
      let bleed = false; let weakness = false; let critical = false;
      const removed = new Set();
      groups.forEach(function (group) {
        const multiplier = group.length >= 5 ? 3 : (group.length === 4 ? 2 : 1);
        const center = group.cells.reduce(function (sum, cell) { sum.x += cell.x; sum.y += cell.y; return sum; }, { x: 0, y: 0 });
        const cx = center.x / group.length * CELL + CELL / 2; const cy = BOARD_TOP + center.y / group.length * CELL + CELL / 2;
        if (group.length >= 4) extraTurn = true;
        group.cells.forEach(function (cell) { removed.add(cell.x + "," + cell.y); });
        if (group.type === "sword") {
          let damage = (3 + state.player.atk + (state.player.rageTurns > 0 ? state.player.rage : 0)) * multiplier;
          if (state.player.weakness > 0) damage = Math.max(1, Math.floor(damage * .7));
          if (group.length >= 5 && Math.random() < .25) { damage *= 2; critical = true; addFloat("КРИТ!", cx, cy - 8, "#ffe18d"); }
          swordDamage += damage; addFloat("−" + damage, cx, cy, "#ff978c");
          if (group.length >= 4) { state.enemy.bleed = Math.max(state.enemy.bleed, 3); bleed = true; }
        } else if (group.type === "shield") {
          armorGain += 3 * multiplier; addFloat("+" + (3 * multiplier) + " БРОНЯ", cx, cy, "#a7e6ef");
          if (group.length >= 4) { state.enemy.weakness = Math.max(state.enemy.weakness, 2); weakness = true; }
        } else if (group.type === "mana") { manaGain += 3 * multiplier; addFloat("+" + (3 * multiplier) + " МАНА", cx, cy, "#b6a7ff"); }
        else if (group.type === "potion") { healing += 3 * multiplier; addFloat("+" + (3 * multiplier) + " HP", cx, cy, "#9fe0a4"); }
        else if (group.type === "gold") { goldGain += 3 * multiplier; addFloat("+" + (3 * multiplier) + " ЗОЛОТА", cx, cy, "#f4cf83"); }
      });
      if (state.player.weakness > 0) state.player.weakness = Math.max(0, state.player.weakness - 1);
      damageEnemyWithSwords(swordDamage);
      state.player.armor += armorGain; state.player.mana += manaGain;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + healing); state.player.gold += goldGain;
      const matchedPieces = [];
      removed.forEach(function (key) {
        const parts = key.split(","); const x = Number(parts[0]); const y = Number(parts[1]);
        matchedPieces.push({ x: x, y: y, type: state.board[y][x] });
        spawnBurst(x * CELL + 32, BOARD_TOP + y * CELL + 32, TYPE_COLORS[state.board[y][x]], 4);
        state.board[y][x] = null;
      });
      state.matchFx = { cells: matchedPieces, pieces: matchedPieces, start: Date.now(), duration: 210 };
      let summary = "Каскад " + cascadeNumber + ": " + removed.size + " фишек";
      if (swordDamage) summary += " · мечи " + swordDamage;
      if (armorGain) summary += " · броня +" + armorGain;
      if (manaGain) summary += " · мана +" + manaGain;
      if (healing) summary += " · HP +" + healing;
      if (goldGain) summary += " · золото +" + goldGain;
      if (critical) summary += " · крит!";
      if (bleed) summary += " · кровотечение";
      if (weakness) summary += " · слабость";
      addLog(summary); playTone("match"); render();
      await delay(210);
      state.matchFx = null;
      state.dropFx = { drops: DungeonBoard.collapse(state.board), start: Date.now(), duration: 230 };
      render(); await delay(235); state.dropFx = null;
      if (state.enemy.hp <= 0) break;
    }
    if (cascadeNumber >= 14 && DungeonBoard.findMatches(state.board).length) state.board = DungeonBoard.create();
    if (!DungeonBoard.hasPossibleMove(state.board)) { state.board = DungeonBoard.create(); addLog("Ходов нет: поле перемешано бесплатно."); }
    return extraTurn;
  }

  async function tickEnemyStatuses() {
    const statuses = [{ key: "burn", amount: 3, name: "Ожог" }, { key: "bleed", amount: 2, name: "Кровотечение" }];
    for (let i = 0; i < statuses.length; i += 1) {
      const status = statuses[i];
      if (state.enemy[status.key] <= 0) continue;
      state.enemy[status.key] -= 1; state.enemy.hp = Math.max(0, state.enemy.hp - status.amount);
      addFloat("−" + status.amount, 388, 50, status.key === "burn" ? "#ffac68" : "#f08d82");
      addLog(status.name + ": враг получает " + status.amount + " урона."); render(); await delay(120);
      if (state.enemy.hp <= 0) return false;
    }
    return true;
  }

  async function enemyTurn() {
    if (state.enemy.hp <= 0) { claimVictory(); return; }
    state.phase = "enemy"; state.selected = null; render(); await delay(360);
    if (!await tickEnemyStatuses()) { claimVictory(); return; }
    const enemy = state.enemy; const p = state.player;
    enemy.turnCount += 1;
    if (enemy.special === "necromancer" && enemy.turnCount % 3 === 0 && (!enemy.minion || enemy.minion.hp <= 0)) {
      enemy.minion = { hp: 25 }; addLog("Некромант призвал скелета-прислужника."); addFloat("ПРИЗЫВ", 386, 91, "#cfb2eb"); render(); await delay(220);
    }
    let damage = enemy.nextAttack;
    if (enemy.special === "lich" && enemy.turnCount % 4 === 0) { damage = Math.round(damage * 1.5); addLog("Лич усиливает удар тёмной магией!"); }
    if (enemy.weakness > 0) { damage = Math.max(1, Math.floor(damage * .7)); enemy.weakness -= 1; }
    const pierce = enemy.special === "pierce" ? 2 : 0;
    const effectiveArmor = Math.max(0, p.armor - pierce);
    const blocked = Math.min(effectiveArmor, damage);
    const healthDamage = damage - blocked;
    p.armor = 0; p.hp = Math.max(0, p.hp - healthDamage);
    if (healthDamage > 0) {
      state.battle.damageTaken += healthDamage; state.totalDamageTaken += healthDamage;
      addFloat("−" + healthDamage + " HP", 105, 48, "#ff8e83"); spawnBurst(39, 64, "#f37465", 9); playTone("hit");
    }
    if (blocked > 0) addFloat("БЛОК " + blocked, 124, 91, "#a8e5ef");
    addLog(enemy.name + " наносит " + damage + (blocked ? " · броня поглотила " + blocked : "") + ".");
    if (enemy.special === "slime" && enemy.turnCount % 3 === 0 && enemy.hp > 0) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + 5); addLog("Слайм восстанавливает 5 здоровья."); addFloat("+5 HP", 395, 49, "#9de0a1");
    }
    if (enemy.special === "cultist" && enemy.turnCount % 3 === 0) { p.weakness = 2; addLog("Культист проклинает героя: мечи ослаблены."); }
    if (p.rageTurns > 0) {
      if (state.battle.rageFresh) state.battle.rageFresh = false;
      else { p.rageTurns -= 1; if (!p.rageTurns) p.rage = 0; }
    }
    if (p.hp <= 0) { claimDefeat(); return; }
    enemy.nextAttack = randomInt(enemy.attackMin, enemy.attackMax);
    state.phase = "player"; state.selected = null; persist(); render();
  }

  async function finishPlayerAction(extraTurn) {
    if (state.enemy.hp <= 0) { claimVictory(); return; }
    if (extraTurn) {
      state.battle.extraTurns += 1; addLog("Матч 4+ — враг пропускает атаку.");
      state.phase = "player"; persist(); render(); return;
    }
    await enemyTurn();
  }

  async function resolveSwap(a, b) {
    if (!state || state.phase !== "player") return;
    state.phase = "resolving"; state.selected = null;
    DungeonBoard.swap(state.board, a, b);
    if (!DungeonBoard.findMatches(state.board).length) {
      render(); await delay(150); DungeonBoard.swap(state.board, a, b);
      state.phase = "player"; addLog("Нет совпадения: обмен отменён, ход сохранён."); render(); return;
    }
    state.battle.moves += 1; addLog("Ход " + state.battle.moves + ": удачный обмен."); render();
    const extra = await resolveMatches(); await finishPlayerAction(extra);
  }

  async function castSpell(spell) {
    if (!canCast(spell)) return;
    const p = state.player; const enemy = state.enemy;
    state.phase = "resolving"; p.mana -= spell.cost; state.battle.moves += 1; state.stats.casts += 1; achievementProgress.casts += 1;
    checkAchievements();
    if (spell.action === "fireball") { enemy.hp = Math.max(0, enemy.hp - 12); enemy.burn = Math.max(enemy.burn, 2); addFloat("−12", 390, 49, "#ffab67"); }
    else if (spell.action === "heal") { const before = p.hp; p.hp = Math.min(p.maxHp, p.hp + 15); addFloat("+" + (p.hp - before) + " HP", 95, 49, "#a4eca7"); }
    else if (spell.action === "shield") { p.armor += 10; addFloat("+10 БРОНЯ", 112, 92, "#9de7f1"); }
    else if (spell.action === "skin") { p.armor += 14; enemy.weakness = Math.max(enemy.weakness, 2); addFloat("+14 БРОНЯ", 112, 92, "#9de7f1"); }
    else if (spell.action === "lightning") { enemy.hp = Math.max(0, enemy.hp - 20); enemy.armor = 0; addFloat("−20", 390, 49, "#b9afff"); }
    else if (spell.action === "vampirism") { enemy.hp = Math.max(0, enemy.hp - 8); const before = p.hp; p.hp = Math.min(p.maxHp, p.hp + 8); addFloat("−8 / +" + (p.hp - before), 390, 49, "#da8dad"); }
    else if (spell.action === "berserk") { p.rage = 3; p.rageTurns = 4; state.battle.rageFresh = true; addFloat("ЯРОСТЬ · 4 ХОДА", 118, 88, "#ffae7b"); }
    else if (spell.action === "chain") { enemy.hp = Math.max(0, enemy.hp - 30); enemy.armor = 0; enemy.weakness = Math.max(enemy.weakness, 2); addFloat("−30", 390, 49, "#b9afff"); }
    addLog(spell.name + ": " + spell.effect + "."); spawnBurst(460, 62, "#d0b3ff", 12); playTone("magic"); render(); await delay(220); await finishPlayerAction(false);
  }

  async function useConsumable(kind) {
    if (!state || state.screen !== "battle" || state.phase !== "player") return;
    const p = state.player;
    if (kind === "potion") {
      if (!p.potions || p.hp >= p.maxHp) return;
      const before = p.hp; p.potions -= 1; p.hp = Math.min(p.maxHp, p.hp + 25);
      addFloat("+" + (p.hp - before) + " HP", 96, 48, "#9fe3a1"); addLog("Зелье: здоровье +" + (p.hp - before) + ".");
    } else if (kind === "bomb") {
      if (!p.bombs) return;
      p.bombs -= 1; state.enemy.hp = Math.max(0, state.enemy.hp - 25); addFloat("−25", 390, 49, "#ffad61"); addLog("Бомба наносит 25 прямого урона.");
    } else if (kind === "shuffle") {
      if (!p.shuffles) return;
      p.shuffles -= 1; state.board = DungeonBoard.create(); state.stats.consumables += 1; achievementProgress.consumables += 1; checkAchievements();
      addLog("Руна перемешки создаёт новое поле без траты хода."); playTone("magic"); persist(); render(); return;
    }
    state.stats.consumables += 1; achievementProgress.consumables += 1; checkAchievements(); state.battle.moves += 1; state.phase = "resolving";
    playTone(kind === "potion" ? "heal" : "hit"); render(); await delay(170); await finishPlayerAction(false);
  }

  function handleBoardClick(x, y) {
    const cell = { x: Math.floor(x / CELL), y: Math.floor((y - BOARD_TOP) / CELL) };
    if (cell.x < 0 || cell.x >= 8 || cell.y < 0 || cell.y >= 8) return;
    if (!state.selected) { state.selected = cell; render(); return; }
    if (state.selected.x === cell.x && state.selected.y === cell.y) { state.selected = null; render(); return; }
    if (Math.abs(state.selected.x - cell.x) + Math.abs(state.selected.y - cell.y) !== 1) { state.selected = cell; render(); return; }
    const first = state.selected; state.selected = null;
    resolveSwap(first, cell).catch(function (error) { console.error(error); state.phase = "player"; addLog("Не удалось завершить ход."); render(); });
  }

  function activate(action) {
    if (action === "new-game") newGame(false);
    else if (action === "hardcore") newGame(true);
    else if (action === "continue") continueRun();
    else if (action === "demo") window.location.href = "demo.html";
    else if (action === "achievements") {
      if (!state) utilityScreen = "achievements";
      else { state.utilityReturn = state.screen; state.screen = "achievements"; persist(); }
      resizeCanvas(); render();
    }
    else if (action === "howto") {
      if (!state) utilityScreen = "howto";
      else { state.utilityReturn = state.screen; state.screen = "howto"; persist(); }
      resizeCanvas(); render();
    }
    else if (action === "menu") {
      if (state && state.dead) goMenu(true);
      else if (!state) { utilityScreen = ""; resizeCanvas(); render(); }
      else {
        state.menuReturn = state.utilityReturn || (state.screen === "menu" ? (state.menuReturn || "map") : state.screen);
        state.utilityReturn = ""; state.screen = "menu"; persist(); resizeCanvas(); render();
      }
    }
    else if (action === "enter-room") startBattle();
    else if (action === "toggle-route") { state.routeElite = !state.routeElite; playTone("click"); persist(); render(); }
    else if (action === "shop") { state.shopReturn = state.screen; state.screen = "shop"; persist(); resizeCanvas(); render(); }
    else if (action === "treasure-shop") { state.row = 6; state.routeElite = false; state.screen = "shop"; persist(); resizeCanvas(); render(); }
    else if (action === "leave-shop") { state.screen = "map"; persist(); resizeCanvas(); render(); }
    else if (action.indexOf("buy:") === 0) buy(action.slice(4));
    else if (action === "advance") continueAfterWin();
    else if (action === "leave-defeat") beginDefeatReturn();
    else if (action === "retry") startBattle();
    else if (action.indexOf("upgrade:") === 0) pickUpgrade(action.slice(8));
    else if (action === "take-event") applyEvent();
    else if (action === "new-cycle") beginNgPlus();
    else if (action === "hint") drawHint();
    else if (action.indexOf("spell:") === 0) { const spell = SPELLS.find(function (item) { return item.action === action.slice(6); }); if (spell) castSpell(spell).catch(console.error); }
    else if (action.indexOf("item:") === 0) useConsumable(action.slice(5)).catch(console.error);
  }

  function handlePointer(event) {
    event.preventDefault();
    const bounds = canvas.getBoundingClientRect();
    const point = { x: (event.clientX - bounds.left) * WIDTH / bounds.width, y: (event.clientY - bounds.top) * viewHeight / bounds.height };
    if (state && state.screen === "battle" && state.phase === "player") {
      const hit = buttons.find(function (button) { return point.x >= button.x && point.x <= button.x + button.w && point.y >= button.y && point.y <= button.y + button.h; });
      if (hit) { if (hit.enabled) activate(hit.action); return; }
      if (point.y >= BOARD_TOP && point.y < BOARD_TOP + 8 * CELL) handleBoardClick(point.x, point.y);
      return;
    }
    const button = buttons.find(function (item) { return point.x >= item.x && point.x <= item.x + item.w && point.y >= item.y && point.y <= item.y + item.h; });
    if (button && button.enabled) activate(button.action);
  }

  function handlePointerMove(event) {
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * WIDTH / bounds.width;
    const y = (event.clientY - bounds.top) * viewHeight / bounds.height;
    const hit = buttons.find(function (button) { return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h; });
    hoverAction = hit ? hit.action : "";
    if (state) state.hover = hoverAction;
  }

  function handleRailClick(event) {
    if (!railVisible || !state || state.screen !== "battle") return;
    const spellButton = event.target.closest("[data-spell-action]");
    if (spellButton) { const spell = SPELLS.find(function (item) { return item.action === spellButton.dataset.spellAction; }); if (spell) castSpell(spell).catch(console.error); return; }
    const itemButton = event.target.closest("[data-item-action]");
    if (itemButton) useConsumable(itemButton.dataset.itemAction).catch(console.error);
  }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, String(muted)); } catch (error) { /* Optional. */ }
    document.getElementById("mute-button").textContent = muted ? "ЗВУК: ВЫКЛ" : "ЗВУК: ВКЛ";
    if (!muted) playTone("click");
  }

  function boot() {
    document.getElementById("mute-button").textContent = muted ? "ЗВУК: ВЫКЛ" : "ЗВУК: ВКЛ";
    canvas.addEventListener("pointerdown", handlePointer);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", function () { hoverAction = ""; if (state) state.hover = ""; });
    canvas.addEventListener("contextmenu", function (event) { event.preventDefault(); });
    rail.addEventListener("click", handleRailClick);
    document.getElementById("mute-button").addEventListener("click", toggleMute);
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", function (event) { if (event.key.toLowerCase() === "m") toggleMute(); });
    resizeCanvas();
    window.requestAnimationFrame(animationFrame);
    DungeonSprites.preload(ASSET_IDS).then(function (loaded) {
      ASSET_IDS.forEach(function (id, index) { images[id] = loaded[index]; }); render();
    }).catch(function (error) { console.error(error); });
  }

  buildRail();
  boot();
})();
