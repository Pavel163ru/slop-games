'use strict';

/* ============================================================
 * main.js — точка входа, game loop, инициализация Canvas
 * ============================================================ */

// Получаем канвас и контекст
var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');

// Предотвращаем двойной буфер мерцания (браузер сам использует double-buffering для canvas)
ctx.imageSmoothingEnabled = false;

// Инициализация подсистем
Input.init(canvas);
Game.init();

// Переменные для расчёта deltaTime
var lastTime = 0;

/**
 * Главный игровой цикл (game loop)
 * @param {number} timestamp — timestamp от requestAnimationFrame (ms)
 */
function gameLoop(timestamp) {
    // Вычисляем deltaTime в секундах (ограничиваем до 0.1 чтобы избежать скачков при потере фокуса)
    var dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    // Обновляем логику
    Game.update(dt);

    // Отрисовываем текущий кадр
    Game.render(ctx);

    // Сбрасываем состояния нажатий клавиш для текущего кадра
    Input.update();

    // Запрашиваем следующий кадр
    requestAnimationFrame(gameLoop);
}

/** Обработка ресайза окна — масштабируем канвас через CSS transform */
function handleResize() {
    var w = window.innerWidth;
    var h = window.innerHeight;

    var scaleX = w / canvas.width;
    var scaleY = h / canvas.height;
    var scale = Math.min(scaleX, scaleY);

    // Масштабируем канвас, сохраняя пропорции
    canvas.style.width = (canvas.width * scale) + 'px';
    canvas.style.height = (canvas.height * scale) + 'px';
}

window.addEventListener('resize', handleResize);
handleResize(); // Вызываем сразу при загрузке

// Запускаем первый кадр
requestAnimationFrame(gameLoop);
