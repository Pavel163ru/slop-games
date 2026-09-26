/* 30_entity.js — сущности: физика 2.5D, состояния, анимация, управление игроком. */
(function (G) {
  'use strict';

  var GRAV = 900;
  var JUMP_V = 250;
  var FRICTION = 520;
  var EID = 0;

  function Entity(o) {
    o = o || {};
    this.id = ++EID;
    this.kind = o.kind || 'enemy';         // player | enemy | companion
    this.name = o.name || 'БАНДИТ';
    this.spec = o.spec || 'punk';
    this.team = o.team === undefined ? 1 : o.team;   // 0 — сторона игрока
    this.defId = o.defId || null;          // id в G.Data.enemies

    this.x = o.x || 0;
    this.y = o.y === undefined ? 34 : o.y;
    this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.facing = o.facing || 1;

    this.maxHp = o.hp || 40; this.hp = this.maxHp;
    this.atk = o.atk || 6;
    this.def = o.def || 3;
    this.spd = o.spd || 40;
    this.maxSta = o.sta || 30; this.sta = this.maxSta;
    this.money = o.money || 0;

    this.state = 'idle';
    this.st = 0;
    this.animT = 0;
    this.atkData = null;      // активная атака
    this.combo = 0;
    this.queued = null;
    this.invuln = 0;
    this.hitstun = 0;
    this.downT = 0;
    this.getupT = 0;
    this.flash = 0;
    this.dead = false;
    this.remove = false;

    this.boss = !!o.boss;
    this.aiType = o.ai || 'brawler';
    this.aiT = 0; this.aiState = 'wait'; this.aiTarget = null;
    this.tauntT = 0; this.tauntMsg = null;
    this.cryT = 0;

    this.sitT = 0;            // таймер «сидит и ждёт вербовки»
    this.recruitable = false;

    this.hw = 5; this.hd = 5; this.zh = 24;
    this.lunge = 0;
    this.equip = 0;           // индекс выбранного приёма (для игрока)
    this.bufJ = 0; this.bufK = 0; this.bufL = 0; this.bufSp = 0;
  }

  Entity.prototype.canAct = function () {
    return this.state === 'idle' || this.state === 'walk' ||
           this.state === 'block' || this.state === 'jump';
  };

  Entity.prototype.grounded = function () { return this.z <= 0.0001; };

  Entity.prototype.setState = function (s) {
    if (this.state === s) { return; }
    this.state = s;
    this.st = 0;
  };

  Entity.prototype.pose = function () {
    var s = this.state;
    if (s === 'down' || s === 'dead') return 'down';
    if (s === 'sit') return 'sit';
    if (s === 'block' || s === 'getup') return 'block';
    if (s === 'hurt') return 'hurt';
    if (s === 'jump') return this.vz > 0 ? 'jump' : 'fall';
    if (s === 'punch' || s === 'kick' || s === 'tech') {
      if (this.atkData && this.atkData.pose) return this.atkData.pose;
      return s === 'kick' ? 'kick' : 'punch1';
    }
    if (s === 'walk') {
      var f = Math.floor(this.animT * 9) % 4;
      return ['walk0', 'walk1', 'walk2', 'walk3'][f];
    }
    return (Math.floor(this.animT * 1.6) % 2) ? 'idle2' : 'idle';
  };

  Entity.prototype.update = function (dt, world) {
    this.st += dt;
    this.animT += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hitstun > 0) this.hitstun -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.tauntT > 0) this.tauntT -= dt;
    if (this.cryT > 0) this.cryT -= dt;

    if (this.kind === 'player' && this.sta < this.maxSta) {
      this.sta = Math.min(this.maxSta, this.sta + 9 * dt);
    }

    /* атака */
    if (this.atkData) G.Combat.stepAttack(this, dt, world);

    /* состояния, которые блокируют управление */
    if (this.state === 'hurt') {
      if (this.st >= this.hitstun) { this.setState('idle'); }
    } else if (this.state === 'down') {
      this.downT -= dt;
      if (this.downT <= 0) {
        this.setState('getup');
        this.invuln = 0.35;
      }
    } else if (this.state === 'getup') {
      if (this.st >= 0.30) this.setState('idle');
    } else if (this.state === 'sit') {
      this.sitT -= dt;
      if (this.sitT <= 0) { this.dead = true; this.remove = true; }
    }

    /* физика */
    if (!this.grounded() || this.vz > 0) {
      this.vz -= GRAV * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0; this.vz = 0;
        if (this.state === 'jump') this.setState('idle');
        G.Audio.sfx('land');
      }
    }

    /* вынос вперёд от приёма */
    if (this.lunge !== 0) {
      var step = this.lunge * dt * 4;
      this.x += this.facing * step;
      this.lunge -= step;
      if (Math.abs(this.lunge) < 1) this.lunge = 0;
    }

    /* трение */
    if (this.state !== 'walk' || this.grounded() === false) {
      var fr = FRICTION * dt * (this.grounded() ? 1 : 0.25);
      this.vx = G.approach(this.vx, 0, fr);
      this.vy = G.approach(this.vy, 0, fr);
    }

    /* разбиваем движение на мелкие шаги — чтобы на большой скорости не проскочить сквозь стены */
    var total = Math.sqrt(this.vx * this.vx + this.vy * this.vy) * dt;
    var steps = Math.max(1, Math.ceil(total / 4));
    for (var i = 0; i < steps; i++) {
      this.x += this.vx * dt / steps;
      this.y += this.vy * dt / steps;
    }

    this.x = G.clamp(this.x, 10, world.width - 10);
    this.y = G.clamp(this.y, G.World.YMIN, G.World.YMAX);

    if (this.state === 'walk' && Math.abs(this.vx) < 4 && Math.abs(this.vy) < 4) this.setState('idle');
  };

  /* ---------------- управление игроком ----------------
     Нажатия складываются в буфер и живут 0.22с: удар, нажатый чуть раньше
     или в «мёртвом окне» комбо, не пропадает, а срабатывает, как только можно. */
  var BUF = 0.22;

  Entity.prototype.controlPlayer = function (dt, world) {
    var In = G.Input;
    var s = this.state;

    /* клавиши берутся из текущей раскладки (см. 08_binds.js) */
    if (In.hitAny(G.key('punch'))) this.bufJ = BUF;
    if (In.hitAny(G.key('kick')))  this.bufK = BUF;
    if (In.hitAny(G.key('tech')))  this.bufL = BUF;
    if (In.hitAny(G.key('jump')))  this.bufSp = BUF;

    for (var n = 1; n <= 5; n++) {
      if (In.hit('Digit' + n)) {
        if (G.player.techs[n - 1]) { G.player.equip = n - 1; G.Audio.sfx('menu'); }
      }
    }

    if (this.bufJ > 0) this.bufJ -= dt;
    if (this.bufK > 0) this.bufK -= dt;
    if (this.bufL > 0) this.bufL -= dt;
    if (this.bufSp > 0) this.bufSp -= dt;

    if (s === 'down' || s === 'getup' || s === 'hurt' || s === 'dead' || s === 'sit') return;

    if (s === 'punch' || s === 'kick' || s === 'tech') {
      /* в серии ударов можно заказать продолжение */
      if (this.atkData && this.atkData.next && this.st > this.atkData.dur * 0.38 && this.bufJ > 0) {
        this.queued = this.atkData.next;
        this.bufJ = 0;
      }
      return;
    }

    var ax = In.axis();
    var blocking = In.downAny(G.key('block'));

    if (blocking && this.grounded()) {
      this.setState('block');
      this.vx = 0; this.vy = 0;
      return;
    }

    /* прыжок */
    if (this.bufSp > 0 && this.grounded()) {
      this.bufSp = 0;
      this.vz = JUMP_V;
      this.setState('jump');
      G.Audio.sfx('jump');
      return;
    }

    /* приём */
    if (this.bufL > 0 && this.grounded()) {
      this.bufL = 0;
      var tid = G.player.techs[G.player.equip];
      if (!tid) { G.notify('ПРИЁМОВ НЕТ — КУПИ КНИГУ В ЛАВКЕ'); G.Audio.sfx('no'); }
      else G.Combat.startTech(this, tid);
      return;
    }

    /* удары */
    if (this.bufJ > 0) {
      this.bufJ = 0;
      G.Combat.startAttack(this, this.grounded() ? 'punch1' : 'kickAir');
      return;
    }
    if (this.bufK > 0) {
      this.bufK = 0;
      G.Combat.startAttack(this, this.grounded() ? 'kick' : 'kickAir');
      return;
    }

    /* движение */
    if (this.grounded() && (ax.x || ax.y)) {
      var len = Math.sqrt(ax.x * ax.x + ax.y * ax.y) || 1;
      var sp = this.spd * (this.state === 'block' ? 0 : 1);
      this.vx = (ax.x / len) * sp;
      this.vy = (ax.y / len) * sp * 0.62;
      if (ax.x) this.facing = ax.x > 0 ? 1 : -1;
      this.setState('walk');
    } else if (this.grounded() && this.state === 'walk') {
      this.setState('idle');
    } else if (this.grounded() && s !== 'jump') {
      if (this.state !== 'idle') this.setState('idle');
    }
  };

  G.Entity = Entity;
  G.JUMP_V = JUMP_V;

  G.makeEnemy = function (defId, x, y, opt) {
    var d = G.Data.enemies[defId];
    if (!d) return null;
    opt = opt || {};
    var e = new G.Entity({
      kind: opt.kind || 'enemy',
      name: d.name, spec: d.spec, defId: defId,
      x: x, y: y,
      hp: Math.round(d.hp * (opt.hpMul || 1)),
      atk: Math.round(d.atk * (opt.atkMul || 1)),
      def: d.def, spd: d.spd, sta: 30,
      money: d.money, ai: d.ai, boss: d.boss, team: opt.team === undefined ? 1 : opt.team
    });
    e.hw = d.boss ? 7 : 5;
    e.zh = d.boss ? 28 : 24;
    return e;
  };
})(window.G);
