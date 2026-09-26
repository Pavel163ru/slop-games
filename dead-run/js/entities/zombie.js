'use strict';

/* ============================================================
 * entities/zombie.js — типы зомби и их ИИ
 * ============================================================ */

// --- Базовые параметры зомби по типам ---
var ZombieTypes = {
    walker: {
        name:       'Walker',
        hp:         30,
        damage:     5,
        speed:      0.8,    // px за кадр
        radius:     13,
        color:      '#556b2f',
        outline:    '#3b4b1f',
        spawnFrom:  1,      // с какого этажа
        attackRange: 30,
        visionRange: 200
    },
    runner: {
        name:       'Runner',
        hp:         25,
        damage:     8,
        speed:      1.5,
        radius:     11,
        color:      '#b22222',
        outline:    '#7a1a1a',
        spawnFrom:  2,
        attackRange: 30,
        visionRange: 250
    },
    brute: {
        name:       'Brute',
        hp:         100,
        damage:     20,
        speed:      0.5,
        radius:     18,
        color:      '#696969',
        outline:    '#4a4a4a',
        spawnFrom:  4,
        attackRange: 35,
        visionRange: 180
    },
    crawler: {
        name:       'Crawler',
        hp:         20,
        damage:     5,
        speed:      1.0,
        radius:     9,
        color:      '#8b7355',
        outline:    '#5a4a35',
        spawnFrom:  3,
        attackRange: 25,
        visionRange: 180
    },
    spitter: {
        name:       'Spitter',
        hp:         35,
        damage:     7,
        speed:      0.7,
        radius:     12,
        color:      '#6b8e23',
        outline:    '#4a6313',
        spawnFrom:  5,
        attackRange: 30,
        visionRange: 300,
        ranged:     true,   // атакует на расстоянии
        projectileSpeed: 3,
        fireRate:   1.5     // выстрелов в секунду
    },
    boomer: {
        name:       'Boomer',
        hp:         40,
        damage:     0,       // взрыв при смерти
        explosiveDamage: 30,
        explosiveRadius: 80, // px
        speed:      0.5,
        radius:     15,
        color:      '#8b4513',
        outline:    '#5a2d0a',
        spawnFrom:  6,
        attackRange: 30,
        visionRange: 180
    },
    tank: {
        name:       'Tank',
        hp:         300,
        damage:     30,
        speed:      0.3,
        radius:     22,
        color:      '#4b0082',
        outline:    '#2d004d',
        spawnFrom:  10,
        attackRange: 40,
        visionRange: 300,
        throwRange: 200,
        throwDamage: 20,
        throwCooldown: 3     // секунды
    },
    shadow: {
        name:       'Shadow',
        hp:         40,
        damage:     15,
        speed:      2.0,
        radius:     11,
        color:      '#1a1a1a',
        outline:    '#0a0a0a',
        spawnFrom:  12,
        attackRange: 30,
        visionRange: 280,
        invisible:  true     // невидим, пока не атакует/не рядом
    },
    necro: {
        name:       'Necromancer',
        hp:         60,
        damage:     10,
        speed:      0.6,
        radius:     13,
        color:      '#483d8b',
        outline:    '#2a1a5d',
        spawnFrom:  8,
        attackRange: 30,
        visionRange: 250,
        summonCooldown: 6,    // секунды
        summonCount:  3       // сколько призывает за раз
    }
};

// --- Конструктор зомби ---
/**
 * Создание зомби
 * @param {string} type    — ключ из ZombieTypes
 * @param {number} x       — мировая X (px)
 * @param {number} y       — мировая Y (px)
 * @returns {Object}
 */
