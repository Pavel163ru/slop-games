/* 99_main.js — единственная точка старта. */
(function (G) {
  'use strict';

  G.fx = [];
  G.hint = '';

  function update(dt) {
    G.Audio.tick();
    G.FX.update(dt);
    G.states.update(dt);
  }

  function render(dt) {
    G.Screen.clearFx();
    G.states.render(dt);
    G.HUD.update(dt);
  }

  function boot() {
    G.Screen.init();
    G.Input.init();
    G.HUD.init();
    G.UI.init();

    G.player = G.Save.read() || G.newPlayer();
    if (!G.player.unlocked) G.player.unlocked = 0;

    /* раскладка: из localStorage, иначе из сохранения (кодовый путь) */
    G.Bind.load();

    document.addEventListener('mousedown', function () { G.Audio.unlock(); });

    G.states.change('title');
    G.Loop.start(update, render);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.G);
