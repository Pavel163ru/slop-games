/* ============================================================
   ПЕРЕКУП — Симулятор автоперекупа
   Чистый JS, сохранение в localStorage
   ============================================================ */

const SAVE_KEY = 'perekup_save_v1';

/* ---------- Данные: марки и модели ---------- */
// cls: A=премиум, B=надёжные, C=бюджет, D=экзотика/риск
const MODELS = [
  {brand:'Lada',   model:'Priora',   cls:'C', base:380000,  ymin:2008, ymax:2018},
  {brand:'Lada',   model:'Vesta',    cls:'C', base:780000,  ymin:2016, ymax:2024},
  {brand:'Lada',   model:'Niva',     cls:'C', base:620000,  ymin:2010, ymax:2024},
  {brand:'Kia',    model:'Rio',      cls:'B', base:950000,  ymin:2012, ymax:2023},
  {brand:'Hyundai',model:'Solaris',  cls:'B', base:920000,  ymin:2011, ymax:2023},
  {brand:'Hyundai',model:'Creta',    cls:'B', base:1450000, ymin:2016, ymax:2024},
  {brand:'Toyota', model:'Camry',    cls:'B', base:1900000, ymin:2010, ymax:2024},
  {brand:'Toyota', model:'Corolla',  cls:'B', base:1250000, ymin:2010, ymax:2023},
  {brand:'Toyota', model:'RAV4',     cls:'B', base:2200000, ymin:2013, ymax:2024},
  {brand:'VW',     model:'Polo',     cls:'B', base:980000,  ymin:2012, ymax:2023},
  {brand:'VW',     model:'Tiguan',   cls:'A', base:2100000, ymin:2013, ymax:2024},
  {brand:'Skoda',  model:'Octavia',  cls:'B', base:1350000, ymin:2012, ymax:2023},
  {brand:'BMW',    model:'3-series',  cls:'A', base:2600000, ymin:2010, ymax:2023},
  {brand:'BMW',    model:'X5',       cls:'A', base:4200000, ymin:2012, ymax:2024},
  {brand:'Mercedes',model:'E-class', cls:'A', base:3200000, ymin:2010, ymax:2023},
  {brand:'Mercedes',model:'GLE',     cls:'A', base:5500000, ymin:2015, ymax:2024},
  {brand:'Audi',   model:'A6',       cls:'A', base:2800000, ymin:2011, ymax:2023},
  {brand:'Porsche',model:'Cayenne',  cls:'D', base:6500000, ymin:2012, ymax:2023},
  {brand:'Nissan', model:'X-Trail',  cls:'B', base:1600000, ymin:2014, ymax:2023},
  {brand:'Mazda',  model:'CX-5',     cls:'B', base:1700000, ymin:2014, ymax:2024},
  {brand:'Mitsubishi',model:'Outlander',cls:'B',base:1550000,ymin:2013,ymax:2023},
  {brand:'Ford',   model:'Focus',    cls:'C', base:780000,  ymin:2010, ymax:2019},
  {brand:'Renault',model:'Duster',   cls:'C', base:880000,  ymin:2012, ymax:2023},
];

const COLORS = ['Чёрный','Белый','Серебристый','Серый','Синий','Красный','Зелёный','Коричневый'];

// Узлы (детали), которые можно чинить
const PARTS = [
  {key:'engine',  name:'Двигатель',  weight:0.30, repairBase:90000},
  {key:'trans',   name:'КПП',        weight:0.18, repairBase:70000},
  {key:'suspension',name:'Подвеска', weight:0.12, repairBase:35000},
  {key:'body',    name:'Кузов',      weight:0.20, repairBase:60000},
  {key:'interior',name:'Салон',      weight:0.10, repairBase:25000},
  {key:'electrics',name:'Электрика', weight:0.10, repairBase:30000},
];

// Апгрейды
const UPGRADES = [
  {key:'detail', name:'Химчистка и детейлинг', cost:15000,  addValue:35000,  repBonus:0, desc:'Товарный вид, +к впечатлению покупателя'},
  {key:'wheels', name:'Литые диски + новая резина', cost:60000, addValue:110000, repBonus:0, desc:'Заметно поднимает цену'},
  {key:'audio',  name:'Мультимедиа и аудио', cost:45000, addValue:80000, repBonus:0, desc:'Любят молодые покупатели'},
  {key:'tune',   name:'Чип-тюнинг и выхлоп', cost:90000, addValue:160000, repBonus:0, desc:'Премия за мощность (риск для надёжных марок)'},
  {key:'paint',  name:'Полная покраска', cost:120000, addValue:220000, repBonus:0, desc:'Как новый, скрывает следы кузовного ремонта'},
];

/* ---------- Имена продавцов / события ---------- */
const SELLER_NAMES = ['Виктор','Армен','Дмитрий','Гоша','Ринат','Сергей Палыч','Андрюха','Тамара','Олег','Махмуд','Иваныч','Костя'];
const BUYER_NAMES  = ['молодая семья','таксист','студент','бизнесмен','пенсионер','девушка','блогер','фермер','дальнобойщик'];

/* ---------- ГОРОДА ---------- */
// diff: звёзды сложности; fee: входной взнос; comp: множитель конкуренции;
// pool: классы марок (cls), доступные в городе; basePassive: базовый пассив/день
const CITIES = [
  {key:'starogorsk',name:'Старогорск',     diff:1, fee:0,        comp:1.00, pool:['C','B'],         basePassive:20000},
  {key:'zarechye',  name:'Заречье',        diff:2, fee:800000,   comp:1.05, pool:['C','B'],         basePassive:35000},
  {key:'oblastnoy', name:'Областной',      diff:3, fee:2500000,  comp:1.10, pool:['B'],             basePassive:60000},
  {key:'primorsk',  name:'Приморск',       diff:3, fee:5000000,  comp:1.15, pool:['B','A'],         basePassive:95000},
  {key:'gorny',     name:'Горный',         diff:4, fee:9000000,  comp:1.20, pool:['A'],             basePassive:140000},
  {key:'nevsky',    name:'Невский',        diff:4, fee:16000000, comp:1.25, pool:['A','D'],         basePassive:200000},
  {key:'stolitsa',  name:'Столица',        diff:5, fee:30000000, comp:1.35, pool:['A','D'],         basePassive:320000},
];
const cityDef = key => CITIES.find(c=>c.key===key) || CITIES[0];

// Константы экспансии
const MOVE_COST  = 150000;
const CARRY_PCT  = 0.65;
const CARRY_MIN  = 1500000;
// Инфраструктурные пакеты (каждый разовый, в порядке уровней)
const INFRA_TIERS = [
  {cost:500000,  prog:12, passive:0.10, name:'Аренда салона и вывеска'},
  {cost:1500000, prog:20, passive:0.20, name:'Боксы и оборудование'},
  {cost:4000000, prog:28, passive:0.35, name:'Реклама и площадка'},
];
const managerCost = key => Math.max(200000, Math.round(cityDef(key).fee*0.1));
const MECHANIC_COST = 350000;

/* ============================================================
   СОСТОЯНИЕ ИГРЫ
   ============================================================ */
let S = null;

function defaultState(){
  const s = {
    cash: 1500000,
    debt: 0,
    creditRate: 0,      // дневная ставка по текущему кредиту
    rep: 50,            // 0..100
    day: 1,
    market: [],         // авто на рынке
    garage: [],         // купленные авто (переезжают с игроком)
    auction: null,      // текущий лот аукциона
    auctionDay: 0,      // когда следующий аукцион
    log: [],
    seenIntro: false,
    activeCity: 'starogorsk',
    cities: {},
    won: false,
  };
  initCities(s);
  return s;
}

// Инициализация состояния всех городов
function initCities(s){
  s.cities = {};
  CITIES.forEach((c,i)=>{
    s.cities[c.key] = {
      progress: 0,                          // 0..100 шкала освоения
      infra: 0,                             // сколько инфра-пакетов куплено (0..3)
      staff: {manager:false, mechanic:0},
      leftCapital: 0,                       // капитал, оставленный при переезде
      unlocked: i===0,                      // город 1 открыт сразу
      status: i===0 ? 'active' : 'locked',  // active | locked | mastered
    };
  });
}

