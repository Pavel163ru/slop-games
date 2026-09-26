// main.js — роутер экранов (menu/howto/ach/map/shop/battle/victory),
// оверлеи (сложность/событие/level-up), rAF-цикл анимаций, автомат боя.

import { createBoard, findMatches, swapCells, isAdjacent, collapse, matchKeys, hasPossibleMove, findHintMove } from './board.js';
import { createPlayer, resetForBattle, addXp, applyLevelChoice } from './player.js';
import { createEnemy, rollDamage, DUNGEON, LAST_ROW } from './enemies.js';
import { SPELLS, isUnlocked } from './spells.js';
import { applyMatchEffects, describeStep, damageEnemy, tickStatuses } from './battle.js';
import { addFloat, now, pruneFx } from './fx.js';
import * as UI from './ui.js';
import { sfx } from './audio.js';
import { saveGame, loadGame, hasSave, clearSave, applySave, defaultStats, loadMuted, storeMuted } from './save.js';
import { SHOP_ITEMS, POTION_HEAL, BOMB_DMG } from './shop.js';
import { rollEvent } from './events.js';
import { loadAch, checkAch, achById } from './ach.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = UI.W * dpr;
  canvas.height = UI.H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- состояние ----------

const app = {
  screen: 'menu', // menu | howto | ach | map | shop | battle | victory
  diffOpen: false,
  player: createPlayer(),
  row: 0,
  sel: 0,
  path: [],
  cycle: 0,
  hardcore: false,
  pendingLevels: 0,
  afterLevel: 'map', // куда после level-up: 'map' | 'win'
  shopMsg: '',
  event: null,
  stats: defaultStats(),
  ach: loadAch(),
};

let battle = null;

sfx.setMuted(loadMuted());

function persist() {
  saveGame({ player: app.player, row: app.row, col: app.sel, cycle: app.cycle, hardcore: app.hardcore, stats: app.stats, path: app.path });
}

function draw() {
  const p = app.player;
  switch (app.screen) {
    case 'menu':
      UI.drawMenu(ctx, hasSave(), sfx.isMuted());
      if (app.diffOpen) UI.drawDiffOverlay(ctx);
      break;
    case 'howto': UI.drawHowto(ctx); break;
    case 'ach': UI.drawAch(ctx, app.ach); break;
    case 'map':
      UI.drawMap(ctx, p, app.row, app.sel, app.path, app.cycle, app.hardcore);
      if (app.event) UI.drawEventOverlay(ctx, app.event, p);
      else if (app.levelupOpen) UI.drawLevelupOverlay(ctx, p);
      break;
    case 'shop': UI.drawShop(ctx, p, app.shopMsg); break;
    case 'battle': UI.drawBattle(ctx, battle); break;
    case 'victory': UI.drawVictory(ctx, p, app.cycle, app.stats); break;
  }
}

// rAF-цикл: анимации (падение, взрывы, цифры, тосты) требуют перерисовки.
function frame() {
  if (app.screen === 'battle' && battle) {
    pruneFx(battle);
    if (battle.toasts) battle.toasts = battle.toasts.filter((t) => now() < t.until);
  }
  draw();
  requestAnimationFrame(frame);
}

function shake() {
  canvas.classList.remove('shake');
  void canvas.offsetWidth;
  canvas.classList.add('shake');
}

function grantAch(ids) {
  for (const id of ids) {
    const a = achById(id);
    if (!a) continue;
    if (app.screen === 'battle' && battle) {
      battle.toasts.push({ text: `${a.name} — ${a.desc}`, until: now() + 2400 });
    } else {
      app.shopMsg = `🏆 ${a.name}! ${a.desc}`;
    }
  }
  if (ids.length) sfx.ach();
}

function checkAchievements(flawless = false) {
  const fresh = checkAch(app.ach, { ...app.stats, gold: app.player.gold }, flawless);
  if (fresh.length) grantAch(fresh);
}

// ---------- запуск / продолжение ----------

