'use strict';

/* ============================================================
 * combat.js — система боя
 * ============================================================ */

var COMBAT = {};

// --- Параметры атак игрока ---
COMBAT.playerMeleeDamage = 10;
COMBAT.playerMeleeRange   = 50;   // px
COMBAT.playerMeleeCooldown = 0.3;  // секунды
COMBAT.playerMeleeTimer   = 0;
COMBAT.playerPistolDamage = 15;
COMBAT.playerPistolRange  = 400;
COMBAT.playerPistolAmmo   = 12;
COMBAT.playerPistolMaxAmmo = 12;
COMBAT.playerPistolFireRate = 0.8;  // выстрелов в секунду (было 0.25)
COMBAT.playerPistolCooldown = 0;
COMBAT.playerReloadTime   = 1.2;    // текущий таймер
COMBAT.playerMaxReloadTime = 1.2;   // константа для UI
COMBAT.playerIsReloading  = false;

// Мощность удара в зависимости от оружия
// 0 = кулаки, 1 = пистолет
COMBAT.currentWeapon = 0;  // начинаем с кулаков

// Снаряды (пули, гранаты...)
var projectiles = [];

// Взрывы (визуальные)
var explosions = [];

// Взмахи ближнего боя (визуальные)
var slashes = [];

// --- Удар ближнего боя игрока ---
function playerMeleeAttack(player, enemies, zombies) {
    if (COMBAT.playerMeleeTimer > 0) return;

    COMBAT.playerMeleeTimer = COMBAT.playerMeleeCooldown;

    // Добавляем визуальный эффект взмаха
    slashes.push({
        x: player.x,
        y: player.y,
        angle: player.angle,
        radius: COMBAT.playerMeleeRange,
        timer: 0.15, // время жизни эффекта (сек)
        maxTimer: 0.15
    });

    var dmg = COMBAT.playerMeleeDamage;
    var hits = 0;

    for (var i = 0; i < zombies.length; i++) {
        var z = zombies[i];
        if (z.dead) continue;

        var dx = z.x - player.x;
        var dy = z.y - player.y;
        var distance = Math.sqrt(dx * dx + dy * dy);

        // Проверяем, что зомби перед игроком (в направлении взгляда)
        if (distance < COMBAT.playerMeleeRange) {
            // Проверяем угол — атакуем только в направлении взгляда (±90°)
            var angleTo = Math.atan2(dy, dx);
            var angleDiff = Math.abs(wrapAngle(angleTo - player.angle));

            if (angleDiff < Math.PI / 2) {
                // Попадание!
                var killed = damageZombie(z, dmg);
                if (killed) {
                    if (typeof kills !== 'undefined') kills++;
                    AudioManager.play('death');
                    if (Math.random() < 0.15 && typeof Game !== 'undefined' && Game._items) {
                        Game._items.push(new Item(Math.random() < 0.5 ? 'medkit' : 'ammo', z.x, z.y));
                    }
                }
                AudioManager.play('hit');
                hits++;
            }
        }
    }

    return hits;
}

// --- Выстрел из пистолета ---
function playerShoot(player, input) {
    if (COMBAT.playerIsReloading) return;
    if (COMBAT.playerPistolCooldown > 0) return;
    if (COMBAT.playerPistolAmmo <= 0) {
        // Автоматическая перезарядка
        COMBAT.startReload();
        return;
    }

    if (!input.mouse.left) return;

    COMBAT.playerPistolCooldown = 1.0 / COMBAT.playerPistolFireRate;
    COMBAT.playerPistolAmmo--;
    AudioManager.play('shoot');

    var ang = player.angle;

    projectiles.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(ang) * 10,
        vy: Math.sin(ang) * 10,
        damage: COMBAT.playerPistolDamage,
        radius: 3,
        color: '#ffff00',
        fromPlayer: true,
        life: 2.0
    });
}

// --- Перезарядка ---
COMBAT.startReload = function() {
    if (COMBAT.playerIsReloading) return;
    if (COMBAT.playerPistolAmmo >= COMBAT.playerPistolMaxAmmo) return;

    COMBAT.playerIsReloading = true;
    COMBAT.playerReloadTime = COMBAT.playerMaxReloadTime; // Сброс таймера
}

