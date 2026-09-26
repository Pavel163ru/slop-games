/* 41_hud.js — HUD, всплывающие сообщения, меню-оверлеи, экранные эффекты. */
(function (G) {
  'use strict';

  var VW = G.VW;

  /* ---------------- тосты ---------------- */
  var toastEl = null, toastT = 0;
  G.notify = function (msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    toastT = 2.6;
  };

  /* ---------------- HUD ---------------- */
  var HUD = {
    el: null, tl: null, tr: null, bl: null, br: null, sig: '',

    init: function () {
      this.el = document.getElementById('hud');
      this.el.innerHTML =
        '<div class="panel tl" id="hud_tl"></div>' +
        '<div class="panel tr" id="hud_tr"></div>' +
        '<div class="panel bl" id="hud_bl"></div>' +
        '<div class="panel br" id="hud_br"></div>' +
        '<div id="toast" style="position:absolute;left:50%;top:14%;transform:translateX(-50%);' +
        'background:rgba(8,8,20,.9);border:2px solid #f8d040;padding:4px 10px;font-size:calc(var(--s) * 5px);' +
        'font-weight:bold;letter-spacing:1px;color:#f8f8ff;display:none;white-space:nowrap;text-transform:uppercase"></div>';
      this.tl = document.getElementById('hud_tl');
      this.tr = document.getElementById('hud_tr');
      this.bl = document.getElementById('hud_bl');
      this.br = document.getElementById('hud_br');
      toastEl = document.getElementById('toast');
    },

    pct: function (v, m) { return Math.max(0, Math.min(100, (v / m) * 100)); },

    update: function (dt) {
      if (toastT > 0) {
        toastT -= dt;
        if (toastT <= 0) toastEl.style.display = 'none';
      }
      var p = G.player;
      if (!p) return;
      var e = G.world && G.world.player;

      /* ВАЖНО: показываем ЖИВОЕ здоровье сущности, а не сохранённое в G.player.
         G.player.hp синхронизируется только при переходах между районами, поэтому
         подпись (sig) должна считаться по тем же живым значениям — иначе шкала
         замирает посреди боя и герой «внезапно» умирает при половине HP. */
      var hp = e ? e.hp : p.hp;
      var sta = e ? e.sta : p.sta;
      var maxHp = e ? e.maxHp : p.maxHp;
      var maxSta = e ? e.maxSta : p.maxSta;

      var dist = G.Data.districts[G.player.district];
      var techLine = 'ПРИЁМОВ НЕТ';
      if (p.techs.length) {
        var parts = [];
        for (var i = 0; i < p.techs.length; i++) {
          var t = G.Data.techs[p.techs[i]];
          parts.push((i === p.equip ? '[' + (i + 1) + ']' : ' ' + (i + 1) + ' ') + t.name.split(' ')[0]);
        }
        techLine = parts.join(' ');
      }

      var sig = [
        Math.ceil(hp), maxHp, Math.ceil(sta), maxSta, p.money, p.atk, p.def, p.spd,
        dist ? dist.id : '', techLine, G.player.companions.length,
        G.states && G.states.name ? G.states.name : '', G.hint || ''
      ].join('|');
      if (sig === this.sig) return;
      this.sig = sig;

      var hpPct = this.pct(hp, maxHp);
      this.tl.innerHTML =
        '<div>' + p.name + '</div>' +
        '<div class="bar' + (hpPct < 30 ? ' lo' : '') + '"><i style="width:' + hpPct + '%"></i></div>' +
        '<div class="bar sta"><i style="width:' + this.pct(sta, maxSta) + '%"></i></div>' +
        '<div class="dim">HP ' + Math.max(0, Math.ceil(hp)) + '/' + maxHp +
        ' · СИЛА ' + p.atk + ' · СТОЙК ' + p.def + '</div>';

      this.tr.innerHTML =
        '<div class="gold">' + p.money + ' ₽</div>' +
        '<div class="dim">' + (dist ? dist.name : '') + '</div>';

      this.bl.innerHTML = '<div class="dim">' + techLine + '</div>';

      var comp = '';
      for (var k = 0; k < G.player.companions.length; k++) {
        var c = G.player.companions[k];
        comp += (comp ? ' · ' : '') + c.name;
      }
      this.br.innerHTML =
        (comp ? '<div>ОТРЯД: ' + comp + '</div>' : '') +
        (G.hint ? '<div class="gold">' + G.hint + '</div>' : '');
    }
  };
  G.HUD = HUD;

  /* ---------------- меню-оверлей ---------------- */
  var UI = {
    el: null, card: null, open: false, cfg: null, idx: 0, top: 0, VIS: 13,

    init: function () {
      this.el = document.getElementById('overlay');
    },

    show: function (cfg) {
      this.cfg = cfg;
      this.idx = cfg.index || 0;
      this.top = 0;
      this.open = true;
      this.el.classList.add('on');
      this.render();
    },

    hide: function () {
      this.open = false;
      this.cfg = null;
      this.el.classList.remove('on');
    },

    render: function () {
      var cfg = this.cfg;
      if (!cfg) return;
      var rows = cfg.rows || [];
      this.top = Math.max(0, this.top);
      if (this.idx < 0) this.idx = 0;
      if (this.idx >= rows.length) this.idx = Math.max(0, rows.length - 1);
      if (this.idx < this.top) this.top = this.idx;
      if (this.idx > this.top + this.VIS - 1) this.top = this.idx - this.VIS + 1;

      var html = '';
      if (cfg.title) html += '<h1>' + cfg.title + '</h1>';
      if (cfg.subtitle) html += '<div class="sub">' + cfg.subtitle + '</div>';
      if (cfg.big) html += '<h2>' + cfg.big + '</h2>';
      html += '<div class="list">';
      for (var i = this.top; i < Math.min(rows.length, this.top + this.VIS); i++) {
        var r = rows[i];
        var cls = 'row' + (i === this.idx ? ' sel' : '') + (r.disabled ? ' off' : '');
        html += '<div class="' + cls + '"><span>' + r.label + '</span><span>' + (r.right || '') + '</span></div>';
      }
      if (!rows.length) html += '<div class="row"><span class="dim">— ПУСТО —</span><span></span></div>';
      html += '</div>';
      var sel = rows[this.idx];
      html += '<div class="desc">' + (sel && sel.desc ? sel.desc : (cfg.desc || '')) + '</div>';
      html += '<div class="foot">' + (cfg.footer || '<span class="k">↑↓</span> выбор · <span class="k">ENTER</span> ок · <span class="k">ESC</span> назад') + '</div>';
      this.el.innerHTML = '<div class="card">' + html + '</div>';
    },

    input: function () {
      if (!this.open || !this.cfg) return;
      var In = G.Input, cfg = this.cfg, rows = cfg.rows || [];
      var moved = false;
      if (In.hit('ArrowUp') || In.hit('KeyW')) { this.idx--; moved = true; }
      if (In.hit('ArrowDown') || In.hit('KeyS')) { this.idx++; moved = true; }
      if (rows.length) {
        if (this.idx < 0) this.idx = rows.length - 1;
        if (this.idx >= rows.length) this.idx = 0;
      } else this.idx = 0;
      if (moved) { G.Audio.sfx('menu'); this.render(); }

      if (In.hitAny(G.key('ok'))) {
        var r = rows[this.idx];
        if (r && !r.disabled && r.action) {
          G.Audio.sfx('ok');
          r.action();
          if (this.cfg && this.cfg.rebuild) { this.cfg.rows = this.cfg.rebuild(); this.render(); }
        } else if (r && r.disabled) G.Audio.sfx('no');
        return;
      }
      if (In.hitAny(G.key('back'))) {
        if (cfg.onCancel) { G.Audio.sfx('no'); cfg.onCancel(); }
        return;
      }
    }
  };
  G.UI = UI;

  /* ---------------- экранные эффекты ---------------- */
  var FX = {
    update: function (dt, world) {
      var a = G.fx;
      for (var i = a.length - 1; i >= 0; i--) {
        var f = a[i];
        f.life -= dt;
        if (f.life <= 0) { a.splice(i, 1); continue; }
        if (f.type === 'spark') {
          f.vz -= 420 * dt;
          f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
          if (f.z < 0) { f.z = 0; f.vz *= -0.35; f.vx *= 0.6; }
        } else {
          f.z += (f.vz || 0) * dt;
          if (f.vz) f.vz -= 90 * dt;
        }
      }
    },

    drawGame: function (ctx, camX) {
      var a = G.fx;
      for (var i = 0; i < a.length; i++) {
        var f = a[i];
        if (f.type === 'num' || f.type === 'word') continue;
        var sx = Math.round(f.x - camX);
        if (sx < -20 || sx > VW + 20) continue;
        var sy = Math.round(G.World.sy(f.y, f.z));
        var al = Math.max(0, Math.min(1, f.life / f.max));
        ctx.globalAlpha = al;
        ctx.fillStyle = f.col;
        if (f.type === 'dust') ctx.fillRect(sx - 1, sy - 1, 2, 2);
        else ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
    },

    /* текст — на отдельном высоком разрешении, чтобы кириллица была резкой */
    drawText: function (ctx, camX) {
      var a = G.fx;
      ctx.save();
      ctx.textAlign = 'center';
      for (var i = 0; i < a.length; i++) {
        var f = a[i];
        if (f.type !== 'num' && f.type !== 'word') continue;
        var sx = f.x - camX;
        if (sx < -30 || sx > VW + 30) continue;
        var sy = G.World.sy(f.y, f.z);
        var al = Math.max(0, Math.min(1, f.life / f.max));
        ctx.globalAlpha = al;
        ctx.font = 'bold ' + (f.type === 'word' ? 10 : 8) + 'px "Courier New", monospace';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#101018';
        ctx.strokeText(f.text, sx, sy);
        ctx.fillStyle = f.col;
        ctx.fillText(f.text, sx, sy);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    },

    /* реплики над головами */
    drawSpeech: function (ctx, camX) {
      var ents = G.world ? G.world.ents : [];
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'bold 6px "Courier New", monospace';
      for (var i = 0; i < ents.length; i++) {
        var e = ents[i];
        if (!e.tauntMsg || e.tauntT <= 0) continue;
        var sx = e.x - camX;
        if (sx < 10 || sx > VW - 10) continue;
        var sy = G.World.sy(e.y, e.z) - e.zh - 12;
        var w = ctx.measureText(e.tauntMsg).width + 8;
        var x0 = G.clamp(sx - w / 2, 2, VW - w - 2);
        var a = Math.min(1, e.tauntT / 0.4);
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(248,248,255,.94)';
        ctx.fillRect(x0, sy - 9, w, 12);
        ctx.fillStyle = '#101018';
        ctx.fillRect(x0 + w / 2 - 2, sy + 3, 4, 3);
        ctx.fillStyle = '#101018';
        ctx.fillText(e.tauntMsg, x0 + w / 2, sy);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  };
  G.FX = FX;
})(window.G);