function createZombie(type, x, y) {
    var tpl = ZombieTypes[type];
    if (!tpl) {
        type = 'walker';
        tpl = ZombieTypes[type];
    }

    var z = {
        type: type,
        name: tpl.name,
        x: x,
        y: y,
        hp: tpl.hp,
        maxHp: tpl.hp,
        damage: tpl.damage,
        speed: tpl.speed,
        radius: tpl.radius,
        color: tpl.color,
        outline: tpl.outline,
        visionRange: tpl.visionRange || 200,
        attackRange: tpl.attackRange || 30,
        angle: 0,          // направление движения
        state: 'idle',     // idle | chasing | attacking | dead
        alert: false,      // видит ли игрока
        // Спецсвойства
        ranged: tpl.ranged || false,
        projectileSpeed: tpl.projectileSpeed || 0,
        fireRate: tpl.fireRate || 1,
        fireCooldown: 0,
        // Бумер
        explosive: tpl.explosiveDamage || false,
        explosiveDamage: tpl.explosiveDamage || 0,
        explosiveRadius: tpl.explosiveRadius || 0,
        // Танк
        throwRange: tpl.throwRange || 0,
        throwDamage: tpl.throwDamage || 0,
        throwCooldown: tpl.throwCooldown || 0,
        throwTimer: 0,
        // Некромант
        summonCooldown: tpl.summonCooldown || 0,
        summonTimer: 0,
        summonCount: tpl.summonCount || 0,
        // Тень
        invisible: tpl.invisible || false,
        visible: false,     // стал видим (после атаки)
        visibleTimer: 0,
        // Патрулирование
        patrolTarget: null,
        patrolTimer: 0,
        // Путь (BFS path)
        path: [],
        pathTimer: 0,
        // Удалён?
        dead: false,
        deathTimer: 0,
        // Анимация
        hitFlash: 0,
        walkAnim: 0
    };

    return z;
}

/**
 * Вычислить расстояние между двумя точками
 */
function dist(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Есть ли прямая видимость между двумя точками (не блокирует стена)
 */
function hasLineOfSight(level, x1, y1, x2, y2) {
    var steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / TILE_SIZE;
    steps = Math.max(steps, 1);
    for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        var cx = x1 + (x2 - x1) * t;
        var cy = y1 + (y2 - y1) * t;
        var tx = Math.floor(cx / TILE_SIZE);
        var ty = Math.floor(cy / TILE_SIZE);
        if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) return false;
        if (level.tiles[ty][tx] === TILE.WALL) return false;
    }
    return true;
}

/**
 * Простой BFS pathfinding — возвращает массив точек (мировые px)
 */
function findPath(level, sx, sy, ex, ey) {
    var startTX = Math.floor(sy / TILE_SIZE);
    var startTY = Math.floor(sx / TILE_SIZE);
    var endTX   = Math.floor(ey / TILE_SIZE);
    var endTY   = Math.floor(ex / TILE_SIZE); // исправлено

    // Корректировка
    var startCol = Math.floor(sx / TILE_SIZE);
    var startRow = Math.floor(sy / TILE_SIZE);
    var endCol   = Math.floor(ex / TILE_SIZE);
    var endRow   = Math.floor(ey / TILE_SIZE);

    // Ограничение по глубине поиска (чтобы не тормозило)
    var maxDepth = 60;

    var queue = [];
    var visited = {};
    var key = function(r, c) { return r + ',' + c; };

    queue.push({ row: startRow, col: startCol, path: [] });
    visited[key(startRow, startCol)] = true;

    var dirs = [
        { dr: -1, dc: 0 },
        { dr: 1,  dc: 0 },
        { dr: 0,  dc: -1 },
        { dr: 0,  dc: 1 }
    ];

    while (queue.length > 0) {
        if (queue.length > maxDepth * 2) break; // защита от перебора

        var node = queue.shift();

        // Проверка цели
        if (node.row === endRow && node.col === endCol) {
            // Преобразуем путь из тайловых координат в мировые пиксели (центры клеток)
            var worldPath = [];
            var fullPath = node.path.concat([{ row: node.row, col: node.col }]);
            for (var i = 0; i < fullPath.length; i++) {
                worldPath.push({
                    x: fullPath[i].col * TILE_SIZE + TILE_SIZE / 2,
                    y: fullPath[i].row * TILE_SIZE + TILE_SIZE / 2
                });
            }
            return worldPath;
        }

        for (var d = 0; d < dirs.length; d++) {
            var nr = node.row + dirs[d].dr;
            var nc = node.col + dirs[d].dc;
            var k = key(nr, nc);

            if (nr < 0 || nr >= level.height || nc < 0 || nc >= level.width) continue;
            if (visited[k]) continue;
            if (level.tiles[nr][nc] === TILE.WALL || level.tiles[nr][nc] === TILE.DOOR_CLOSED) continue;

            visited[k] = true;
            var newPath = node.path.slice();
            newPath.push({ row: node.row, col: node.col });
            queue.push({ row: nr, col: nc, path: newPath });
        }
    }

    return null; // путь не найден
}

