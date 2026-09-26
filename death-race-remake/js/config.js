'use strict';
/* ============================================================
 * config.js — глобальные константы, утилиты, сложности
 * ============================================================ */

const TAU = Math.PI * 2;

const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const dist2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };
const fmtScore = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/* Скруглённый прямоугольник (путь), используется всеми рендерами */
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* Сложности — по духе NES: таймер давит, враги злые, щадить некому */
const DIFFS = [
  { id:'rookie',  name:'ROOKIE',       desc:'Один вертолёт, запас времени',            timer:150, helis:1, silos:2, gremCap:20, gremPanic:88,  heliFire:2.4, heliSpeed:150, heliBurst:3, mslSpeed:235, gunAmmo:400, mslCount:4, siloCd:7.5, scoreMul:1   },
  { id:'amateur', name:'AMATEUR',      desc:'Два вертолёта, таймер короче',            timer:120, helis:2, silos:2, gremCap:24, gremPanic:96,  heliFire:1.8, heliSpeed:175, heliBurst:4, mslSpeed:265, gunAmmo:320, mslCount:3, siloCd:6.0, scoreMul:1.5 },
  { id:'pro',     name:'PROFESSIONAL', desc:'Плотный огонь, шахты бьют часто',         timer:100, helis:2, silos:3, gremCap:28, gremPanic:104, heliFire:1.3, heliSpeed:200, heliBurst:4, mslSpeed:295, gunAmmo:260, mslCount:3, siloCd:4.8, scoreMul:2   },
  { id:'world',   name:'WORLD CLASS',  desc:'Как на NES: жесть. Три вертолёта',        timer:85,  helis:3, silos:3, gremCap:32, gremPanic:112, heliFire:1.0, heliSpeed:230, heliBurst:5, mslSpeed:325, gunAmmo:220, mslCount:2, siloCd:3.8, scoreMul:3   },
];

/* Кампании: 8 городов США (спека §3.1). flags — требуемые флаги (1–4),
   timerK — множитель таймера сложности, diffK — надбавка к давлению (этап A4),
   geo — [долгота, широта] для экрана карты маршрутов,
   палитры/плотность — см. CityMap (этап A3) */
const CITIES = [
  { id:'sandiego',  name:'SAN DIEGO',  title:'ГОРОД 1: SAN DIEGO',   state:'КАЛИФОРНИЯ',    flags:2, timerK:1.00, diffK:0, geo:[-117.16, 32.72] },
  { id:'phoenix',   name:'PHOENIX',    title:'ГОРОД 2: PHOENIX',     state:'АРИЗОНА',       flags:2, timerK:1.00, diffK:1, geo:[-112.07, 33.45] },
  { id:'denver',    name:'DENVER',     title:'ГОРОД 3: DENVER',      state:'КОЛОРАДО',      flags:3, timerK:1.02, diffK:2, geo:[-104.99, 39.74] },
  { id:'houston',   name:'HOUSTON',    title:'ГОРОД 4: HOUSTON',     state:'ТЕХАС',         flags:3, timerK:1.04, diffK:3, geo:[-95.37, 29.76] },
  { id:'neworleans',name:'NEW ORLEANS',title:'ГОРОД 5: NEW ORLEANS', state:'ЛУИЗИАНА',      flags:3, timerK:1.06, diffK:4, geo:[-90.07, 30.00] },
  { id:'chicago',   name:'CHICAGO',    title:'ГОРОД 6: CHICAGO',     state:'ИЛЛИНОЙС',      flags:4, timerK:1.08, diffK:5, geo:[-87.63, 41.88] },
  { id:'raleigh',   name:'RALEIGH',    title:'ГОРОД 7: RALEIGH',     state:'СЕВ. КАРОЛИНА', flags:4, timerK:1.10, diffK:6, geo:[-78.64, 35.78] },
  { id:'newyork',   name:'NEW YORK',   title:'ГОРОД 8: NEW YORK',    state:'НЬЮ-ЙОРК',      flags:4, timerK:1.12, diffK:7, geo:[-74.00, 40.71] },
];

const CITY = CITIES[0];

/* Эффективные параметры давления от номера города: эталонные значения
   DIFFS растут на diffK городов (этап A4, спека §8) */
