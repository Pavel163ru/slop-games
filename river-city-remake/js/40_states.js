/* 40_states.js — конечный автомат: тайтл, карта города, район, меню, магазины. */
(function (G) {
  'use strict';

  var VW = G.VW, VH = G.VH;
  var S = { name: null, pending: null, param: null };
  G.states = S;

  S.change = function (name, param) { S.pending = { name: name, param: param }; };

  function applyPending() {
    if (!S.pending) return;
    var p = S.pending; S.pending = null;
    if (S.name && States[S.name] && States[S.name].exit) States[S.name].exit();
    S.name = p.name;
    if (States[p.name] && States[p.name].enter) States[p.name].enter(p.param || {});
  }

  /* ================================================================
     РАЙОН
     ================================================================ */
  function makePlayerEntity(x) {
    var p = G.player;
    var e = new G.Entity({
      kind: 'player', name: p.name, spec: G.PlayerSpec,
      x: x, y: 34, team: 0,
      hp: p.hp, atk: p.atk, def: p.def, spd: p.spd, sta: p.sta
    });
    e.maxHp = p.maxHp;
    e.maxSta = p.maxSta;
    return e;
  }

  function makeCompanionEntity(c, x) {
    var d = G.Data.enemies[c.defId] || G.Data.enemies.punk;
    var e = new G.Entity({
      kind: 'companion', name: c.name, spec: d.spec, defId: c.defId,
      x: x, y: 34, team: 0, ai: 'companion',
      hp: c.hp, atk: Math.round(d.atk * 0.8), def: d.def, spd: Math.round(d.spd * 0.95), sta: 30
    });
    e.maxHp = c.maxHp;
    return e;
  }

  function enterDistrict(idx, spawnX) {
    var def = G.Data.districts[idx];
    if (!def) return;
    G.player.district = idx;
    G.World.init(def);

    var w = {
      def: def, width: def.width, ents: [], pickups: [], camX: 0,
      bossSpawned: false, cleared: !!G.player.cleared[def.id],
      shake: 0, time: 0, player: null, boss: null,
      travelCD: 0, exitMsg: 0, gameOverT: 0, victoryT: 0, shown: false
    };
    G.world = w;

    var p = makePlayerEntity(spawnX === undefined ? 60 : spawnX);
    w.player = p;
    w.ents.push(p);

    for (var i = 0; i < G.player.companions.length; i++) {
      w.ents.push(makeCompanionEntity(G.player.companions[i], p.x - 30 - i * 16));
    }

    var r = G.rng(def.seed);
    for (var k = 0; k < def.roam; k++) {
      var id = def.spawns[G.ri(r, 0, def.spawns.length - 1)];
      var ex = G.ri(r, 110, def.width - 110);
      var ey = G.ri(r, 10, 58);
      var e = G.makeEnemy(id, ex, ey);
      e.aiT = Math.random() * 1.5;
      w.ents.push(e);
    }

    w.camX = G.clamp(p.x - VW / 2, 0, Math.max(0, w.width - VW));
    G.Audio.music(def.music);
    G.notify(def.intro);
    G.Save.write(G.player);
  }

  function spawnBoss(w) {
    var def = w.def;
    w.bossSpawned = true;
    var bx = Math.min(def.width - 90, def.gate + 150);
    var b = G.makeEnemy(def.boss, bx, 34);
    b.aiT = 0.6;
    w.boss = b;
    w.ents.push(b);
    var r = G.rng(def.seed + 99);
    for (var i = 0; i < 2; i++) {
      var id = def.spawns[G.ri(r, 0, def.spawns.length - 1)];
      var m = G.makeEnemy(id, bx - 60 - i * 30, G.ri(r, 12, 56));
      m.aiT = 1 + Math.random();
      w.ents.push(m);
    }
    var td = G.Data.enemies[def.boss];
    b.tauntMsg = G.Data.taunts[td.taunt] ? G.Data.taunts[td.taunt][0] : 'НУ ПОГОДИ!';
    b.tauntT = 2.6; b.cryT = 2.6;
    G.Audio.sfx('boss');
    G.notify('БОСС: ' + td.name + '!');
  }

  G.onBossDown = function (e) {
    var w = G.world;
    if (!w) return;
    w.cleared = true;
    G.player.cleared[w.def.id] = true;
    var idx = G.Data.districtIndex[w.def.id];
    G.player.unlocked = Math.max(G.player.unlocked || 0, idx + 1);
    G.notify('ПОБЕДА! ПРОХОД ОТКРЫТ');
    G.Audio.sfx('levelup');
    G.Save.write(G.player);
    if (w.def.id === 'tower') w.victoryT = 2.2;
  };

  G.onPlayerDown = function () {
    var w = G.world;
    if (w) w.gameOverT = 1.6;
  };

  /* живые показатели -> в сохранение. Вызывается КАЖДЫЙ кадр: иначе еда лечит
     от «старого» p.hp (полного), а сохранение пишет не нынешнее здоровье. */
  function syncVitals() {
    var w = G.world;
    if (!w || !G.player) return;
    var p = w.player;
    if (p) { G.player.hp = Math.max(0, Math.round(p.hp)); G.player.sta = p.sta; }
  }

  function syncToPlayer() {
    syncVitals();
    var w = G.world;
    if (!w) return;
    var p = w.player;
    G.player.hp = Math.max(1, Math.round(p.hp));
    G.player.sta = p.sta;
    G.player.spawnX = p.x;
    var list = [];
    for (var i = 0; i < w.ents.length; i++) {
      var e = w.ents[i];
      if (e.kind === 'companion' && !e.dead && !e.remove) {
        list.push({ defId: e.defId, name: e.name, hp: Math.max(1, Math.round(e.hp)), maxHp: e.maxHp });
      }
    }
    G.player.companions = list;
  }

  function separate(w) {
    var e = w.ents;
    for (var i = 0; i < e.length; i++) {
      for (var j = i + 1; j < e.length; j++) {
        var a = e[i], b = e[j];
        if (a.dead || b.dead || a.remove || b.remove) continue;
        if (a.state === 'down' || b.state === 'down' || a.state === 'sit' || b.state === 'sit') continue;
        var dx = b.x - a.x;
        var dy = (b.y - a.y);
        if (Math.abs(dx) < (a.hw + b.hw) && Math.abs(dy) < (a.hd + b.hd)) {
          var push = ((a.hw + b.hw) - Math.abs(dx)) * 0.5 + 0.25;
          var s = dx === 0 ? (i % 2 ? 1 : -1) : G.sign(dx);
          a.x -= s * push * 0.5;
          b.x += s * push * 0.5;
        }
      }
    }
  }

  function updatePickups(w, dt) {
    var p = w.player;
    for (var i = w.pickups.length - 1; i >= 0; i--) {
      var k = w.pickups[i];
      k.t += dt;
      k.vz -= 700 * dt;
      k.x += k.vx * dt; k.y += k.vy * dt; k.z += k.vz * dt;
      if (k.z <= 0) { k.z = 0; k.vz = Math.abs(k.vz) > 40 ? -k.vz * 0.4 : 0; k.vx *= 0.7; k.vy *= 0.7; }
      if (k.t > 0.35 && p && !p.dead) {
        var dx = p.x - k.x, dy = p.y - k.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 58) {
          var sp = 200 * dt;
          k.x += dx / (d || 1) * sp; k.y += dy / (d || 1) * sp * 0.7;
          k.z += (14 - k.z) * 6 * dt;
        }
        if (d < 9) {
          G.player.money += k.value;
          G.Audio.sfx('coin');
          w.pickups.splice(i, 1);
        }
      }
      if (k.t > 22) w.pickups.splice(i, 1);
    }
  }

  /* ---------- взаимодействие ---------- */
  function nearestShop(w) {
    var best = null, bd = 30;
    for (var i = 0; i < G.World.shops.length; i++) {
      var s = G.World.shops[i];
      var d = Math.abs(w.player.x - s.x);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  function nearestRecruit(w) {
    var best = null, bd = 26;
    for (var i = 0; i < w.ents.length; i++) {
      var e = w.ents[i];
      if (e.state !== 'sit' || !e.recruitable) continue;
      var d = Math.abs(w.player.x - e.x) + Math.abs(w.player.y - e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function interact(w) {
    if (w.player.dead) { G.hint = ''; return; }
    var sh = nearestShop(w);
    if (sh) {
      G.hint = 'E — ' + G.Data.shops[sh.id].name;
      if (G.Input.hit('KeyE')) openShop(sh.id);
      return;
    }
    var rc = nearestRecruit(w);
    if (rc) {
      if (G.player.companions.length >= 2) G.hint = 'ОТРЯД ПОЛОН';
      else G.hint = 'E — ВЗЯТЬ В ОТРЯД (' + rc.name + ')';
      if (G.Input.hit('KeyE') && G.player.companions.length < 2) recruit(rc);
      return;
    }
    G.hint = '';
  }

  function recruit(e) {
    e.team = 0;
    e.kind = 'companion';
    e.aiType = 'companion';
    e.recruitable = false;
    e.sitT = 0;
    e.setState('idle');
    e.hp = Math.max(20, Math.round(e.maxHp * 0.6));
    e.tauntMsg = G.pick(Math.random, G.Data.recruitLines);
    e.tauntT = 2;
    G.player.companions.push({ defId: e.defId, name: e.name, hp: e.hp, maxHp: e.maxHp });
    G.Audio.sfx('levelup');
    G.notify(e.name + ' ТЕПЕРЬ С ТОБОЙ!');
  }

  /* ---------- магазины ---------- */
  function openShop(shopId) {
    var sh = G.Data.shops[shopId];
    if (!sh) return;
    if (sh.kind === 'gym') return openGym(sh);
    G.Audio.sfx('menu');
    var rows = function () {
      return sh.stock.map(function (id) {
        var it = G.Data.items[id];
        var owned = G.player.inv[id] || 0;
        var known = it.kind === 'book' && G.player.techs.indexOf(it.tech) >= 0;
        return {
          label: it.name + (owned ? ' ×' + owned : ''),
          right: (known ? 'ЕСТЬ' : it.price + ' ₽'),
          desc: it.desc,
          disabled: known || G.player.money < it.price,
          action: function () {
            if (G.player.money < it.price) { G.Audio.sfx('no'); return; }
            G.player.money -= it.price;
            G.player.spent += it.price;
            G.addItem(id, 1);
            G.Audio.sfx('buy');
          }
        };
      });
    };
    G.UI.show({
      title: sh.name, subtitle: sh.hello, rows: rows(),
      rebuild: rows,
      footer: '<span class="k">↑↓</span> выбор · <span class="k">ENTER</span> купить · <span class="k">ESC</span> выйти',
      onCancel: function () { G.UI.hide(); }
    });
  }

  function openGym(sh) {
    G.Audio.sfx('menu');
    var rows = function () {
      return G.Data.gym.map(function (g) {
        var price = G.gymPrice(g.key);
        var amount = g.amount || 1;
        return {
          label: g.name + ' +' + amount,
          right: price + ' ₽',
          desc: 'Тренировка поднимает ' + g.name + ' на ' + amount + '. Навсегда.',
          disabled: G.player.money < price,
          action: function () {
            if (G.player.money < price) { G.Audio.sfx('no'); return; }
            G.player.money -= price;
            G.player.spent += price;
            G.player[g.key] += amount;
            var e = G.world && G.world.player;
            if (e) { e.atk = G.player.atk; e.def = G.player.def; e.spd = G.player.spd; e.maxHp = G.player.maxHp; e.maxSta = G.player.maxSta; e.hp += (g.key === 'maxHp' ? amount : 0); }
            G.Audio.sfx('levelup');
            G.notify(g.name + ' +' + amount + '!');
          }
        };
      });
    };
    G.UI.show({
      title: sh.name, subtitle: sh.hello, rows: rows(), rebuild: rows,
      footer: '<span class="k">↑↓</span> выбор · <span class="k">ENTER</span> тренироваться · <span class="k">ESC</span> выйти',
      onCancel: function () { G.UI.hide(); }
    });
  }

  function openInventory() {
    var rows = function () {
      var ids = Object.keys(G.player.inv);
      ids.sort();
      if (!ids.length) return [{ label: '— ПУСТО —', right: '', desc: 'Купи что-нибудь в магазине: еда лечит и качает статы.', disabled: true }];
      return ids.map(function (id) {
        var it = G.Data.items[id];
        var n = G.player.inv[id];
        return {
          label: it.name + ' ×' + n,
          right: it.kind === 'food' ? 'ЕДА' : (it.kind === 'med' ? 'ЛЕК' : (it.kind === 'book' ? 'КНИГА' : 'ШМОТ')),
          desc: it.desc,
          action: function () { G.useItem(id); }
        };
      });
    };
    G.UI.show({
      title: 'ИНВЕНТАРЬ', subtitle: 'ДЕНЬГИ: ' + G.player.money + ' ₽', rows: rows(), rebuild: rows,
      footer: '<span class="k">↑↓</span> выбор · <span class="k">ENTER</span> использовать · <span class="k">ESC</span> назад',
      onCancel: function () { G.UI.hide(); }
    });
  }

  function openPause() {
    var rows = function () {
      return [
        { label: 'ПРОДОЛЖИТЬ', desc: 'Вернуться в драку.', action: function () { G.UI.hide(); } },
        { label: 'ИНВЕНТАРЬ', desc: 'Еда, лекарства, книги.', action: function () { openInventory(); } },
        { label: 'КАРТА ГОРОДА', desc: 'Переместиться в другой район.', action: function () { G.UI.hide(); S.change('citymap'); } },
        { label: 'СОХРАНИТЬ', desc: 'Записать прогресс.', action: function () { syncToPlayer(); G.Save.write(G.player); G.notify('СОХРАНЕНО'); } },
        {
          label: 'РАСКЛАДКА: ' + G.Bind.name(),
          desc: G.Bind.def(G.Bind.current).desc + '. Нажми, чтобы переключить.',
          action: function () { G.Bind.next(); }
        },
        { label: G.Audio.isMuted() ? 'ЗВУК: ВЫКЛ' : 'ЗВУК: ВКЛ', desc: 'Переключить звук.', action: function () { G.Audio.toggleMute(); } },
        { label: 'В ГЛАВНОЕ МЕНЮ', desc: 'Прогресс будет сохранён.', action: function () { syncToPlayer(); G.Save.write(G.player); G.UI.hide(); S.change('title'); } }
      ];
    };
    G.UI.show({ title: 'ПАУЗА', rows: rows(), rebuild: rows, onCancel: function () { G.UI.hide(); } });
  }

  /* ================================================================
     СОСТОЯНИЯ
     ================================================================ */
  var States = {};

  /* ---------------- ТАЙТЛ ---------------- */
  States.title = {
    enter: function () {
      G.World.init(G.Data.districts[0]);
      this.t = 0;
      G.Audio.music('menu');
      var rows = function () {
        var r = [];
        r.push({ label: 'НОВАЯ ИГРА', desc: 'Начать с чистого листа. Весь прогресс сотрётся.', action: function () { G.player = G.newPlayer(); G.Save.clear(); G.UI.hide(); enterDistrict(0, 60); S.change('district'); } });
        if (G.Save.read()) {
          r.push({
            label: 'ПРОДОЛЖИТЬ', desc: 'Загрузить сохранение.',
            action: function () {
              var d = G.Save.read();
              if (d) { G.player = d; G.Bind.load(); G.UI.hide(); enterDistrict(d.district || 0, d.spawnX || 60); S.change('district'); }
            }
          });
        }
        r.push({ label: 'ВВЕСТИ КОД СОХРАНЕНИЯ', desc: 'Если хранилище браузера недоступно.', action: function () { promptCode(); } });
        r.push({
          label: 'РАСКЛАДКА: ' + G.Bind.name(),
          desc: G.Bind.def(G.Bind.current).desc + '. Нажми, чтобы переключить.',
          action: function () { G.Bind.next(); }
        });
        r.push({ label: G.Audio.isMuted() ? 'ЗВУК: ВЫКЛ' : 'ЗВУК: ВКЛ', desc: 'Щёлк-щёлк.', action: function () { G.Audio.toggleMute(); } });
        return r;
      };
      G.UI.show({
        title: 'РЕЧНОЙ ГОРОД', subtitle: 'Р А З Б О Р К И', rows: rows(), rebuild: rows,
        desc: 'Бей, ешь, качайся. Город не простит слабых.',
        footer: '<span class="k">↑↓</span> выбор · <span class="k">ENTER</span> ок'
      });
    },
    update: function (dt) { this.t += dt; },
    render: function () {
      var c = G.Screen.gctx;
      var cam = (this.t * 12) % Math.max(1, G.World.width - VW);
      G.World.draw(c, cam);
      var f = G.Screen.fctx;
      f.save();
      f.textAlign = 'center';
      f.font = 'bold 22px "Courier New", monospace';
      f.lineWidth = 6; f.strokeStyle = '#101018';
      f.strokeText('РЕЧНОЙ ГОРОД', VW / 2, 52);
      f.fillStyle = '#f8d040';
      f.fillText('РЕЧНОЙ ГОРОД', VW / 2, 52);
      f.font = 'bold 12px "Courier New", monospace';
      f.fillStyle = '#f8f8ff';
      f.fillText('Р А З Б О Р К И', VW / 2, 68);
      f.restore();
    },
    exit: function () { }
  };

  function promptCode() {
    var code = window.prompt('ВСТАВЬ КОД СОХРАНЕНИЯ (или оставь пустым, чтобы получить текущий):', '');
    if (code === null) return;
    if (code === '') {
      if (!G.player) G.player = G.newPlayer();
      window.prompt('ВОТ ТВОЙ КОД — СОХРАНИ ЕГО:', G.Save.encode(G.player));
      return;
    }
    var d = G.Save.decode(code);
    if (!d || !d.maxHp) { G.notify('КОД НЕ ПОДОШЁЛ'); G.Audio.sfx('no'); return; }
    G.player = d;
    G.Save.write(d);
    G.UI.hide();
    enterDistrict(d.district || 0, d.spawnX || 60);
    S.change('district');
  }

  /* ---------------- КАРТА ГОРОДА ---------------- */
  var NODES = [
    { x: 44, y: 122 }, { x: 104, y: 86 }, { x: 164, y: 130 }, { x: 226, y: 82 }, { x: 284, y: 118 }
  ];

  States.citymap = {
    enter: function () {
      this.sel = G.player.district || 0;
      this.t = 0;
      G.Audio.music('menu');
    },
    update: function (dt) {
      this.t += dt;
      var In = G.Input;
      var maxU = G.player.unlocked || 0;
      if (In.hit('ArrowLeft') || In.hit('KeyA')) { this.sel = Math.max(0, this.sel - 1); G.Audio.sfx('menu'); }
      if (In.hit('ArrowRight') || In.hit('KeyD')) { this.sel = Math.min(maxU, this.sel + 1); G.Audio.sfx('menu'); }
      if (In.hitAny(G.key('ok'))) {
        G.Audio.sfx('ok');
        enterDistrict(this.sel, 60);
        S.change('district');
        return;
      }
      if (In.hit('Escape')) { S.change('district'); enterDistrict(G.player.district, G.player.spawnX); }
    },
    render: function () {
      var c = G.Screen.gctx, i;
      c.fillStyle = '#0d0d1c';
      c.fillRect(0, 0, VW, VH);
      /* река */
      c.fillStyle = '#183060';
      c.fillRect(0, 150, VW, VH - 150);
      for (i = 0; i < 40; i++) {
        c.fillStyle = ((i + ((this.t * 3) | 0)) % 2) ? '#204080' : '#183060';
        c.fillRect((i * 11 + ((this.t * 6) % 11)) % VW, 152 + (i % 5) * 5, 6, 2);
      }
      /* дороги */
      c.fillStyle = '#383850';
      for (i = 0; i < NODES.length - 1; i++) {
        var a = NODES[i], b = NODES[i + 1];
        var steps = 24;
        for (var s = 0; s <= steps; s++) {
          var x = a.x + (b.x - a.x) * s / steps;
          var y = a.y + (b.y - a.y) * s / steps;
          c.fillRect(x - 1, y - 1, 3, 3);
        }
      }
      /* узлы */
      for (i = 0; i < NODES.length; i++) {
        var n = NODES[i], d = G.Data.districts[i];
        var un = i <= (G.player.unlocked || 0);
        var cur = i === (G.player.district || 0);
        var pu = (i === this.sel) && (((this.t * 4) | 0) % 2 === 0);
        c.fillStyle = un ? (d.theme === 'tower' ? '#f8d040' : '#c85040') : '#2c2c40';
        c.fillRect(n.x - 7, n.y - 7, 14, 14);
        c.fillStyle = un ? '#f8f8f8' : '#40405a';
        c.fillRect(n.x - 4, n.y - 4, 8, 8);
        if (cur) { c.fillStyle = '#40f880'; c.fillRect(n.x - 1, n.y - 1, 3, 3); }
        if (pu) { c.strokeStyle = '#f8d040'; c.lineWidth = 1; c.strokeRect(n.x - 10.5, n.y - 10.5, 21, 21); }
      }

      var f = G.Screen.fctx;
      f.save();
      f.textAlign = 'center';
      f.font = 'bold 8px "Courier New", monospace';
      for (i = 0; i < NODES.length; i++) {
        var nn = NODES[i], un2 = i <= (G.player.unlocked || 0);
        f.fillStyle = '#101018';
        f.fillText(un2 ? G.Data.districts[i].name : '???', nn.x + 1, nn.y + 19);
        f.fillStyle = un2 ? '#f8f8ff' : '#585878';
        f.fillText(un2 ? G.Data.districts[i].name : '???', nn.x, nn.y + 18);
      }
      f.font = 'bold 10px "Courier New", monospace';
      f.fillStyle = '#f8d040';
      f.fillText('КАРТА ГОРОДА', VW / 2, 20);
      f.font = 'bold 7px "Courier New", monospace';
      f.fillStyle = '#9898c0';
      f.fillText('← →  ВЫБОР   ·   ENTER  ЕХАТЬ   ·   ESC  НАЗАД', VW / 2, VH - 10);
      f.restore();
    },
    exit: function () { }
  };

  /* ---------------- РАЙОН ---------------- */
  States.district = {
    enter: function () { },

    update: function (dt) {
      var w = G.world;
      if (!w) { S.change('title'); return; }
      var In = G.Input, i, e;

      if (In.hit('Escape')) { openPause(); return; }
      if (In.hit('Tab')) { openInventory(); return; }
      if (In.hit('KeyM')) { syncToPlayer(); S.change('citymap'); return; }

      w.time += dt;
      G.World.time = w.time;
      if (w.shake > 0) w.shake = Math.max(0, w.shake - dt * 16);
      if (w.travelCD > 0) w.travelCD -= dt;

      var p = w.player;

      /* конец игры / победа */
      if (w.gameOverT > 0) {
        w.gameOverT -= dt;
        if (w.gameOverT <= 0 && !w.shown) { w.shown = true; showGameOver(); }
      }
      if (w.victoryT > 0) {
        w.victoryT -= dt;
        if (w.victoryT <= 0 && !w.shown) { w.shown = true; showVictory(); }
      }

      if (!p.dead) p.controlPlayer(dt, w);

      for (i = 0; i < w.ents.length; i++) {
        e = w.ents[i];
        if (e === p) continue;
        if (!e.dead) G.AI.update(e, dt, w);
        e.update(dt, w);
      }
      p.update(dt, w);

      separate(w);
      updatePickups(w, dt);
      interact(w);
      syncVitals();

      /* гейт босса */
      if (!w.cleared && !w.bossSpawned && !p.dead && p.x > w.def.gate) spawnBoss(w);

      /* выходы */
      if (w.travelCD <= 0 && !p.dead) {
        if (p.x >= w.width - 14 && w.def.next) {
          if (w.cleared) {
            var ni = G.Data.districtIndex[w.def.next];
            syncToPlayer();
            G.player.spawnX = 60;
            enterDistrict(ni, 60);
          } else if (w.exitMsg <= 0) {
            G.notify('СНАЧАЛА РАЗБЕРИСЬ С БОССОМ');
            w.exitMsg = 2;
            p.x = w.width - 20;
            p.vx = -60;
          }
        } else if (p.x <= 14 && w.def.prev) {
          var pi = G.Data.districtIndex[w.def.prev];
          syncToPlayer();
          G.player.spawnX = G.Data.districts[pi].width - 60;
          enterDistrict(pi, G.player.spawnX);
        }
      }
      if (w.exitMsg > 0) w.exitMsg -= dt;

      /* уборка трупов */
      for (i = w.ents.length - 1; i >= 0; i--) {
        e = w.ents[i];
        if (e.remove && e !== p) w.ents.splice(i, 1);
      }
      /* добор врагов, если стало пусто */
      if (w.ents.length < 3 && !w.cleared && w.bossSpawned === false) {
        var r = G.rng(w.def.seed + ((w.time * 7) | 0));
        var id = w.def.spawns[G.ri(r, 0, w.def.spawns.length - 1)];
        var ne = G.makeEnemy(id, G.ri(r, 120, w.width - 120), G.ri(r, 10, 58));
        w.ents.push(ne);
      }

      /* камера */
      var want = G.clamp(p.x - VW / 2, 0, Math.max(0, w.width - VW));
      w.camX += (want - w.camX) * Math.min(1, dt * 8);
    },

    render: function () {
      var w = G.world;
      if (!w) return;
      var c = G.Screen.gctx;
      var sx = 0, sy = 0;
      if (w.shake > 0.1) {
        sx = (Math.random() - 0.5) * w.shake;
        sy = (Math.random() - 0.5) * w.shake;
      }
      var camX = w.camX + sx;

      c.save();
      c.translate(0, sy);
      G.World.draw(c, camX);

      /* тени — до всех спрайтов */
      var ents = w.ents.slice().sort(function (a, b) { return a.y - b.y; });
      var i, e;
      for (i = 0; i < ents.length; i++) {
        e = ents[i];
        if (e.dead && e.state !== 'down') continue;
        var gy = G.World.sy(e.y, 0);
        var r = 6 - Math.min(3, e.z / 22);
        G.Sprites.shadow(c, Math.round(e.x - camX), Math.round(gy), r, 0.32 * (1 - Math.min(0.7, e.z / 60)));
      }

      /* монеты */
      for (i = 0; i < w.pickups.length; i++) {
        var k = w.pickups[i];
        var kx = Math.round(k.x - camX), ky = Math.round(G.World.sy(k.y, k.z));
        var bob = Math.sin((k.t + i) * 9) > 0 ? 0 : 1;
        c.fillStyle = '#f8d040';
        c.fillRect(kx - 2, ky - 4 + bob, 5, 5);
        c.fillStyle = '#c09010';
        c.fillRect(kx - 1, ky - 3 + bob, 2, 2);
      }

      /* сущности */
      for (i = 0; i < ents.length; i++) {
        e = ents[i];
        if (e.remove) continue;
        var ex = Math.round(e.x - camX);
        if (ex < -40 || ex > VW + 40) continue;
        var ey = Math.round(G.World.sy(e.y, e.z));
        var pose = e.pose();
        var alpha = 1;
        if (e.state === 'down' && e.kind !== 'player') {
          /* лёжа fade-out не делаем — пусть встают */
        }
        G.Sprites.draw(c, e.spec, pose, ex, ey, e.facing, alpha, e.flash > 0);
        if (e.state === 'sit') {
          /* мигающая стрелка «вербуй меня» */
          if (((w.time * 3) | 0) % 2 === 0) {
            c.fillStyle = '#f8d040';
            c.fillRect(ex - 2, ey - e.zh - 12, 5, 4);
            c.fillRect(ex - 1, ey - e.zh - 8, 3, 2);
          }
        }
        /* полоска здоровья босса */
        if (e.boss && !e.dead) {
          var bw = 60, bx = VW / 2 - bw / 2, by = 8;
          c.fillStyle = '#101018'; c.fillRect(bx - 1, by - 1, bw + 2, 6);
          c.fillStyle = '#c02020'; c.fillRect(bx, by, bw, 4);
          c.fillStyle = '#f84040'; c.fillRect(bx, by, Math.max(0, bw * (e.hp / e.maxHp)), 4);
        }
      }

      G.FX.drawGame(c, camX);
      G.World.drawProps(c, camX, true);
      c.restore();

      /* текст — отдельным слоем */
      var f = G.Screen.fctx;
      G.FX.drawText(f, camX);
      G.FX.drawSpeech(f, camX);
    },

    exit: function () { }
  };

  function showGameOver() {
    G.player.hp = G.player.maxHp;
    G.player.companions = [];
    G.UI.show({
      title: 'ОТМОРОЗКИ ПОБЕДИЛИ',
      subtitle: 'ТЫ ЛЕЖИШЬ НА АСФАЛЬТЕ. ГОРОД СМЕЁТСЯ.',
      rows: [
        { label: 'ПОДНЯТЬСЯ ЗДЕСЬ', desc: 'Откупиться половиной денег и продолжить.', action: function () { G.player.money = Math.floor(G.player.money / 2); G.UI.hide(); enterDistrict(G.player.district, 60); } },
        { label: 'ЗАГРУЗИТЬ СОХРАНЕНИЕ', desc: 'Вернуться к последнему сохранению.', action: function () { var d = G.Save.read(); G.player = d || G.newPlayer(); G.UI.hide(); enterDistrict(G.player.district, G.player.spawnX); } },
        { label: 'В ГЛАВНОЕ МЕНЮ', desc: 'Начать заново.', action: function () { G.UI.hide(); S.change('title'); } }
      ],
      footer: '<span class="k">↑↓</span> выбор · <span class="k">ENTER</span> ок'
    });
  }

  function showVictory() {
    G.UI.show({
      title: 'ГОРОД ТВОЙ',
      subtitle: 'САТОРУ ПОВЕРЖЕН. ТИШИНА НА УЛИЦАХ.',
      rows: [
        { label: 'ГУЛЯТЬ ДАЛЬШЕ', desc: 'Свободная прогулка по городу.', action: function () { G.UI.hide(); enterDistrict(G.player.district, G.player.spawnX); } },
        { label: 'В ГЛАВНОЕ МЕНЮ', desc: 'В титры.', action: function () { G.UI.hide(); S.change('title'); } }
      ],
      desc: 'Убито врагов: ' + G.player.kills + ' · Потрачено: ' + G.player.spent + ' ₽',
      footer: '<span class="k">↑↓</span> выбор · <span class="k">ENTER</span> ок'
    });
  }

  States.showGameOver = showGameOver;

  /* ================================================================
     ДИСПЕТЧЕР
     ================================================================ */
  S.update = function (dt) {
    if (G.UI.open) { G.UI.input(); applyPending(); return; }
    var st = States[S.name];
    if (st && st.update) st.update(dt);
    applyPending();
  };

  S.render = function (dt) {
    var st = States[S.name];
    if (st && st.render) st.render(dt);
  };

  S.States = States;
  S.enterDistrict = enterDistrict;
  S.openInventory = openInventory;
})(window.G);
