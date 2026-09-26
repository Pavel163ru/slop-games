// ui.js — ВЕСЬ рендер на Canvas: меню, карта-ветки, лавка, события,
// достижения, бой с анимациями, оверлеи. DOM-модалок нет.

import { SIZE } from './board.js';
import { SPELLS } from './spells.js';
import { ENEMIES, DUNGEON, LAST_ROW } from './enemies.js';
import { SHOP_ITEMS } from './shop.js';
import { ACHIEVEMENTS } from './ach.js';
import { xpNeed } from './player.js';
import { progress, easeOutCubic, clamp01 } from './fx.js';

export const W = 512;
export const H = 760;

// --- раскладка боя ---
export const BOARD_Y = 80;
export const CELL = 64;
export const STATS_Y = 596;
export const LOG_Y = 650;
export const SPELL_ROWS = 2;
export const SPELL_COLS = 4;
export const SPELL_Y = 676;
export const SPELL_H = 38;

const TILE_COLORS = {
  sword: '#e05252',
  shield: '#8fa3bf',
  mana: '#4f8cff',
  potion: '#58c472',
  gold: '#f0c75e',
};

// ---------- общие helpers ----------

function bg(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#171422');
  g.addColorStop(1, '#0d0c15');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function bar(ctx, x, y, w, h, frac, color, bgc = '#2a2438') {
  ctx.fillStyle = bgc;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
}

function button(ctx, r, label, { disabled = false, font = 'bold 16px Georgia, serif' } = {}) {
  ctx.fillStyle = disabled ? '#1a1826' : '#2c2540';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = disabled ? '#4a4460' : '#f0c75e';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = disabled ? '#6a6486' : '#ffe27a';
  ctx.font = font;
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 6);
}

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function title(ctx, text, y, size = 40) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f0c75e';
  ctx.font = `bold ${size}px Georgia, serif`;
  ctx.fillText(text, W / 2, y);
}

function statsLine(p) {
  return `Ур.${p.level} · HP ${p.hp}/${p.maxHp} · ⚔${p.atk} · 🪙${p.gold} · 🧪${p.potions} 💣${p.bombs} 🔀${p.shuffles}`;
}

// ---------- МЕНЮ ----------

const MENU_BTNS = {
  new: { x: 106, y: 276, w: 300, h: 56 },
  continue: { x: 106, y: 340, w: 300, h: 56 },
  howto: { x: 106, y: 404, w: 300, h: 56 },
  ach: { x: 106, y: 468, w: 300, h: 56 },
  mute: { x: 156, y: 544, w: 200, h: 34 },
};

export function menuHit(x, y, hasSave) {
  if (inRect(x, y, MENU_BTNS.new)) return 'new';
  if (hasSave && inRect(x, y, MENU_BTNS.continue)) return 'continue';
  if (inRect(x, y, MENU_BTNS.howto)) return 'howto';
  if (inRect(x, y, MENU_BTNS.ach)) return 'ach';
  if (inRect(x, y, MENU_BTNS.mute)) return 'mute';
  return null;
}

export function drawMenu(ctx, hasSave, muted) {
  bg(ctx);
  title(ctx, 'DUNGEON', 140, 52);
  title(ctx, 'MATCH', 195, 52);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9a93b8';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('match-3 RPG · тёмное подземелье', W / 2, 225);
  ctx.fillText('ветки · элита ★ · сокровища · NG+', W / 2, 248);
  button(ctx, MENU_BTNS.new, 'Новая игра');
  button(ctx, MENU_BTNS.continue, 'Продолжить', { disabled: !hasSave });
  button(ctx, MENU_BTNS.howto, 'Как играть');
  button(ctx, MENU_BTNS.ach, '🏆 Достижения');
  button(ctx, MENU_BTNS.mute, muted ? '🔇 звук выкл (M)' : '🔊 звук вкл (M)', { font: '13px Georgia, serif' });
}

// ---------- СЛОЖНОСТЬ (оверлей) ----------

const DIFF_BTNS = {
  normal: { x: 86, y: 350, w: 340, h: 56 },
  hardcore: { x: 86, y: 416, w: 340, h: 56 },
  back: { x: 156, y: 496, w: 200, h: 40 },
};

export function diffHit(x, y) {
  if (inRect(x, y, DIFF_BTNS.normal)) return 'normal';
  if (inRect(x, y, DIFF_BTNS.hardcore)) return 'hardcore';
  if (inRect(x, y, DIFF_BTNS.back)) return 'back';
  return null;
}