// Миграция старого сейва (без системы городов) — чтобы не падал
function migrateState(){
  if(!S.cities || !S.activeCity){
    S.activeCity = 'starogorsk';
    S.won = S.won||false;
    initCities(S);
    // текущий рынок/гараж остаются у стартового города (активного)
  }
  // на случай частично сохранённых структур
  CITIES.forEach((c,i)=>{
    if(!S.cities[c.key]){
      S.cities[c.key] = {progress:0,infra:0,staff:{manager:false,mechanic:0},
        leftCapital:0,unlocked:i===0,status:i===0?'active':'locked'};
    }
  });
}

const activeCityDef = ()=> cityDef(S.activeCity);
const cityComp = ()=> activeCityDef().comp;

/* ---------- Утилиты ---------- */
const rnd  = (a,b)=>a+Math.random()*(b-a);
const rndi = (a,b)=>Math.floor(rnd(a,b+1));
const pick = arr=>arr[rndi(0,arr.length-1)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt  = n=>Math.round(n).toLocaleString('ru-RU')+' ₽';
let _id = 1;
const uid = ()=>'c'+(_id++);

/* ============================================================
   ГЕНЕРАЦИЯ АВТО
   ============================================================ */
function genCar(opts={}){
  let pool = MODELS;
  if(opts.pool && opts.pool.length){
    const filtered = MODELS.filter(m=>opts.pool.includes(m.cls));
    if(filtered.length) pool = filtered;
  }
  const m = opts.model || pick(pool);
  const year = opts.year || rndi(m.ymin, m.ymax);
  const age = clamp(2026 - year, 0, 30);
  const mileage = opts.mileage || rndi(15,35)*1000*Math.max(1,age*0.7+rnd(.5,1.5))|0;

  // Состояние деталей 0..100
  const cond = {};
  PARTS.forEach(p=>{
    let base = clamp(100 - age*rnd(2,5) - mileage/8000, 8, 100);
    cond[p.key] = clamp(Math.round(base + rnd(-15,15)), 5, 100);
  });

  // Скрытые дефекты: продавец может скрыть реальное состояние узла
  const hidden = {};
  PARTS.forEach(p=>{
    if(Math.random() < 0.30){
      // реальное состояние хуже показанного
      hidden[p.key] = clamp(cond[p.key] - rndi(15,45), 3, cond[p.key]);
    }
  });

  const car = {
    id: uid(),
    brand:m.brand, model:m.model, cls:m.cls, base:m.base,
    year, age, mileage,
    color: pick(COLORS),
    cond,                 // показанное состояние
    hidden,               // скрытое реальное (заполняется при дефекте)
    realCond: {...cond},  // реальное состояние (= cond, если нет hidden)
    inspected:false,
    upgrades:[],
    boughtFor:0,
  };
  // применяем скрытые дефекты в реальное состояние
  Object.keys(hidden).forEach(k=> car.realCond[k] = hidden[k]);

  return car;
}

// Рыночная стоимость авто по РЕАЛЬНОМУ состоянию
function marketValue(car){
  let v = car.base;
  // амортизация по возрасту
  v *= Math.pow(0.90, car.age);
  // пробег
  v *= clamp(1 - car.mileage/600000, 0.45, 1);
  // состояние узлов (взвешенное)
  let condFactor = 0;
  PARTS.forEach(p=> condFactor += (car.realCond[p.key]/100)*p.weight);
  v *= (0.45 + 0.55*condFactor);
  // апгрейды
  car.upgrades.forEach(uk=>{
    const u = UPGRADES.find(x=>x.key===uk);
    if(u) v += u.addValue;
    // риск тюнинга на надёжных марках
    if(uk==='tune' && (car.cls==='B'||car.cls==='C')) v -= 40000;
  });
  return Math.max(50000, v);
}

// Цена, которую показывает продавец (по ПОКАЗАННОМУ состоянию + наценка)
function askingPrice(car){
  const shown = {...car};
  shown.realCond = car.cond; // продавец оценивает по видимому
  const fair = marketValue(shown);
  // в городах с высокой конкуренцией продавцы держат цену выше
  return Math.round(fair * rnd(1.05, 1.25) * cityComp() / 1000)*1000;
}

/* ============================================================
   РЫНОК
   ============================================================ */
function refillMarket(){
  const target = 6;
  const pool = activeCityDef().pool;
  while(S.market.length < target){
    const c = genCar({pool});
    c.ask = askingPrice(c);
    c.seller = pick(SELLER_NAMES);
    S.market.push(c);
  }
}

function rotateMarket(){
  // убираем 2-3 старых, добавляем новые
  const remove = rndi(2,3);
  S.market.splice(0, remove);
  refillMarket();
}

/* ============================================================
   СОХРАНЕНИЕ
   ============================================================ */
function save(){
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify({S,_id})); }catch(e){}
}
function load(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return false;
    const data = JSON.parse(raw);
    S = data.S; _id = data._id||1;
    migrateState();
    return true;
  }catch(e){ return false; }
}
function resetGame(){
  // вернуться на стартовый экран (сейв пока не трогаем — решит пользователь)
  closeModal();
  save();
  showStartScreen();
}

/* ============================================================
   ЛОГ И ТОСТЫ
   ============================================================ */
function logMsg(text, type='info'){
  S.log.unshift({text, type, day:S.day});
  if(S.log.length>40) S.log.pop();
  renderLog();
}
function toast(text, type=''){
  const el = document.createElement('div');
  el.className = 'toast '+type;
  el.textContent = text;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='.4s'; setTimeout(()=>el.remove(),400); }, 2600);
}

/* ============================================================
   МОДАЛКА
   ============================================================ */