function effDiff(diff, city) {
  const k = city.diffK || 0;
  return {
    helis:   Math.min(4, diff.helis   + Math.floor(k / 2)),
    silos:   Math.min(4, diff.silos   + Math.floor(k / 3)),
    gremCap: Math.min(40, diff.gremCap + Math.floor(k / 2)),
    siloCd:  Math.max(2.2, diff.siloCd * Math.pow(.97, k)),
    gremPanic: diff.gremPanic + Math.min(14, k * 2),
    heliSpeed: diff.heliSpeed * (1 + Math.min(.25, k * .03)),
    heliFire:  Math.max(.6, diff.heliFire * Math.pow(.96, k)),
  };
}

/* Физика бронемашины: продольная/поперечная скорость, сцепление, дрифт
   (модель из pixel-rally, переточена под свободную езду по городу) */
const CFG = {
  CAR_R: 15, CAR_LEN: 36, CAR_WID: 19,
  ACCEL: 470, BRAKE: 800, REVMAX: 190, MAXSPD: 545,
  DRAG: .66, ROLL: 40, TURN: 2.8,
  GRIP: 8.4, GRIP_DRIFT: 2.1, GRIP_OFF: 3.4, GRIP_HB: 1.1, SLIP_ON: 78,
  /* оружие */
  GUN_CD: .085, GUN_SPREAD: .055, GUN_SPD: 760, GUN_LIFE: .62, GUN_DMG_SILO: 1,
  MSL_CD: .55, MSL_SPD: 480, MSL_TURN: 3.6, MSL_LIFE: 3.6, MSL_BLAST_R: 100,
  /* урон и взаимодействия */
  HURT_BUILD: 230,      // скорость удара о здание, с которой начинается урон
  RAM_SPD: 140,         // минимальная скорость, чтобы насмерть сбить гремлина
  SILO_RAM_SPD: 230,    // скорость тарана ракетной шахты
  BULLET_DMG: 6,        // урон пули вертолёта
  INVULN: 2.2, RESPAWN: 2.2,
  LIVES: 3,
  CRATE_AMMO: 140, CRATE_MSL: 2, CRATE_RESPAWN: 24,
};

const WORLD = { W: 3200, H: 2400, VW: 960, VH: 600 };

/* Городские палитры (этап A3): у каждого города свой характер застройки.
   ground/sidewalk/roof/asphalt/dash/zebra + density (0–1, шанс застройки) */
const CITY_THEMES = {
  sandiego:   { ground:'#3a4038', sidewalk:'#4d5257', asphalt:'#2b2e33', dash:'#c9a23c', zebra:'rgba(225,229,235,.72)', roof:['#5f6a62','#66705f','#57605a','#6b6f58','#565e66'], density:.92, ac:1, hz:0 },
  phoenix:    { ground:'#463d33', sidewalk:'#5a5044', asphalt:'#33302a', dash:'#d0a13c', zebra:'rgba(240,228,205,.72)', roof:['#6b5f4d','#7a6a52','#5f5342','#73604a','#665c4e'], density:.96, ac:2, hz:0 },
  denver:     { ground:'#424346', sidewalk:'#54565c', asphalt:'#2d2f34', dash:'#b7a24c', zebra:'rgba(230,232,238,.75)', roof:['#5b5f6b','#666a74','#525a64','#6e727c','#575d68'], density:.95, ac:1, hz:1 },
  houston:    { ground:'#3c4340', sidewalk:'#4e5651', asphalt:'#2a2e2c', dash:'#bfa23c', zebra:'rgba(222,228,222,.72)', roof:['#55605a','#5c6b60','#4f5a55','#636e66','#526058'], density:.98, ac:3, hz:0 },
  neworleans: { ground:'#3a4a3a', sidewalk:'#4c5c4c', asphalt:'#293429', dash:'#b8a84c', zebra:'rgba(225,232,220,.7)',  roof:['#556655','#5f7060','#4a5a4a','#66765e','#52634f'], density:.90, ac:2, hz:0 },
  chicago:    { ground:'#3c4047', sidewalk:'#4e525b', asphalt:'#2a2d33', dash:'#c9b23c', zebra:'rgba(228,231,238,.78)', roof:['#575d6a','#616774','#4d535f','#6a707d','#525a66'], density:1.0, ac:3, hz:1 },
  raleigh:    { ground:'#3c463a', sidewalk:'#4f5a4c', asphalt:'#2a2f29', dash:'#c4a23c', zebra:'rgba(226,230,224,.72)', roof:['#59655a','#636f60','#4f5b50','#6d786a','#545f56'], density:.94, ac:2, hz:0 },
  newyork:    { ground:'#3a3d44', sidewalk:'#4c4f57', asphalt:'#282b31', dash:'#d2b23c', zebra:'rgba(234,236,242,.8)',  roof:['#565a66','#606470','#4c505c','#6b6f7b','#515561'], density:1.0, ac:4, hz:1 },
};