function newRun(hardcore) {
  app.player = createPlayer();
  app.row = 0;
  app.sel = 0;
  app.path = [];
  app.cycle = 0;
  app.hardcore = hardcore;
  app.pendingLevels = 0;
  app.afterLevel = 'map';
  app.shopMsg = '';
  app.event = null;
  app.levelupOpen = false;
  app.stats = defaultStats();
  app.diffOpen = false;
  persist();
  app.screen = 'map';
  sfx.click();
}

function continueRun() {
  const data = loadGame();
  if (!data) return;
  const meta = applySave(app.player, data);
  app.row = Math.max(0, Math.min(LAST_ROW, meta.row));
  app.sel = 0;
  app.path = [];
  app.cycle = meta.cycle;
  app.hardcore = meta.hardcore;
  app.stats = meta.stats;
  app.pendingLevels = 0;
  app.shopMsg = '';
  app.event = null;
  app.levelupOpen = false;
  app.diffOpen = false;
  app.screen = 'map';
  sfx.click();
}

// ---------- бой ----------

function prerollIntent() {
  const e = battle.enemy;
  const base = rollDamage(e);
  const empowered = !!(e.powerEvery && (e.turns + 1) % e.powerEvery === 0);
  battle.intent = { dmg: empowered ? Math.round(base * 1.5) : base, empowered, base };
}

function startBattle() {
  const node = DUNGEON[app.row].nodes[app.sel];
  if (node.treasure) return;
  const p = app.player;
  resetForBattle(p);
  battle = {
    grid: createBoard(),
    player: p,
    enemy: createEnemy(node, { cycle: app.cycle, hardcore: app.hardcore }),
    hardcore: app.hardcore,
    selected: null,
    highlight: null,
    burst: null,
    fall: null,
    swap: null,
    hint: null,
    floats: [],
    toasts: [],
    extraBadge: false,
    enemyNote: '',
    intent: null,
    rewards: null,
    pendingLevels: 0,
    dmgTaken: 0,
    turnDmg: 0,
    maxHit: 0,
    eshake: 0,
    log: [],
    state: 'player',
  };
  const e = battle.enemy;
  battle.enemyNote = e.special || '';
  battle.log.push(`${e.name} преграждает путь!`);
  battle.log.push('Собери 3 меча, чтобы ударить.');
  prerollIntent();
  persist();
  app.screen = 'battle';
}

function addLog(s) {
  battle.log.push(s);
  if (battle.log.length > 6) battle.log.shift();
}

function floatAtEnemy(text, color) {
  addFloat(battle, UI.W / 2, 120, text, color);
}

function checkEnd() {
  if (battle.enemy.hp <= 0) {
    const e = battle.enemy;
    battle.state = 'win';
    battle.highlight = null;
    battle.burst = null;
    battle.selected = null;
    battle.rewards = { xp: e.xp, gold: e.gold };
    battle.player.gold += e.gold;
    battle.pendingLevels = addXp(battle.player, e.xp);
    app.pendingLevels = battle.pendingLevels;
    battle.maxHit = Math.max(battle.maxHit, battle.turnDmg);
    app.stats.wins++;
    app.stats.maxHit = Math.max(app.stats.maxHit, battle.maxHit);
    if (e.elite) app.stats.elites++;
    if (e.id === 'lich') app.stats.lich++;
    const flawless = battle.dmgTaken === 0;
    battle.flawless = flawless;
    addLog(`${e.name} повержен! +${e.xp} XP, +${e.gold} зол.`);
    if (battle.pendingLevels > 0) addLog(`Новый уровень! (${battle.pendingLevels})`);
    if (flawless) addLog('Без царапин!');
    sfx.win();
    checkAchievements(flawless);
    return true;
  }
  if (battle.player.hp <= 0) {
    battle.state = 'lose';
    battle.highlight = null;
    battle.burst = null;
    battle.selected = null;
    addLog('Герой пал...');
    sfx.lose();
    return true;
  }
  return false;
}