function openModal(html){
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal(){
  document.getElementById('modal-overlay').classList.add('hidden');
}

/* ============================================================
   ПОКУПКА / ОСМОТР / ТОРГ
   ============================================================ */
const INSPECT_COST = 8000;

function openCarMarket(id){
  const car = S.market.find(c=>c.id===id);
  if(!car) return;
  const condRows = PARTS.map(p=>{
    const shown = car.cond[p.key];
    let extra = '';
    if(car.inspected && car.hidden[p.key]!==undefined){
      extra = ` <span class="tag warn">скрытый дефект: реально ${car.realCond[p.key]}%</span>`;
    }
    return condBar(p.name, shown)+extra;
  }).join('');

  const inspectInfo = car.inspected
    ? `<div class="tag good">✓ Осмотрено независимым экспертом</div>`
    : `<p class="car-sub">Состояние со слов продавца. Возможны скрытые дефекты!</p>`;

  openModal(`
    <h2>${car.brand} ${car.model}</h2>
    <p class="modal-sub">${car.year} г. · ${car.color} · ${car.mileage.toLocaleString('ru-RU')} км · класс ${car.cls}</p>
    <div class="dealer-quote">«${dealerQuote(car)}» — ${car.seller}</div>
    ${inspectInfo}
    <div class="cond-bars" style="margin:14px 0">${condRows}</div>
    <div class="price-row" style="border:none;padding:0">
      <span class="car-sub">Просит</span>
      <span class="price">${fmt(car.ask)}</span>
    </div>
    <div class="btn-row" style="margin-top:18px">
      ${car.inspected?'':`<button class="btn" onclick="doInspect('${car.id}')">🔍 Осмотр эксперта (${fmt(INSPECT_COST)})</button>`}
      <button class="btn" onclick="openHaggle('${car.id}')">💬 Торговаться</button>
      <button class="btn btn-primary" onclick="buyCar('${car.id}', ${car.ask})">Купить за ${fmt(car.ask)}</button>
    </div>
  `);
}

function dealerQuote(car){
  const q = [
    'Машина — конфетка, вложений не требует!',
    'Сел и поехал, всё родное.',
    'Один хозяин, гаражное хранение.',
    'Торг уместен, но в пределах разумного.',
    'Не бит, не крашен... почти.',
    'Movie простите, мотор как часы.',
    'Брал для себя, срочно нужны деньги.',
  ];
  return pick(q);
}

function doInspect(id){
  const car = S.market.find(c=>c.id===id);
  if(!car || car.inspected) return;
  if(S.cash < INSPECT_COST){ toast('Недостаточно денег на осмотр','bad'); return; }
  S.cash -= INSPECT_COST;
  car.inspected = true;
  const defects = Object.keys(car.hidden).length;
  if(defects>0) logMsg(`Осмотр ${car.brand} ${car.model}: эксперт нашёл ${defects} скрытый(х) дефект(ов)!`,'bad');
  else logMsg(`Осмотр ${car.brand} ${car.model}: машина чистая, без скрытых проблем.`,'good');
  refreshStats(); save();
  openCarMarket(id);
}

function openHaggle(id){
  const car = S.market.find(c=>c.id===id);
  if(!car) return;
  const minP = Math.round(car.ask*0.78);
  const start = Math.round(car.ask*0.92);
  openModal(`
    <h2>💬 Торг с ${car.seller}</h2>
    <p class="modal-sub">${car.brand} ${car.model} · просит ${fmt(car.ask)}</p>
    <div class="dealer-quote" id="haggle-quote">Ну что, сколько предложишь?</div>
    <div class="field">
      <label>Твоё предложение</label>
      <input type="range" id="haggle-range" min="${minP}" max="${car.ask}" step="1000" value="${start}"
        oninput="document.getElementById('haggle-val').textContent=Number(this.value).toLocaleString('ru-RU')+' ₽'">
      <div class="val" id="haggle-val">${start.toLocaleString('ru-RU')} ₽</div>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick="tryHaggle('${car.id}')">Предложить цену</button>
    </div>
  `);
}

function tryHaggle(id){
  const car = S.market.find(c=>c.id===id);
  if(!car) return;
  const offer = Number(document.getElementById('haggle-range').value);
  const ratio = offer/car.ask;
  // шанс согласия зависит от того насколько низко + репутация помогает
  const repBonus = (S.rep-50)/300; // ±0.16
  // в конкурентных городах продавцы упрямее
  const compPenalty = (cityComp()-1)*0.5;
  let chance = clamp((ratio-0.75)/0.20 + repBonus - compPenalty, 0.02, 0.97);
  const quoteEl = document.getElementById('haggle-quote');
  if(Math.random() < chance){
    car.ask = offer;
    quoteEl.textContent = 'По рукам! Забирай за '+offer.toLocaleString('ru-RU')+' ₽.';
    quoteEl.style.borderLeftColor='var(--green)';
    logMsg(`Сторговались: ${car.brand} ${car.model} теперь ${fmt(offer)}`,'good');
    setTimeout(()=>openCarMarket(id), 900);
  }else{
    // продавец делает встречное
    const counter = Math.round((offer+car.ask)/2/1000)*1000;
    car.ask = Math.min(car.ask, counter);
    quoteEl.textContent = `Не, так не пойдёт. Last цена — ${counter.toLocaleString('ru-RU')} ₽.`;
    quoteEl.style.borderLeftColor='var(--red)';
    setTimeout(()=>openHaggle(id), 1100);
  }
}

function buyCar(id, price){
  const car = S.market.find(c=>c.id===id);
  if(!car) return;
  if(S.cash < price){ toast('Недостаточно наличных!','bad'); return; }
  S.cash -= price;
  car.boughtFor = price;
  car.boughtDay = S.day;
  S.garage.push(car);
  S.market = S.market.filter(c=>c.id!==id);
  logMsg(`Куплен ${car.brand} ${car.model} (${car.year}) за ${fmt(price)}`,'info');
  toast('Машина в гараже!','good');
  closeModal();
  renderAll(); save();
}

/* ============================================================
   ГАРАЖ: РЕМОНТ, АПГРЕЙДЫ, ПРОДАЖА
   ============================================================ */
function repairCost(car, partKey){
  const p = PARTS.find(x=>x.key===partKey);
  const missing = (100 - car.realCond[partKey])/100;
  return Math.round(p.repairBase * missing / 1000)*1000;
}

function openCarGarage(id){
  const car = S.garage.find(c=>c.id===id);
  if(!car) return;
  const value = marketValue(car);
  const partRows = PARTS.map(p=>{
    const c = car.realCond[p.key];
    const cost = repairCost(car, p.key);
    const btn = c>=98 ? `<span class="tag good">ОК</span>`
      : `<button class="btn btn-sm" onclick="repairPart('${car.id}','${p.key}')">Чинить ${fmt(cost)}</button>`;
    return `<div class="cond-row"><span class="lbl">${p.name}</span>${barEl(c)}<span style="width:38px;text-align:right">${c}%</span>${btn}</div>`;
  }).join('');

  const upRows = UPGRADES.map(u=>{
    const has = car.upgrades.includes(u.key);
    const btn = has?`<span class="tag good">✓ установлено</span>`
      :`<button class="btn btn-sm" onclick="addUpgrade('${car.id}','${u.key}')">+${fmt(u.cost)}</button>`;
    return `<div class="cond-row" title="${u.desc}"><span class="lbl" style="width:auto;flex:1">${u.name}</span>${btn}</div>`;
  }).join('');

  const profit = value - car.boughtFor - totalSpent(car);
  openModal(`
    <h2>${car.brand} ${car.model}</h2>
    <p class="modal-sub">${car.year} г. · ${car.mileage.toLocaleString('ru-RU')} км · куплен за ${fmt(car.boughtFor)}</p>
    <h3 style="margin:8px 0;font-size:15px">🔧 Состояние узлов</h3>
    <div class="cond-bars">${partRows}</div>
    <h3 style="margin:16px 0 8px;font-size:15px">⚡ Апгрейды</h3>
    <div class="cond-bars">${upRows}</div>
    <div class="price-row">
      <div><div class="car-sub">Оценка рынка</div><div class="price">${fmt(value)}</div></div>
      <div style="text-align:right"><div class="car-sub">Потенц. прибыль</div>
        <div class="price" style="color:${profit>=0?'var(--green)':'var(--red)'}">${profit>=0?'+':''}${fmt(profit)}</div></div>
    </div>
    <div class="btn-row" style="margin-top:16px">
      <button class="btn btn-green" onclick="openSell('${car.id}')">💰 Выставить на продажу</button>
    </div>
  `);
}

function totalSpent(car){
  return car.spent||0;
}
function repairPart(id, key){
  const car = S.garage.find(c=>c.id===id);
  if(!car) return;
  const cost = repairCost(car, key);
  if(cost<=0) return;
  if(S.cash < cost){ toast('Недостаточно денег на ремонт','bad'); return; }
  S.cash -= cost;
  car.spent = (car.spent||0)+cost;
  car.realCond[key] = 100;
  car.cond[key] = 100;
  delete car.hidden[key];
  logMsg(`Отремонтирован узел «${PARTS.find(p=>p.key===key).name}» на ${car.brand} ${car.model}`,'info');
  renderAll(); save();
  openCarGarage(id);
}

function addUpgrade(id, key){
  const car = S.garage.find(c=>c.id===id);
  if(!car || car.upgrades.includes(key)) return;
  const u = UPGRADES.find(x=>x.key===key);
  if(S.cash < u.cost){ toast('Недостаточно денег','bad'); return; }
  S.cash -= u.cost;
  car.spent = (car.spent||0)+u.cost;
  car.upgrades.push(key);
  logMsg(`Установлен апгрейд «${u.name}» на ${car.brand} ${car.model}`,'info');
  renderAll(); save();
  openCarGarage(id);
}

function openSell(id){
  const car = S.garage.find(c=>c.id===id);
  if(!car) return;
  const value = marketValue(car);
  const askMax = Math.round(value*1.25/1000)*1000;
  const askStart = Math.round(value*1.10/1000)*1000;
  openModal(`
    <h2>💰 Продажа</h2>
    <p class="modal-sub">${car.brand} ${car.model} · рыночная оценка ${fmt(value)}</p>
    <p class="car-sub">Выставь цену. Завышенная — отпугнёт покупателей, заниженная — быстрая продажа но меньше прибыль.</p>
    <div class="field">
      <label>Цена объявления</label>
      <input type="range" id="sell-range" min="${Math.round(value*0.8)}" max="${askMax}" step="5000" value="${askStart}"
        oninput="document.getElementById('sell-val').textContent=Number(this.value).toLocaleString('ru-RU')+' ₽'">
      <div class="val" id="sell-val">${askStart.toLocaleString('ru-RU')} ₽</div>
    </div>
    <div class="btn-row">
      <button class="btn btn-green" onclick="listForSale('${car.id}')">Выставить</button>
    </div>
  `);
}

function listForSale(id){
  const car = S.garage.find(c=>c.id===id);
  if(!car) return;
  car.listPrice = Number(document.getElementById('sell-range').value);
  car.listed = true;
  car.listedDay = S.day;
  logMsg(`${car.brand} ${car.model} выставлен на продажу за ${fmt(car.listPrice)}`,'info');
  toast('Объявление размещено','good');
  closeModal();
  renderAll(); save();
}

function unlist(id){
  const car = S.garage.find(c=>c.id===id);
  if(car){ car.listed=false; renderAll(); save(); }
}

/* ============================================================
   ВИЗУАЛ: ПОЛОСКИ СОСТОЯНИЯ
   ============================================================ */
function condColor(v){
  if(v>=70) return 'var(--green)';
  if(v>=40) return 'var(--accent)';
  return 'var(--red)';
}
function barEl(v){
  return `<div class="bar"><i style="width:${v}%;background:${condColor(v)}"></i></div>`;
}
function condBar(label, v){
  return `<div class="cond-row"><span class="lbl">${label}</span>${barEl(v)}<span style="width:38px;text-align:right">${v}%</span></div>`;
}

/* ============================================================
   БАНК / КРЕДИТ
   ============================================================ */
function creditLimit(){
  // лимит зависит от репутации
  return Math.round((1000000 + S.rep*30000)/100000)*100000;
}
function takeCredit(amount){
  amount = Number(amount);
  if(!amount || amount<=0) return;
  const limit = creditLimit();
  if(S.debt + amount > limit){ toast('Превышен кредитный лимит','bad'); return; }
  S.cash += amount;
  S.debt += amount;
  S.creditRate = 0.012; // 1.2% в день — мотивирует не сидеть в долгах
  logMsg(`Взят кредит ${fmt(amount)} под 1.2%/день`,'info');
  renderAll(); save();
}
function repayCredit(amount){
  amount = Math.min(Number(amount), S.debt, S.cash);
  if(amount<=0) return;
  S.cash -= amount;
  S.debt -= amount;
  logMsg(`Погашено по кредиту ${fmt(amount)}`,'good');
  if(S.debt<=0){ S.debt=0; S.creditRate=0; }
  renderAll(); save();
}

/* ============================================================
   АУКЦИОН
   ============================================================ */
function scheduleAuction(){
  S.auctionDay = S.day + rndi(3,5);
  S.auction = null;
}
function advanceAuctionDay(){
  const car = S.auction;
  if(!car) return;
  const value = marketValue(car);
  car.auctionAge = (car.auctionAge||0)+1;

  if(car.bidder==='Вы'){
    // игрок лидирует — соперник может перебить
    if(car.currentBid < value*0.95 && Math.random()<0.55){
      const rivalBid = car.currentBid + Math.round(value*rnd(0.04,0.12)/1000)*1000;
      car.currentBid = rivalBid;
      car.bidder = pick(SELLER_NAMES);
      logMsg(`🔨 Аукцион: ${car.bidder} перебил ставку до ${fmt(rivalBid)}!`,'bad');
    }
  } else {
    // соперник лидирует — может поднять
    if(car.currentBid < value*0.9 && Math.random()<0.4){
      const rivalBid = car.currentBid + Math.round(value*rnd(0.02,0.08)/1000)*1000;
      car.currentBid = rivalBid;
      car.bidder = pick(SELLER_NAMES);
      logMsg(`🔨 Аукцион: ставки растут — ${car.bidder} даёт ${fmt(rivalBid)}`,'info');
    }
  }

  // через 3 дня аукцион закрывается
  if(car.auctionAge >= 3){
    if(car.bidder==='Вы'){
      if(S.cash >= car.currentBid){
        S.cash -= car.currentBid;
        car.boughtFor = car.currentBid;
        car.boughtDay = S.day;
        S.garage.push(car);
        logMsg(`🔨 Аукцион закрыт: ${car.brand} ${car.model} твой за ${fmt(car.currentBid)}`,'good');
        toast('Лот твой!','good');
      } else {
        logMsg(`🔨 Аукцион закрыт: не хватило денег на ставку. Лот ушёл.`,'bad');
      }
    } else {
      logMsg(`🔨 Аукцион закрыт: ${car.brand} ${car.model} ушёл к ${car.bidder} за ${fmt(car.currentBid)}`,'info');
    }
    S.auction = null;
    scheduleAuction();
  }
}

function startAuction(){
  // лот заметно дешевле рынка, но кот в мешке (без осмотра)
  const car = genCar();
  // на аукционе больше скрытых дефектов
  PARTS.forEach(p=>{
    if(Math.random()<0.45 && car.hidden[p.key]===undefined){
      car.hidden[p.key] = clamp(car.cond[p.key]-rndi(20,50),3,car.cond[p.key]);
      car.realCond[p.key] = car.hidden[p.key];
    }
  });
  const value = marketValue(car);
  car.startBid = Math.round(value*rnd(0.45,0.6)/1000)*1000;
  car.currentBid = car.startBid;
  car.bidder = 'стартовая цена';
  car.seller = 'Аукцион';
  car.auctionAge = 0;
  S.auction = car;
  logMsg(`🔨 Открыт аукцион: ${car.brand} ${car.model} (${car.year}), старт ${fmt(car.startBid)}`,'info');
}

function placeBid(){
  const car = S.auction;
  if(!car) return;
  const step = Math.round(car.currentBid*0.05/1000)*1000;
  if(car.bidder==='Вы'){
    toast('Вы уже лидируете. Ожидаем соперников…','');
  }else{
    const bid = car.currentBid + step;
    if(S.cash < bid){ toast('Недостаточно наличных для ставки','bad'); return; }
    car.currentBid = bid;
    car.bidder = 'Вы';
  }
  setTimeout(()=>{
    if(S.auction && S.auction.bidder==='Вы'){
      const value = marketValue(car);
      if(car.currentBid < value*0.9 && Math.random()<0.6){
        const rival = car.currentBid + Math.round(value*rnd(0.03,0.08)/1000)*1000;
        S.auction.currentBid = rival;
        S.auction.bidder = pick(SELLER_NAMES);
        renderAuction();
        toast(S.auction.bidder+' перебил ставку!','');
      }
    }
  }, 700);
  renderAuction();
}

function winAuction(){
  const car = S.auction;
  if(!car || car.bidder!=='Вы') { toast('Сначала сделайте ставку','bad'); return; }
  if(S.cash < car.currentBid){ toast('Недостаточно денег','bad'); return; }
  S.cash -= car.currentBid;
  car.boughtFor = car.currentBid;
  car.boughtDay = S.day;
  S.garage.push(car);
  logMsg(`🔨 Выигран лот: ${car.brand} ${car.model} за ${fmt(car.currentBid)}`,'good');
  toast('Лот ваш!','good');
  S.auction = null;
  scheduleAuction();
  renderAll(); save();
}

/* ============================================================
   СМЕНА ДНЯ + СОБЫТИЯ + ПРОДАЖИ
   ============================================================ */
const LIVING_COST = 12000;

function nextDay(){
  S.day++;
  // проценты по кредиту
  if(S.debt>0){
    const interest = Math.round(S.debt*S.creditRate);
    S.debt += interest;
    logMsg(`Начислены проценты по кредиту: ${fmt(interest)}`,'bad');
  }
  // расходы на жизнь/аренду
  S.cash -= LIVING_COST;
  // ротация рынка
  if(S.day%2===0) rotateMarket();
  // аукцион
  if(S.auction){
    advanceAuctionDay();
  }else if(S.day>=S.auctionDay){
    startAuction();
  }
  // проверка продаж выставленных машин
  processSales();
  // пассивный доход с освоённых городов
  collectPassive();
  // случайное событие
  maybeEvent();

  if(S.cash < -200000){
    logMsg('💀 Вы по уши в долгах. Игра окончена.','bad');
    toast('Банкротство!','bad');
  }
  renderAll(); save();
}

function processSales(){
  S.garage.filter(c=>c.listed).forEach(car=>{
    const value = marketValue(car);
    const overpriced = car.listPrice/value; // >1 = дорого
    // вероятность найти покупателя за день
    let chance = clamp(1.3 - overpriced, 0.05, 0.9);
    chance *= (0.7 + S.rep/200); // репутация ускоряет
    chance /= cityComp();        // в конкурентных городах продавать дольше
    if(Math.random() < chance){
      // покупатель может ещё немного поторговаться вниз
      const finalPrice = Math.round(car.listPrice * rnd(0.95,1.0)/1000)*1000;
      sellComplete(car, finalPrice);
    }
  });
}

function sellComplete(car, price){
  S.cash += price;
  const profit = price - car.boughtFor - (car.spent||0);
  S.garage = S.garage.filter(c=>c.id!==car.id);
  const buyer = pick(BUYER_NAMES);
  // репутация: честная сделка (без необнаруженных дефектов) растит репутацию
  const undetectedDefects = Object.keys(car.hidden||{}).length;
  if(undetectedDefects>0 && Math.random()<0.5){
    S.rep = clamp(S.rep-rndi(3,8),0,100);
    logMsg(`⚠️ Покупатель (${buyer}) нашёл скрытый дефект в ${car.brand} ${car.model}. Репутация упала.`,'bad');
  }else{
    S.rep = clamp(S.rep + (profit>0?rndi(1,3):0),0,100);
  }
  logMsg(`💰 Продан ${car.brand} ${car.model} (${buyer}) за ${fmt(price)} · прибыль ${profit>=0?'+':''}${fmt(profit)}`, profit>=0?'good':'bad');
  toast((profit>=0?'Продано! +':'Продано (убыток) ')+fmt(profit),profit>=0?'good':'bad');
  addCityProgress(profit);
}

// Рост шкалы освоения активного города от прибыльной сделки
function addCityProgress(profit){
  const c = S.cities[S.activeCity];
  if(!c || c.status==='mastered') return;
  if(profit>0){
    const gain = clamp(profit/300000*4, 1, 8) / cityComp();
    c.progress = clamp(c.progress + gain, 0, 100);
  }
  checkMastered(S.activeCity);
}

// Переход города в статус "освоён" (автопилот)
function checkMastered(key){
  const c = S.cities[key];
  if(!c || c.status==='mastered') return false;
  if(c.progress>=100 && c.staff.manager){
    c.status = 'mastered';
    c.progress = 100;
    logMsg(`🏆 Город ${cityDef(key).name} освоён! Теперь приносит пассивный доход.`,'good');
    toast('Город освоён! 🏆','good');
    checkVictory();
    return true;
  }
  return false;
}

// Суточный пассив освоённого города
function cityPassive(key){
  const c = S.cities[key];
  const def = cityDef(key);
  if(!c || c.status!=='mastered') return 0;
  return Math.round(def.basePassive*(0.5 + c.progress/100*0.5) + c.leftCapital*0.0005);
}

function checkVictory(){
  const allMastered = CITIES.every(c=>S.cities[c.key].status==='mastered');
  if(allMastered && !S.won){
    S.won = true;
    showVictory();
  }
}

// Начисление суточного пассива со всех освоённых городов
function collectPassive(){
  let total = 0;
  CITIES.forEach(def=>{
    const p = cityPassive(def.key);
    if(p>0) total += p;
  });
  if(total>0){
    S.cash += total;
    logMsg(`🏙️ Пассивный доход с сети: +${fmt(total)}`,'good');
  }
}

/* ============================================================
   ПЕРЕЕЗД МЕЖДУ ГОРОДАМИ
   ============================================================ */
// стоимость входа в город (взнос платится один раз)
function entryFee(key){
  return S.cities[key].unlocked ? 0 : cityDef(key).fee;
}
// общая стоимость переезда в город
function moveTotalCost(key){
  return MOVE_COST + entryFee(key);
}
function canMoveTo(key){
  if(key===S.activeCity) return false;
  return S.cash >= moveTotalCost(key);
}
// сколько денег увезём / оставим при переезде ИЗ текущего города
function carrySplit(cashAfterCosts){
  const carry = Math.min(cashAfterCosts, Math.max(CARRY_MIN, cashAfterCosts*CARRY_PCT));
  const left  = Math.max(0, cashAfterCosts - carry);
  return {carry, left};
}

function moveToCity(key){
  if(key===S.activeCity){ toast('Вы уже здесь','bad'); return; }
  const total = moveTotalCost(key);
  if(S.cash < total){ toast('Недостаточно денег на переезд','bad'); return; }

  const fee = entryFee(key);
  const from = S.activeCity;

  // списываем стоимость переезда и взнос
  let cash = S.cash - MOVE_COST - fee;

  // вынос: часть остаётся работать в покинутом городе
  const {carry, left} = carrySplit(cash);
  S.cities[from].leftCapital += left;

  S.cash = carry;
  S.activeCity = key;
  S.cities[key].unlocked = true;
  if(S.cities[key].status==='locked') S.cities[key].status='active';

  // новый локальный рынок и аукцион
  S.market = [];
  refillMarket();
  scheduleAuction();
  S.auction = null;

  if(fee>0) logMsg(`Оплачен вход в ${cityDef(key).name}: ${fmt(fee)}`,'info');
  logMsg(`🚚 Переезд в ${cityDef(key).name}. Увезли ${fmt(carry)}, оставили работать ${fmt(left)} в ${cityDef(from).name}.`,'info');
  toast('Переезд завершён!','good');
  closeModal();
  renderAll(); save();
}

const EVENTS = [
  ()=>{ const d=rndi(40000,120000); S.cash+=d; logMsg(`📈 Спрос вырос! Удачная подработка перегоном: +${fmt(d)}`,'good'); },
  ()=>{ const d=rndi(20000,60000); S.cash-=d; logMsg(`🚓 Штрафы и эвакуатор: -${fmt(d)}`,'bad'); },
  ()=>{ S.rep=clamp(S.rep+rndi(3,7),0,100); logMsg('⭐ Доволен­ный клиент оставил отзыв. Репутация +.','good'); },
  ()=>{ if(S.garage.length){ const c=pick(S.garage); const k=pick(PARTS).key; c.realCond[k]=clamp(c.realCond[k]-rndi(10,25),3,100); logMsg(`🔧 В гараже у ${c.brand} ${c.model} обнаружилась проблема: ${PARTS.find(p=>p.key===k).name}.`,'bad'); } },
  ()=>{ logMsg('🌧️ Сезонное затишье на рынке — продажи идут медленнее.','info'); },
  ()=>{ const d=rndi(60000,150000); S.cash+=d; logMsg(`💎 Перепродал запчасти с разборки: +${fmt(d)}`,'good'); },
];
function maybeEvent(){
  if(Math.random()<0.5){ pick(EVENTS)(); }
}

/* ============================================================
   РЕНДЕРИНГ
   ============================================================ */
function refreshStats(){
  document.getElementById('stat-cash').textContent = fmt(S.cash);
  document.getElementById('stat-cash').style.color = S.cash<0?'var(--red)':'var(--text)';
  document.getElementById('stat-debt').textContent = fmt(S.debt);
  document.getElementById('stat-rep').textContent = S.rep+'/100';
  document.getElementById('stat-day').textContent = S.day;
  document.getElementById('stat-garage').textContent = S.garage.length;
  document.getElementById('stat-city').textContent = activeCityDef().name;
}

function carCardMarket(car){
  const cond = PARTS.slice(0,3).map(p=>condBar(p.name, car.cond[p.key])).join('');
  return `<div class="card">
    <div class="card-head">
      <div><div class="car-name">${car.brand} ${car.model}</div>
      <div class="car-sub">${car.year} · ${car.color} · ${car.mileage.toLocaleString('ru-RU')} км</div></div>
      <span class="badge cls-${car.cls}">${car.cls}</span>
    </div>
    <div class="cond-bars">${cond}</div>
    ${car.inspected?'<span class="tag good">✓ осмотрено</span>':'<span class="tag">со слов продавца</span>'}
    <div class="price-row">
      <span class="price">${fmt(car.ask)}</span>
      <button class="btn btn-primary btn-sm" onclick="openCarMarket('${car.id}')">Смотреть</button>
    </div>
  </div>`;
}

function carCardGarage(car){
  const value = marketValue(car);
  const profit = value - car.boughtFor - (car.spent||0);
  const avg = Math.round(PARTS.reduce((s,p)=>s+car.realCond[p.key]*p.weight,0));
  const statusTag = car.listed
    ? `<span class="tag good">📢 продаётся за ${fmt(car.listPrice)}</span>`
    : `<span class="tag">в работе</span>`;
  return `<div class="card">
    <div class="card-head">
      <div><div class="car-name">${car.brand} ${car.model}</div>
      <div class="car-sub">${car.year} · куплен за ${fmt(car.boughtFor)}</div></div>
      <span class="badge cls-${car.cls}">${car.cls}</span>
    </div>
    ${statusTag}
    <div class="cond-row"><span class="lbl">Состояние</span>${barEl(avg)}<span style="width:38px;text-align:right">${avg}%</span></div>
    <div class="spec"><span>Вложено в ремонт</span><b>${fmt(car.spent||0)}</b></div>
    <div class="spec"><span>Оценка рынка</span><b style="color:var(--accent)">${fmt(value)}</b></div>
    <div class="spec"><span>Прибыль при продаже</span><b style="color:${profit>=0?'var(--green)':'var(--red)'}">${profit>=0?'+':''}${fmt(profit)}</b></div>
    <div class="btn-row" style="margin-top:6px">
      <button class="btn btn-sm btn-primary" onclick="openCarGarage('${car.id}')">🔧 Открыть</button>
      ${car.listed?`<button class="btn btn-sm" onclick="unlist('${car.id}')">Снять с продажи</button>`:`<button class="btn btn-sm btn-green" onclick="openSell('${car.id}')">💰 Продать</button>`}
    </div>
  </div>`;
}

function renderMarket(){
  const el = document.getElementById('screen-market');
  el.innerHTML = `<div class="sec-head"><h2>🏪 Авторынок</h2>
    <span class="hint">Рынок обновляется каждые 2 дня · осмотр выявляет скрытые дефекты</span></div>
    <div class="grid">${S.market.map(carCardMarket).join('')}</div>`;
}

function renderGarage(){
  const el = document.getElementById('screen-garage');
  if(S.garage.length===0){
    el.innerHTML = `<div class="sec-head"><h2>🔧 Гараж</h2></div>
      <div class="empty">Гараж пуст. Купи что-нибудь на рынке или аукционе!</div>`;
    return;
  }
  el.innerHTML = `<div class="sec-head"><h2>🔧 Гараж (${S.garage.length})</h2>
    <span class="hint">Чини узлы и ставь апгрейды, чтобы поднять цену</span></div>
    <div class="grid">${S.garage.map(carCardGarage).join('')}</div>`;
}

function renderAuction(){
  const el = document.getElementById('screen-auction');
  if(!S.auction){
    const inDays = Math.max(0, S.auctionDay - S.day);
    el.innerHTML = `<div class="sec-head"><h2>🔨 Аукцион</h2></div>
      <div class="empty">Следующий аукцион через ${inDays} дн.<br><small>На аукционе авто дешевле рынка, но осмотр недоступен — высокий риск скрытых дефектов.</small></div>`;
    return;
  }
  const car = S.auction;
  const cond = PARTS.map(p=>condBar(p.name, car.cond[p.key])).join('');
  const value = marketValue(car);
  el.innerHTML = `<div class="sec-head"><h2>🔨 Аукцион — идут торги!</h2></div>
    <div class="card" style="max-width:480px">
      <div class="card-head"><div><div class="car-name">${car.brand} ${car.model}</div>
        <div class="car-sub">${car.year} · ${car.color} · ${car.mileage.toLocaleString('ru-RU')} км</div></div>
        <span class="badge cls-${car.cls}">${car.cls}</span></div>
      <span class="tag warn">⚠️ Кот в мешке — осмотр невозможен</span>
      <div class="cond-bars">${cond}</div>
      <div class="price-row">
        <div><div class="car-sub">Текущая ставка (${car.bidder})</div><div class="price">${fmt(car.currentBid)}</div></div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="placeBid()">Поднять ставку (+5%)</button>
        <button class="btn btn-green" onclick="winAuction()">✅ Забрать по текущей</button>
      </div>
    </div>`;
}

function renderBank(){
  const el = document.getElementById('screen-bank');
  const limit = creditLimit();
  const avail = limit - S.debt;
  el.innerHTML = `<div class="sec-head"><h2>🏦 Банк</h2>
    <span class="hint">Кредитный лимит растёт с репутацией</span></div>
    <div class="grid">
      <div class="card">
        <div class="car-name">Кредитный счёт</div>
        <div class="spec"><span>Текущий долг</span><b>${fmt(S.debt)}</b></div>
        <div class="spec"><span>Ставка</span><b>${S.debt>0?(S.creditRate*100).toFixed(1)+'%/день':'—'}</b></div>
        <div class="spec"><span>Лимит</span><b>${fmt(limit)}</b></div>
        <div class="spec"><span>Доступно</span><b style="color:var(--green)">${fmt(Math.max(0,avail))}</b></div>
      </div>
      <div class="card">
        <div class="car-name">Взять кредит</div>
        <div class="field"><input type="range" id="credit-range" min="100000" max="${Math.max(100000,avail)}" step="100000" value="${Math.min(500000,Math.max(100000,avail))}"
          oninput="document.getElementById('credit-val').textContent=Number(this.value).toLocaleString('ru-RU')+' ₽'">
          <div class="val" id="credit-val">${Math.min(500000,Math.max(100000,avail)).toLocaleString('ru-RU')} ₽</div></div>
        <button class="btn btn-primary" onclick="takeCredit(document.getElementById('credit-range').value)" ${avail<100000?'disabled':''}>Взять</button>
      </div>
      <div class="card">
        <div class="car-name">Погасить долг</div>
        ${S.debt>0?`<div class="field"><input type="range" id="repay-range" min="0" max="${Math.min(S.debt,Math.max(0,S.cash))}" step="10000" value="${Math.min(S.debt,Math.max(0,S.cash))}"
          oninput="document.getElementById('repay-val').textContent=Number(this.value).toLocaleString('ru-RU')+' ₽'">
          <div class="val" id="repay-val">${Math.min(S.debt,Math.max(0,S.cash)).toLocaleString('ru-RU')} ₽</div></div>
        <button class="btn btn-green" onclick="repayCredit(document.getElementById('repay-range').value)">Погасить</button>`
        :`<p class="car-sub">Долгов нет. Красавчик 👍</p>`}
      </div>
    </div>`;
}

function renderInfo(){
  const el = document.getElementById('screen-info');
  const garageValue = S.garage.reduce((s,c)=>s+marketValue(c),0);
  const netWorth = S.cash + garageValue - S.debt;
  let repTitle = S.rep>=80?'Легенда рынка':S.rep>=60?'Надёжный перекуп':S.rep>=40?'Обычный барыга':S.rep>=20?'Скользкий тип':'Кидала';
  el.innerHTML = `<div class="sec-head"><h2>📊 Статус</h2></div>
    <div class="grid">
      <div class="card">
        <div class="car-name">💼 Капитал</div>
        <div class="spec"><span>Наличные</span><b>${fmt(S.cash)}</b></div>
        <div class="spec"><span>Активы в гараже</span><b>${fmt(garageValue)}</b></div>
        <div class="spec"><span>Долг</span><b style="color:var(--red)">−${fmt(S.debt)}</b></div>
        <div class="spec" style="border-top:1px solid var(--border);padding-top:8px;margin-top:6px"><span>Чистый капитал</span><b style="color:var(--accent);font-size:16px">${fmt(netWorth)}</b></div>
      </div>
      <div class="card">
        <div class="car-name">⭐ Репутация</div>
        <div class="cond-row"><span class="lbl">Рейтинг</span>${barEl(S.rep)}<span style="width:38px;text-align:right">${S.rep}</span></div>
        <p class="car-sub">Статус: <b style="color:var(--accent)">${repTitle}</b></p>
        <p class="car-sub">Высокая репутация ускоряет продажи, улучшает торг и повышает кредитный лимит. Обман покупателей (скрытые дефекты) её роняет.</p>
      </div>
      <div class="card">
        <div class="car-name">⚙️ Управление</div>
        <p class="car-sub">День ${S.day}. Расходы на жизнь: ${fmt(LIVING_COST)}/день.</p>
        <div class="btn-row" style="margin-top:10px">
          <button class="btn" onclick="resetGame()">🏠 В главное меню</button>
        </div>
      </div>
    </div>`;
}

function renderLog(){
  const ul = document.getElementById('log-list');
  ul.innerHTML = S.log.map(l=>`<li class="${l.type}"><small>День ${l.day}</small>${l.text}</li>`).join('');
}

function renderAll(){
  refreshStats();
  renderMarket();
  renderGarage();
  renderAuction();
  renderCity();
  renderMap();
  renderBank();
  renderInfo();
  renderLog();
}

/* ============================================================
   ЭКРАН: РАЗВИТИЕ ГОРОДА
   ============================================================ */
function renderCity(){
  const el = document.getElementById('screen-city');
  const key = S.activeCity;
  const def = cityDef(key);
  const c = S.cities[key];
  const mastered = c.status==='mastered';

  // следующий инфра-пакет
  const nextInfra = c.infra<INFRA_TIERS.length ? INFRA_TIERS[c.infra] : null;
  const infraBtn = nextInfra
    ? `<button class="btn btn-sm btn-primary" onclick="investInfra()" ${S.cash<nextInfra.cost?'disabled':''}>«${nextInfra.name}» — ${fmt(nextInfra.cost)} (+${nextInfra.prog}%)</button>`
    : `<span class="tag good">✓ Инфраструктура максимальна</span>`;

  const mCost = managerCost(key);
  const managerBtn = c.staff.manager
    ? `<span class="tag good">✓ Управляющий нанят</span>`
    : `<button class="btn btn-sm" onclick="hireManager()" ${S.cash<mCost?'disabled':''}>Нанять управляющего — ${fmt(mCost)}</button>`;

  const mechBtn = c.staff.mechanic>=3
    ? `<span class="tag good">✓ Бригада механиков (макс)</span>`
    : `<button class="btn btn-sm" onclick="hireMechanic()" ${S.cash<MECHANIC_COST?'disabled':''}>Нанять механика — ${fmt(MECHANIC_COST)} (+5%)</button>`;

  const passiveNow = mastered ? cityPassive(key) : 0;
  const masteredNote = mastered
    ? `<div class="tag good" style="font-size:13px">🏆 Город освоён · пассив ${fmt(passiveNow)}/день</div>`
    : (c.staff.manager
        ? `<p class="car-sub">Доведи шкалу до 100% — и город уйдёт на автопилот.</p>`
        : `<p class="car-sub">⚠️ Для автопилота нужен <b>управляющий</b> + шкала 100%.</p>`);

  el.innerHTML = `<div class="sec-head"><h2>🏢 ${def.name}</h2>
    <span class="hint">${'⭐'.repeat(def.diff)} · конкуренция ×${def.comp.toFixed(2)}</span></div>
    <div class="grid">
      <div class="card">
        <div class="car-name">📈 Освоение бизнеса</div>
        <div class="cond-row"><span class="lbl">Прогресс</span>${barEl(Math.round(c.progress))}<span style="width:42px;text-align:right">${Math.round(c.progress)}%</span></div>
        ${masteredNote}
        <div class="spec"><span>Оставленный капитал</span><b>${fmt(c.leftCapital)}</b></div>
        <p class="car-sub">Шкала растёт от прибыльных продаж, инвестиций и найма.</p>
      </div>
      <div class="card">
        <div class="car-name">🏗️ Инфраструктура (${c.infra}/${INFRA_TIERS.length})</div>
        <p class="car-sub">Разовые вложения. Поднимают шкалу и будущий пассив.</p>
        <div class="btn-row" style="margin-top:6px">${infraBtn}</div>
      </div>
      <div class="card">
        <div class="car-name">👔 Персонал</div>
        <div class="btn-row" style="flex-direction:column;align-items:stretch;gap:8px">
          ${managerBtn}
          ${mechBtn}
        </div>
      </div>
    </div>`;
}

function investInfra(){
  const c = S.cities[S.activeCity];
  if(c.infra>=INFRA_TIERS.length) return;
  const tier = INFRA_TIERS[c.infra];
  if(S.cash < tier.cost){ toast('Недостаточно денег','bad'); return; }
  S.cash -= tier.cost;
  c.infra++;
  c.progress = clamp(c.progress + tier.prog, 0, 100);
  logMsg(`🏗️ ${cityDef(S.activeCity).name}: вложено в «${tier.name}» — ${fmt(tier.cost)}`,'info');
  checkMastered(S.activeCity);
  renderAll(); save();
}

function hireManager(){
  const c = S.cities[S.activeCity];
  if(c.staff.manager) return;
  const cost = managerCost(S.activeCity);
  if(S.cash < cost){ toast('Недостаточно денег','bad'); return; }
  S.cash -= cost;
  c.staff.manager = true;
  c.progress = clamp(c.progress + 5, 0, 100);
  logMsg(`👔 ${cityDef(S.activeCity).name}: нанят управляющий за ${fmt(cost)}`,'info');
  checkMastered(S.activeCity);
  renderAll(); save();
}

function hireMechanic(){
  const c = S.cities[S.activeCity];
  if(c.staff.mechanic>=3) return;
  if(S.cash < MECHANIC_COST){ toast('Недостаточно денег','bad'); return; }
  S.cash -= MECHANIC_COST;
  c.staff.mechanic++;
  c.progress = clamp(c.progress + 5, 0, 100);
  logMsg(`🔧 ${cityDef(S.activeCity).name}: нанят механик за ${fmt(MECHANIC_COST)}`,'info');
  checkMastered(S.activeCity);
  renderAll(); save();
}

/* ============================================================
   ЭКРАН: КАРТА ГОРОДОВ
   ============================================================ */
function renderMap(){
  const el = document.getElementById('screen-map');
  const cards = CITIES.map(def=>{
    const c = S.cities[def.key];
    const here = def.key===S.activeCity;
    let statusBadge, action;

    if(here){
      statusBadge = `<span class="badge cls-A">📍 Вы здесь</span>`;
      action = `<span class="tag">Активный город</span>`;
    }else if(c.status==='mastered'){
      statusBadge = `<span class="badge cls-B">🏆 Освоён</span>`;
    }else if(c.unlocked){
      statusBadge = `<span class="badge cls-C">🔓 Открыт</span>`;
    }else{
      statusBadge = `<span class="badge cls-D">🔒 Закрыт</span>`;
    }

    if(!here){
      const total = moveTotalCost(def.key);
      const fee = entryFee(def.key);
      const can = canMoveTo(def.key);
      // предпросмотр выноса
      let preview = '';
      if(can){
        const {carry,left} = carrySplit(S.cash - total);
        preview = `<p class="car-sub">Увезёшь ${fmt(carry)}, оставишь ${fmt(left)}.</p>`;
      }
      action = `
        <div class="spec"><span>Переезд</span><b>${fmt(MOVE_COST)}</b></div>
        ${fee>0?`<div class="spec"><span>Входной взнос</span><b>${fmt(fee)}</b></div>`:''}
        ${preview}
        <button class="btn btn-sm btn-primary" onclick="confirmMove('${def.key}')" ${can?'':'disabled'}>
          ${can?'🚚 Переехать':'Не хватает '+fmt(total)}
        </button>`;
    }

    const passive = c.status==='mastered' ? cityPassive(def.key) : 0;
    return `<div class="card">
      <div class="card-head">
        <div><div class="car-name">${def.name}</div>
        <div class="car-sub">${'⭐'.repeat(def.diff)} · конкуренция ×${def.comp.toFixed(2)}</div></div>
        ${statusBadge}
      </div>
      <div class="cond-row"><span class="lbl">Освоение</span>${barEl(Math.round(c.progress))}<span style="width:42px;text-align:right">${Math.round(c.progress)}%</span></div>
      <div class="spec"><span>Пассив</span><b style="color:${passive>0?'var(--green)':'var(--muted)'}">${passive>0?'+'+fmt(passive)+'/д':'—'}</b></div>
      ${action}
    </div>`;
  }).join('');

  const masteredCount = CITIES.filter(c=>S.cities[c.key].status==='mastered').length;
  el.innerHTML = `<div class="sec-head"><h2>🗺️ Карта сети</h2>
    <span class="hint">Освоено ${masteredCount}/${CITIES.length} · цель — вся сеть на автопилоте</span></div>
    <div class="grid">${cards}</div>`;
}

function confirmMove(key){
  const def = cityDef(key);
  const total = moveTotalCost(key);
  const {carry,left} = carrySplit(S.cash - total);
  openModal(`
    <h2>🚚 Переезд в ${def.name}</h2>
    <p class="modal-sub">${'⭐'.repeat(def.diff)} · конкуренция ×${def.comp.toFixed(2)}</p>
    <div class="spec"><span>Стоимость переезда</span><b>${fmt(MOVE_COST)}</b></div>
    ${entryFee(key)>0?`<div class="spec"><span>Входной взнос</span><b>${fmt(entryFee(key))}</b></div>`:''}
    <div class="spec" style="border-top:1px solid var(--border);padding-top:8px;margin-top:6px"><span>Увезёшь с собой</span><b style="color:var(--green)">${fmt(carry)}</b></div>
    <div class="spec"><span>Останется работать в ${cityDef(S.activeCity).name}</span><b>${fmt(left)}</b></div>
    <p class="car-sub" style="margin-top:10px">Оставленный капитал увеличивает пассивный доход покинутого города. Гараж и машины едут с тобой.</p>
    <div class="btn-row" style="margin-top:16px">
      <button class="btn btn-primary" onclick="moveToCity('${key}')">Переехать</button>
      <button class="btn" onclick="closeModal()">Отмена</button>
    </div>
  `);
}

/* ============================================================
   ЭКРАН ПОБЕДЫ
   ============================================================ */
function showVictory(){
  const net = S.cash + S.garage.reduce((s,c)=>s+marketValue(c),0) - S.debt;
  const dailyPassive = CITIES.reduce((s,c)=>s+cityPassive(c.key),0);
  openModal(`
    <h2>🏆 Автомобильный магнат!</h2>
    <p class="modal-sub">Все 7 городов под твоим контролем</p>
    <p style="line-height:1.6;margin-bottom:12px">Ты прошёл путь от гаражного перекупа до владельца сети автосалонов по всей стране. Сеть работает на автопилоте и приносит доход без твоего участия.</p>
    <div class="spec"><span>Дней в игре</span><b>${S.day}</b></div>
    <div class="spec"><span>Чистый капитал</span><b style="color:var(--accent)">${fmt(net)}</b></div>
    <div class="spec"><span>Суммарный пассив</span><b style="color:var(--green)">+${fmt(dailyPassive)}/день</b></div>
    <p class="car-sub" style="margin-top:12px">🎉 Поздравляем! Можешь продолжить в режиме песочницы.</p>
    <div class="btn-row" style="margin-top:16px">
      <button class="btn btn-primary" onclick="closeModal()">Продолжить игру</button>
    </div>
  `);
}

/* ============================================================
   НАВИГАЦИЯ И ЗАПУСК
   ============================================================ */
function switchScreen(name){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.screen===name));
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active', s.id==='screen-'+name));
}

