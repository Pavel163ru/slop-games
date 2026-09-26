// enemies.js — таблица врагов + структура подземелья с ветвлениями.
// Ветки: ряды с 2 узлами (обычный / элитный / альтернативный путь), сокровищница.

export const ENEMIES = {
  rat:      { id: 'rat',      name: 'Крыса',             hp: 40,  dmgMin: 6,  dmgMax: 8,  xp: 40,  gold: 30 },
  bat:      { id: 'bat',      name: 'Летучая мышь',      hp: 48,  dmgMin: 7,  dmgMax: 9,  xp: 55,  gold: 35 },
  skeleton: { id: 'skeleton', name: 'Скелет-воин',       hp: 62,  dmgMin: 9,  dmgMax: 12, xp: 75,  gold: 45 },
  archer:   { id: 'archer',   name: 'Скелет-лучник',     hp: 58,  dmgMin: 11, dmgMax: 13, xp: 85,  gold: 50,
              pierce: 2, special: 'Игнорирует 2 брони' },
  slime:    { id: 'slime',    name: 'Слайм',             hp: 78,  dmgMin: 8,  dmgMax: 10, xp: 105, gold: 55,
              regen: 5, special: 'Лечится +5 каждый 3-й ход' },
  cultist:  { id: 'cultist',  name: 'Культист',          hp: 88,  dmgMin: 12, dmgMax: 15, xp: 125, gold: 65 },
  knight:   { id: 'knight',   name: 'Тёмный рыцарь',     hp: 118, dmgMin: 14, dmgMax: 18, xp: 160, gold: 80,
              armor: 10, special: 'Начинает с бронёй 10' },
  necro:    { id: 'necro',    name: 'Некромант',         hp: 110, dmgMin: 15, dmgMax: 19, xp: 185, gold: 90,
              summonEvery: 3, special: 'Призывает скелета каждые 3 хода' },
  guard:    { id: 'guard',    name: 'Страж подземелья',  hp: 148, dmgMin: 17, dmgMax: 21, xp: 220, gold: 100 },
  lich:     { id: 'lich',     name: 'ЛИЧ (босс)',        hp: 190, dmgMin: 20, dmgMax: 25, xp: 300, gold: 180,
              powerEvery: 4, special: 'Каждая 4-я атака ×1.5' },
};

// Ряды подземелья. Узел: {e} — бой, {e, elite} — элитник (×2 награды),
// {treasure, gold} — сокровищница без боя.
export const DUNGEON = [
  { nodes: [{ e: 'rat' }] },
  { nodes: [{ e: 'bat' }] },
  { nodes: [{ e: 'skeleton' }, { e: 'skeleton', elite: true }] },
  { nodes: [{ e: 'archer' }] },
  { nodes: [{ treasure: true, gold: 90 }] },
  { nodes: [{ e: 'slime' }, { e: 'cultist' }] },
  { nodes: [{ e: 'knight' }] },
  { nodes: [{ e: 'necro' }] },
  { nodes: [{ e: 'guard' }, { e: 'guard', elite: true }] },
  { nodes: [{ e: 'lich' }] },
];

export const LAST_ROW = DUNGEON.length - 1;

/**
 * Создаёт врага с учётом модификаторов.
 * @param {object} node узел подземелья {e, elite?, treasure?}
 * @param {object} opts {cycle} — цикл NG+ (0 = первый забег), {hardcore}
 */
export function createEnemy(node, opts = {}) {
  const { cycle = 0, hardcore = false } = opts;
  const base = ENEMIES[node.e];
  if (!base) throw new Error('unknown enemy: ' + node.e);
  const e = { ...base, maxHp: base.hp, armor: base.armor || 0, turns: 0 };
  if (node.elite) {
    e.name += ' ★';
    e.hp = e.maxHp = Math.round(base.hp * 1.5);
    e.dmgMin += 2;
    e.dmgMax += 2;
    e.xp *= 2;
    e.gold *= 2;
    e.elite = true;
    e.special = ((base.special || '') + ' · Элитник: ×2 награда').trim().replace(/^· /, '');
  }
  if (cycle > 0) { // NG+: +35% HP, +25% урона, +20% наград за цикл
    e.hp = e.maxHp = Math.round(e.hp * Math.pow(1.35, cycle));
    e.dmgMin = Math.round(e.dmgMin * Math.pow(1.25, cycle));
    e.dmgMax = Math.round(e.dmgMax * Math.pow(1.25, cycle));
    e.xp = Math.round(e.xp * Math.pow(1.2, cycle));
    e.gold = Math.round(e.gold * Math.pow(1.2, cycle));
  }
  if (hardcore) {
    e.hp = e.maxHp = Math.round(e.hp * 1.15);
  }
  // статусы и миньон
  e.bleed = 0;
  e.burn = 0;
  e.weak = 0;
  e.minion = null;
  return e;
}

export function rollDamage(enemy) {
  const span = enemy.dmgMax - enemy.dmgMin + 1;
  return enemy.dmgMin + ((Math.random() * span) | 0);
}