export function drawDiffOverlay(ctx) {
  ctx.fillStyle = 'rgba(5,5,10,.82)';
  ctx.fillRect(0, 0, W, H);
  title(ctx, 'Новая игра', 300, 28);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9a93b8';
  ctx.font = '14px Georgia, serif';
  ctx.fillText('Выбери сложность:', W / 2, 328);
  button(ctx, DIFF_BTNS.normal, 'Обычная');
  button(ctx, DIFF_BTNS.hardcore, '☠ Хардкор (+15% HP врагов, смерть = вайп)', { font: 'bold 12px Georgia, serif' });
  button(ctx, DIFF_BTNS.back, '← Назад', { font: '14px Georgia, serif' });
}

// ---------- ДОСТИЖЕНИЯ ----------

const ACH_BACK = { x: 106, y: 684, w: 300, h: 50 };
export function achHit(x, y) {
  return inRect(x, y, ACH_BACK) ? 'back' : null;
}

export function drawAch(ctx, owned) {
  bg(ctx);
  title(ctx, 'Достижения', 60, 28);
  ctx.fillText('', W / 2, 0);
  ACHIEVEMENTS.forEach((a, i) => {
    const y = 92 + i * 68;
    const has = owned.has(a.id);
    ctx.fillStyle = has ? '#1d2b1f' : '#1a1826';
    ctx.fillRect(24, y, W - 48, 58);
    ctx.strokeStyle = has ? '#58c472' : '#3a3350';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(24, y, W - 48, 58);
    ctx.textAlign = 'left';
    ctx.fillStyle = has ? '#ffe27a' : '#6a6486';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText((has ? '🏆 ' : '🔒 ') + a.name, 40, y + 24);
    ctx.fillStyle = has ? '#cfc9b8' : '#4a4460';
    ctx.font = '12px Georgia, serif';
    ctx.fillText(a.desc, 40, y + 44);
  });
  button(ctx, ACH_BACK, '← Назад');
}

// ---------- КАК ИГРАТЬ ----------

const HOWTO_BACK = { x: 106, y: 668, w: 300, h: 50 };
export function howtoHit(x, y) {
  return inRect(x, y, HOWTO_BACK) ? 'back' : null;
}

const HOWTO_LINES = [
  'Собери 3+ фишки в ряд свапом (клик-клик).',
  '⚔ Меч — урон · 🛡 Щит — броня (сгорает)',
  '🔷 Мана — заряд · 💚 Зелье — лечение · 🪙 лут.',
  'Матч-4 = ×2, матч-5 = ×3 + доп. ход, 25% крит ×2!',
  'Мечи-4+: кровотечение · Щиты-4+: слабость врага.',
  'Красная цифра — следующий удар врага (интент).',
  '★ Элитник: сильнее, но ×2 награда. Выбирай путь!',
  '🧪💣🔀 — расходники из лавки прямо в бою.',
  'Пройди 10 рядов и убей Лича. M — звук.',
];

export function drawHowto(ctx) {
  bg(ctx);
  title(ctx, 'Как играть', 70, 30);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#cfc9b8';
  ctx.font = '15px Georgia, serif';
  HOWTO_LINES.forEach((line, i) => ctx.fillText(line.slice(0, 52), 24, 130 + i * 34));
  button(ctx, HOWTO_BACK, '← Назад');
}

// ---------- КАРТА С ВЕТКАМИ ----------

export function mapNodePos(row, col) {
  const n = DUNGEON[row].nodes.length;
  const x = n === 1 ? 256 : col === 0 ? 140 : 372;
  return { x, y: 124 + row * 44 };
}

const MAP_BTNS = {
  fight: { x: 24, y: 606, w: 224, h: 50 },
  shop: { x: 264, y: 606, w: 224, h: 50 },
  mute: { x: 196, y: 664, w: 120, h: 28 },
};

export function mapHit(x, y, row) {
  if (inRect(x, y, MAP_BTNS.fight)) return { type: 'fightBtn' };
  if (inRect(x, y, MAP_BTNS.shop)) return { type: 'shop' };
  if (inRect(x, y, MAP_BTNS.mute)) return { type: 'mute' };
  const nodes = DUNGEON[row].nodes;
  for (let c = 0; c < nodes.length; c++) {
    const p = mapNodePos(row, c);
    if ((x - p.x) ** 2 + (y - p.y) ** 2 <= 24 * 24) return { type: 'node', col: c };
  }
  return null;
}

