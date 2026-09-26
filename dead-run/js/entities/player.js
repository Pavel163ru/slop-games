'use strict';

/* ============================================================
 * entities/player.js — игрок: движение, коллизии, камера
 * ============================================================ */

// --- Характеристики игрока ---
var PLAYER_SPEED = 3;       // px за кадр (при 60fps ≈ 180px/сек)
var PLAYER_SPRINT_MULT = 1.6; // множитель при зажатом Shift
var PLAYER_RADIUS = 14;      // радиус коллизии (вписан в 32×32 квадрат)
var PLAYER_MAX_HP = 100;

/**
 * Создание игрока в заданной позиции мира
 * @param {number} worldX
 * @param {number} worldY
 */
function Player(worldX, worldY) {
    this.x = worldX;
    this.y = worldY;
    this.width  = 32;
    this.height = 32;

    this.hp     = PLAYER_MAX_HP;
    this.maxHp  = PLAYER_MAX_HP;

    // Направление взгляда (от мыши)
    this.angle = 0;

    // Состояния
    this.isSprinting = false;

    // Анимация
    this.walkTimer = 0;
    this.bobPhase  = 0; // покачивание при ходьбе
}

/**
 * Обновление каждый кадр
 * @param {number} dt         — deltaTime (секунды)
 * @param {Object} level      — объект уровня
 * @param {Object} input      — Input (глобальный)
 * @param {{x: number, y: number}} camera — текущая позиция камеры (м.б. модифицировано)
 * @returns {{x: number, y: number}} — новое смещение камеры
 */
Player.prototype.update = function (dt, level, input, camera) {
    // Определяем направление движения
    var moveX = 0;
    var moveY = 0;

    if (input.isDown('KeyW') || input.isDown('ArrowUp'))    moveY -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown'))  moveY += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft'))  moveX -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) moveX += 1;

    // Нормализуем диагональное движение
    if (moveX !== 0 && moveY !== 0) {
        var len = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX /= len;
        moveY /= len;
    }

    // Бег при зажатом Shift
    this.isSprinting = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    var speed = PLAYER_SPEED * (this.isSprinting ? PLAYER_SPRINT_MULT : 1);

    // Вычисляем приращение
    var dx = moveX * speed;
    var dy = moveY * speed;

    // --- Коллизии по X ---
    var newX = this.x + dx;
    if (!collidesWithWall(level.tiles, newX - PLAYER_RADIUS, this.y - PLAYER_RADIUS, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2) &&
        !collidesWithWall(level.tiles, newX + PLAYER_RADIUS - 1, this.y - PLAYER_RADIUS, 1, PLAYER_RADIUS * 2)) {
        this.x = newX;
    } else {
        // Попробуем прижаться к стене (скольжение)
        if (!collidesWithWall(level.tiles, newX - PLAYER_RADIUS, this.y - PLAYER_RADIUS, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2)) {
            this.x = newX;
        }
    }

    // --- Коллизии по Y ---
    var newY = this.y + dy;
    if (!collidesWithWall(level.tiles, this.x - PLAYER_RADIUS, newY - PLAYER_RADIUS, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2) &&
        !collidesWithWall(level.tiles, this.x - PLAYER_RADIUS, newY + PLAYER_RADIUS - 1, PLAYER_RADIUS * 2, 1)) {
        this.y = newY;
    } else {
        if (!collidesWithWall(level.tiles, this.x - PLAYER_RADIUS, newY - PLAYER_RADIUS, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2)) {
            this.y = newY;
        }
    }

    // Ограничиваем в пределах карты
    if (this.x < PLAYER_RADIUS) this.x = PLAYER_RADIUS;
    if (this.x > level.width * TILE_SIZE - PLAYER_RADIUS) this.x = level.width * TILE_SIZE - PLAYER_RADIUS;
    if (this.y < PLAYER_RADIUS) this.y = PLAYER_RADIUS;
    if (this.y > level.height * TILE_SIZE - PLAYER_RADIUS) this.y = level.height * TILE_SIZE - PLAYER_RADIUS;

    // --- Направление взгляда на мышь ---
    this.angle = Math.atan2(input.mouse.y - (this.y - camera.y),
                            input.mouse.x - (this.x - camera.x));

    // --- Анимация ходьбы ---
    if (moveX !== 0 || moveY !== 0) {
        this.walkTimer += dt * 8; // скорость покачивания
    } else {
        this.walkTimer = 0;
        this.bobPhase = 0;
    }

    return camera;
};

/**
 * Отрисовка игрока на канвасе (уже с учётом смещения камеры)
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} screenX — позиция на экране (x - cameraX)
 * @param {number} screenY — позиция на экране (y - cameraY)
 */
Player.prototype.draw = function (ctx, screenX, screenY) {
    var cx = screenX;
    var cy = screenY;
    var r  = PLAYER_RADIUS;
    var hpRatio = Math.max(0, Math.min(1, this.hp / this.maxHp));
    var red = Math.round(255 * (1 - hpRatio));
    var green = Math.round(255 * hpRatio);
    var bodyColor = 'rgb(' + red + ', ' + green + ', 64)';
    var outlineColor = 'rgb(' + Math.round(red * 0.75) + ', ' + Math.round(green * 0.75) + ', 48)';

    // --- Тело (круг) ---
    ctx.save();
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // --- Контур ---
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- Направление взгляда (линия к курсору) ---
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(this.angle) * (r + 12), cy + Math.sin(this.angle) * (r + 12));
    ctx.stroke();

    // --- «Глаз» в направлении взгляда ---
    var eyeDist = 6;
    var eyeX = cx + Math.cos(this.angle) * eyeDist;
    var eyeY = cy + Math.sin(this.angle) * eyeDist;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // --- Покачивание (боб) при ходьбе ---
    // Лёгкое покачивание тела вверх-вниз
    if (this.walkTimer > 0) {
        var bob = Math.sin(this.walkTimer) * 2;
        // Рисуем тень, которая тоже покачивается
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + r + 4 - Math.abs(bob), r, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
};

/**
 * Получить хитбокс игрока (AABB)
 * @returns {{x: number, y: number, w: number, h: number}}
 */
Player.prototype.getHitbox = function () {
    return {
        x: this.x - PLAYER_RADIUS,
        y: this.y - PLAYER_RADIUS,
        w: PLAYER_RADIUS * 2,
        h: PLAYER_RADIUS * 2
    };
};

/**
 * Применить урон игроку
 * @param {number} amount — величина урона
 * @returns {boolean} — true если игрок жив, false если погиб
 */
Player.prototype.takeDamage = function (amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
        this.hp = 0;
        return false;
    }
    return true;
};

/**
 * Лечение
 * @param {number} amount
 */
Player.prototype.heal = function (amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
};
