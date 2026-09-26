'use strict';
/* ============================================================
 * input.js — клавиатура: удержание + «нажато в этом кадре»
 * ============================================================ */

const Input = {
  keys: {},
  pressedKeys: {},

  init() {
    window.addEventListener('keydown', e => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.keys[e.code]) this.pressedKeys[e.code] = true;
      this.keys[e.code] = true;
      if (typeof Sound !== 'undefined') Sound.unlock();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; });
  },

  /** Зажата ли любая из перечисленных клавиш */
  down(...codes) { return codes.some(c => !!this.keys[c]); },

  /** Нажата ли (один раз) в текущем кадре */
  pressed(...codes) { return codes.some(c => !!this.pressedKeys[c]); },

  /** Вызывается в конце каждого кадра */
  update() { this.pressedKeys = {}; },
};