function showIntro(){
  openModal(`
    <h2>🏎️ Добро пожаловать в «ПЕРЕКУП»</h2>
    <p class="modal-sub">Симулятор автоперекупа</p>
    <p style="line-height:1.6;margin-bottom:12px">Твоя цель — разбогатеть на перепродаже машин. Цикл прост:</p>
    <ol style="line-height:1.8;padding-left:20px;color:#cdd7e2">
      <li><b>Купи дёшево</b> на рынке или аукционе. Торгуйся, заказывай осмотр — продавцы прячут дефекты!</li>
      <li><b>Приведи в порядок</b> в гараже: почини узлы, поставь апгрейды.</li>
      <li><b>Продай дороже.</b> Выставь цену и жди покупателя.</li>
    </ol>
    <p style="line-height:1.6;margin-top:12px">Следи за наличными, репутацией и кредитом. Жми «Следующий день», чтобы время шло, появлялись покупатели и события.</p>
    <p class="car-sub" style="margin-top:8px">💡 Совет: дешёвый осмотр (8 000 ₽) может спасти от покупки убитого мотора за сотни тысяч.</p>
    <div class="btn-row" style="margin-top:18px">
      <button class="btn btn-primary" onclick="closeModal();S.seenIntro=true;save();">Поехали! 🚀</button>
    </div>
  `);
}

