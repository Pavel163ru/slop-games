/* 05_palette.js — процедурная пиксель-графика персонажей.
   Спрайты рисуются кодом из прямоугольников в NES-палитре, кешируются в offscreen-canvas.
   Все персонажи рисуются лицом ВПРАВО; разворот делается зеркалированием при отрисовке. */
(function (G) {
  'use strict';

  var SW = 36, SH = 34;      // размер холста спрайта (справа запас под вытянутую руку)
  var CX = 16, FEET = 32;    // якорь: низ по центру

  function px(c, x, y, w, h, col) {
    if (w <= 0 || h <= 0) return;
    c.fillStyle = col;
    c.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  /* Руки: [dx, dy, dw, dh] относительно плеча; итоговая толщина = 3 + dw.
     b — задняя (дальняя) рука, f — передняя (ближняя к направлению взгляда).

     ВАЖНО: прямоугольник руки обязательно должен касаться торса (торс занимает
     tx..tx+bw-1). Иначе рука превращается в «палку, висящую в воздухе».
     Задняя рука рисуется ДО торса, поэтому видно только то, что выступает
     слева от него; чтобы удар задней рукой читался, она должна заходить
     далеко вправо (fwd.b) — снаружи остаётся только кисть. */
  var ARM = {
    down:  { b: [0, 0, 0, 9],   f: [0, 0, 0, 9] },
    fwd:   { b: [6, -2, 11, 3], f: [0, -3, 8, 3] },
    swing: { b: [-4, 2, 5, 3],  f: [-7, 5, 3, 3] },
    guard: { b: [0, -5, 0, 7],  f: [0, -5, 0, 7] },
    up:    { b: [0, -7, 0, 7],  f: [0, -8, 0, 8] },
    wide:  { b: [-6, -2, 7, 3], f: [0, -2, 7, 3] },
    flail: { b: [-6, -6, 7, 3], f: [0, -6, 7, 3] },
    out:   { b: [-4, -1, 6, 3], f: [0, -1, 6, 3] }
  };

  /* Ноги: [dx, dy, dw, dh] — dw добавка к ширине голени, dh высота.
     Ботинок всегда кладётся ПОД голень (y+h), поэтому высота ноги должна
     дополнять смещение таза (hip) ровно до земли — иначе ботинок висит в воздухе.
     strideA/strideB — шаг: в каждом своя пара «одна нога вперёд, другая назад». */
  var LEG = {
    stand:  { l: [0, 0, 0, 6], r: [0, 0, 0, 6] },
    /* шаг: передняя нога вперёд / задняя нога назад — обязательно разносятся,
       иначе обе ноги попадают в одну точку и вместо шага выходит «шарканье» */
    strideA:{ l: [0, 0, 0, 5], r: [3, 0, 0, 5] },
    strideB:{ l: [-3, 0, 0, 5], r: [0, 0, 0, 5] },
    /* kick:1  — ботинок рисуется на КОНЦЕ вытянутой ноги, а не под ней
       thigh:1 — бедро поднимается вертикально от таза до уровня удара
                 (иначе высокий удар висит в воздухе отдельно от тела) */
    kick:   { l: [0, 0, 0, 6], r: [0, -2, 8, 3],  kick: 1 },
    kickH:  { l: [0, 0, 0, 6], r: [0, -9, 8, 3],  kick: 1, thigh: 1 },
    crouch: { l: [-2, 0, 0, 4], r: [2, 0, 0, 4] },   // только вместе с hip:2
    jump:   { l: [-2, -1, 0, 6], r: [2, -2, 0, 6] },
    wide:   { l: [-3, 0, 0, 6], r: [3, 0, 0, 6] }
  };

  /* lb/lf — задняя и передняя нога. Для шага обе ноги берутся из одного набора
     (strideA/strideB), иначе они едут в одну сторону и выходит «шарканье», а не шаг.
     dy  — сдвиг головы/торса вниз (сжатие корпуса)
     hip — сдвиг таза вниз. Таз + высота ноги должны давать 30 (боток = 30..31). */
  var POSES = {
    idle:   { b: 'down',  f: 'down',  lb: 'stand',  lf: 'stand' },
    idle2:  { b: 'down',  f: 'down',  lb: 'stand',  lf: 'stand', dy: 1 },
    walk0:  { b: 'fwd',   f: 'swing', lb: 'strideA', lf: 'strideA' },
    walk1:  { b: 'down',  f: 'down',  lb: 'stand',  lf: 'stand' },
    walk2:  { b: 'swing', f: 'fwd',   lb: 'strideB', lf: 'strideB' },
    walk3:  { b: 'down',  f: 'down',  lb: 'stand',  lf: 'stand', dy: 1 },
    run0:   { b: 'fwd',   f: 'swing', lb: 'strideA', lf: 'strideA', dy: -1 },
    run1:   { b: 'down',  f: 'out',   lb: 'stand',  lf: 'stand' },
    run2:   { b: 'swing', f: 'fwd',   lb: 'strideB', lf: 'strideB', dy: -1 },
    run3:   { b: 'down',  f: 'out',   lb: 'stand',  lf: 'stand' },
    jump:   { b: 'up',    f: 'up',    lb: 'jump',   lf: 'jump' },
    fall:   { b: 'wide',  f: 'up',    lb: 'wide',   lf: 'wide' },
    punch1: { b: 'swing', f: 'fwd',   lb: 'strideB', lf: 'strideB', lean: 1 },
    punch2: { b: 'fwd',   f: 'swing', lb: 'strideA', lf: 'strideA', lean: 1 },
    punch3: { b: 'wide',  f: 'fwd',   lb: 'strideB', lf: 'strideB', lean: 2 },
    kick:   { b: 'guard', f: 'flail', lb: 'strideA', lf: 'kick',  lean: -1 },
    kickH:  { b: 'guard', f: 'flail', lb: 'strideA', lf: 'kickH', lean: -1 },
    block:  { b: 'guard', f: 'guard', lb: 'crouch', lf: 'crouch', dy: 2, hip: 2 },
    hurt:   { b: 'guard', f: 'up',    lb: 'strideB', lf: 'stand', lean: -2 },
    tech:   { b: 'wide',  f: 'fwd',   lb: 'strideB', lf: 'strideB', lean: 1 },
    charge: { b: 'swing', f: 'guard', lb: 'crouch', lf: 'crouch', dy: 2, hip: 2, lean: -1 },
    cheer:  { b: 'up',    f: 'up',    lb: 'stand',  lf: 'stand' },
    carry:  { b: 'down',  f: 'out',   lb: 'stand',  lf: 'stand' },
    grab:   { b: 'out',   f: 'out',   lb: 'strideB', lf: 'strideB' },
    thrown: { b: 'flail', f: 'flail', lb: 'wide',   lf: 'wide',  dy: -2 }
  };

  /* насколько причёска выступает ВЫШЕ прямоугольника головы — чтобы голова
     в позах с dy<0 не уезжала за верхний край спрайта */
  var HAIR_UP = { bald: 0, buzz: 0, short: 1, spike: 4, afro: 3, mohawk: 4,
                  long: 1, pony: 1, cap: 2, helmet: 2, bandana: 1 };

  function hair(c, s, x, y, w, h) {
    var col = s.hair;
    var s1 = Math.floor(w / 3);
    switch (s.style) {
      case 'bald': break;
      case 'buzz': px(c, x, y, w, 1, col); break;
      case 'short': px(c, x - 1, y - 1, w + 2, 2, col); break;
      case 'spike':
        px(c, x - 1, y - 1, w + 2, 2, col);
        px(c, x, y - 3, 2, 3, col);
        px(c, x + s1, y - 4, 2, 4, col);
        px(c, x + s1 * 2, y - 3, 2, 3, col);
        break;
      case 'afro': px(c, x - 2, y - 3, w + 4, 4, col); px(c, x - 1, y, 1, 3, col); break;
      case 'mohawk': px(c, x + Math.floor(w / 4), y - 4, Math.ceil(w / 2), 4, col); px(c, x, y - 1, w, 2, col); break;
      case 'long':
        px(c, x - 1, y - 1, w + 2, 2, col);
        px(c, x - 2, y + 1, 2, h - 1, col);
        break;
      case 'pony':
        px(c, x - 1, y - 1, w + 2, 2, col);
        px(c, x - 4, y + 1, 4, 2, col);
        break;
      case 'cap':
        px(c, x - 1, y - 2, w + 2, 4, col);
        px(c, x + w - 1, y + 1, 5, 1, col);
        break;
      case 'helmet':
        px(c, x - 1, y - 2, w + 2, 5, col);
        px(c, x + w - 1, y + 2, 4, 2, col);
        break;
      case 'bandana':
        px(c, x - 1, y + 1, w + 2, 2, col);
        px(c, x - 5, y + 2, 5, 1, col);
        px(c, x - 4, y + 3, 3, 1, col);
        break;
      default: px(c, x - 1, y - 1, w + 2, 2, col);
    }
  }

  function drawBody(c, s, poseName) {
    var p = POSES[poseName] || POSES.idle;
    var build = s.build;
    var bw = build === 'big' ? 10 : (build === 'thin' ? 6 : 8);
    var bl = build === 'big' ? 27 : (build === 'thin' ? 22 : 24);
    var headH = build === 'big' ? 8 : 7;
    var legW = bw / 2;
    var armW = 3;

    var dy = p.dy || 0;
    var lean = p.lean || 0;

    var headY = Math.max((FEET - bl) + dy, (HAIR_UP[s.style] || 1) + 1);
    var torsoY = headY + headH;
    var legsY = (FEET - 8) + (p.hip || 0);      // таз: присед = таз вниз + короткая голень
    var torsoH = Math.max(3, legsY - torsoY);

    var tx = Math.round(CX - bw / 2) + lean;
    var shY = torsoY + 1;
    var shB = tx - 3, shF = tx + bw;
    var lbX = tx, lfX = tx + legW;

    var a, l, x, y, w, h, sy;

    /* --- задняя рука (рисуется первой, уходит за торс) --- */
    a = ARM[p.b] || ARM.down;
    px(c, shB + a.b[0], shY + a.b[1], armW + a.b[2], a.b[3], s.skin);

    /* --- задняя нога --- */
    l = LEG[p.lb] || LEG.stand;
    x = lbX + l.l[0]; y = legsY + l.l[1]; w = legW + l.l[2]; h = l.l[3];
    sy = y + h;                     // ботинок кладётся под голень, а не поверх неё
    px(c, x, y, w, h, s.pants);
    px(c, x - 1, sy, w + 1, 2, s.shoe);

    /* --- торс --- */
    px(c, tx, torsoY, bw, torsoH, s.shirt);
    if (s.accent) px(c, tx, torsoY, bw, Math.min(2, torsoH), s.accent);
    px(c, tx, torsoY + torsoH - 2, bw, 2, s.belt || s.pants);

    /* --- передняя нога --- */
    l = LEG[p.lf] || LEG.stand;
    x = lfX + l.r[0]; y = legsY + l.r[1]; w = legW + l.r[2]; h = l.r[3];
    if (l.kick) {
      if (l.thigh) px(c, lfX, y, legW, (legsY + 1) - y, s.pants);   // бедро вверх
      px(c, x, y, w, h, s.pants);
      px(c, x + w - 3, y - 1, 3, h + 2, s.shoe);                    // носок ботинка
    } else {
      px(c, x, y, w, h, s.pants);
      px(c, x - 1, y + h, w + 1, 2, s.shoe);                        // ботинок под голенью
    }

    /* --- голова --- */
    px(c, tx, headY, bw, headH, s.skin);
    hair(c, s, tx, headY, bw, headH);
    px(c, tx + bw - 5, headY + 3, 1, 2, '#101018');
    px(c, tx + bw - 3, headY + 3, 1, 2, '#101018');
    px(c, tx + bw - 4, headY + 5, 2, 1, '#603030');

    /* --- передняя рука (рисуется последней, поверх всего) --- */
    a = ARM[p.f] || ARM.down;
    px(c, shF + a.f[0], shY + a.f[1], armW + a.f[2], a.f[3], s.skin);
  }

  function drawDown(c, s) {
    px(c, 2, 27, 9, 5, s.pants);
    px(c, 1, 28, 4, 4, s.shoe);
    px(c, 4, 22, 7, 3, s.skin);
    px(c, 9, 25, 14, 7, s.shirt);
    if (s.accent) px(c, 9, 25, 14, 2, s.accent);
    px(c, 20, 23, 8, 8, s.skin);
    hair(c, s, 20, 23, 8, 7);
    px(c, 22, 25, 1, 2, '#101018');
    px(c, 25, 25, 1, 2, '#101018');
    px(c, 12, 31, 10, 1, '#202020');
  }

  /* сидячая поза: ноги вытянуты вперёд, ботинок стоит на земле (строка 31) */
  function drawSit(c, s) {
    px(c, 8, 27, 11, 4, s.pants);
    px(c, 17, 29, 6, 3, s.shoe);
    px(c, 6, 18, 3, 9, s.skin);
    px(c, 10, 17, 8, 10, s.shirt);
    if (s.accent) px(c, 10, 17, 8, 2, s.accent);
    px(c, 10, 25, 8, 2, s.belt || s.pants);
    px(c, 10, 10, 8, 7, s.skin);
    hair(c, s, 10, 10, 8, 7);
    px(c, 13, 13, 1, 2, '#101018');
    px(c, 15, 13, 1, 2, '#101018');
    px(c, 20, 19, 3, 8, s.skin);
  }

  var cache = Object.create(null);

  function build(specId, pose, flash) {
    var s = G.Specs[specId] || G.Specs.punk;
    var cv = document.createElement('canvas');
    cv.width = SW; cv.height = SH;
    var c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;

    var flat = (pose === 'down' || pose === 'dead' || pose === 'sit');
    /* лежачие позы нарисованы под обычный рост — крупным бойцам добавляем масштаб */
    if (flat && s.build === 'big') {
      c.save();
      c.translate(CX, FEET); c.scale(1.14, 1.14); c.translate(-CX, -FEET);
    } else if (flat && s.build === 'thin') {
      c.save();
      c.translate(CX, FEET); c.scale(0.92, 0.92); c.translate(-CX, -FEET);
    } else {
      c.save();
    }

    if (pose === 'down' || pose === 'dead') drawDown(c, s);
    else if (pose === 'sit') drawSit(c, s);
    else drawBody(c, s, pose);

    c.restore();

    if (flash) {
      c.globalCompositeOperation = 'source-in';
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, SW, SH);
      c.globalCompositeOperation = 'source-over';
    }
    return cv;
  }

  var Sprites = {
    SW: SW, SH: SH, ANCHOR_X: CX, ANCHOR_Y: FEET,

    char: function (specId, pose, flash) {
      var key = specId + '|' + pose + '|' + (flash ? 1 : 0);
      var cv = cache[key];
      if (!cv) { cv = build(specId, pose, flash); cache[key] = cv; }
      return cv;
    },

    /* рисует спрайт: (sx, sy) — точка под ногами персонажа */
    draw: function (ctx, specId, pose, sx, sy, facing, alpha, flash) {
      var cv = Sprites.char(specId, pose, flash);
      var x = Math.round(sx), y = Math.round(sy);
      ctx.save();
      if (alpha !== undefined && alpha < 1) ctx.globalAlpha = alpha;
      if (facing < 0) {
        ctx.translate(x, y); ctx.scale(-1, 1);
        ctx.drawImage(cv, -CX, -FEET);
      } else {
        ctx.drawImage(cv, x - CX, y - FEET);
      }
      ctx.restore();
    },

    /* силуэт-тень на земле */
    shadow: function (ctx, sx, sy, r, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha === undefined ? 0.3 : alpha;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(sx, sy, r, r * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  /* список всех поз — для отладочной страницы просмотра спрайтов */
  Sprites.poseNames = (function () {
    var out = [];
    for (var k in POSES) out.push(k);
    return out.concat(['sit', 'down']);
  })();

  G.Sprites = Sprites;
})(window.G);
