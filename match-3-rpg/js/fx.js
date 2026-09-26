// fx.js — helpers анимаций на Canvas: время, easing, всплывающие цифры.
// Состояние эффектов живёт в объекте боя (battle.floats и т.д.), rAF-цикл — в main.js.

export function now() {
  return performance.now();
}

export function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

/** Прогресс 0..1 эффекта длительностью dur мс от t0. */
export function progress(t0, dur) {
  return clamp01((now() - t0) / dur);
}

/** Добавить всплывающую цифру (координаты канваса). */
export function addFloat(game, x, y, text, color = '#fff') {
  if (!game.floats) game.floats = [];
  game.floats.push({ x, y, text, color, t0: now(), dur: 950 });
  if (game.floats.length > 12) game.floats.shift();
}

/** Убрать завершённые эффекты (вызывается каждый кадр). */
export function pruneFx(game) {
  const t = now();
  if (game.floats) game.floats = game.floats.filter((f) => t - f.t0 < f.dur);
  if (game.fall && progress(game.fall.t0, 200) >= 1) game.fall = null;
  if (game.swap && progress(game.swap.t0, game.swap.dur) >= 1) game.swap = null;
  if (game.hint && t > game.hint.until) game.hint = null;
}