/* ============================================================
   СТАРТОВЫЙ ЭКРАН
   ============================================================ */
function showStartScreen(){
  const start = document.getElementById('start-screen');
  const game  = document.getElementById('game');
  const cont  = document.getElementById('btn-continue');
  const info  = document.getElementById('start-continue-info');
  start.classList.remove('hidden');
  game.classList.add('hidden');

  // есть ли сохранение?
  let saved = null;
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(raw) saved = JSON.parse(raw).S;
  }catch(e){}

  if(saved){
    cont.classList.remove('hidden');
    info.classList.remove('hidden');
    const garageVal = (saved.garage||[]).reduce((s,c)=>s+marketValue(c),0);
    const net = saved.cash + garageVal - saved.debt;
    info.innerHTML = `
      <div><span>День</span><b>${saved.day}</b></div>
      <div><span>Наличные</span><b>${fmt(saved.cash)}</b></div>
      <div><span>Капитал</span><b>${fmt(net)}</b></div>
      <div><span>Гараж</span><b>${(saved.garage||[]).length} 🚗</b></div>`;
  }else{
    cont.classList.add('hidden');
    info.classList.add('hidden');
  }
}

function enterGame(){
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');
}

function continueGame(){
  if(!load()){ startNewGame(); return; }
  enterGame();
  renderAll();
}

