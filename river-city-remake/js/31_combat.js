/* 31_combat.js — атаки, хитбоксы, урон, нокдауны, дроп денег, эффекты. */
(function (G) {
  'use strict';

  /* rect: dx — от центра по направлению взгляда, w — длина, hd — полуглубина, zMin/zMax — полоса высот */
  var A = {
    punch1: {
      st: 'punch', dur: 0.30, active: [0.07, 0.15], dmg: 4, kb: 70, stun: 0.20,
      next: 'punch2', pose: 'punch1', sfx: 'punch',
      rect: { dx: 5, w: 14, hd: 8, zMin: 2, zMax: 24 }
    },
    punch2: {
      st: 'punch', dur: 0.30, active: [0.07, 0.15], dmg: 6, kb: 90, stun: 0.22,
      next: 'punch3', pose: 'punch2', sfx: 'punch',
      rect: { dx: 5, w: 15, hd: 8, zMin: 2, zMax: 24 }
    },
    punch3: {
      st: 'punch', dur: 0.44, active: [0.11, 0.21], dmg: 10, kb: 220, stun: 0.7,
      knock: true, pose: 'punch3', sfx: 'heavy',
      rect: { dx: 6, w: 18, hd: 10, zMin: 0, zMax: 26 }
    },
    kick: {
      st: 'kick', dur: 0.40, active: [0.09, 0.20], dmg: 9, kb: 200, stun: 0.65,
      knock: true, pose: 'kick', sfx: 'kick',
      rect: { dx: 7, w: 19, hd: 9, zMin: 0, zMax: 22 }
    },
    kickAir: {
      st: 'kick', dur: 0.34, active: [0.05, 0.24], dmg: 10, kb: 190, stun: 0.6,
      knock: true, pose: 'kickH', sfx: 'kick',
      rect: { dx: 7, w: 20, hd: 10, zMin: -14, zMax: 24 }
    },
    /* вражеские */
    ePunch: {
      st: 'punch', dur: 0.46, active: [0.16, 0.25], dmg: 5, kb: 90, stun: 0.26,
      pose: 'punch1', sfx: 'punch',
      rect: { dx: 5, w: 15, hd: 8, zMin: 0, zMax: 26 }
    },
    eKick: {
      st: 'kick', dur: 0.54, active: [0.20, 0.31], dmg: 8, kb: 180, stun: 0.6,
      knock: true, pose: 'kick', sfx: 'kick',
      rect: { dx: 7, w: 19, hd: 9, zMin: 0, zMax: 24 }
    },
    eSlam: {
      st: 'tech', dur: 0.80, active: [0.36, 0.50], dmg: 16, kb: 240, stun: 0.9,
      knock: true, pose: 'grab', sfx: 'heavy',
      rect: { dx: 4, w: 16, hd: 10, zMin: 0, zMax: 24 }
    },
    eRush: {
      st: 'tech', dur: 0.66, active: [0.18, 0.44], dmg: 9, kb: 150, stun: 0.5,
      knock: true, lunge: 150, pose: 'charge', sfx: 'tech',
      rect: { dx: 6, w: 18, hd: 9, zMin: 0, zMax: 26 }
    }
  };
  G.Attacks = A;

  var COMIC = ['БДЫЩ!', 'БАХ!', 'ХРЯСЬ!', 'БУМ!', 'ПЛЮХ!', 'ДЗЫНЬ!', 'КРЭК!', 'ТР-Р-РАХ!'];

  var Combat = {
    startAttack: function (e, id) {
      var d = A[id];
      if (!d) return;
      if (e.state === 'down' || e.state === 'dead' || e.state === 'sit') return;
      e.atkData = {
        def: d, id: id, dur: d.dur, active: d.active, t: 0,
        hits: Object.create(null), pose: d.pose, next: d.next || null,
        hitCount: 0, tickT: 0, isTech: false, launched: false
      };
      e.setState(d.st);
      e.combo = e.combo + 1;
      G.Audio.sfx('swing');
      if (d.lunge) e.lunge = d.lunge;
    },

    startTech: function (e, tid) {
      var t = G.Data.techs[tid];
      if (!t) return false;
      if (e.sta < t.cost) {
        G.notify('НЕТ ВЫНОСЛИВОСТИ');
        G.Audio.sfx('no');
        return false;
      }
      if (e.state === 'down' || e.state === 'dead') return false;
      e.sta -= t.cost;
      e.atkData = {
        def: t, id: tid, dur: t.dur, active: t.active, t: 0,
        hits: Object.create(null), pose: t.pose || 'tech', next: null,
        hitCount: 0, tickT: 0, isTech: true, launched: false
      };
      e.setState('tech');
      G.Audio.sfx(t.sfx || 'tech');
      if (t.lunge) e.lunge = t.lunge;
      return true;
    },

    /* вызывается каждый фикс-шаг, пока активна атака */
    stepAttack: function (e, dt, world) {
      var a = e.atkData;
      if (!a) return;
      a.t += dt;

      /* серия ударов «гипер-кулак»: сбрасываем список целей каждые 0.08с */
      if (a.def.hits) {
        a.pose = (Math.floor(a.t * 24) % 2) ? 'punch1' : 'punch2';
        a.tickT += dt;
        if (a.tickT >= 0.085) { a.tickT = 0; a.hits = Object.create(null); }
      }

      var inWin = a.t >= a.active[0] && a.t <= a.active[1];
      if (inWin) {
        if (a.def.lunge && !a.launched) { a.launched = true; e.lunge = a.def.lunge; }
        Combat.resolve(e, world, a);
      }

      if (a.t >= a.dur) {
        var wasPunch = e.state === 'punch';
        e.atkData = null;
        if (wasPunch && e.queued) {
          var q = e.queued; e.queued = null;
          Combat.startAttack(e, q);
        } else {
          e.queued = null;
          e.combo = 0;
          if (e.state === 'punch' || e.state === 'kick' || e.state === 'tech') e.setState('idle');
        }
      }
    },

    resolve: function (att, world, a) {
      var d = a.def;
      if (a.def.hits && a.hitCount >= a.def.hits) return;

      var r = d.rect;
      var cx = att.x + att.facing * (r.dx + r.w / 2);
      var hw = r.w / 2;
      var hd = r.hd;
      var zMin = att.z + r.zMin;
      var zMax = att.z + r.zMax;

      var ents = world.ents;
      for (var i = 0; i < ents.length; i++) {
        var e = ents[i];
        if (e === att || e.dead || e.remove) continue;
        if (e.team === att.team) continue;
        if (a.hits[e.id]) continue;

        if (Math.abs(e.x - cx) > hw + e.hw) continue;
        if (Math.abs(e.y - att.y) > hd + e.hd) continue;
        var eTop = e.z + e.zh, aTop = zMax;
        if (e.z > aTop || eTop < zMin) continue;

        a.hits[e.id] = true;
        a.hitCount++;
        Combat.apply(att, e, d, world);
        if (a.def.hits && a.hitCount >= a.def.hits) break;
        if (!d.hitAll && !d.hits) break;   // обычный удар — одна цель за взмах
      }
    },

    apply: function (att, tgt, d, world) {
      var dir = G.sign(tgt.x - att.x) || att.facing;
      if (att.facing !== dir && Math.abs(tgt.x - att.x) > 3) dir = att.facing;

      /* блок: держит удар только спереди и только от обычных атак */
      var blocked = false;
      if (tgt.state === 'block' && !d.breakGuard && G.sign(att.x - tgt.x) === tgt.facing) {
        blocked = true;
      }
      if (tgt.invuln > 0) return;

      var raw = d.dmg + att.atk * 0.5;
      var mit = raw * (30 / (30 + tgt.def));
      var dmg = Math.max(1, Math.round(mit * (0.88 + Math.random() * 0.24)));

      if (blocked) {
        dmg = Math.max(1, Math.round(dmg * 0.12));
        tgt.vx = dir * d.kb * 0.18;
        G.Audio.sfx('guard');
        Combat.burst(tgt.x, tgt.y - 12, tgt.z + 14, 4, '#a8d8f8');
        Combat.num(tgt, dmg, '#a8c8e0');
        return;
      }

      tgt.hp -= dmg;
      tgt.flash = 0.09;
      Combat.num(tgt, dmg, att.kind === 'player' ? '#f8f060' : '#f8a060');
      Combat.burst(tgt.x, tgt.y - 12, tgt.z + 13, d.knock ? 10 : 5, d.knock ? '#f8f8a0' : '#f8d890');

      if (d.knock) {
        G.Audio.sfx('down');
        Combat.word(tgt, G.pick(Math.random, COMIC));
        tgt.setState('down');
        tgt.downT = 1.15 + Math.random() * 0.4;
        tgt.vx = dir * d.kb * 0.55;
        tgt.vy = dir === 0 ? 0 : (Math.random() - 0.5) * 30;
        tgt.vz = 110;
        tgt.hitstun = 0;
      } else {
        G.Audio.sfx(d.sfx === 'heavy' ? 'heavy' : 'hit');
        tgt.setState('hurt');
        tgt.hitstun = d.stun;
        tgt.vx = dir * d.kb * 0.35;
        tgt.atkData = null;   // полученный удар прерывает собственную атаку
        tgt.queued = null;
      }
      if (world.shake !== undefined) {
        world.shake = Math.max(world.shake, d.knock ? 4 : 2);
      }

      /* «железный лоб» бьёт и по тебе */
      if (d.recoil) {
        att.hp = Math.max(1, att.hp - d.recoil);
        Combat.num(att, d.recoil, '#f86060');
      }

      if (tgt.hp <= 0) Combat.kill(tgt, att, world);
    },

    kill: function (e, killer, world) {
      if (e.dead) return;
      e.hp = 0;

      if (e.kind === 'player') {
        e.dead = true;
        e.setState('down');
        e.downT = 999;
        G.onPlayerDown();
        return;
      }

      /* вербовка: обычный враг иногда садится и ждёт */
      if (!e.boss && e.team === 1 && G.player.companions.length < 2 && Math.random() < 0.38) {
        e.setState('sit');
        e.sitT = 14;
        e.recruitable = true;
        e.hp = Math.max(12, Math.round(e.maxHp * 0.5));
        e.cryT = 1.4;
        e.tauntMsg = G.pick(Math.random, G.Data.recruitLines);
        G.Audio.sfx('yell');
        Combat.dropMoney(e, world, 0.5);
        return;
      }

      e.dead = true;
      e.remove = true;
      if (e.team === 1) G.player.kills = (G.player.kills || 0) + 1;
      G.Audio.sfx('down');
      Combat.burst(e.x, e.y - 12, e.z + 12, 16, '#f8a040');
      Combat.dropMoney(e, world, 1);

      if (e.boss) G.onBossDown(e);
    },

    dropMoney: function (e, world, mul) {
      var amt = e.money;
      if (Array.isArray(amt)) amt = G.ri(Math.random, amt[0], amt[1]);
      amt = Math.max(1, Math.round(amt * (mul || 1)));
      var n = G.clamp(Math.round(amt / 6), 1, 8);
      var per = Math.max(1, Math.floor(amt / n));
      var left = amt;
      var r = Math.random;
      for (var i = 0; i < n; i++) {
        var v = (i === n - 1) ? left : per;
        left -= v;
        if (v <= 0) break;
        world.pickups.push({
          x: e.x + (r() - 0.5) * 14,
          y: e.y + (r() - 0.5) * 8,
          z: 12 + r() * 10,
          vx: (r() - 0.5) * 70,
          vy: (r() - 0.5) * 30,
          vz: 90 + r() * 60,
          value: v, t: 0
        });
      }
    },

    /* -------- эффекты -------- */
    burst: function (x, y, z, n, col) {
      var r = Math.random;
      for (var i = 0; i < n; i++) {
        G.fx.push({
          type: 'spark', x: x, y: y, z: z,
          vx: (r() - 0.5) * 160, vy: (r() - 0.5) * 50, vz: r() * 110 + 20,
          life: 0.28 + r() * 0.22, max: 0.5, col: col || '#f8f8a0'
        });
      }
    },
    num: function (e, v, col) {
      G.fx.push({ type: 'num', x: e.x + (Math.random() - 0.5) * 6, y: e.y - 14, z: e.z + 26, vz: 46, life: 0.75, max: 0.75, text: String(v), col: col || '#f8f060' });
    },
    word: function (e, txt) {
      G.fx.push({ type: 'word', x: e.x, y: e.y - 20, z: e.z + 30, vz: 26, life: 0.6, max: 0.6, text: txt, col: '#f8f8f8' });
    },
    dust: function (x, y, n) {
      var r = Math.random;
      for (var i = 0; i < n; i++) {
        G.fx.push({ type: 'dust', x: x + (r() - 0.5) * 10, y: y, z: 0, vx: (r() - 0.5) * 40, vy: 0, vz: 10 + r() * 30, life: 0.3, max: 0.3, col: '#c8c8b8' });
      }
    }
  };

  G.Combat = Combat;
})(window.G);
