// events.js — случайные события между боями (возврат на карту, шанс 35%).
// Событие: {id, text, opts: [{label, can?, apply}]} — can/apply мутируют player.

export const EVENT_CHANCE = 0.35;

export const EVENTS = [
  {
    id: 'altar',
    text: 'Тёмный алтарь жаждет крови. Отдашь здоровье за опыт?',
    opts: [
      {
        label: '-12 HP → +50 XP',
        can: (p) => p.hp > 12,
        whyNot: () => 'мало HP',
        apply: (p) => { p.hp -= 12; return 0; },
        xp: 50,
      },
      { label: 'Уйти', apply: () => 0 },
    ],
  },
  {
    id: 'merchant',
    text: 'Раненый торговец: «Зелье за 20 золота, герой?»',
    opts: [
      {
        label: 'Купить 🧪 за 20',
        can: (p) => p.gold >= 20 && p.potions < 3,
        whyNot: (p) => (p.potions >= 3 ? 'уже максимум' : 'нет золота'),
        apply: (p) => { p.gold -= 20; p.potions++; return 0; },
      },
      { label: 'Уйти', apply: () => 0 },
    ],
  },
  {
    id: 'trap',
    text: 'Щелчок под ногой — ловушка! Болт вонзается в плечо.',
    opts: [
      {
        label: 'Терпеть (-10 HP)',
        apply: (p) => { p.hp = Math.max(1, p.hp - 10); return 0; },
      },
    ],
  },
  {
    id: 'cache',
    text: 'За расшатанным камнем — тайник с золотом!',
    opts: [
      {
        label: 'Забрать +35 🪙',
        apply: (p) => { p.gold += 35; return 0; },
      },
    ],
  },
  {
    id: 'well',
    text: 'Подземный колодец с чистой водой. Напиться?',
    opts: [
      {
        label: 'Пить (HP полностью)',
        can: (p) => p.hp < p.maxHp,
        whyNot: () => 'HP полное',
        apply: (p) => { p.hp = p.maxHp; return 0; },
      },
      { label: 'Уйти', apply: () => 0 },
    ],
  },
];

export function rollEvent() {
  if (Math.random() > EVENT_CHANCE) return null;
  return EVENTS[(Math.random() * EVENTS.length) | 0];
}