function startNewGame(){
  // если есть прогресс — подтверждаем перезапись
  if(localStorage.getItem(SAVE_KEY)){
    if(!confirm('Начать новую игру? Текущее сохранение будет удалено.')) return;
  }
  localStorage.removeItem(SAVE_KEY);
  S = defaultState();
  _id = 1;
  refillMarket();
  scheduleAuction();
  logMsg('Старт игры. Капитал '+fmt(S.cash)+'.','info');
  enterGame();
  renderAll();
  save();
  showIntro();
}

function init(){
  // навигация
  document.querySelectorAll('.tab').forEach(t=>{
    t.addEventListener('click', ()=>switchScreen(t.dataset.screen));
  });
  document.getElementById('btn-nextday').addEventListener('click', nextDay);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e=>{
    if(e.target.id==='modal-overlay') closeModal();
  });
  document.getElementById('btn-continue').addEventListener('click', continueGame);
  document.getElementById('btn-newgame').addEventListener('click', startNewGame);

  showStartScreen();
}

document.addEventListener('DOMContentLoaded', init);
// экспортируем функции, вызываемые из onclick
Object.assign(window,{openCarMarket,doInspect,openHaggle,tryHaggle,buyCar,
  openCarGarage,repairPart,addUpgrade,openSell,listForSale,unlist,
  takeCredit,repayCredit,placeBid,winAuction,resetGame,closeModal,
  continueGame,startNewGame,showStartScreen,
  investInfra,hireManager,hireMechanic,confirmMove,moveToCity,showVictory});