function nodeLabel(node) {
  if (node.treasure) return `🎁 +${node.gold} зол.`;
  const e = ENEMIES[node.e];
  return (node.elite ? '★ ' : '') + e.name;
}

export function drawMap(ctx, player, row, sel, path, cycle, hardcore) {
  bg(ctx);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f0c75e';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(`Подземелье${cycle > 0 ? ` (NG+${cycle})` : ''}${hardcore ? ' ☠' : ''}`, 16, 30);
  ctx.fillStyle = '#cfc9b8';
  ctx.font = '12px Georgia, serif';
  ctx.fillText(statsLine(player), 16, 52);
  ctx.fillStyle = '#9a93b8';
  ctx.fillText(`XP ${player.xp}/${xpNeed(player.level)} · мана/бой +${player.startMana}`, 16, 70);

  // связи
  ctx.strokeStyle = '#3a3350';
  ctx.lineWidth = 3;
  for (let r = 0; r < LAST_ROW; r++) {
    const cur = DUNGEON[r].nodes;
    const nxt = DUNGEON[r + 1].nodes;
    for (let c = 0; c < cur.length; c++) {
      for (let n = 0; n < nxt.length; n++) {
        const a = mapNodePos(r, c), b = mapNodePos(r + 1, n);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
  // узлы
  ctx.textAlign = 'center';
  for (let r = 0; r <= LAST_ROW; r++) {
    const nodes = DUNGEON[r].nodes;
    for (let c = 0; c < nodes.length; c++) {
      const node = nodes[c];
      const p = mapNodePos(r, c);
      const done = r < row;
      const skipped = r < row && path[r] !== undefined && path[r] !== c && DUNGEON[r].nodes.length > 1;
      const cur = r === row;
      const chosen = cur && c === sel;
      const boss = node.e === 'lich';
      const treasure = !!node.treasure;
      ctx.beginPath();
      ctx.arc(p.x, p.y, chosen ? 21 : 17, 0, Math.PI * 2);
      ctx.fillStyle = done && !skipped ? '#2d4a35'
        : skipped ? '#1a1826'
        : chosen ? (boss ? '#5a1a1a' : treasure ? '#4a3d1a' : '#4a3d1a')
        : cur ? '#2c2540'
        : boss ? '#2a1215' : '#221f30';
      ctx.fill();
      ctx.strokeStyle = done && !skipped ? '#58c472'
        : chosen ? '#ffe27a'
        : treasure && cur ? '#f0c75e'
        : boss ? '#e05252' : '#4a4460';
      ctx.lineWidth = chosen ? 3 : 2;
      ctx.stroke();
      ctx.fillStyle = done && !skipped ? '#58c472' : skipped ? '#3a3448' : chosen ? '#ffe27a' : '#6a6486';
      ctx.font = `bold ${chosen ? 16 : 13}px Georgia, serif`;
      ctx.fillText(done && !skipped ? '✓' : skipped ? '✕' : treasure ? '🎁' : String(r + 1), p.x, p.y + 5);
      ctx.font = '11px Georgia, serif';
      ctx.fillStyle = chosen ? '#ffe27a' : done && !skipped ? '#5a6a5e' : '#6a6486';
      const tx = p.x <= W / 2 ? p.x + 26 : p.x - 26;
      ctx.textAlign = p.x <= W / 2 ? 'left' : 'right';
      ctx.fillText(nodeLabel(node), tx, p.y + 4);
      ctx.textAlign = 'center';
    }
  }

  // превью выбранного узла
  const node = DUNGEON[row].nodes[sel];
  ctx.fillStyle = '#1d1a2b';
  ctx.fillRect(16, 556, W - 32, 40);
  ctx.strokeStyle = '#3a3350';
  ctx.strokeRect(16, 556, W - 32, 40);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '12px Georgia, serif';
  let preview;
  if (node.treasure) {
    preview = `Сокровищница: +${node.gold} золота и лавка. Клик по узлу — забрать.`;
  } else {
    const ce = ENEMIES[node.e];
    const mult = node.elite ? ' · ★ ЭЛИТА ×2 награда' : '';
    preview = `${node.elite ? '★ ' : ''}${ce.name}: HP ${ce.hp}, урон ${ce.dmgMin}–${ce.dmgMax}, ${ce.xp} XP / ${ce.gold} зол.${mult}`;
    if (ce.special) preview += ` · ${ce.special}`;
  }
  ctx.fillText(preview.slice(0, 76), W / 2, 571);
  if (preview.length > 76) {
    ctx.fillStyle = '#9a93b8';
    ctx.fillText(preview.slice(76, 150), W / 2, 587);
  }

  button(ctx, MAP_BTNS.fight, node.treasure ? '🎁 Забрать' : '⚔ В БОЙ');
  button(ctx, MAP_BTNS.shop, '🛒 Лавка');
  button(ctx, MAP_BTNS.mute, 'звук (M)', { font: '11px Georgia, serif' });
}

// ---------- СОБЫТИЕ (оверлей) ----------

export function eventHits(event) {
  const n = event.opts.length;
  return event.opts.map((_, i) => ({ x: 86, y: 400 + i * 62, w: 340, h: 52 }));
}

export function eventHit(x, y, event) {
  const rects = eventHits(event);
  for (let i = 0; i < rects.length; i++) if (inRect(x, y, rects[i])) return i;
  return null;
}

export function drawEventOverlay(ctx, event, player) {
  ctx.fillStyle = 'rgba(5,5,10,.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1d1a2b';
  ctx.fillRect(56, 230, 400, 320);
  ctx.strokeStyle = '#8fa3bf';
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 230, 400, 320);
  title(ctx, 'Событие', 280, 26);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#cfc9b8';
  ctx.font = '14px Georgia, serif';
  // перенос по словам
  const words = event.text.split(' ');
  const lines = [];
  let cur = '';
  for (const wline of words) {
    if ((cur + ' ' + wline).trim().length > 42) { lines.push(cur.trim()); cur = wline; }
    else cur += ' ' + wline;
  }
  if (cur.trim()) lines.push(cur.trim());
  lines.slice(0, 3).forEach((line, i) => ctx.fillText(line, W / 2, 312 + i * 22));
  const rects = eventHits(event);
  event.opts.forEach((opt, i) => {
    const ok = !opt.can || opt.can(player);
    button(ctx, rects[i], opt.label, { disabled: !ok, font: 'bold 14px Georgia, serif' });
  });
}

// ---------- ЛАВКА ----------

const SHOP_BACK = { x: 106, y: 676, w: 300, h: 50 };
function shopBuyRect(i) {
  return { x: 348, y: 142 + i * 100, w: 130, h: 40 };
}

export function shopHit(x, y) {
  if (inRect(x, y, SHOP_BACK)) return { type: 'back' };
  for (let i = 0; i < SHOP_ITEMS.length; i++) {
    if (inRect(x, y, shopBuyRect(i))) return { type: 'buy', i };
  }
  return null;
}

function stackCount(p, id) {
  if (id === 'potion') return `${p.potions}/3`;
  if (id === 'bomb') return `${p.bombs}/3`;
  if (id === 'shuffle') return `${p.shuffles}/3`;
  return '';
}

export function drawShop(ctx, player, msg = '') {
  bg(ctx);
  title(ctx, 'Лавка', 56, 28);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText(`🪙 ${player.gold} золота`, W / 2, 84);
  ctx.fillStyle = '#9a93b8';
  ctx.font = '12px Georgia, serif';
  ctx.fillText(statsLine(player), W / 2, 104);

  SHOP_ITEMS.forEach((item, i) => {
    const y = 132 + i * 100;
    ctx.fillStyle = '#1d1a2b';
    ctx.fillRect(24, y, W - 48, 88);
    ctx.strokeStyle = '#3a3350';
    ctx.strokeRect(24, y, W - 48, 88);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText(item.name, 40, y + 26);
    ctx.fillStyle = '#cfc9b8';
    ctx.font = '12px Georgia, serif';
    ctx.fillText(item.desc, 40, y + 48);
    const cnt = stackCount(player, item.id);
    if (cnt) {
      ctx.fillStyle = '#9a93b8';
      ctx.fillText(`Есть: ${cnt}`, 40, y + 68);
    }
    const ok = item.canBuy(player);
    button(ctx, shopBuyRect(i), `${item.price} зол.`, { disabled: !ok, font: 'bold 13px Georgia, serif' });
    if (!ok) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#6a6486';
      ctx.font = '11px Georgia, serif';
      ctx.fillText(item.whyNot(player), 40, y + 68);
    }
  });

  if (msg) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#58c472';
    ctx.font = '13px Georgia, serif';
    ctx.fillText(msg.slice(0, 60), W / 2, 646);
  }
  button(ctx, SHOP_BACK, '← К карте');
}

