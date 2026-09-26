// save.js — сейв забега в localStorage. Ключ версионирован.
// Автосейв: старт боя, победа, покупка, level-up, событие, NG+.

const KEY = 'dungeon-match-save-v1';
const MUTE_KEY = 'dungeon-match-muted';

export function defaultStats() {
  return { wins: 0, casts: 0, used: 0, maxHit: 0, elites: 0, lich: 0 };
}

export function saveGame(state) {
  try {
    const p = state.player;
    const data = {
      v: 2,
      level: p.level, xp: p.xp, hp: p.hp, maxHp: p.maxHp,
      atk: p.atk, startMana: p.startMana, gold: p.gold,
      potions: p.potions, bombs: p.bombs, shuffles: p.shuffles,
      row: state.row, col: state.col,
      cycle: state.cycle || 0, hardcore: !!state.hardcore,
      stats: state.stats || defaultStats(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /* приватный режим — игра продолжается без сейва */ }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d.row !== 'number' || typeof d.level !== 'number') return null;
    return d;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Применяет данные сейва, возвращает {row, col, cycle, hardcore, stats}. */
export function applySave(player, data) {
  player.level = data.level;
  player.xp = data.xp;
  player.hp = Math.min(data.hp, data.maxHp);
  player.maxHp = data.maxHp;
  player.atk = data.atk;
  player.startMana = data.startMana;
  player.gold = data.gold;
  player.potions = data.potions ?? 1;
  player.bombs = data.bombs ?? 0;
  player.shuffles = data.shuffles ?? 0;
  player.rage = 0;
  return {
    row: data.row ?? 0,
    col: data.col ?? 0,
    cycle: data.cycle ?? 0,
    hardcore: !!data.hardcore,
    stats: data.stats || defaultStats(),
  };
}

export function loadMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

export function storeMuted(m) {
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* ignore */ }
}