async function enemyTurn() {
  battle.state = 'enemy';
  battle.extraBadge = false;
  await sleep(650);
  if (app.screen !== 'battle' || battle.state !== 'enemy') return;
  const e = battle.enemy;
  const p = battle.player;
  e.turns++;

  // статусы тикают первыми
  const tick = tickStatuses(e);
  if (tick.dmg > 0) {
    addLog(`Статусы: ${tick.text}.`);
    floatAtEnemy(`-${tick.dmg}`, '#e05252');
    battle.eshake = now();
    if (checkEnd()) return;
  }

  // призыв некроманта
  if (e.summonEvery && e.turns % e.summonEvery === 0 && (!e.minion || e.minion.hp <= 0) && e.hp > 0) {
    e.minion = { hp: 25, maxHp: 25 };
    sfx.summon();
    addLog('Некромант призывает скелета-прислужника!');
    floatAtEnemy('+прислужник', '#b9a8ef');
  }

  // удар по preroll-интенту
  let raw = battle.intent.base;
  if (battle.intent.empowered) {
    raw = battle.intent.dmg;
    addLog(`☠ УСИЛЕННАЯ АТАКА ${e.name}: ${raw}!`);
  }
  if (e.weak > 0) raw = Math.max(1, Math.round(raw * 0.7));
  const effArmor = Math.max(0, p.armor - (e.pierce || 0));
  const absorbed = Math.min(effArmor, raw);
  const dealt = raw - absorbed;
  p.hp = Math.max(0, p.hp - dealt);
  battle.dmgTaken += dealt;
  p.armor = 0;
  if (dealt > 0) {
    shake();
    addFloat(battle, UI.W / 2, 640, `-${dealt}`, '#e05252');
  }
  sfx.hurt();
  if (!battle.intent.empowered) {
    addLog(absorbed > 0
      ? `${e.name} бьёт ${raw} → броня ${absorbed}, урон ${dealt}.`
      : `${e.name} бьёт на ${dealt}.`);
  }

  // регенерация слайма
  if (e.regen && e.hp > 0) {
    if (e.turns % 3 === 0) {
      e.hp = Math.min(e.maxHp, e.hp + e.regen);
      addLog(`Слайм восстанавливает +${e.regen} HP.`);
      floatAtEnemy(`+${e.regen}`, '#58c472');
    } else {
      battle.enemyNote = `Регенерация через ${3 - (e.turns % 3)} ход(а).`;
    }
  }
  if (e.powerEvery) {
    const left = e.powerEvery - (e.turns % e.powerEvery);
    battle.enemyNote = `${e.special}. Усиление через ${left}.`;
  }
  if (checkEnd()) return;
  battle.state = 'player';
  prerollIntent();
}

async function resolveTurn() {
  battle.state = 'resolving';
  battle.selected = null;
  battle.turnDmg = 0;
  let extraTurn = false;

  for (;;) {
    const matches = findMatches(battle.grid);
    if (matches.length === 0) break;
    battle.highlight = matchKeys(matches);
    battle.burst = { t0: now() };
    sfx.match(Math.max(...matches.map((m) => m.len)));
    await sleep(270);
    if (app.screen !== 'battle' || battle.state === 'player') return;

    const res = applyMatchEffects(battle, matches);
    battle.turnDmg += res.damage;
    if (res.extraTurn) extraTurn = true;
    addLog(describeStep(matches, res));
    if (res.damage > 0) {
      battle.eshake = now();
      floatAtEnemy(`-${res.damage}`, res.crit ? '#ffe27a' : '#ff8a8a');
      if (res.crit) { sfx.crit(); floatAtEnemy('КРИТ ×2!', '#ffe27a'); }
      else shake(), sfx.hit();
    }
    if (res.armor > 0) { addFloat(battle, 60, 610, `+${res.armor} 🛡`, '#8fa3bf'); }
    if (res.mana > 0) { addFloat(battle, 150, 610, `+${res.mana} 🔷`, '#4f8cff'); sfx.match(2); }
    if (res.heal > 0) { addFloat(battle, 240, 610, `+${res.heal}`, '#58c472'); sfx.heal(); }
    if (res.gold > 0) { addFloat(battle, 320, 610, `+${res.gold} 🪙`, '#f0c75e'); sfx.gold(); }

    battle.highlight = null;
    battle.burst = null;
    const enemy = battle.enemy;
    if (enemy.minionDead) {
      enemy.minion = null;
      enemy.minionDead = false;
      addLog('Прислужник рассыпался в прах!');
    }
    if (checkEnd()) return;
    const keys = matchKeys(matches);
    const moves = collapse(battle.grid, keys);
    battle.fall = moves.size ? { moves, t0: now() } : null;
    await sleep(210);
    if (app.screen !== 'battle' || battle.state === 'player') return;
  }

  if (!hasPossibleMove(battle.grid)) {
    battle.grid = createBoard();
    addLog('Нет ходов — поле перемешано.');
  }

  if (checkEnd()) return;
  battle.maxHit = Math.max(battle.maxHit, battle.turnDmg);

  if (extraTurn) {
    battle.state = 'player';
    battle.extraBadge = true;
    addLog('★ Доп. ход!');
  } else {
    battle.extraBadge = false;
    await enemyTurn();
  }
}

