// spells.js — заклинания за ману. Каст возвращает {msg, dmg}.
// Открытия: 3 базовых сразу, кожа со 2-го, молния с 3-го, вамп/берсерк с 4-го,
// цепная молния с 6-го (NG+).

function directHp(game, amount) {
  game.enemy.hp = Math.max(0, game.enemy.hp - amount);
}

export const SPELLS = [
  {
    id: 'fireball', name: 'Фаербол', cost: 15, desc: '12 ур. +ожог', unlock: 1,
    cast(game) {
      game.player.mana -= 15;
      directHp(game, 12);
      game.enemy.burn = 2;
      return { msg: 'Фаербол! 12 урона, враг горит.', dmg: 12 };
    },
  },
  {
    id: 'heal', name: 'Лечение', cost: 12, desc: '+15 HP', unlock: 1,
    cast(game) {
      game.player.mana -= 12;
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 15);
      return { msg: 'Лечение +15 HP.', dmg: 0 };
    },
  },
  {
    id: 'shield', name: 'Щит', cost: 10, desc: '+10 брони', unlock: 1,
    cast(game) {
      game.player.mana -= 10;
      game.player.armor += 10;
      return { msg: 'Каменный щит +10 брони.', dmg: 0 };
    },
  },
  {
    id: 'skin', name: 'Кожа', cost: 14, desc: '+14 бр.+слабость', unlock: 2,
    cast(game) {
      game.player.mana -= 14;
      game.player.armor += 14;
      game.enemy.weak = Math.max(game.enemy.weak, 2);
      return { msg: 'Каменная кожа! +14 брони, враг ослаблен.', dmg: 0 };
    },
  },
  {
    id: 'lightning', name: 'Молния', cost: 20, desc: '20 ур.', unlock: 3,
    cast(game) {
      game.player.mana -= 20;
      directHp(game, 20);
      game.enemy.armor = 0;
      return { msg: 'Молния! 20 урона, броня врага сброшена.', dmg: 20 };
    },
  },
  {
    id: 'vampire', name: 'Вампиризм', cost: 18, desc: '8 ур.+8', unlock: 4,
    cast(game) {
      game.player.mana -= 18;
      directHp(game, 8);
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 8);
      return { msg: 'Вампиризм! 8 урона и +8 HP.', dmg: 8 };
    },
  },
  {
    id: 'berserk', name: 'Берсерк', cost: 16, desc: 'мечи +3, 4 хода', unlock: 4,
    cast(game) {
      game.player.mana -= 16;
      game.player.rage = 4;
      return { msg: 'Берсерк! Мечи +3 урона на 4 хода.', dmg: 0 };
    },
  },
  {
    id: 'chain', name: 'Цепь', cost: 26, desc: '30 ур.+слабость', unlock: 6,
    cast(game) {
      game.player.mana -= 26;
      directHp(game, 30);
      game.enemy.armor = 0;
      game.enemy.weak = Math.max(game.enemy.weak, 2);
      return { msg: 'Цепная молния! 30 урона, враг ослаблен.', dmg: 30 };
    },
  },
];

/** Открыто ли заклинание для игрока. */
export function isUnlocked(spell, player) {
  return player.level >= spell.unlock;
}