// --- Обновление снарядов ---
function updateProjectiles(dt, level, enemies, zombies, player) {
    for (var i = projectiles.length - 1; i >= 0; i--) {
        var p = projectiles[i];

        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt;

        // Проверка столкновения со стеной
        var tx = Math.floor(p.x / TILE_SIZE);
        var ty = Math.floor(p.y / TILE_SIZE);
        if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height || level.tiles[ty][tx] === TILE.WALL) {
            // Взрыв (маленький визуальный эффект для пуль)
            if (!p.fromPlayer) {
                explosions.push({ x: p.x, y: p.y, radius: 10, timer: 0.1 });
            }
            // Удалить снаряд
            projectiles.splice(i, 1);
            continue;
        }

        // Проверка попадания в врагов
        if (p.fromPlayer) {
            for (var j = 0; j < zombies.length; j++) {
                var z = zombies[j];
                if (z.dead) continue;

                var dx = p.x - z.x;
                var dy = p.y - z.y;
                if (Math.abs(dx) < z.radius + p.radius && Math.abs(dy) < z.radius + p.radius) {
                    // Попадание!
                    var killed = damageZombie(z, p.damage);
                    if (killed) {
                        if (typeof kills !== 'undefined') kills++;
                        AudioManager.play('death');
                        if (Math.random() < 0.15 && typeof Game !== 'undefined' && Game._items) {
                            Game._items.push(new Item(Math.random() < 0.5 ? 'medkit' : 'ammo', z.x, z.y));
                        }
                    }
                    AudioManager.play('hit');

                    // Небольшой взрыв
                    explosions.push({ x: p.x, y: p.y, radius: 8, timer: 0.15 });

                    projectiles.splice(i, 1);
                    break;
                }
            }
        }

        // Проверка попадания в игрока (снаряды от зомби)
        if (p.fromZombie && player) {
            var px2 = p.x - player.x;
            var py2 = p.y - player.y;
            if (Math.abs(px2) < PLAYER_RADIUS + p.radius && Math.abs(py2) < PLAYER_RADIUS + p.radius) {
                var playerAlive = player.takeDamage(p.damage);

                explosions.push({ x: p.x, y: p.y, radius: 5, timer: 0.1 });

                // Удаляем если убил
                projectiles.splice(i, 1);
                if (!playerAlive) {
                    // Game over будет обработан в game.js
                }
                break;
            }
        }

        // Проверка спавна зомби (от некроманта)
        if (p._spawnZombie) {
            zombies.push(createZombie(p.type, p.x, p.y));
            projectiles.splice(i, 1);
            continue;
        }

        // Время жизни
        if (p.life <= 0) {
            projectiles.splice(i, 1);
        }
    }
}

// --- Обновление взрывов ---
function updateExplosions(dt) {
    for (var i = explosions.length - 1; i >= 0; i--) {
        explosions[i].timer -= dt;
        if (explosions[i].timer <= 0) {
            explosions.splice(i, 1);
        }
    }
    
    // Обновляем взмахи
    for (var j = slashes.length - 1; j >= 0; j--) {
        slashes[j].timer -= dt;
        // Опционально: привязываем позицию взмаха к игроку
        if (typeof Game !== 'undefined' && Game._player) {
            slashes[j].x = Game._player.x;
            slashes[j].y = Game._player.y;
        }
        if (slashes[j].timer <= 0) {
            slashes.splice(j, 1);
        }
    }
}

// --- Обновление всех боевых систем ---
function updateCombat(dt, level, enemies, zombies, player) {
    // Кулдауны
    COMBAT.playerMeleeTimer = Math.max(0, COMBAT.playerMeleeTimer - dt);
    COMBAT.playerPistolCooldown = Math.max(0, COMBAT.playerPistolCooldown - dt);

    // Авто-перезарядка
    if (COMBAT.playerIsReloading) {
        COMBAT.playerReloadTime -= dt;
        if (COMBAT.playerReloadTime <= 0) {
            COMBAT.playerIsReloading = false;
            COMBAT.playerPistolAmmo = COMBAT.playerPistolMaxAmmo;
            COMBAT.playerReloadTime = 1.2;
        }
    }

    // Обновление снарядов
    updateProjectiles(dt, level, enemies, zombies, player);

    // Обновление взрывов
    updateExplosions(dt);

    // Выстрел игрока (если зажата ЛКМ)
    // Вызывается из game.update
}

// --- Рендеринг снарядов и взрывов ---
function renderCombat(ctx, cameraX, cameraY) {
    // Снаряды
    for (var i = 0; i < projectiles.length; i++) {
        var p = projectiles[i];
        var sx = p.x - cameraX;
        var sy = p.y - cameraY;

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Свечение
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, sy, p.radius + 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    // Взрывы
    for (var e = 0; e < explosions.length; e++) {
        var ex = explosions[e];
        var expX = ex.x - cameraX;
        var expY = ex.y - cameraY;
        var r = ex.radius * (1 - ex.timer / 0.3);

        ctx.save();
        ctx.globalAlpha = ex.timer / 0.3;
        ctx.fillStyle = '#ffa500';
        ctx.beginPath();
        ctx.arc(expX, expY, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff4500';
        ctx.beginPath();
        ctx.arc(expX, expY, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Взмахи ближнего боя
    for (var s = 0; s < slashes.length; s++) {
        var sl = slashes[s];
        var slX = sl.x - cameraX;
        var slY = sl.y - cameraY;
        var progress = 1 - (sl.timer / sl.maxTimer); // от 0 до 1
        
        ctx.save();
        ctx.translate(slX, slY);
        ctx.rotate(sl.angle);
        
        ctx.beginPath();
        var startAngle = -Math.PI / 4;
        var endAngle = Math.PI / 4;
        ctx.arc(0, 0, sl.radius * progress, startAngle, endAngle);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + (1 - progress) + ')';
        ctx.lineWidth = 4 * (1 - progress);
        ctx.stroke();
        
        ctx.restore();
    }
}

/** Используем глобальную переменную wrapAngle */
function wrapAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}