async function trySwap(a, b) {
  battle.swap = { a, b, t0: now(), dur: 150 };
  sfx.swap();
  await sleep(165);
  if (app.screen !== 'battle') return;
  battle.swap = null;
  swapCells(battle.grid, a, b);
  if (findMatches(battle.grid).length === 0) {
    swapCells(battle.grid, a, b);
    sfx.error();
    addLog('Нет матча — ход не засчитан.');
    return;
  }
  await resolveTurn();
}

const DMG_SFX = {
  fireball: 'fireball', lightning: 'lightning', chain: 'lightning',
  vampire: 'vampire', heal: 'heal', shield: 'shield', skin: 'shield', berserk: 'summon',
};

async function castSpell(i) {
  const sp = SPELLS[i];
  const p = battle.player;
  if (!isUnlocked(sp, p)) {
    sfx.error();
    addLog(`«${sp.name}» откроется на ${sp.unlock} уровне.`);
    return;
  }
  if (p.mana < sp.cost) {
    sfx.error();
    addLog(`Не хватает маны для «${sp.name}» (${sp.cost}).`);
    return;
  }
  battle.turnDmg = 0;
  const { msg, dmg } = sp.cast(battle);
  battle.turnDmg = dmg;
  addLog(msg);
  app.stats.casts++;
  if (dmg > 0) {
    battle.eshake = now();
    shake();
    floatAtEnemy(`-${dmg}`, '#ff8a8a');
  }
  if (sp.id === 'heal') addFloat(battle, UI.W / 2, 640, '+15', '#58c472');
  if (sp.id === 'berserk') addFloat(battle, UI.W / 2, 640, '😡', '#e05252');
  sfx[DMG_SFX[sp.id]]();
  battle.selected = null;
  battle.maxHit = Math.max(battle.maxHit, battle.turnDmg);
  checkAchievements();
  if (checkEnd()) return;
  await enemyTurn();
}

async function castPotion() {
  const p = battle.player;
  if (p.potions <= 0) { sfx.error(); addLog('Нет зелий — загляни в лавку.'); return; }
  if (p.hp >= p.maxHp) { sfx.error(); addLog('HP полное — зелье не нужно.'); return; }
  p.potions--;
  app.stats.used++;
  p.hp = Math.min(p.maxHp, p.hp + POTION_HEAL);
  addLog(`Зелье: +${POTION_HEAL} HP. (осталось ${p.potions})`);
  addFloat(battle, UI.W / 2, 640, `+${POTION_HEAL}`, '#58c472');
  sfx.potion();
  battle.selected = null;
  checkAchievements();
  await enemyTurn();
}