/**
 * Обновление одного зомби за кадр
 * @param {Object} z          — зомби
 * @param {Object} player     — объект игрока
 * @param {Object} level      — объект уровня
 * @param {number} dt         — deltaTime
 * @param {Array} newProjectiles — массив для новых снарядов
 * @param {Array} explosions  — массив для взрывов
 */
function updateZombie(z, player, level, dt, newProjectiles, explosions) {
    if (z.dead) return;

    var toPlayer = dist(z.x, z.y, player.x, player.y);

    // --- Обновление кулдаунов ---
    z.fireCooldown = Math.max(0, z.fireCooldown - dt);
    z.throwTimer   = Math.max(0, z.throwTimer - dt);
    z.hitFlash     = Math.max(0, z.hitFlash - dt);

    // --- Спец: тень — невидимость ---
    if (z.invisible) {
        if (z.alert) {
            z.visibleTimer -= dt;
            if (z.visibleTimer <= 0) {
                z.alert = false;
                z.visible = false;
            }
        }

        // Режим стелс — видит ли игрока
        if (!z.alert && toPlayer < z.visionRange && hasLineOfSight(level, z.x, z.y, player.x, player.y)) {
            z.alert = true;
            z.visible = true;
            z.visibleTimer = 3; // виден 3 секунды после обнаружения
        }
    }

    // --- Машина состояний ---
    switch (z.state) {
        case 'idle':
            // Патрулирование — случайная точка в комнате
            if (!z.patrolTarget) {
                z.patrolTimer -= dt;
                if (z.patrolTimer <= 0) {
                    // Выбираем случайную точку рядом
                    var angle = Math.random() * Math.PI * 2;
                    var dist2 = 30 + Math.random() * 80;
                    z.patrolTarget = {
                        x: z.x + Math.cos(angle) * dist2,
                        y: z.y + Math.sin(angle) * dist2
                    };
                    z.patrolTimer = 3 + Math.random() * 5;
                }
            }

            // Видит ли игрока?
            if (toPlayer < z.visionRange && hasLineOfSight(level, z.x, z.y, player.x, player.y)) {
                z.state = 'chasing';
                z.path = null;
                z.pathTimer = 0;
                break;
            }

            // Двигаемся к точке патрулирования
            if (z.patrolTarget) {
                var pdx = z.patrolTarget.x - z.x;
                var pdy = z.patrolTarget.y - z.y;
                var plen = Math.sqrt(pdx * pdx + pdy * pdy);

                if (plen < 5) {
                    z.patrolTarget = null;
                    z.angle = z.angle; // продолжаем смотреть в последнюю сторону
                } else {
                    z.angle = Math.atan2(pdy, pdx);
                    var mvx = Math.cos(z.angle) * z.speed;
                    var mvy = Math.sin(z.angle) * z.speed;
                    tryMoveZombie(z, level, mvx, mvy);
                }
            }
            break;

        case 'chasing':
            if (toPlayer > z.visionRange * 1.5) {
                z.state = 'idle';
                z.patrolTarget = null;
                z.patrolTimer = 2;
                break;
            }

            // Видимость?
            if (!hasLineOfSight(level, z.x, z.y, player.x, player.y)) {
                // Ищем путь
                if (!z.path || z.pathTimer <= 0) {
                    z.path = findPath(level, z.x, z.y, player.x, player.y);
                    z.pathTimer = 0.5; // пересчитываем каждые 0.5 сек
                }
                z.pathTimer -= dt;
            }

            // Оружие ближнего боя — атакуем если близко
            if (toPlayer < z.attackRange) {
                z.state = 'attacking';
                z.attackCooldown = 0.8;
                break;
            }

            // Рanged — стреляем
            if (z.ranged && toPlayer < z.visionRange && z.fireCooldown <= 0) {
                // Стреляем в игрока
                var ang = Math.atan2(player.y - z.y, player.x - z.x);
                newProjectiles.push({
                    x: z.x,
                    y: z.y,
                    vx: Math.cos(ang) * z.projectileSpeed,
                    vy: Math.sin(ang) * z.projectileSpeed,
                    damage: z.damage,
                    radius: 4,
                    color: '#32cd32',
                    fromZombie: true,
                    life: 2.0
                });
                z.fireCooldown = 1.0 / z.fireRate;
                break;
            }

            // Танк — бросает обломки
            if (z.type === 'tank' && z.throwTimer <= 0 && toPlayer < z.throwRange) {
                var tang = Math.atan2(player.y - z.y, player.x - z.x);
                newProjectiles.push({
                    x: z.x,
                    y: z.y,
                    vx: Math.cos(tang) * 4,
                    vy: Math.sin(tang) * 4,
                    damage: z.throwDamage,
                    radius: 8,
                    color: '#ff6347',
                    fromZombie: true,
                    life: 1.5
                });
                z.throwTimer = z.throwCooldown;
                break;
            }

            // Некромант — призывает
            if (z.type === 'necro' && z.summonTimer <= 0) {
                z.summonTimer = z.summonCooldown;
                // Призываем walker'ов вокруг себя
                for (var s = 0; s < z.summonCount; s++) {
                    var sa = (Math.PI * 2 / z.summonCount) * s;
                    newProjectiles.push({ // временно используем для спавна
                        _spawnZombie: true,
                        type: 'walker',
                        x: z.x + Math.cos(sa) * 40,
                        y: z.y + Math.sin(sa) * 40
                    });
                }
            }
            z.summonTimer = Math.max(0, z.summonTimer - dt);

            // Движение к игроку
            var dx = player.x - z.x;
            var dy = player.y - z.y;
            var dlen = Math.sqrt(dx * dx + dy * dy);

            if (dlen > 0) {
                z.angle = Math.atan2(dy, dx);
                var mvx = (dx / dlen) * z.speed;
                var mvy = (dy / dlen) * z.speed;

                // Если есть путь — используем промежуточные точки
                if (z.path && z.path.length > 0) {
                    var target = z.path[0];
                    var tdx = target.x - z.x;
                    var tdy = target.y - z.y;
                    var tlen = Math.sqrt(tdx * tdx + tdy * tdy);
                    if (tlen < 8) {
                        z.path.shift();
                    } else if (tlen > 0) {
                        mvx = (tdx / tlen) * z.speed;
                        mvy = (tdy / tlen) * z.speed;
                    }
                }

                tryMoveZombie(z, level, mvx, mvy);
            }
            break;

        case 'attacking':
            z.attackCooldown = (z.attackCooldown || 0) - dt;

            if (toPlayer > z.attackRange * 1.2) {
                z.state = 'chasing';
                break;
            }

            if (z.attackCooldown <= 0) {
                // Наносим урон игроку
                if (typeof onZombieHit === 'function') {
                    onZombieHit(z.damage);
                }
                z.attackCooldown = 0.8;
            }

            // Смотрим на игрока
            z.angle = Math.atan2(player.y - z.y, player.x - z.x);
            break;

        case 'dead':
            z.deathTimer -= dt;
            if (z.deathTimer <= 0) {
                z.destroy = true; // помечаем для удаления
            }
            break;
    }
};

