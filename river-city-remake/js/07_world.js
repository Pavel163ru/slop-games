/* 07_world.js — геометрия мира, процедурные фоны районов и пропсы. */
(function (G) {
  'use strict';

  var VW = G.VW, VH = G.VH;

  /* полоса, по которой ходят: y от 0 (дальний край) до BAND (ближний край) */
  var TOP = 84;    // экранная y для мировой y = 0
  var BAND = 68;   // глубина полосы
  var YMIN = 0, YMAX = BAND;

  function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, w | 0, h | 0); }

  G.Themes = {
    river: {
      sky: ['#4a7cb8', '#a8c8e0'], far: '#2e3c56', mid: '#4a5a70', midDark: '#3a4a60',
      ground: '#60606a', ground2: '#54545e', walk: '#6a6a72', trim: '#8a8a96',
      lamp: '#f8f0b0', win: '#e8d888', accent: '#c85040'
    },
    downtown: {
      sky: ['#20204a', '#7858a0'], far: '#1a1830', mid: '#302848', midDark: '#241e38',
      ground: '#38384a', ground2: '#30303e', walk: '#444458', trim: '#585870',
      lamp: '#f8d060', win: '#f8e070', accent: '#e05070'
    },
    school: {
      sky: ['#6aa0c8', '#c8e0d0'], far: '#4a5a48', mid: '#8a5a48', midDark: '#6a4038',
      ground: '#7a7a68', ground2: '#6a6a58', walk: '#8a8a78', trim: '#a89a80',
      lamp: '#f8f8d0', win: '#b8d8e8', accent: '#c85040'
    },
    construction: {
      sky: ['#8a5020', '#e09040'], far: '#402818', mid: '#5a3a20', midDark: '#3a2414',
      ground: '#585048', ground2: '#4a4238', walk: '#605850', trim: '#786858',
      lamp: '#f8c040', win: '#f8b040', accent: '#e06020'
    },
    tower: {
      sky: ['#080820', '#282848'], far: '#0c0c1c', mid: '#181828', midDark: '#101018',
      ground: '#28283a', ground2: '#202030', walk: '#30304a', trim: '#40405e',
      lamp: '#40f8f8', win: '#f8f880', accent: '#f8d040'
    }
  };

  /* ---------------- пропсы ---------------- */
  function propLamp(c, x, y, t) {
    px(c, x + 3, y, 2, 26, '#404048');
    px(c, x + 1, y + 24, 6, 2, '#303038');
    px(c, x + 1, y - 4, 6, 5, t.lamp);
    px(c, x, y - 6, 8, 2, '#585860');
  }
  function propHydrant(c, x, y, t) {
    px(c, x + 2, y + 6, 6, 10, '#c03828');
    px(c, x + 1, y + 13, 8, 3, '#a02820');
    px(c, x + 3, y + 3, 4, 4, '#c03828');
    px(c, x + 3, y + 2, 4, 2, '#e04838');
  }
  function propCrate(c, x, y, t) {
    px(c, x, y + 4, 14, 14, '#a07038');
    px(c, x, y + 4, 14, 2, '#c08848');
    px(c, x + 1, y + 9, 12, 2, '#705020');
    px(c, x + 1, y + 15, 12, 2, '#705020');
  }
  function propBarrel(c, x, y, t) {
    px(c, x + 2, y + 4, 12, 16, '#3860a0');
    px(c, x + 2, y + 8, 12, 2, '#204878');
    px(c, x + 2, y + 14, 12, 2, '#204878');
    px(c, x + 2, y + 4, 12, 2, '#5080c0');
  }
  function propBench(c, x, y, t) {
    px(c, x, y + 8, 22, 3, '#8a5a30');
    px(c, x + 2, y + 11, 2, 7, '#40303a');
    px(c, x + 18, y + 11, 2, 7, '#40303a');
    px(c, x, y + 2, 22, 3, '#8a5a30');
    px(c, x + 1, y + 5, 2, 4, '#40303a');
    px(c, x + 19, y + 5, 2, 4, '#40303a');
  }
  function propTree(c, x, y, t) {
    px(c, x + 5, y + 12, 5, 16, '#5a3a20');
    px(c, x - 3, y - 4, 22, 18, '#286028');
    px(c, x + 1, y - 8, 14, 8, '#306c30');
    px(c, x + 5, y + 2, 6, 8, '#204c20');
  }
  function propBush(c, x, y, t) {
    px(c, x, y + 6, 14, 8, '#286028');
    px(c, x + 3, y + 2, 8, 6, '#306c30');
  }
  function propSign(c, x, y, t) {
    px(c, x + 7, y + 6, 2, 18, '#404048');
    px(c, x, y - 4, 16, 11, t.accent);
    px(c, x + 1, y - 3, 14, 9, '#f0e8d0');
    px(c, x + 3, y, 10, 1, '#404048');
    px(c, x + 3, y + 3, 7, 1, '#404048');
  }
  function propFence(c, x, y, t) {
    for (var i = 0; i < 4; i++) px(c, x + i * 8, y + 2, 2, 18, '#585860');
    px(c, x, y + 6, 32, 2, '#585860');
    px(c, x, y + 14, 32, 2, '#585860');
  }
  function propCar(c, x, y, t) {
    px(c, x, y + 10, 40, 12, t.accent);
    px(c, x + 8, y + 2, 22, 9, t.midDark);
    px(c, x + 10, y + 4, 8, 5, '#a8c8d8');
    px(c, x + 20, y + 4, 8, 5, '#a8c8d8');
    px(c, x + 4, y + 20, 7, 5, '#181820');
    px(c, x + 28, y + 20, 7, 5, '#181820');
    px(c, x + 38, y + 12, 2, 3, '#f8e070');
  }
  function propCone(c, x, y, t) {
    px(c, x + 2, y + 8, 8, 2, '#d05020');
    px(c, x + 3, y + 4, 6, 5, '#e06020');
    px(c, x + 4, y + 6, 4, 2, '#f8f8f8');
  }
  function propDrum(c, x, y, t) {
    px(c, x + 1, y + 6, 14, 14, '#c03828');
    px(c, x + 1, y + 9, 14, 3, '#f8f8f8');
    px(c, x + 1, y + 14, 14, 3, '#f8f8f8');
  }
  function propGirder(c, x, y, t) {
    px(c, x, y + 2, 4, 26, '#606068');
    px(c, x + 14, y + 2, 4, 26, '#606068');
    for (var i = 0; i < 5; i++) px(c, x + 4, y + 4 + i * 5, 10, 2, '#787880');
  }
  function propVending(c, x, y, t) {
    px(c, x, y - 10, 16, 30, '#c02030');
    px(c, x + 2, y - 8, 12, 12, '#204060');
    px(c, x + 3, y - 7, 4, 3, '#f8d040');
    px(c, x + 8, y - 7, 4, 3, '#f8d040');
    px(c, x + 3, y + 6, 10, 8, '#181820');
  }
  function propTrash(c, x, y, t) {
    px(c, x + 2, y + 8, 12, 14, '#4a5048');
    px(c, x + 1, y + 6, 14, 3, '#5a6058');
  }
  function propLocker(c, x, y, t) {
    px(c, x, y - 14, 12, 34, '#5878a0');
    px(c, x + 1, y - 13, 10, 14, '#6888b0');
    px(c, x + 1, y + 3, 10, 14, '#6888b0');
    px(c, x + 8, y - 6, 2, 3, '#202028');
  }
  function propAC(c, x, y, t) {
    px(c, x, y + 6, 18, 12, '#787880');
    px(c, x + 2, y + 8, 14, 8, '#585860');
    px(c, x + 2, y + 12, 14, 1, '#484850');
  }
  function propAntenna(c, x, y, t) {
    px(c, x + 5, y - 46, 2, 60, '#a0a0b0');
    px(c, x + 1, y - 40, 10, 2, '#a0a0b0');
    px(c, x + 2, y - 30, 8, 2, '#a0a0b0');
    px(c, x + 6, y - 48, 1, 4, '#f84040');
  }
  function propBarrier(c, x, y, t) {
    px(c, x, y + 8, 26, 3, '#f8f8f8');
    px(c, x, y + 14, 26, 3, '#e04030');
    px(c, x + 2, y + 11, 2, 12, '#a0a0a0');
    px(c, x + 22, y + 11, 2, 12, '#a0a0a0');
  }

  var PROPS = {
    lamp: propLamp, hydrant: propHydrant, crate: propCrate, barrel: propBarrel,
    bench: propBench, tree: propTree, sign: propSign, fence: propFence, car: propCar,
    cone: propCone, drum: propDrum, girder: propGirder, vending: propVending,
    trash: propTrash, locker: propLocker, ac: propAC, antenna: propAntenna,
    barrier: propBarrier, bush: propBush
  };

  function drawShop(c, x, y, shop, t, time) {
    /* дверь с навесом и вывеской */
    px(c, x - 2, y - 26, 34, 30, '#3a2a20');
    px(c, x, y - 24, 30, 28, shop.wall || '#6a4a38');
    px(c, x + 5, y - 12, 20, 16, '#204060');
    px(c, x + 6, y - 11, 18, 14, '#38688c');
    px(c, x + 22, y - 5, 2, 2, '#f8d040');
    px(c, x - 3, y - 30, 36, 5, shop.awning || '#c04030');
    px(c, x - 3, y - 25, 36, 2, '#a03028');
    px(c, x - 1, y - 42, 32, 11, '#181820');
    px(c, x, y - 41, 30, 9, shop.sign || '#f8d040');
    /* мигающая лампочка над входом */
    var on = ((time * 2) | 0) % 2 === 0;
    px(c, x + 14, y - 46, 4, 4, on ? '#f8f060' : '#807030');
  }

  /* ---------------- мир ---------------- */
  var World = {
    TOP: TOP, BAND: BAND, YMIN: YMIN, YMAX: YMAX,
    def: null, width: 0, props: null, shops: null, far: null, mid: null,
    rng: null, time: 0, theme: null,

    /* экранная y для мировой (y, z) */
    sy: function (y, z) { return TOP + y - (z || 0); },

    init: function (def) {
      this.def = def;
      this.width = def.width;
      this.theme = G.Themes[def.theme] || G.Themes.river;
      this.time = 0;
      var r = G.rng(def.seed);
      this.rng = r;

      /* дальний план — небоскрёбы */
      var far = [], x = -80;
      while (x < this.width + 120) {
        var w = G.ri(r, 26, 60), h = G.ri(r, 26, 58);
        far.push({ x: x, w: w, h: h, seed: G.ri(r, 1, 99999) });
        x += w + G.ri(r, 4, 16);
      }
      this.far = far;

      /* средний план — фасады */
      var mid = [];
      x = -80;
      while (x < this.width + 120) {
        var w2 = G.ri(r, 50, 110), h2 = G.ri(r, 34, 62);
        mid.push({ x: x, w: w2, h: h2, seed: G.ri(r, 1, 99999) });
        x += w2 + G.ri(r, 0, 6);
      }
      this.mid = mid;

      /* пропсы на земле */
      var props = [], types = def.props;
      for (var i = 0; i < types.length; i++) {
        var p = types[i];
        var n = p.n || 6;
        for (var k = 0; k < n; k++) {
          props.push({
            x: G.ri(r, 40, this.width - 60),
            type: p.t,
            y: p.front ? BAND + 10 : -6
          });
        }
      }
      props.sort(function (a, b) { return a.x - b.x; });
      this.props = props;

      this.shops = (def.shops || []).map(function (s) {
        var d = G.Data.shops[s.id] || {};
        return { x: s.x, id: s.id, name: d.name, wall: d.wall, awning: d.awning, sign: d.sign };
      });
    },

    drawSky: function (c, camX) {
      var t = this.theme;
      var g = c.createLinearGradient(0, 0, 0, TOP);
      g.addColorStop(0, t.sky[0]);
      g.addColorStop(1, t.sky[1]);
      c.fillStyle = g;
      c.fillRect(0, 0, VW, TOP);
    },

    drawFar: function (c, camX) {
      var t = this.theme, arr = this.far, i, b;
      for (i = 0; i < arr.length; i++) {
        b = arr[i];
        var sx = b.x - camX * 0.35;
        if (sx > VW + 40 || sx + b.w < -40) continue;
        var sy = TOP - b.h;
        px(c, sx, sy, b.w, b.h, t.far);
        /* окна детерминированные */
        var rr = G.rng(b.seed);
        for (var wy = sy + 4; wy < TOP - 4; wy += 7) {
          for (var wx = sx + 3; wx < sx + b.w - 4; wx += 6) {
            if (rr() > 0.45) px(c, wx, wy, 3, 4, t.win);
          }
        }
      }
    },

    drawMid: function (c, camX) {
      var t = this.theme, arr = this.mid, i, b;
      for (i = 0; i < arr.length; i++) {
        b = arr[i];
        var sx = b.x - camX * 0.6;
        if (sx > VW + 60 || sx + b.w < -60) continue;
        var sy = TOP - b.h;
        px(c, sx, sy, b.w, b.h, t.mid);
        px(c, sx, sy, b.w, 3, t.midDark);
        px(c, sx, sy, 2, b.h, t.midDark);
        /* окна */
        var rr = G.rng(b.seed + 7);
        for (var wy = sy + 8; wy < TOP - 8; wy += 12) {
          for (var wx = sx + 6; wx < sx + b.w - 8; wx += 12) {
            px(c, wx, wy, 7, 8, t.win);
            px(c, wx, wy, 7, 1, t.midDark);
            if (rr() > 0.7) px(c, wx, wy, 7, 8, t.lamp);
          }
        }
      }
    },

    drawGround: function (c, camX) {
      var t = this.theme;
      var bottom = TOP + BAND;
      px(c, 0, TOP, VW, BAND, t.ground);
      /* полосы "в перспективе" */
      var off = -(camX % 32);
      for (var x = off - 32; x < VW; x += 32) {
        px(c, x, TOP, 16, BAND, t.ground2);
      }
      for (var i = 1; i < 5; i++) {
        var yy = TOP + (BAND * i / 5) | 0;
        px(c, 0, yy, VW, 1, t.ground2);
      }
      /* дальний бордюр */
      px(c, 0, TOP - 3, VW, 3, t.trim);
      /* ближний тротуар */
      px(c, 0, bottom, VW, VH - bottom, t.walk);
      px(c, 0, bottom, VW, 2, t.trim);
      off = -(camX % 24);
      for (var x2 = off - 24; x2 < VW; x2 += 24) px(c, x2, bottom + 2, 1, VH - bottom - 2, t.ground2);
    },

    drawProps: function (c, camX, front) {
      var t = this.theme;
      for (var i = 0; i < this.props.length; i++) {
        var p = this.props[i];
        if (!!(p.y > BAND) !== !!front) continue;
        var sx = p.x - camX;
        if (sx > VW + 60 || sx < -70) continue;
        var fn = PROPS[p.type];
        if (fn) fn(c, sx, TOP + p.y, t);
      }
      /* магазины — на заднем плане */
      if (!front) {
        for (var k = 0; k < this.shops.length; k++) {
          var s = this.shops[k];
          var ssx = s.x - camX;
          if (ssx > VW + 60 || ssx < -60) continue;
          drawShop(c, ssx, TOP - 4, s, t, this.time);
        }
      }
    },

    draw: function (c, camX) {
      this.drawSky(c, camX);
      this.drawFar(c, camX);
      this.drawMid(c, camX);
      this.drawGround(c, camX);
      this.drawProps(c, camX, false);
    }
  };

  G.World = World;
})(window.G);