// ---------- LEVEL-UP (оверлей) ----------

const LVL_BTNS = [
  { id: 'hp', label: '❤ +10 maxHP', x: 86, y: 330, w: 340, h: 54 },
  { id: 'atk', label: '⚔ +1 атака', x: 86, y: 394, w: 340, h: 54 },
  { id: 'mana', label: '🔷 +2 маны в начале боя', x: 86, y: 458, w: 340, h: 54 },
];

export function levelupHit(x, y) {
  for (const b of LVL_BTNS) if (inRect(x, y, b)) return b.id;
  return null;
}

export function drawLevelupOverlay(ctx, player) {
  ctx.fillStyle = 'rgba(5,5,10,.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1d1a2b';
  ctx.fillRect(56, 230, 400, 320);
  ctx.strokeStyle = '#f0c75e';
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 230, 400, 320);
  title(ctx, `Уровень ${player.level}!`, 285, 30);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9a93b8';
  ctx.font = '14px Georgia, serif';
  ctx.fillText('Выбери бонус:', W / 2, 310);
  for (const b of LVL_BTNS) button(ctx, b, b.label);
}

// ---------- ПОБЕДА В ИГРЕ ----------

const VICTORY_BTNS = {
  ng: { x: 106, y: 540, w: 300, h: 54 },
  menu: { x: 106, y: 604, w: 300, h: 54 },
};

