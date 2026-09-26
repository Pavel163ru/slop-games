/* 32_ai.js — поведение врагов, боссов и напарников. */
(function (G) {
  'use strict';

  function nearestFoe(e, world, maxD) {
    var best = null, bd = maxD === undefined ? 1e9 : maxD;
    var ents = world.ents;
    for (var i = 0; i < ents.length; i++) {
      var o = ents[i];
      if (o === e || o.dead || o.remove) continue;
      if (o.team === e.team) continue;
      if (o.state === 'down' || o.state === 'sit') continue;
      var d = Math.abs(o.x - e.x) + Math.abs(o.y - e.y) * 1.6;
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  function face(e, t) { if (Math.abs(t.x - e.x) > 2) e.facing = t.x > e.x ? 1 : -1; }

  function move(e, tx, ty, spd, world) {
    var dx = tx - e.x, dy = ty - e.y;
    var l = Math.sqrt(dx * dx + dy * dy);
    if (l < 1) { e.vx = 0; e.vy = 0; e.setState('idle'); return; }
    e.vx = dx / l * spd;
    e.vy = dy / l * spd * 0.62;
    if (Math.abs(dx) > 3) e.facing = dx > 0 ? 1 : -1;
    e.setState('walk');
  }

  function stop(e) { e.setState('idle'); }

  function busy(e) {
    return e.state === 'down' || e.state === 'getup' || e.state === 'hurt' ||
           e.state === 'dead' || e.state === 'sit' || !!e.atkData;
  }

  function say(e, key) {
    var arr = G.Data.taunts[key];
    if (!arr || e.tauntT > 0) return;
    e.tauntMsg = G.pick(Math.random, arr);
    e.tauntT = 2.2;
    e.cryT = 2.2;
    G.Audio.sfx('yell');
  }

  var AI = {
    update: function (e, dt, world) {
      if (busy(e)) return;
      e.aiT -= dt;

      /* спящие враги: активируемся только рядом с игроком */
      if (e.team === 1 && world.player) {
        var pd = Math.abs(e.x - world.player.x);
        if (pd > 260) { stop(e); return; }
      }

      if (e.aiType === 'companion') return companion(e, dt, world);

      var t = nearestFoe(e, world);
      if (!t) { stop(e); return; }

      var dx = t.x - e.x, dy = t.y - e.y;
      var adx = Math.abs(dx), ady = Math.abs(dy);

      /* выравниваемся по глубине, потом идём вперёд */
      if (ady > 6) {
        move(e, e.x + G.sign(dx) * 8, t.y, e.spd * 0.9, world);
        return;
      }

      if (e.aiType === 'boss') return boss(e, dt, world, t, adx);

      var kind = e.aiType;
      var reach = kind === 'kicker' ? 19 : 14;

      if (adx > reach + 4) {
        move(e, t.x - G.sign(dx) * reach * 0.45, t.y, e.spd, world);
        if (e.aiT <= 0 && Math.random() < 0.012) say(e, G.Data.enemies[e.defId] ? G.Data.enemies[e.defId].taunt : 'punk');
        return;
      }

      face(e, t);
      if (e.aiT > 0) {
        /* ждём своего окна: слегка топчемся */
        if (Math.random() < 0.02) move(e, e.x + (Math.random() - 0.5) * 26, e.y + (Math.random() - 0.5) * 10, e.spd * 0.5, world);
        else stop(e);
        return;
      }

      stop(e);
      var roll = Math.random();
      if (kind === 'kicker') {
        G.Combat.startAttack(e, roll < 0.7 ? 'eKick' : 'ePunch');
        e.aiT = 1.1 + Math.random() * 0.9;
      } else if (kind === 'grabber') {
        if (roll < 0.35) { G.Combat.startAttack(e, 'eSlam'); e.aiT = 1.9 + Math.random(); }
        else { G.Combat.startAttack(e, 'ePunch'); e.aiT = 1.0 + Math.random() * 0.8; }
      } else {
        if (roll < 0.72) { G.Combat.startAttack(e, 'ePunch'); e.aiT = 0.85 + Math.random() * 0.7; }
        else { G.Combat.startAttack(e, 'eKick'); e.aiT = 1.3 + Math.random() * 0.8; }
      }

      if (Math.random() < 0.16) say(e, G.Data.enemies[e.defId] ? G.Data.enemies[e.defId].taunt : 'punk');
    }
  };

  function boss(e, dt, world, t, adx) {
    face(e, t);
    if (e.hp < e.maxHp * 0.5 && !e.enraged) {
      e.enraged = true;
      e.spd *= 1.18;
      G.notify(e.name + ' ВЗБЕШЁН!');
      G.Audio.sfx('boss');
    }

    if (e.aiT > 0) {
      if (adx > 40) move(e, t.x - G.sign(t.x - e.x) * 20, t.y, e.spd, world);
      else if (adx < 12) move(e, e.x - G.sign(t.x - e.x) * 30, e.y + (Math.random() - 0.5) * 14, e.spd * 0.7, world);
      else stop(e);
      return;
    }

    stop(e);
    var r = Math.random();
    if (adx > 46 && r < 0.5) {
      G.Combat.startAttack(e, 'eRush');
      e.aiT = 1.5 + Math.random() * 0.7;
    } else if (adx < 22 && r < 0.55) {
      G.Combat.startAttack(e, 'eSlam');
      e.aiT = 1.7 + Math.random() * 0.8;
    } else if (r < 0.7) {
      G.Combat.startAttack(e, 'eKick');
      e.aiT = 1.1 + Math.random() * 0.6;
    } else {
      G.Combat.startAttack(e, 'ePunch');
      e.aiT = 0.8 + Math.random() * 0.5;
    }
    if (Math.random() < 0.3) say(e, G.Data.enemies[e.defId] ? G.Data.enemies[e.defId].taunt : 'punk');
  }

  function companion(e, dt, world) {
    var p = world.player;
    if (!p) return;
    var foe = nearestFoe(e, world, 120);

    if (foe && e.aiT <= 0) {
      var adx = Math.abs(foe.x - e.x), ady = Math.abs(foe.y - e.y);
      if (ady > 6) { move(e, e.x, foe.y, e.spd, world); return; }
      if (adx > 18) { move(e, foe.x - G.sign(foe.x - e.x) * 12, foe.y, e.spd, world); return; }
      face(e, foe);
      stop(e);
      G.Combat.startAttack(e, Math.random() < 0.7 ? 'ePunch' : 'eKick');
      e.aiT = 1.0 + Math.random() * 0.9;
      return;
    }

    /* держимся рядом с игроком */
    var want = p.x - p.facing * 26;
    var dist = Math.abs(e.x - want);
    if (dist > 46) move(e, want, p.y + (e.id % 2 ? 8 : -8), p.spd * 1.05, world);
    else stop(e);
    if (dist < 14) e.facing = p.facing;
  }

  G.AI = AI;
  G.AI.nearestFoe = nearestFoe;
})(window.G);