/* Магазин снабжения (спецификация §5.3): бренды, цены, эффекты.
   Пары чисел — «уровень/второй показатель» как на экранах ROM */
const SHOP_DATA = {
  guns: {
    name: 'ПУЛЕМЁТЫ',
    items: [
      { id: 'acme',    brand: 'ACME',    price: 500,  stats: [7, 10],  rof: 1.0,  dmg: 1, spread: 1.0  },
      { id: 'gatlin',  brand: 'GATLIN',  price: 1800, stats: [9, 20],  rof: 1.35, dmg: 1, spread: 1.35 },
      { id: 'spandau', brand: 'SPANDAU', price: 3000, stats: [12, 15], rof: 1.15, dmg: 2, spread: 0.7  },
      { id: 'uzi',     brand: 'UZI',     price: 4000, stats: [16, 20], rof: 1.5,  dmg: 2, spread: 0.8  },
    ],
  },
  engine: {
    name: 'ДВИГАТЕЛЬ',
    items: [
      { id: 'turbo',   brand: 'TURBO',   price: 1000, stats: [6, 7],   maxSpd: 545, accel: 1.0  },
      { id: 'nitrous', brand: 'NITROUS', price: 2200, stats: [12, 9],  maxSpd: 600, accel: 1.15 },
      { id: 'nuclear', brand: 'NUCLEAR', price: 4500, stats: [16, 11], maxSpd: 640, accel: 1.28 },
      { id: 'fusion',  brand: 'FUSION',  price: 7000, stats: [18, 13], maxSpd: 690, accel: 1.4  },
    ],
  },
  chassis: {
    name: 'ШАССИ',
    items: [
      { id: 'kilroy',  brand: 'KILROY',  price: 20000, stats: [12, 10], hp: 100, ram: 1.0  },
      { id: 'catspaw', brand: 'CATSPAW', price: 25000, stats: [14, 15], hp: 120, ram: 1.15 },
      { id: 'panther', brand: 'PANTHER', price: 30000, stats: [13, 28], hp: 110, ram: 1.3  },
      { id: 'pitbull', brand: 'PITBULL', price: 40000, stats: [16, 35], hp: 145, ram: 1.45 },
    ],
  },
  tires: {
    name: 'ШИНЫ',
    items: [
      { id: 'cutters', brand: 'CUTTERS', price: 200,  stats: [8],  grip: 1.0,  turn: 1.0  },
      { id: 'bashers', brand: 'BASHERS', price: 300,  stats: [10], grip: 1.12, turn: 1.05 },
      { id: 'slicers', brand: 'SLICERS', price: 600,  stats: [14], grip: 1.25, turn: 1.12 },
      { id: 'dicers',  brand: 'DICERS',  price: 1000, stats: [17], grip: 1.38, turn: 1.2  },
    ],
  },
  missiles: {
    name: 'РАКЕТЫ',
    items: [
      { id: 'shell',   brand: 'SHELL',   price: 100, stats: [],  blast: 1.0,  bonus: 0, trade: 0 },
      { id: 'armored', brand: 'ARMORED', price: 200, stats: [],  blast: 1.15, bonus: 1, trade: 200 },
      { id: 'nuclear', brand: 'NUCLEAR', price: 300, stats: [],  blast: 1.3,  bonus: 2, trade: 300 },
      { id: 'fusion',  brand: 'FUSION',  price: 400, stats: [],  blast: 1.5,  bonus: 3, trade: 400 },
    ],
  },
};

const SHOP_CATS = ['guns', 'engine', 'chassis', 'tires', 'missiles'];
const SHOP_START = { guns: 'acme', engine: 'turbo', chassis: 'kilroy', tires: 'cutters', missiles: 'shell' };
