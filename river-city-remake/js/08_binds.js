/* 08_binds.js — раскладки управления.
   Две раскладки: «КЛАССИКА» (J K L + ПРОБЕЛ) и «Z X C V» (под стрелки).
   Переключается в главном меню и в паузе, запоминается в localStorage
   (и дублируется в сохранение, если хранилище недоступно). */
(function (G) {
  'use strict';

  var LAYOUTS = {
    classic: {
      id: 'classic',
      name: 'КЛАССИКА',
      desc: 'J — рука, K — нога, L — приём, ПРОБЕЛ — прыжок',
      keys: {
        punch: ['KeyJ'],
        kick:  ['KeyK'],
        tech:  ['KeyL'],
        jump:  ['Space'],
        block: ['ShiftLeft', 'ShiftRight'],
        ok:    ['Enter', 'Space', 'KeyJ'],
        back:  ['Escape', 'Backspace', 'KeyK']
      }
    },
    zxcv: {
      id: 'zxcv',
      name: 'Z X C V',
      desc: 'Z — рука, X — нога, C — приём, V — прыжок (стрелки — ходьба)',
      keys: {
        punch: ['KeyZ'],
        kick:  ['KeyX'],
        tech:  ['KeyC'],
        jump:  ['KeyV', 'Space'],
        block: ['ShiftLeft', 'ShiftRight'],
        ok:    ['Enter', 'Space', 'KeyZ'],
        back:  ['Escape', 'Backspace', 'KeyX']
      }
    }
  };

  var ORDER = ['classic', 'zxcv'];
  var STORE = 'rcr_layout';

  function pretty(code) {
    if (code.indexOf('Key') === 0) return code.slice(3);
    if (code.indexOf('Digit') === 0) return code.slice(5);
    if (code.indexOf('Shift') === 0) return 'SHIFT';
    if (code === 'Space') return 'ПРОБЕЛ';
    if (code === 'Escape') return 'ESC';
    if (code === 'Backspace') return 'BACKSPACE';
    return code.toUpperCase();
  }
  function join(codes, sep) {
    var out = [];
    for (var i = 0; i < codes.length; i++) {
      var s = pretty(codes[i]);
      if (out.indexOf(s) < 0) out.push(s);      // SHIFT LEFT/RIGHT -> один SHIFT
    }
    return out.join(sep || ' / ');
  }

  var Bind = {
    current: 'classic',

    list: function () { return ORDER.slice(); },
    def: function (id) { return LAYOUTS[id] || LAYOUTS.classic; },
    name: function () { return this.def(this.current).name; },

    /* коды клавиш для действия в текущей раскладке */
    keys: function (action) {
      var k = this.def(this.current).keys;
      return k[action] || [];
    },

    set: function (id) {
      if (!LAYOUTS[id]) return;
      this.current = id;
      try { window.localStorage.setItem(STORE, id); } catch (e) { /* file:// — молча */ }
      if (G.player) G.player.layout = id;
      this.applyHelp();
    },

    next: function () {
      var i = ORDER.indexOf(this.current);
      this.set(ORDER[(i + 1) % ORDER.length]);
      G.notify('РАСКЛАДКА: ' + this.name());
    },

    load: function () {
      var id = null;
      try { id = window.localStorage.getItem(STORE); } catch (e) { id = null; }
      if (!id && G.player && G.player.layout) id = G.player.layout;
      this.current = LAYOUTS[id] ? id : 'classic';
      this.applyHelp();
    },

    /* строка подсказок под игрой */
    helpHtml: function () {
      var k = this.def(this.current).keys;
      return '<b>WASD</b>/<b>СТРЕЛКИ</b> ходьба &nbsp; ' +
        '<b>' + join(k.punch) + '</b> рука &nbsp; ' +
        '<b>' + join(k.kick) + '</b> нога &nbsp; ' +
        '<b>' + join(k.tech) + '</b> приём &nbsp; ' +
        '<b>' + join(k.jump) + '</b> прыжок &nbsp; ' +
        '<b>SHIFT</b> блок &nbsp; <b>E</b> действие &nbsp; ' +
        '<b>TAB</b> инвентарь &nbsp; <b>1-5</b> приём &nbsp; <b>ESC</b> меню';
    },

    applyHelp: function () {
      var el = document.getElementById('help');
      if (el) el.innerHTML = this.helpHtml();
    }
  };

  G.Bind = Bind;
  /* короткий алиас для мест использования: G.key('punch') */
  G.key = function (action) { return Bind.keys(action); };
})(window.G);
