// player.js — состояние игрока.
// HP/расходники переносятся между боями; мана/броня сбрасываются в начале боя.

export function createPlayer() {
  return {
    hp: 50,
    maxHp: 50,
    armor: 0,
    mana: 0,
    atk: 0,
    gold: 0,
    level: 1,
    xp: 0,
    startMana: 0,
    potions: 1,  // +25 HP в бою, макс. 3
    bombs: 0,    // 💣 25 урона, макс. 3
    shuffles: 0, // 🔀 перемешать поле, макс. 3
    rage: 0,     // ходы берсерка (+3 к мечам)
  };
}

/** Сброс боевых (не персистентных) полей в начале боя. */
export function resetForBattle(p) {
  p.mana = p.startMana;
  p.armor = 0;
  p.rage = 0;
}

/** Порог level-up: 100 × текущий уровень. */
export function xpNeed(level) {
  return 100 * level;
}

/** Начисляет XP, возвращает число полученных уровней. */
export function addXp(player, amount) {
  player.xp += amount;
  let ups = 0;
  while (player.xp >= xpNeed(player.level)) {
    player.xp -= xpNeed(player.level);
    player.level++;
    ups++;
  }
  return ups;
}

/** Выбор при level-up: 'hp' | 'atk' | 'mana'. */
export function applyLevelChoice(player, choice) {
  if (choice === 'hp') {
    player.maxHp += 10;
    player.hp = Math.min(player.maxHp, player.hp + 10);
    return '+10 maxHP';
  }
  if (choice === 'atk') {
    player.atk += 1;
    return '+1 атака';
  }
  player.startMana += 2;
  return '+2 маны в начале боя';
}

export function heal(player, amount) {
  player.hp = Math.min(player.maxHp, player.hp + amount);
}

export function hurt(player, rawDamage) {
  const absorbed = Math.min(player.armor, rawDamage);
  const dealt = rawDamage - absorbed;
  player.hp = Math.max(0, player.hp - dealt);
  return { absorbed, dealt };
}