/**
 * Попытка перемещения зомби с проверкой коллизий
 */
function tryMoveZombie(z, level, mvx, mvy) {
    var nx = z.x + mvx;
    var ny = z.y + mvy;

    // Простая коллизия — проверяем тайл по направлению движения
    var tx1 = Math.floor((nx - z.radius) / TILE_SIZE);
    var tx2 = Math.floor((nx + z.radius) / TILE_SIZE);
    var ty1 = Math.floor((z.y - z.radius) / TILE_SIZE);
    var ty2 = Math.floor((z.y + z.radius) / TILE_SIZE);

    var blockedX = false;
    for (var ty = ty1; ty <= ty2; ty++) {
        if (tx1 >= 0 && tx1 < level.width && ty >= 0 && ty < level.height) {
            var t1 = level.tiles[ty][tx1];
            if (t1 === TILE.WALL || t1 === TILE.DOOR_CLOSED) { blockedX = true; break; }
        }
        if (tx2 >= 0 && tx2 < level.width && ty >= 0 && ty < level.height) {
            var t2 = level.tiles[ty][tx2];
            if (t2 === TILE.WALL || t2 === TILE.DOOR_CLOSED) { blockedX = true; break; }
        }
    }

    if (!blockedX) z.x = nx;

    var blockedY = false;
    var ux1 = Math.floor((z.x - z.radius) / TILE_SIZE);
    var ux2 = Math.floor((z.x + z.radius) / TILE_SIZE);
    var uy1 = Math.floor((ny - z.radius) / TILE_SIZE);
    var uy2 = Math.floor((ny + z.radius) / TILE_SIZE);

    for (var ux = ux1; ux <= ux2; ux++) {
        if (uy1 >= 0 && uy1 < level.height && ux >= 0 && ux < level.width) {
            var u1 = level.tiles[uy1][ux];
            if (u1 === TILE.WALL || u1 === TILE.DOOR_CLOSED) { blockedY = true; break; }
        }
        if (uy2 >= 0 && uy2 < level.height && ux >= 0 && ux < level.width) {
            var u2 = level.tiles[uy2][ux];
            if (u2 === TILE.WALL || u2 === TILE.DOOR_CLOSED) { blockedY = true; break; }
        }
    }

    if (!blockedY) z.y = ny;
}

