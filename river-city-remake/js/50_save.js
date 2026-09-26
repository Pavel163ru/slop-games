/* 50_save.js — данные игрока и сохранение (localStorage + фолбэк-код, т.к. на file:// хранилище бывает отключено). */
(function (G) {
  'use strict';

  var KEY = 'river_city_razborki_v1';

  G.newPlayer = function () {
    var s = G.Data.startPlayer;
    return {
      name: s.name,
      hp: s.hp, maxHp: s.maxHp,
      atk: s.atk, def: s.def, spd: s.spd,
      sta: s.sta, maxSta: s.maxSta,
      money: s.money,
      inv: {},
      techs: [],
      equip: 0,
      defeated: {},
      cleared: {},
      district: 0,
      spawnX: 60,
      companions: [],
      kills: 0,
      spent: 0
    };
  };

  var Save = {
    available: function () {
      try {
        var t = '__rcr__';
        window.localStorage.setItem(t, '1');
        window.localStorage.removeItem(t);
        return true;
      } catch (e) { return false; }
    },

    write: function (p) {
      var json = JSON.stringify(p);
      try {
        window.localStorage.setItem(KEY, json);
        return true;
      } catch (e) { return false; }
    },

    read: function () {
      try {
        var s = window.localStorage.getItem(KEY);
        if (!s) return null;
        return JSON.parse(s);
      } catch (e) { return null; }
    },

    clear: function () {
      try { window.localStorage.removeItem(KEY); } catch (e) { /* */ }
    },

    /* человекочитаемый код сохранения — на случай, если localStorage недоступен */
    encode: function (p) {
      try { return btoa(encodeURIComponent(JSON.stringify(p))); } catch (e) { return ''; }
    },
    decode: function (s) {
      try { return JSON.parse(decodeURIComponent(atob(s.replace(/\s+/g, '')))); } catch (e) { return null; }
    }
  };

  G.Save = Save;

  /* ---------- инвентарь и статы ---------- */
  G.addItem = function (id, n) {
    var p = G.player;
    p.inv[id] = (p.inv[id] || 0) + (n || 1);
  };
  G.hasItem = function (id) { return (G.player.inv[id] || 0) > 0; };
  G.takeItem = function (id) {
    var p = G.player;
    if (!p.inv[id]) return false;
    p.inv[id]--;
    if (p.inv[id] <= 0) delete p.inv[id];
    return true;
  };

  /* съесть / использовать предмет. Возвращает true, если сработало. */
  G.useItem = function (id) {
    var p = G.player, it = G.Data.items[id];
    if (!it || !G.hasItem(id)) return false;

    if (it.kind === 'food' || it.kind === 'med') {
      if (p.hp >= p.maxHp && !it.sta && !it.atk && !it.def && !it.spd && !it.hp) {
        G.notify('И ТАК ЗДОРОВ');
        G.Audio.sfx('no');
        return false;
      }
    }

    G.takeItem(id);
    var e = G.world && G.world.player;

    if (it.heal) {
      p.hp = Math.min(p.maxHp, p.hp + it.heal);
      if (e) e.hp = p.hp;
    }
    if (it.sta) { p.sta = p.maxSta; if (e) e.sta = p.maxSta; }
    if (it.hp) { p.maxHp += it.hp; p.hp += it.hp; if (e) { e.maxHp = p.maxHp; e.hp = p.hp; } }
    if (it.atk) p.atk += it.atk;
    if (it.def) p.def += it.def;
    if (it.spd) p.spd += it.spd;
    if (e) { e.atk = p.atk; e.def = p.def; e.spd = p.spd; }

    if (it.kind === 'book') {
      if (p.techs.indexOf(it.tech) >= 0) {
        G.notify('УЖЕ УМЕЕШЬ');
        G.Audio.sfx('no');
        return false;
      }
      p.techs.push(it.tech);
      p.equip = p.techs.length - 1;
      G.notify('ВЫУЧЕН ПРИЁМ: ' + G.Data.techs[it.tech].name + '!');
      G.Audio.sfx('levelup');
      return true;
    }

    if (it.atk || it.def || it.spd || it.hp || it.sta) G.Audio.sfx('levelup');
    else G.Audio.sfx('ok');
    G.notify(it.name + ' — ГОТОВО');
    return true;
  };

  G.gymPrice = function (key) {
    var g = null;
    for (var i = 0; i < G.Data.gym.length; i++) if (G.Data.gym[i].key === key) g = G.Data.gym[i];
    if (!g) return 999;
    var cur = G.player[key] || 0;
    return Math.round(g.base + (cur - g.start) * 6);
  };
})(window.G);
