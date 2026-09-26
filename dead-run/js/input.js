'use strict';

/* ============================================================
 * input.js — обработка ввода (клавиатура + мышь)
 * ============================================================ */

var Input = {
    keys: {},
    keysPressed: {},
    mouse: { x: 0, y: 0, left: false, right: false, leftPressed: false }
};

/** Инициализация слушателей событий на канвасе */
Input.init = function (canvas) {
    // Клавиатура
    window.addEventListener('keydown', function (e) {
        if (!Input.keys[e.code]) {
            Input.keysPressed[e.code] = true;
        }
        Input.keys[e.code] = true;
        // Предотвращаем скроллинг страницы клавишами-стрелками, пробелом
if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Escape'].indexOf(e.code) !== -1) {
            e.preventDefault();
        }
    });

    window.addEventListener('keyup', function (e) {
        Input.keys[e.code] = false;
    });

    // Мышь — позиция относительно канваса
    canvas.addEventListener('mousemove', function (e) {
        var rect = canvas.getBoundingClientRect();
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        Input.mouse.x = (e.clientX - rect.left) * scaleX;
        Input.mouse.y = (e.clientY - rect.top) * scaleY;
    });

    canvas.addEventListener('mousedown', function (e) {
        if (e.button === 0) {
            Input.mouse.left = true;
            Input.mouse.leftPressed = true;
        }
        if (e.button === 2) Input.mouse.right = true;
    });

    canvas.addEventListener('mouseup', function (e) {
        if (e.button === 0) Input.mouse.left = false;
        if (e.button === 2) Input.mouse.right = false;
    });

    // Отключаем контекстное меню ПКМ на канвасе
    canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });
};

/** Проверка, зажата ли клавиша в текущем кадре */
Input.isDown = function (code) {
    return !!Input.keys[code];
};

/** Проверка, была ли клавиша нажата в этом кадре */
Input.wasPressed = function (code) {
    return !!Input.keysPressed[code];
};

/** Сброс состояния одного кадра (вызывать в конце кадра) */
Input.update = function () {
    Input.keysPressed = {};
    Input.mouse.leftPressed = false;
};