async function castBomb() {
  const p = battle.player;
  if (p.bombs <= 0) { sfx.error(); addLog('Нет бомб — загляни в лавку.'); return; }
  p.bombs--;
  app.stats.used++;
  battle.turnDmg = BOMB_DMG;
  battle.enemy.hp = Math.max(0, battle.enemy.hp - BOMB_DMG);
  addLog(`Бомба! ${BOMB_DMG} прямого урона.`);
  battle.eshake = now();
  shake();
  floatAtEnemy(`-${BOMB_DMG}`, '#ff8a8a');
  sfx.boom();
  battle.selected = null;
  battle.maxHit = Math.max(battle.maxHit, battle.turnDmg);
  checkAchievements();
  if (checkEnd()) return;
  await enemyTurn();
}

function castShuffle() {
  const p = battle.player;
  if (p.shuffles <= 0) { sfx.error(); addLog('Нет перемешек — загляни в лавку.'); return; }
  p.shuffles--;
  app.stats.used++;
  battle.grid = createBoard();
  battle.selected = null;
  addLog('Поле перемешано (ход сохранён).');
  sfx.shuffleSfx();
  checkAchievements();
}

function castHint() {
  const mv = findHintMove(battle.grid);
  if (!mv) { sfx.error(); addLog('Ходов нет — поле скоро перемешается.'); return; }
  battle.hint = { ...mv, until: now() + 1600 };
  sfx.click();
}

// ---------- поток после боя ----------

function onBattleWinClick() {
  battle = null;
  if (app.pendingLevels > 0) {
    app.afterLevel = 'win';
    app.levelupOpen = true;
    app.screen = 'map';
  } else {
    finishWin();
  }
}

function finishWin() {
  if (app.row >= LAST_ROW) {
    clearSave();
    app.screen = 'victory';
    sfx.win();
  } else {
    app.path[app.row] = app.sel;
    app.row++;
    app.sel = 0;
    persist();
    // событие между боями
    const ev = rollEvent();
    if (ev && app.player.hp > 1) {
      app.event = ev;
      sfx.event();
    }
    app.screen = 'map';
    sfx.click();
  }
}

function onLevelChoice(choice) {
  applyLevelChoice(app.player, choice);
  app.pendingLevels--;
  sfx.levelup();
  persist();
  if (app.pendingLevels > 0) return; // ещё уровни — оверлей остаётся
  app.levelupOpen = false;
  if (app.afterLevel === 'win') finishWin();
  else app.screen = 'map';
}

function onBattleLoseClick() {
  battle = null;
  if (app.hardcore) {
    clearSave();
    app.screen = 'menu';
    app.player = createPlayer();
    app.row = 0;
    sfx.click();
    return;
  }
  const p = app.player;
  p.hp = p.maxHp;
  p.armor = 0;
  persist();
  app.screen = 'map';
  sfx.click();
}

// ---------- карта ----------

function enterNode(col) {
  app.sel = col;
  const node = DUNGEON[app.row].nodes[col];
  sfx.click();
  if (node.treasure) {
    app.player.gold += node.gold;
    app.shopMsg = `Сокровищница: +${node.gold} золота!`;
    sfx.gold();
    app.path[app.row] = col;
    app.row++;
    app.sel = 0;
    persist();
    checkAchievements();
    app.screen = 'shop';
    return;
  }
  startBattle();
}

// ---------- события ----------

function chooseEventOption(i) {
  const ev = app.event;
  const opt = ev.opts[i];
  if (opt.can && !opt.can(app.player)) {
    sfx.error();
    return;
  }
  opt.apply(app.player);
  let msg = opt.label;
  if (opt.xp) {
    const ups = addXp(app.player, opt.xp);
    msg += ` (+${opt.xp} XP)`;
    if (ups > 0) {
      app.pendingLevels += ups;
      app.afterLevel = 'map';
      app.levelupOpen = true;
    }
  }
  app.event = null;
  persist();
  checkAchievements();
  sfx.event();
  void msg;
}

// ---------- клики ----------

