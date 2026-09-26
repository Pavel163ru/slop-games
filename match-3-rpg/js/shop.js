// shop.js — лавка: с карты и после сокровищницы.

export const MAX_STACK = 3;
export const POTION_HEAL = 25;
export const BOMB_DMG = 25;

export const SHOP_ITEMS = [
  {
    id: 'potion', name: '🧪 Зелье в бой', desc: `+${POTION_HEAL} HP в бою (макс. ${MAX_STACK})`,
    price: 30,
    canBuy(p) { return p.potions < MAX_STACK && p.gold >= 30; },
    whyNot(p) {
      if (p.potions >= MAX_STACK) return 'уже максимум';
      return 'не хватает золота';
    },
    buy(p) { p.gold -= 30; p.potions++; return 'Куплено зелье.'; },
  },
  {
    id: 'bomb', name: '💣 Бомба', desc: `${BOMB_DMG} урона в бою (макс. ${MAX_STACK})`,
    price: 50,
    canBuy(p) { return p.bombs < MAX_STACK && p.gold >= 50; },
    whyNot(p) {
      if (p.bombs >= MAX_STACK) return 'уже максимум';
      return 'не хватает золота';
    },
    buy(p) { p.gold -= 50; p.bombs++; return 'Куплена бомба.'; },
  },
  {
    id: 'shuffle', name: '🔀 Перемешка', desc: `Новое поле в бою (макс. ${MAX_STACK})`,
    price: 40,
    canBuy(p) { return p.shuffles < MAX_STACK && p.gold >= 40; },
    whyNot(p) {
      if (p.shuffles >= MAX_STACK) return 'уже максимум';
      return 'не хватает золота';
    },
    buy(p) { p.gold -= 40; p.shuffles++; return 'Куплена перемешка.'; },
  },
  {
    id: 'heal', name: '❤ Лечение', desc: 'Восстановить HP полностью',
    price: 25,
    canBuy(p) { return p.hp < p.maxHp && p.gold >= 25; },
    whyNot(p) {
      if (p.hp >= p.maxHp) return 'HP полное';
      return 'не хватает золота';
    },
    buy(p) { p.gold -= 25; p.hp = p.maxHp; return 'HP восстановлено.'; },
  },
  {
    id: 'maxhp', name: '💪 Здоровье', desc: '+10 maxHP навсегда',
    price: 100,
    canBuy(p) { return p.gold >= 100; },
    whyNot() { return 'не хватает золота'; },
    buy(p) { p.gold -= 100; p.maxHp += 10; p.hp += 10; return '+10 maxHP!'; },
  },
];
