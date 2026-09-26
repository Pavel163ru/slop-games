// ach.js — достижения в отдельном ключе localStorage.

const KEY = 'dungeon-match-ach-v1';

export const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'Первая кровь', desc: 'Первая победа в бою' },
  { id: 'exterminator', name: 'Истребитель', desc: '10 побед суммарно' },
  { id: 'mage', name: 'Маг', desc: '25 кастов заклинаний' },
  { id: 'flawless', name: 'Без царапин', desc: 'Победа без полученного урона' },
  { id: 'elite', name: 'Охотник на элиту', desc: 'Убит элитник ★' },
  { id: 'rich', name: 'Богач', desc: '300 золота в кошельке' },
  { id: 'alchemist', name: 'Алхимик', desc: 'Использовано 5 расходников' },
  { id: 'lich', name: 'Убийца Лича', desc: 'Лич повержен' },
];

export function loadAch() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function storeAch(set) {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

/**
 * Проверяет достижения по статистике забега.
 * @param {Set} owned уже полученные
 * @param {object} st статистика {wins, casts, used, elites, lich, gold}
 * @param {boolean} flawless победа без урона только что?
 * @returns {string[]} id новых достижений
 */
export function checkAch(owned, st, flawless = false) {
  const fresh = [];
  const give = (id) => { if (!owned.has(id)) { owned.add(id); fresh.push(id); } };
  if (st.wins >= 1) give('first_blood');
  if (st.wins >= 10) give('exterminator');
  if (st.casts >= 25) give('mage');
  if (flawless) give('flawless');
  if (st.elites >= 1) give('elite');
  if (st.gold >= 300) give('rich');
  if (st.used >= 5) give('alchemist');
  if (st.lich >= 1) give('lich');
  if (fresh.length) storeAch(owned);
  return fresh;
}

export function achById(id) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
