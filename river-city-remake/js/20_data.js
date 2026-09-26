/* 20_data.js — контент: враги, районы, товары, приёмы, реплики. Чистые данные. */
(function (G) {
  'use strict';

  var D = {};
  G.Data = D;

  /* ---------------- стартовые параметры героя ---------------- */
  D.startPlayer = {
    name: 'АЛЕКС',
    hp: 60, maxHp: 60,
    atk: 8, def: 4, spd: 52, sta: 40, maxSta: 40,
    money: 25
  };

  /* ---------------- враги ---------------- */
  D.enemies = {
    punk:     { name: 'ПАНК',      spec: 'punk',     hp: 34,  atk: 7,  def: 2,  spd: 38, money: [4, 9],   ai: 'brawler',  taunt: 'punk' },
    punkB:    { name: 'БАНДАНИТ',  spec: 'punkB',    hp: 40,  atk: 8,  def: 3,  spd: 40, money: [5, 11],  ai: 'brawler',  taunt: 'punk' },
    skin:     { name: 'СКИНХЕД',   spec: 'skinhead', hp: 46,  atk: 9,  def: 5,  spd: 36, money: [7, 13],  ai: 'brawler',  taunt: 'skin' },
    goth:     { name: 'ГОТ',       spec: 'goth',     hp: 32,  atk: 8,  def: 2,  spd: 50, money: [6, 12],  ai: 'kicker',   taunt: 'goth' },
    jock:     { name: 'КАЧОК',     spec: 'jock',     hp: 66,  atk: 11, def: 7,  spd: 34, money: [11, 19], ai: 'grabber',  taunt: 'jock' },
    punkess:  { name: 'ПАНКЕССА',  spec: 'chick',    hp: 36,  atk: 8,  def: 3,  spd: 48, money: [8, 14],  ai: 'kicker',   taunt: 'goth' },
    student:  { name: 'СТУДЕНТ',   spec: 'student',  hp: 40,  atk: 8,  def: 4,  spd: 42, money: [8, 15],  ai: 'brawler',  taunt: 'school' },
    teacher:  { name: 'УЧИТЕЛЬ',   spec: 'teacher',  hp: 58,  atk: 10, def: 6,  spd: 38, money: [12, 20], ai: 'grabber',  taunt: 'school' },
    worker:   { name: 'РАБОТЯГА',  spec: 'worker',   hp: 62,  atk: 12, def: 8,  spd: 36, money: [14, 24], ai: 'brawler',  taunt: 'work' },
    yakuza:   { name: 'ЯКУДЗА',    spec: 'yakuza',   hp: 72,  atk: 14, def: 8,  spd: 44, money: [20, 34], ai: 'grabber',  taunt: 'yakuza' },
    ninja:    { name: 'НИНДЗЯ',    spec: 'ninja',    hp: 54,  atk: 13, def: 5,  spd: 58, money: [18, 30], ai: 'kicker',   taunt: 'ninja' },

    /* боссы */
    rat:      { name: 'КРЫСА',     spec: 'rat',      hp: 100, atk: 12, def: 5,  spd: 46, money: [70, 100], ai: 'boss', boss: true, taunt: 'bossrat' },
    tony:     { name: 'ТОНИ',      spec: 'tony',     hp: 155, atk: 15, def: 8,  spd: 40, money: [110, 150], ai: 'boss', boss: true, taunt: 'bosstony' },
    hulk:     { name: 'ГРОМИЛА',   spec: 'hulk',     hp: 215, atk: 18, def: 11, spd: 34, money: [160, 210], ai: 'boss', boss: true, taunt: 'bosshulk' },
    blade:    { name: 'БЛЭЙД',     spec: 'blade',    hp: 265, atk: 21, def: 12, spd: 56, money: [220, 280], ai: 'boss', boss: true, taunt: 'bossblade' },
    satoru:   { name: 'САТОРУ',    spec: 'satoru',   hp: 360, atk: 25, def: 15, spd: 50, money: [400, 500], ai: 'boss', boss: true, taunt: 'bosssatoru' }
  };

  /* ---------------- реплики (в духе легендарной локализации) ---------------- */
  D.taunts = {
    punk:   ['ЭЙ, ТЫ ЧЁ, КОСОЙ?', 'МОЯ БАБКА ДЕРЁТСЯ ЛУЧШЕ!', 'БРРР! ЗАМЁРЗ!', 'УЙДИ С МОЕЙ УЛИЦЫ!', 'ТВОЙ КУЛАК ЯРОСТИ ЛЕДЕНИТ МНЕ КРОВЬ!', 'ПОГОВОРИМ КАК МУЖЧИНЫ? НЕТ?'],
    skin:   ['ЛЫСЫЙ — ЭТО СТИЛЬ!', 'МОЙ ЛОБ КРЕПЧЕ ТВОЕГО КУЛАКА!', 'ГРРРР-ЯЯЯ!', 'СДАВАЙСЯ, ПОКА ЦЕЛ!'],
    goth:   ['ТЫ ТАКОЙ... ГРОМКИЙ.', 'ЖИЗНЬ — ЭТО БОЛЬ. А ТЫ — ЕЁ ИСТОЧНИК.', 'МОЯ ТЕНЬ ТЕБЯ СЪЕСТ.', 'БЛЭ-Э-Э-Э!'],
    jock:   ['ЖМИ! ЖМИ! ЖМИ!', 'МОИ БИЦЕПСЫ НЕ ЗАМЕТИЛИ ТЕБЯ!', 'ТРЕНИРОВКА НАЧАЛАСЬ!', 'ЗАПИШИСЬ В КАЧАЛКУ!'],
    school: ['ТЫ ОПОЗДАЛ НА УРОК!', 'ДНЕВНИК ПРИНЁС?', 'ВЫЗОВУ РОДИТЕЛЕЙ!', 'ФИЗРА ОТМЕНЯЕТСЯ!'],
    work:   ['КАСКА НАДЕТА, СОВЕСТЬ СНЯТА!', 'ОБЪЕКТ НЕ СДАН!', 'КУДА ПРЁШЬ, СТУДЕНТ?!', 'У НАС ТУТ СТРОЙКА ВЕКА!'],
    yakuza: ['ТЫ ОБИДЕЛ МОЕГО БРАТА.', 'ЧЕСТЬ ТРЕБУЕТ КРОВИ.', 'МОЙ БОСС БУДЕТ НЕДОВОЛЕН.', 'ГОВОРИТЬ БУДЕМ ИЛИ СРАЗУ?'],
    ninja:  ['ТЫ МЕНЯ НЕ ВИДЕЛ.', 'ТЕНЬ БЫСТРЕЕ МЫСЛИ.', '...', 'СМЕРТЬ БЕСШУМНА.'],
    bossrat:    ['Я КРЫСА. Я ПРАВЛЮ ЭТИМ БЕРЕГОМ!', 'МОИ ЗУБЫ ОСТРЕЕ ТВОЕГО УМА!', 'ЗДЕСЬ МОЯ ПОМОЙКА!'],
    bosstony:   ['Я ТОНИ. У МЕНЯ ЕСТЬ ТРУБЫ!', 'САНТЕХНИКА — ЭТО СИЛА!', 'ХОЧЕШЬ КЛЮЧ ПО ЛБУ?'],
    bosshulk:   ['Я ГРОМИЛА. Я НЕ УЧУ, Я ЛОМАЮ!', 'ШКОЛА ЗАКРЫТА НА РЕМОНТ!', 'МОЙ КУЛАК — МОЙ ДИПЛОМ!'],
    bossblade:  ['Я БЛЭЙД. ТОЧНЕЕ НЕ БЫВАЕТ.', 'СТАЛЬ ПОЁТ, КОГДА Я ЕЮ МАШУ!', 'УПАДЁШЬ — НЕ ВСТАНЕШЬ!'],
    bosssatoru: ['Я САТОРУ. ГОРОД МОЙ.', 'ТЫ ДОШЁЛ ДАЛЕКО. ЗРЯ.', 'С ВЕРШИНЫ ВИДНО ВСЁ. ДАЖЕ ТВОЙ КОНЕЦ.']
  };

  D.recruitLines = [
    'ЛАДНО, ТЫ НОРМАЛЬНЫЙ. Я С ТОБОЙ.',
    'ХОЧЕШЬ ДРАКУ? Я В ДОЛЕ!',
    'МОЯ БАНДА ТУПАЯ. БУДУ С ТОБОЙ.',
    'ТЫ СИЛЬНЫЙ. Я СЛАБЫЙ. ВОЗЬМИ МЕНЯ.',
    'У МЕНЯ ЕСТЬ ЗУБ НА КРЫСУ. ПОШЛИ.'
  ];
  D.recruitNo = ['ЕЩЁ НЕ ВСТАЛ.', 'НЕ СЕГОДНЯ.', 'Я ЗАНЯТ. ЛЕЖУ.'];

  /* ---------------- приёмы ----------------
     rect: dx — вынос вперёд от центра, w — длина, hd — полуглубина, zMin/zMax — полоса высот */
  D.techs = {
    stone: {
      name: 'КАМЕННЫЕ РУКИ', cost: 18, dur: 0.62, active: [0.30, 0.44], pose: 'tech',
      dmg: 30, kb: 210, stun: 0.5, knock: true, breakGuard: true, sfx: 'heavy',
      rect: { dx: 7, w: 22, hd: 11, zMin: 0, zMax: 28 },
      desc: 'Медленный замах. Ломает блок и валит с ног. Бьёт больнее всех.'
    },
    dragon: {
      name: 'ДРАКОНИЙ ШАГ', cost: 14, dur: 0.50, active: [0.16, 0.34], pose: 'kickH',
      dmg: 15, kb: 170, stun: 0.35, knock: true, lunge: 190, hitAll: true, sfx: 'kick',
      rect: { dx: 6, w: 24, hd: 11, zMin: 0, zMax: 40 },
      desc: 'Прыжок вперёд с ударом ногой. Сбивает всех, кто попался на пути.'
    },
    slam: {
      name: 'ГРАНД-СЛЭМ', cost: 22, dur: 0.74, active: [0.30, 0.44], pose: 'grab',
      dmg: 40, kb: 260, stun: 0.9, knock: true, breakGuard: true, sfx: 'heavy',
      rect: { dx: 4, w: 15, hd: 9, zMin: 0, zMax: 22 },
      desc: 'Захват и бросок через бедро. Самый болезненный приём в игре.'
    },
    hyper: {
      name: 'ГИПЕР-КУЛАК', cost: 16, dur: 0.72, active: [0.14, 0.62], pose: 'punch1',
      dmg: 6, hits: 7, kb: 40, stun: 0.14, sfx: 'punch',
      rect: { dx: 6, w: 17, hd: 10, zMin: 0, zMax: 28 },
      desc: 'Семь быстрых ударов подряд. Отлично ломает защиту толпы.'
    },
    iron: {
      name: 'ЖЕЛЕЗНЫЙ ЛОБ', cost: 20, dur: 0.56, active: [0.20, 0.38], pose: 'charge',
      dmg: 28, kb: 230, stun: 0.6, knock: true, lunge: 220, recoil: 4, sfx: 'heavy',
      rect: { dx: 6, w: 19, hd: 10, zMin: 0, zMax: 26 },
      desc: 'Таран головой. Сбивает дыхание — но и тебе немного достаётся.'
    }
  };
  D.techOrder = ['stone', 'dragon', 'slam', 'hyper', 'iron'];

  /* ---------------- товары ---------------- */
  D.items = {
    bun:     { name: 'БУЛОЧКА',     kind: 'food', price: 3,   heal: 15, desc: 'Мягкая. Пахнет детством.' },
    cola:    { name: 'КОЛА',        kind: 'food', price: 5,   heal: 12, desc: 'Пузырьки бодрят, сахар убивает.' },
    milk:    { name: 'МОЛОКО',      kind: 'food', price: 6,   heal: 20, def: 1, desc: 'Кости крепнут. +1 стойкость.' },
    rice:    { name: 'РИС',         kind: 'food', price: 8,   heal: 32, desc: 'Простая, честная еда.' },
    egg:     { name: 'ЯЙЦО',        kind: 'food', price: 10,  heal: 26, sta: 3, desc: 'Белок! +3 выносливость.' },
    curry:   { name: 'КАРРИ',       kind: 'food', price: 14,  heal: 46, atk: 1, desc: 'Острое. +1 силата.' },
    fish:    { name: 'РЫБА',        kind: 'food', price: 12,  heal: 34, spd: 1, desc: 'Для ума и ног. +1 скорость.' },
    ramen:   { name: 'РАМЕН',       kind: 'food', price: 18,  heal: 60, hp: 3, desc: 'Горячий. +3 к максимуму HP.' },
    sushi:   { name: 'СУШИ',        kind: 'food', price: 24,  heal: 52, spd: 2, desc: 'Дорого и быстро. +2 скорость.' },
    steak:   { name: 'СТЕЙК',       kind: 'food', price: 32,  heal: 85, atk: 2, desc: 'Мясо делает мужчину. +2 силата.' },

    bandage: { name: 'БИНТ',        kind: 'med',  price: 10,  heal: 40, desc: 'Затянет рану, не затянет душу.' },
    medkit:  { name: 'АПТЕЧКА',     kind: 'med',  price: 26,  heal: 110, desc: 'Полная перевязка на ходу.' },
    energy:  { name: 'ЭНЕРГЕТИК',   kind: 'med',  price: 16,  sta: 999, desc: 'Мгновенно восстанавливает выносливость.' },

    wrench:  { name: 'РАЗВОДНОЙ КЛЮЧ', kind: 'gear', price: 60,  atk: 3, desc: 'Тяжёлый. +3 силата.' },
    pipe:    { name: 'ВОДОПРОВОДНАЯ ТРУБА', kind: 'gear', price: 85, atk: 5, desc: 'Классика жанра. +5 силата.' },
    boots:   { name: 'КРОССОВКИ',   kind: 'gear', price: 95,  spd: 4, desc: 'Быстрее ветра. +4 скорость.' },
    glove:   { name: 'ПЕРЧАТКИ',    kind: 'gear', price: 110, atk: 6, desc: 'Бьёшь чище. +6 силата.' },
    vest:    { name: 'ЖИЛЕТ',       kind: 'gear', price: 130, def: 6, desc: 'Держит удар. +6 стойкость.' },

    book_stone:  { name: 'КНИГА: КАМЕННЫЕ РУКИ',  kind: 'book', price: 80,  tech: 'stone',  desc: 'Научит приёму «Каменные руки».' },
    book_dragon: { name: 'КНИГА: ДРАКОНИЙ ШАГ',   kind: 'book', price: 105, tech: 'dragon', desc: 'Научит приёму «Драконий шаг».' },
    book_slam:   { name: 'КНИГА: ГРАНД-СЛЭМ',     kind: 'book', price: 140, tech: 'slam',   desc: 'Научит приёму «Гранд-слэм».' },
    book_hyper:  { name: 'КНИГА: ГИПЕР-КУЛАК',    kind: 'book', price: 175, tech: 'hyper',  desc: 'Научит приёму «Гипер-кулак».' },
    book_iron:   { name: 'КНИГА: ЖЕЛЕЗНЫЙ ЛОБ',   kind: 'book', price: 210, tech: 'iron',   desc: 'Научит приёму «Железный лоб».' }
  };

  /* ---------------- магазины ---------------- */
  D.shops = {
    mama: { name: 'ЗАБЕГАЛОВКА «У МАМОЧКИ»', kind: 'food', wall: '#7a4030', awning: '#c04030', sign: '#f8d040',
            stock: ['bun', 'cola', 'milk', 'rice', 'egg', 'curry', 'fish', 'ramen', 'sushi', 'steak'],
            hello: 'ЗАХОДИ, МИЛЫЙ. ТЫ ВЫГЛЯДИШЬ КАК ПОБИТАЯ ПОДУШКА.' },
    chem: { name: 'АПТЕКА «ЗДОРОВЯК»', kind: 'med', wall: '#3a5a6a', awning: '#2080a0', sign: '#e8f8f8',
            stock: ['bandage', 'medkit', 'energy'],
            hello: 'О, ОПЯТЬ ТЫ. ЧЕМ НА ЭТОТ РАЗ ТЕБЯ ПОБИЛИ?' },
    book: { name: 'КНИЖНАЯ ЛАВКА', kind: 'book', wall: '#4a3a60', awning: '#6040a0', sign: '#f8d040',
            stock: ['book_stone', 'book_dragon', 'book_slam', 'book_hyper', 'book_iron'],
            hello: 'КНИГИ — ЭТО ОРУЖИЕ, КОТОРОЕ НЕЛЬЗЯ ОТОБРАТЬ.' },
    tony: { name: 'МИР САНТЕХНИКИ ТОНИ', kind: 'gear', wall: '#5a5a60', awning: '#c07020', sign: '#f8a040',
            stock: ['wrench', 'pipe', 'boots', 'glove', 'vest'],
            hello: 'ТРУБЫ? КЛЮЧИ? ХОЧЕШЬ БИТЬ СИЛЬНЕЕ — Я ПОМОГУ.' },
    gym:  { name: 'КАЧАЛКА «ЖЕЛЕЗО»', kind: 'gym', wall: '#404048', awning: '#303038', sign: '#f8f8f8',
            stock: [], hello: 'ПОТ — ЭТО ЖИР, КОТОРЫЙ ПЛАЧЕТ.' }
  };

  /* ---------------- районы ---------------- */
  D.districts = [
    {
      id: 'riverside', name: 'НАБЕРЕЖНАЯ', theme: 'river', music: 'river', width: 1500, seed: 10111,
      spawns: ['punk', 'punk', 'punkB', 'goth'], roam: 5,
      boss: 'rat', gate: 1080,
      shops: [{ id: 'mama', x: 420 }, { id: 'chem', x: 900 }],
      props: [
        { t: 'lamp', n: 5 }, { t: 'bench', n: 3 }, { t: 'bush', n: 6 }, { t: 'tree', n: 3 },
        { t: 'fence', n: 3 }, { t: 'crate', n: 3 }, { t: 'sign', n: 2 }, { t: 'hydrant', n: 2 },
        { t: 'barrel', n: 2, front: true }
      ],
      next: 'downtown', prev: null,
      intro: 'НАБЕРЕЖНАЯ. ТУТ ВОНЯЕТ РЕКОЙ И ДЕШЁВЫМИ СИГАРЕТАМИ.'
    },
    {
      id: 'downtown', name: 'ТОРГОВЫЙ КВАРТАЛ', theme: 'downtown', music: 'downtown', width: 1700, seed: 20222,
      spawns: ['punkB', 'skin', 'goth', 'punkess', 'punk'], roam: 6,
      boss: 'tony', gate: 1250,
      shops: [{ id: 'mama', x: 300 }, { id: 'chem', x: 620 }, { id: 'book', x: 900 }, { id: 'tony', x: 1180 }],
      props: [
        { t: 'lamp', n: 6 }, { t: 'vending', n: 4 }, { t: 'sign', n: 4 }, { t: 'car', n: 3 },
        { t: 'trash', n: 4 }, { t: 'hydrant', n: 2 }, { t: 'bench', n: 2 },
        { t: 'barrier', n: 3, front: true }
      ],
      next: 'school', prev: 'riverside',
      intro: 'ЦЕНТР. НЕОН, ТОЛПА И ЛЮДИ, КОТОРЫЕ ХОТЯТ ТЕБЯ УДАРИТЬ.'
    },
    {
      id: 'school', name: 'ШКОЛА ИМ. НЭККЭЦУ', theme: 'school', music: 'school', width: 1600, seed: 30333,
      spawns: ['student', 'student', 'jock', 'skin', 'teacher'], roam: 6,
      boss: 'hulk', gate: 1180,
      shops: [{ id: 'chem', x: 380 }, { id: 'book', x: 760 }, { id: 'gym', x: 1050 }],
      props: [
        { t: 'tree', n: 5 }, { t: 'bench', n: 4 }, { t: 'fence', n: 4 }, { t: 'bush', n: 5 },
        { t: 'locker', n: 4 }, { t: 'sign', n: 2 },
        { t: 'barrier', n: 2, front: true }
      ],
      next: 'construction', prev: 'downtown',
      intro: 'ШКОЛА. ЗВОНОК ПРОЗВЕНЕЛ — НАЧИНАЕТСЯ ПЕРЕМЕНА С МЯСОМ.'
    },
    {
      id: 'construction', name: 'СТРОЙКА', theme: 'construction', music: 'construction', width: 1700, seed: 40444,
      spawns: ['worker', 'worker', 'yakuza', 'skin', 'jock'], roam: 7,
      boss: 'blade', gate: 1280,
      shops: [{ id: 'mama', x: 340 }, { id: 'tony', x: 720 }, { id: 'gym', x: 1100 }],
      props: [
        { t: 'girder', n: 5 }, { t: 'drum', n: 5 }, { t: 'cone', n: 6 }, { t: 'barrier', n: 4 },
        { t: 'crate', n: 4 }, { t: 'trash', n: 3 },
        { t: 'cone', n: 4, front: true }, { t: 'drum', n: 2, front: true }
      ],
      next: 'tower', prev: 'school',
      intro: 'СТРОЙКА. КАСКА НЕ СПАСЁТ, НО ХОТЬ БУДЕТ КРАСИВО ПАДАТЬ.'
    },
    {
      id: 'tower', name: 'ТЕЛЕБАШНЯ', theme: 'tower', music: 'tower', width: 1300, seed: 50555,
      spawns: ['ninja', 'yakuza', 'ninja', 'worker'], roam: 7,
      boss: 'satoru', gate: 980,
      shops: [{ id: 'chem', x: 300 }, { id: 'book', x: 700 }],
      props: [
        { t: 'antenna', n: 4 }, { t: 'ac', n: 5 }, { t: 'girder', n: 3 }, { t: 'crate', n: 3 },
        { t: 'fence', n: 3 },
        { t: 'ac', n: 2, front: true }
      ],
      next: null, prev: 'construction',
      intro: 'ВЕРШИНА. ОТСЮДА ВИДЕН ВЕСЬ ГОРОД. И ВСЕ ЕГО КУЛАКИ.'
    }
  ];

  D.districtIndex = {};
  for (var i = 0; i < D.districts.length; i++) D.districtIndex[D.districts[i].id] = i;

  /* цены тренировок в качалке */
  D.gym = [
    { key: 'atk', name: 'СИЛАТА', base: 40, start: 8 },
    { key: 'def', name: 'СТОЙКОСТЬ', base: 40, start: 4 },
    { key: 'spd', name: 'СКОРОСТЬ', base: 35, start: 52 },
    { key: 'maxHp', name: 'МАКС. HP', base: 30, start: 60, amount: 5 },
    { key: 'maxSta', name: 'ВЫНОСЛИВОСТЬ', base: 30, start: 40, amount: 4 }
  ];

  D.tips = [
    'ЕДА НЕ ТОЛЬКО ЛЕЧИТ — ОНА НАВСЕГДА ПОДНИМАЕТ СТАТЫ.',
    'ПОБИТЫЙ ВРАГ МОЖЕТ СЕСТЬ. ПОДОЙДИ И НАЖМИ E.',
    'НОГА ВАЛИТ С НОГ БЫСТРЕЕ, ЧЕМ КУЛАК. НО БЬЁТ РЕЖЕ.',
    'ВИТРИНЫ МАГАЗИНОВ СВЕТЯТСЯ — ТАМ МОЖНО ПОТРАТИТЬ ДЕНЬГИ.',
    'БЛОК СНИМАЕТ ПОЧТИ ВЕСЬ УРОН, НО НЕ РАБОТИТ ПРОТИВ ПРИЁМОВ.',
    'ПРИЁМЫ ЖРУТ ВЫНОСЛИВОСТЬ. СЛЕДИ ЗА ЗЕЛЁНОЙ ПОЛОСОЙ.',
    'БОСС СТОИТ У ВЫХОДА ИЗ РАЙОНА. ИНАЧЕ НИКАК.'
  ];
})(window.G);