export function victoryHit(x, y) {
  if (inRect(x, y, VICTORY_BTNS.ng)) return 'ng';
  if (inRect(x, y, VICTORY_BTNS.menu)) return 'menu';
  return null;
}

export function drawVictory(ctx, player, cycle, stats) {
  bg(ctx);
  title(ctx, 'ЛИЧ ПОВЕРЖЕН!', 170, 36);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#cfc9b8';
  ctx.font = '15px Georgia, serif';
  ctx.fillText(cycle > 0 ? `Цикл NG+${cycle} зачищен. Легенда растёт!` : 'Подземелье зачищено. Ты — легенда.', W / 2, 215);
  ctx.fillStyle = '#ffe27a';
  ctx.font = '14px Georgia, serif';
  const lines = [
    `Уровень ${player.level} · maxHP ${player.maxHp} · ⚔+${player.atk} · 🔷+${player.startMana}`,
    `Побед: ${stats.wins} · Элита: ${stats.elites} · Кастов: ${stats.casts}`,
    `Макс. урон за ход: ${stats.maxHit} · Расходников: ${stats.used}`,
    `Золото: ${player.gold}`,
  ];
  lines.forEach((line, i) => ctx.fillText(line, W / 2, 270 + i * 30));
  button(ctx, VICTORY_BTNS.ng, `🔁 NG+${cycle + 1} (враги сильнее, награды выше)`, { font: 'bold 13px Georgia, serif' });
  button(ctx, VICTORY_BTNS.menu, 'В меню');
}

// ---------- БОЙ ----------

export function cellFromPoint(x, y) {
  const c = Math.floor(x / CELL);
  const r = Math.floor((y - BOARD_Y) / CELL);
  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return null;
  return { r, c };
}

export function spellRect(i) {
  const gap = 6;
  const row = i < SPELL_COLS ? 0 : 1;
  const col = i % SPELL_COLS;
  const w = (W - gap * (SPELL_COLS + 1)) / SPELL_COLS;
  return { x: gap + col * (w + gap), y: SPELL_Y + row * (SPELL_H + 4), w, h: SPELL_H };
}

export function spellFromPoint(x, y) {
  for (let i = 0; i < SPELLS.length; i++) {
    if (inRect(x, y, spellRect(i))) return i;
  }
  return null;
}

export function consumableRects() {
  return {
    potion: { x: 320, y: 622, w: 58, h: 22 },
    bomb: { x: 384, y: 622, w: 58, h: 22 },
    shuffle: { x: 448, y: 622, w: 58, h: 22 },
  };
}

export function consumableHit(x, y) {
  const rs = consumableRects();
  for (const k of ['potion', 'bomb', 'shuffle']) if (inRect(x, y, rs[k])) return k;
  return null;
}

export function hintRect() {
  return { x: 448, y: 644, w: 52, h: 24 };
}

export function hintHit(x, y) {
  return inRect(x, y, hintRect());
}

/** Минимальная нехватка маны до ближайшего неоткрытого по мане спела. */
function manaToSpell(p) {
  let need = null;
  for (const sp of SPELLS) {
    if (p.level < sp.unlock || p.mana >= sp.cost) continue;
    const d = sp.cost - p.mana;
    if (need === null || d < need) need = d;
  }
  return need;
}