/**
 * Нанести урон зомби
 * @returns {boolean} true если зомби убит
 */
function damageZombie(z, damage) {
    z.hp -= damage;
    z.hitFlash = 0.1;
    z.alert = true;

    if (z.invisible) {
        z.visible = true;
        z.visibleTimer = 3;
    }

    if (z.hp <= 0) {
        z.hp = 0;
        z.state = 'dead';
        z.deathTimer = 0.3;
        return true;
    }
    return false;
}

/**
 * Отрисовка зомби
 */
function drawZombie(ctx, z, cameraX, cameraY) {
    if (z.destroy) return;
    if (z.invisible && !z.visible) return;

    var cx = z.x - cameraX;
    var cy = z.y - cameraY;

    ctx.save();
    
    // Вспышка урона или смерть
    if (z.state === 'dead') {
        ctx.globalAlpha = Math.max(0, z.deathTimer / 0.3);
    } else if (z.hitFlash > 0) {
        ctx.fillStyle = '#ff2a2a';
    } else {
        ctx.fillStyle = z.color;
    }

    // Если не было вспышки и не мертв
    if (!(z.state === 'dead') && !(z.hitFlash > 0)) {
        ctx.fillStyle = z.color;
    }

    ctx.translate(cx, cy);
    ctx.rotate(z.angle);
    
    // Тело
    ctx.fillRect(-z.radius, -z.radius, z.radius * 2, z.radius * 2);
    ctx.strokeStyle = z.outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(-z.radius, -z.radius, z.radius * 2, z.radius * 2);

    ctx.restore();

    // Полоска здоровья (если ранен и жив)
    if (z.state !== 'dead' && z.hp < z.maxHp) {
        var barW = z.radius * 2;
        var hpRatio = Math.max(0, z.hp / z.maxHp);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(cx - z.radius, cy - z.radius - 8, barW, 4);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(cx - z.radius, cy - z.radius - 8, barW * hpRatio, 4);
    }
}