function battleClick(x, y) {
  if (battle.state === 'win') { onBattleWinClick(); return; }
  if (battle.state === 'lose') { onBattleLoseClick(); return; }
  if (battle.state !== 'player') return;

  const si = UI.spellFromPoint(x, y);
  if (si !== null) {
    void castSpell(si);
    return;
  }
  const ck = UI.consumableHit(x, y);
  if (ck === 'potion') { void castPotion(); return; }
  if (ck === 'bomb') { void castBomb(); return; }
  if (ck === 'shuffle') { castShuffle(); return; }
  if (UI.hintHit(x, y)) { castHint(); return; }

  const cell = UI.cellFromPoint(x, y);
  if (!cell) return;

  if (!battle.selected) {
    battle.selected = cell;
    return;
  }
  const a = battle.selected;
  if (a.r === cell.r && a.c === cell.c) {
    battle.selected = null;
    return;
  }
  if (isAdjacent(a, cell)) {
    battle.selected = null;
    void trySwap(a, cell);
  } else {
    battle.selected = cell;
  }
}

canvas.addEventListener('click', (ev) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) / rect.width) * UI.W;
  const y = ((ev.clientY - rect.top) / rect.height) * UI.H;

  switch (app.screen) {
    case 'menu': {
      if (app.diffOpen) {
        const d = UI.diffHit(x, y);
        if (d === 'normal') newRun(false);
        else if (d === 'hardcore') newRun(true);
        else if (d === 'back') { app.diffOpen = false; sfx.click(); }
        break;
      }
      const hit = UI.menuHit(x, y, hasSave());
      if (hit === 'new') { app.diffOpen = true; sfx.click(); }
      else if (hit === 'continue') continueRun();
      else if (hit === 'howto') { app.screen = 'howto'; sfx.click(); }
      else if (hit === 'ach') { app.screen = 'ach'; sfx.click(); }
      else if (hit === 'mute') { toggleMute(); }
      break;
    }
    case 'howto':
      if (UI.howtoHit(x, y)) { app.screen = 'menu'; sfx.click(); }
      break;
    case 'ach':
      if (UI.achHit(x, y)) { app.screen = 'menu'; sfx.click(); }
      break;
    case 'map': {
      if (app.levelupOpen) {
        const choice = UI.levelupHit(x, y);
        if (choice) onLevelChoice(choice);
        break;
      }
      if (app.event) {
        const i = UI.eventHit(x, y, app.event);
        if (i !== null) chooseEventOption(i);
        break;
      }
      const hit = UI.mapHit(x, y, app.row);
      if (!hit) break;
      if (hit.type === 'node') enterNode(hit.col);
      else if (hit.type === 'fightBtn') enterNode(app.sel);
      else if (hit.type === 'shop') { app.shopMsg = ''; app.screen = 'shop'; sfx.click(); }
      else if (hit.type === 'mute') toggleMute();
      break;
    }
    case 'shop': {
      const hit = UI.shopHit(x, y);
      if (!hit) break;
      if (hit.type === 'back') { app.screen = 'map'; sfx.click(); }
      else {
        const item = SHOP_ITEMS[hit.i];
        if (item.canBuy(app.player)) {
          app.shopMsg = item.buy(app.player);
          sfx.buy();
          persist();
          checkAchievements();
        } else {
          app.shopMsg = `Нельзя: ${item.whyNot(app.player)}.`;
          sfx.error();
        }
      }
      break;
    }
    case 'battle':
      battleClick(x, y);
      break;
    case 'victory': {
      const hit = UI.victoryHit(x, y);
      if (hit === 'ng') {
        app.cycle++;
        app.player.hp = app.player.maxHp;
        app.row = 0;
        app.sel = 0;
        app.path = [];
        persist();
        app.screen = 'map';
        sfx.click();
      } else if (hit === 'menu') {
        app.screen = 'menu';
        sfx.click();
      }
      break;
    }
  }
});

function toggleMute() {
  const m = sfx.toggleMute();
  storeMuted(m);
}

window.addEventListener('keydown', (ev) => {
  if (ev.key === 'm' || ev.key === 'M' || ev.key === 'ь' || ev.key === 'Ь') toggleMute();
});

frame();