export function drawTile(ctx, type, px, py, s, glow = false, scale = 1) {
  const cx = px + s / 2;
  const cy = py + s / 2;
  ctx.save();
  if (scale !== 1) {
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  }
  const u = s / 64;
  if (glow) {
    ctx.shadowColor = '#ffe27a';
    ctx.shadowBlur = 18;
  }
  switch (type) {
    case 'sword': {
      ctx.fillStyle = TILE_COLORS.sword;
      ctx.beginPath();
      ctx.moveTo(cx, py + 10 * u);
      ctx.lineTo(cx + 9 * u, cy + 6 * u);
      ctx.lineTo(cx, cy + 16 * u);
      ctx.lineTo(cx - 9 * u, cy + 6 * u);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7a4a2b';
      ctx.fillRect(cx - 3 * u, cy + 14 * u, 6 * u, 12 * u);
      ctx.fillStyle = '#d9d9d9';
      ctx.fillRect(cx - 10 * u, cy + 12 * u, 20 * u, 4 * u);
      break;
    }
    case 'shield': {
      ctx.fillStyle = TILE_COLORS.shield;
      ctx.beginPath();
      ctx.moveTo(cx - 13 * u, py + 14 * u);
      ctx.lineTo(cx + 13 * u, py + 14 * u);
      ctx.lineTo(cx + 13 * u, cy + 4 * u);
      ctx.lineTo(cx, py + 46 * u);
      ctx.lineTo(cx - 13 * u, cy + 4 * u);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3c4a63';
      ctx.fillRect(cx - 3 * u, py + 18 * u, 6 * u, 16 * u);
      break;
    }
    case 'mana': {
      ctx.fillStyle = TILE_COLORS.mana;
      ctx.beginPath();
      ctx.moveTo(cx, py + 10 * u);
      ctx.lineTo(cx + 13 * u, cy);
      ctx.lineTo(cx, py + 54 * u);
      ctx.lineTo(cx - 13 * u, cy);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.moveTo(cx, py + 10 * u);
      ctx.lineTo(cx + 6 * u, cy);
      ctx.lineTo(cx, cy - 8 * u);
      ctx.lineTo(cx - 6 * u, cy);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'potion': {
      ctx.fillStyle = TILE_COLORS.potion;
      ctx.beginPath();
      ctx.arc(cx, cy + 8 * u, 13 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 4 * u, py + 12 * u, 8 * u, 12 * u);
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(cx - 6 * u, py + 8 * u, 12 * u, 5 * u);
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath();
      ctx.arc(cx - 5 * u, cy + 4 * u, 3.5 * u, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'gold': {
      ctx.fillStyle = TILE_COLORS.gold;
      ctx.beginPath();
      ctx.arc(cx, cy, 14 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9a7420';
      ctx.lineWidth = 3 * u;
      ctx.beginPath();
      ctx.arc(cx, cy, 9 * u, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

function statusIcons(e) {
  const parts = [];
  if (e.bleed > 0) parts.push(`🩸${e.bleed}`);
  if (e.burn > 0) parts.push(`🔥${e.burn}`);
  if (e.weak > 0) parts.push(`🌀${e.weak}`);
  return parts.join(' ');
}

export function drawBattle(ctx, game) {
  const { player: p, enemy: e } = game;
  bg(ctx);

  // --- HUD врага (тряска при получении урона) ---
  ctx.save();
  if (game.eshake) {
    const pr = progress(game.eshake, 260);
    if (pr < 1) ctx.translate(Math.sin(pr * 25) * 7 * (1 - pr), 0);
  }
  ctx.fillStyle = '#f0c75e';
  ctx.font = 'bold 19px Georgia, serif';
  ctx.textAlign = 'left';
  let ename = e.name + (e.armor > 0 ? `  🛡${e.armor}` : '');
  const st = statusIcons(e);
  if (st) ename += '  ' + st;
  ctx.fillText(ename.slice(0, 34), 12, 24);
  ctx.fillStyle = '#9a93b8';
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Урон ${e.dmgMin}–${e.dmgMax}`, W - 12, 18);
  // интент: preroll следующего удара
  if (game.intent != null && game.state !== 'win' && game.state !== 'lose') {
    ctx.fillStyle = '#e05252';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText(`След: ${game.intent.dmg}${game.intent.empowered ? ' ☠' : ''}`, W - 12, 34);
  }
  bar(ctx, 12, 36, W - 24, 12, e.hp / e.maxHp, e.elite ? '#a03ac0' : '#c0392b');
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`HP ${e.hp}/${e.maxHp}`, W / 2, 45);
  if (e.minion && e.minion.hp > 0) {
    bar(ctx, 60, 50, W - 120, 7, e.minion.hp / e.minion.maxHp, '#7a5fc0');
    ctx.fillStyle = '#b9a8ef';
    ctx.font = '10px Georgia, serif';
    ctx.fillText(`Скелет-прислужник ${e.minion.hp}/${e.minion.maxHp}`, W / 2, 57);
  }
  ctx.font = '11px Georgia, serif';
  if (game.extraBadge) {
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.fillText('★ ДОП. ХОД — враг пропускает атаку!', W / 2, 70);
  } else if (game.enemyNote) {
    ctx.fillStyle = '#9a93b8';
    ctx.fillText(game.enemyNote.slice(0, 62), W / 2, 70);
  }
  ctx.restore();

  // --- поле (падение + свап-анимация + взрыв матчей) ---
  const fallP = game.fall ? progress(game.fall.t0, 200) : 1;
  const fallK = game.fall ? 1 - easeOutCubic(fallP) : 0;
  const sw = game.swap && progress(game.swap.t0, game.swap.dur) < 1
    ? { ...game.swap, p: easeOutCubic(progress(game.swap.t0, game.swap.dur)) }
    : null;
  const burstP = game.burst ? progress(game.burst.t0, 260) : 1;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const x = c * CELL;
      const y = BOARD_Y + r * CELL;
      ctx.fillStyle = (r + c) % 2 === 0 ? '#1a1a2e' : '#16213e';
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      const key = r + ',' + c;
      // свапающиеся клетки рисуем отдельно (интерполяция)
      if (sw && ((sw.a.r === r && sw.a.c === c) || (sw.b.r === r && sw.b.c === c))) continue;
      const dy = game.fall && game.fall.moves.get(key);
      const yOff = dy ? -dy * CELL * fallK : 0;
      const isSel = game.selected && game.selected.r === r && game.selected.c === c;
      const isHit = game.highlight && game.highlight.has(key);
      const isHint = game.hint && ((game.hint.a.r === r && game.hint.a.c === c) || (game.hint.b.r === r && game.hint.b.c === c));
      const pad = 6;
      drawTile(ctx, game.grid[r][c], x + pad, y + yOff + pad, CELL - pad * 2, isHit, isHit ? 1 + 0.12 * Math.sin(burstP * Math.PI) : 1);
      if (isHit) {
        ctx.strokeStyle = `rgba(255,226,122,${1 - burstP * 0.5})`;
        ctx.lineWidth = 2 + 3 * (1 - burstP);
        ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
      }
      if (isSel || isHint) {
        ctx.strokeStyle = isHint ? '#58c472' : '#ffe27a';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
      }
    }
  }
  // свапающиеся фишки поверх
  if (sw) {
    const pad = 6;
    for (const [from, to] of [[sw.a, sw.b], [sw.b, sw.a]]) {
      const fx = (from.c + (to.c - from.c) * sw.p) * CELL;
      const fy = BOARD_Y + (from.r + (to.r - from.r) * sw.p) * CELL;
      drawTile(ctx, game.grid[to.r][to.c], fx + pad, fy + pad, CELL - pad * 2);
    }
  }

  // всплывающие цифры
  if (game.floats) {
    const t = Date.now();
    ctx.textAlign = 'center';
    for (const f of game.floats) {
      const pr = clamp01((t - f.t0) / f.dur);
      ctx.globalAlpha = 1 - pr;
      ctx.fillStyle = f.color;
      ctx.font = 'bold 17px Georgia, serif';
      ctx.fillText(f.text, f.x, f.y - pr * 44);
    }
    ctx.globalAlpha = 1;
  }

  // --- HUD игрока ---
  let pname = `Герой · Ур.${p.level} · XP ${p.xp}/${xpNeed(p.level)}`;
  if (p.rage > 0) pname += ` · 😡${p.rage}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f0c75e';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(pname, 12, STATS_Y + 2);
  bar(ctx, 12, STATS_Y + 8, W - 24, 12, p.hp / p.maxHp, '#27ae60');
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`HP ${p.hp}/${p.maxHp}`, W / 2, STATS_Y + 17);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#cfc9b8';
  ctx.font = '13px Georgia, serif';
  const mts = manaToSpell(p);
  ctx.fillText(`🛡 ${p.armor}   🔷 ${p.mana}${mts != null ? ` (⚡${mts})` : ''}   🪙 ${p.gold}   ⚔+${p.atk + (p.rage > 0 ? 3 : 0)}`, 12, STATS_Y + 40);
  // расходники
  const rs = consumableRects();
  const items = [
    ['potion', `🧪×${p.potions}`, p.potions > 0 && p.hp < p.maxHp],
    ['bomb', `💣×${p.bombs}`, p.bombs > 0],
    ['shuffle', `🔀×${p.shuffles}`, p.shuffles > 0],
  ];
  for (const [k, label, ok] of items) {
    button(ctx, rs[k], label, { disabled: !(ok && game.state === 'player'), font: 'bold 12px Georgia, serif' });
  }

  // --- лог + подсказка ---
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9a93b8';
  ctx.font = '11px Georgia, serif';
  game.log.slice(-2).forEach((line, i) => ctx.fillText(line.slice(0, 56), 12, LOG_Y + i * 15));
  button(ctx, hintRect(), '💡', { font: '13px Georgia, serif' });

  // --- заклинания 2×4 ---
  SPELLS.forEach((sp, i) => {
    const b = spellRect(i);
    const locked = p.level < sp.unlock;
    const afford = !locked && p.mana >= sp.cost && game.state === 'player';
    ctx.fillStyle = afford ? '#2c2540' : '#1a1826';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = afford ? '#f0c75e' : '#4a4460';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.textAlign = 'center';
    if (locked) {
      ctx.fillStyle = '#4a4460';
      ctx.font = 'bold 12px Georgia, serif';
      ctx.fillText(`🔒 Ур.${sp.unlock}`, b.x + b.w / 2, b.y + 24);
    } else {
      ctx.fillStyle = afford ? '#ffe27a' : '#6a6486';
      ctx.font = 'bold 11px Georgia, serif';
      ctx.fillText(`${sp.name} 🔷${sp.cost}`, b.x + b.w / 2, b.y + 15);
      ctx.fillStyle = afford ? '#cfc9b8' : '#4a4460';
      ctx.font = '9px Georgia, serif';
      ctx.fillText(sp.desc, b.x + b.w / 2, b.y + 29);
    }
  });

  // --- тосты достижений ---
  if (game.toasts && game.toasts.length) {
    const t = game.toasts[0];
    ctx.fillStyle = 'rgba(20,26,12,.95)';
    ctx.fillRect(56, 92, W - 112, 34);
    ctx.strokeStyle = '#58c472';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(56, 92, W - 112, 34);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText(`🏆 ${t.text.slice(0, 40)}`, W / 2, 114);
  }

  // --- оверлеи результата боя ---
  if (game.state === 'win' || game.state === 'lose') {
    ctx.fillStyle = 'rgba(5,5,10,.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = game.state === 'win' ? '#ffe27a' : '#e05252';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.fillText(game.state === 'win' ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ', W / 2, H / 2 - 20);
    ctx.fillStyle = '#cfc9b8';
    ctx.font = '15px Georgia, serif';
    if (game.state === 'win' && game.rewards) {
      ctx.fillText(`${e.name} повержен!`, W / 2, H / 2 + 12);
      ctx.fillStyle = '#ffe27a';
      ctx.fillText(`+${game.rewards.xp} XP · +${game.rewards.gold} золота`, W / 2, H / 2 + 38);
      if (game.pendingLevels > 0) {
        ctx.fillStyle = '#58c472';
        ctx.fillText(`Новый уровень! (${game.pendingLevels})`, W / 2, H / 2 + 62);
      }
      if (game.flawless) {
        ctx.fillStyle = '#8fa3bf';
        ctx.fillText('Без царапин!', W / 2, H / 2 + 84);
      }
    } else {
      ctx.fillText(app_hardcoreHint(game), W / 2, H / 2 + 12);
    }
    ctx.fillStyle = '#9a93b8';
    ctx.font = '14px Georgia, serif';
    ctx.fillText(game.state === 'win' ? 'Клик — дальше' : 'Клик — дальше', W / 2, H / 2 + 110);
  }

  if (game.state === 'enemy') {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e05252';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.fillText('ход врага...', W - 12, STATS_Y + 2);
  }
}

function app_hardcoreHint(game) {
  return game.hardcore ? 'Хардкор: забег окончен...' : 'Герой пал... HP восстановлено.';
}
