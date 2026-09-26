'use strict';

/* ============================================================
 * level/renderer.js — рендеринг уровня (карты)
 * ============================================================ */

var LevelRenderer = {};

/**
 * Рисует карту уровня с учётом камеры и fog of war
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} level   — объект уровня из generator.js
 * @param {Object} explored — 2D массив boolean (true = исследовано)
 * @param {number} cameraX  — мировая X камеры (левый верхний угол видимой области)
 * @param {number} cameraY  — мировая Y камеры
 */
LevelRenderer.draw = function (ctx, level, explored, cameraX, cameraY) {
    var canvasW = ctx.canvas.width;
    var canvasH = ctx.canvas.height;

    // Вычисляем границы видимой области в тайлах
    var startTX = Math.max(0, Math.floor(cameraX / TILE_SIZE));
    var startTY = Math.max(0, Math.floor(cameraY / TILE_SIZE));
    var endTX   = Math.min(level.width,  Math.ceil((cameraX + canvasW) / TILE_SIZE) + 1);
    var endTY   = Math.min(level.height, Math.ceil((cameraY + canvasH) / TILE_SIZE) + 1);

    for (var ty = startTY; ty < endTY; ty++) {
        for (var tx = startTX; tx < endTX; tx++) {
            // Если не исследовано — рисуем чёрную тучу
            if (!explored[ty][tx]) {
                ctx.fillStyle = '#000000';
                ctx.fillRect(
                    tx * TILE_SIZE - cameraX,
                    ty * TILE_SIZE - cameraY,
                    TILE_SIZE,
                    TILE_SIZE
                );
                continue;
            }

            var tile = level.tiles[ty][tx];
            var px = tx * TILE_SIZE - cameraX;
            var py = ty * TILE_SIZE - cameraY;

            if (tile === TILE.WALL) {
                // Стена — тёмно-серая с лёгким 3D-эффектом (свет сверху-слева)
                ctx.fillStyle = '#3d3d3d';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                // Светлая граница сверху и слева
                ctx.fillStyle = '#555555';
                ctx.fillRect(px, py, TILE_SIZE, 2);     // верхняя граница
                ctx.fillRect(px, py, 2, TILE_SIZE);     // левая граница

                // Тёмная граница снизу и справа
                ctx.fillStyle = '#2a2a2a';
                ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);  // нижняя
                ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);  // правая
            } else if (tile === TILE.DOOR_CLOSED) {
                // Закрытая дверь
                ctx.fillStyle = '#6b4423';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#4a2f18';
                ctx.lineWidth = 2;
                ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(px + TILE_SIZE - 6, py + TILE_SIZE / 2, 3, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Пол
                ctx.fillStyle = '#2a2a2a';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                if (tile === TILE.DOOR_OPEN) {
                    ctx.strokeStyle = 'rgba(107, 68, 35, 0.5)';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                }

                // Тонкая граница между тайлами пола для чёткости
                ctx.fillStyle = '#333333';
                ctx.fillRect(px + TILE_SIZE - 1, py, 1, TILE_SIZE);
                ctx.fillRect(px, py + TILE_SIZE - 1, TILE_SIZE, 1);
            }
        }
    }

    // --- Рисуем лестницу (выход) ---
    var exitScreenX = level.exit.x * TILE_SIZE - cameraX;
    var exitScreenY = level.exit.y * TILE_SIZE - cameraY;
    if (explored[level.exit.y][level.exit.x]) {
        ctx.fillStyle = '#ffd700';  // золотой
        ctx.fillRect(exitScreenX + 4, exitScreenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        // Обводка
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        ctx.strokeRect(exitScreenX + 4, exitScreenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    }

    // --- Рисуем сундуки ---
    for (var c = 0; c < level.chests.length; c++) {
        var chest = level.chests[c];
        if (explored[chest.y][chest.x]) {
            var csx = chest.x * TILE_SIZE - cameraX;
            var csy = chest.y * TILE_SIZE - cameraY;
            if (!chest.opened) {
                ctx.fillStyle = '#8b5a2b';
                ctx.fillRect(csx + 4, csy + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                ctx.strokeStyle = '#5c3a18';
                ctx.lineWidth = 2;
                ctx.strokeRect(csx + 4, csy + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(csx + 14, csy + 14, 4, 4);
            } else {
                ctx.strokeStyle = '#8b5a2b';
                ctx.lineWidth = 2;
                ctx.strokeRect(csx + 4, csy + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(csx + 6, csy + 6, TILE_SIZE - 12, TILE_SIZE - 12);
            }
        }
    }

    // --- Рисуем вход (для отладки — полупрозрачный зелёный) ---
    if (explored[level.entrance.y][level.entrance.x]) {
        var esx = level.entrance.x * TILE_SIZE - cameraX;
        var esy = level.entrance.y * TILE_SIZE - cameraY;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.fillRect(esx, esy, TILE_SIZE, TILE_SIZE);
    }
};

/**
 * Вычисляет прямоугольник видимой области в мировых координатах
 * @returns {{x: number, y: number, w: number, h: number}}
 */
LevelRenderer.getViewRect = function (cameraX, cameraY) {
    return {
        x: cameraX,
        y: cameraY,
        w: ctx.canvas.width,
        h: ctx.canvas.height
    };
};

/**
 * Рисует мини-карту в углу экрана
 */
LevelRenderer.drawMinimap = function (ctx, level, explored, player) {
    var size = 150;
    var margin = 20;
    var mx = ctx.canvas.width - size - margin;
    var my = margin;

    ctx.save();
    
    // Фон мини-карты
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.fillRect(mx, my, size, size);
    ctx.strokeRect(mx, my, size, size);

    var scaleX = size / level.width;
    var scaleY = size / level.height;

    // Рисуем исследованные тайлы
    for (var ty = 0; ty < level.height; ty++) {
        for (var tx = 0; tx < level.width; tx++) {
            if (explored[ty][tx]) {
                var tile = level.tiles[ty][tx];
                if (tile === TILE.WALL) {
                    ctx.fillStyle = '#444';
                } else if (tile === TILE.DOOR_CLOSED) {
                    ctx.fillStyle = '#6b4423';
                } else if (tile === TILE.DOOR_OPEN) {
                    ctx.fillStyle = '#555';
                } else {
                    ctx.fillStyle = '#888';
                }
                ctx.fillRect(mx + tx * scaleX, my + ty * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
            }
        }
    }

    // Рисуем выход, если он исследован
    if (explored[level.exit.y][level.exit.x]) {
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(mx + level.exit.x * scaleX - 1, my + level.exit.y * scaleY - 1, 3, 3);
    }

    // Рисуем игрока
    var ptx = player.x / TILE_SIZE;
    var pty = player.y / TILE_SIZE;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(mx + ptx * scaleX, my + pty * scaleY, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
};