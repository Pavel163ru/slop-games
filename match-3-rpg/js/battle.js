// battle.js — маппинг матчей в эффекты, криты, статусы, броня/миньон врага.

export function multiplier(len) {
  if (len >= 5) return 3;
  if (len === 4) return 2;
  return 1;
}

/**
 * Урон врагу: сначала скелет-прислужник (мясной щит от мечей),
 * потом броня, потом HP.
 * @param {object} opts {ignoreArmor, skipMinion} — спеллы бьют мимо миньона
 */
export function damageEnemy(enemy, amount, opts = {}) {
  let left = amount;
  if (!opts.skipMinion && enemy.minion && enemy.minion.hp > 0) {
    const eaten = Math.min(enemy.minion.hp, left);
    enemy.minion.hp -= eaten;
    left -= eaten;
    if (enemy.minion.hp <= 0) enemy.minionDead = true;
  }
  if (!opts.ignoreArmor && enemy.armor > 0) {
    const eaten = Math.min(enemy.armor, left);
    enemy.armor -= eaten;
    left -= eaten;
  }
  enemy.hp = Math.max(0, enemy.hp - left);
  return left; // сколько прошло в HP
}

/** Тик статусов в начале хода врага: bleed 2, burn 3 (прямо в HP). */
export function tickStatuses(enemy) {
  let dmg = 0;
  const parts = [];
  if (enemy.bleed > 0) {
    dmg += 2;
    enemy.bleed--;
    parts.push('кровотечение 2');
    if (enemy.bleed === 0) parts.push('кровь остановилась');
  }
  if (enemy.burn > 0) {
    dmg += 3;
    enemy.burn--;
    parts.push('ожог 3');
    if (enemy.burn === 0) parts.push('пламя погасло');
  }
  if (enemy.weak > 0) enemy.weak--;
  if (dmg > 0) enemy.hp = Math.max(0, enemy.hp - dmg);
  return { dmg, text: parts.join(', ') };
}

/**
 * Применяет группы матчей. Мутирует player/enemy.
 * Матч-5+: 25% крит ×2 на группу. Мечи-4+: кровотечение, щиты-4+: слабость.
 * Возвращает сводку для лога/анимаций.
 */
export function applyMatchEffects(game, matches) {
  const p = game.player;
  const e = game.enemy;
  let damage = 0, armor = 0, mana = 0, heal = 0, gold = 0;
  let extraTurn = false;
  let crit = false;
  let bled = false;
  let weakened = false;

  for (const m of matches) {
    let mult = multiplier(m.len);
    if (m.len >= 4) extraTurn = true;
    if (m.len >= 5 && Math.random() < 0.25) {
      mult *= 2;
      crit = true;
    }
    switch (m.type) {
      case 'sword': {
        const rage = p.rage > 0 ? 3 : 0;
        const d = (3 + p.atk + rage) * mult;
        damage += d;
        m.dealt = d;
        if (m.len >= 4 && e.hp > 0) {
          e.bleed = 3;
          bled = true;
        }
        break;
      }
      case 'shield':
        armor += 3 * mult;
        if (m.len >= 4) {
          e.weak = Math.max(e.weak, 2);
          weakened = true;
        }
        break;
      case 'mana': mana += 3 * mult; break;
      case 'potion': heal += 3 * mult; break;
      case 'gold': gold += 3 * mult; break;
    }
  }

  if (damage > 0) damageEnemy(e, damage);
  p.armor += armor;
  p.mana += mana;
  if (heal > 0) p.hp = Math.min(p.maxHp, p.hp + heal);
  p.gold += gold;
  if (p.rage > 0) p.rage--;

  return { damage, armor, mana, heal, gold, extraTurn, crit, bled, weakened, count: matches.length };
}

/** Краткая строка в лог по итогам каскадного шага. */
export function describeStep(matches, res) {
  const parts = matches.map((m) => `${m.len}x ${m.type}`);
  let s = parts.join(' + ');
  const fx = [];
  if (res.damage > 0) fx.push(`-${res.damage} вр.`);
  if (res.armor > 0) fx.push(`+${res.armor} бр.`);
  if (res.mana > 0) fx.push(`+${res.mana} маны`);
  if (res.heal > 0) fx.push(`+${res.heal} HP`);
  if (res.gold > 0) fx.push(`+${res.gold} зол.`);
  if (fx.length) s += ' → ' + fx.join(', ');
  if (res.crit) s += ' КРИТ ×2!';
  if (res.bled) s += ' 🩸кровотечение';
  if (res.weakened) s += ' 🌀слабость';
  if (res.extraTurn) s += ' ★ доп. ход!';
  return s;
}
