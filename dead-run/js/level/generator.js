'use strict';

/* ============================================================
 * level/generator.js — BSP-генератор уровней
 * ============================================================ */

// --- Константы тайловой карты ---
var TILE_SIZE  = 32;       // px за 1 тайл
var MAP_W      = 50;       // ширина карты в тайлах
var MAP_H      = 50;       // высота карты в тайлах
var WORLD_W    = MAP_W * TILE_SIZE;  // 1600 px
var WORLD_H    = MAP_H * TILE_SIZE;  // 1600 px

// Значения тайлов
var TILE = {
    VOID: 0,
    FLOOR: 1,
    WALL: 2,
    EXIT: 3,
    DOOR_CLOSED: 4,
    DOOR_OPEN: 5
};

// --- BSP-дерево ---

/**
 * Узел BSP-дерева
 * @param {number} x  —左上角 x (в тайлах)
 * @param {number} y  —左上角 y (в тайлах)
 * @param {number} w  — ширина (в тайлах)
 * @param {number} h  — высота (в тайлах)
 */
function BSPNode(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.left  = null;   // потомок
    this.right = null;   // потомок
    this.room  = null;   // {x, y, w, h} — комната (только у листьев)
}

/**
 * Минимальный размер узла для деления
 * (уменьшить до 4–5 для более мелких комнат)
 */
var BSP_MIN_SIZE = 6;

/**
 * Рекурсивное разбиение пространства
 * @param {BSPNode} node
 * @param {number} depth — текущая глубина
 */
function bspSplit(node, depth) {
    // Ограничение глубины рекурсии (4–5 уровней хорошо для 50×50)
    if (depth >= 5) return;

    // Определяем, можно ли и как делить
    var splitHorizontal = (node.h > node.w) || (node.w === node.h && Math.random() < 0.5);

    if (splitHorizontal) {
        // Горизонтальное разделение (сверху/снизу)
        var minH = Math.floor(node.h * 0.35);  // мин 35%
        var maxH = Math.ceil(node.h * 0.65);   // макс 65%
        if (maxH - minH < 1) return;           // слишком мало для деления

        var split = minH + Math.floor(Math.random() * (maxH - minH));

        // Проверяем, что обе части достаточно велики
        if (split < BSP_MIN_SIZE || (node.h - split) < BSP_MIN_SIZE) return;

        node.left  = new BSPNode(node.x, node.y, node.w, split);
        node.right = new BSPNode(node.x, node.y + split, node.w, node.h - split);
    } else {
        // Вертикальное разделение (слева/справа)
        var minW = Math.floor(node.w * 0.35);
        var maxW = Math.ceil(node.w * 0.65);
        if (maxW - minW < 1) return;

        var split2 = minW + Math.floor(Math.random() * (maxW - minW));

        if (split2 < BSP_MIN_SIZE || (node.w - split2) < BSP_MIN_SIZE) return;

        node.left  = new BSPNode(node.x, node.y, split2, node.h);
        node.right = new BSPNode(node.x + split2, node.y, node.w - split2, node.h);
    }

    // Рекурсивно делим потомков
    if (node.left)  bspSplit(node.left, depth + 1);
    if (node.right) bspSplit(node.right, depth + 1);
}

/**
 * Извлечь все листья (терминальные узлы) из дерева
 * @param {BSPNode} node
 * @returns {BSPNode[]}
 */
function bspGetLeaves(node) {
    if (!node) return [];
    if (!node.left && !node.right) return [node];
    return bspGetLeaves(node.left).concat(bspGetLeaves(node.right));
}

/**
 * Создать комнату внутри листа BSP
 * Оставляем отступ 1–2 тайла от краёв листа
 * @param {BSPNode} leaf
 */
function createRoomInLeaf(leaf) {
    var padMin = 2;
    var padMax = 4;

    var left   = padMin + Math.floor(Math.random() * padMax);
    var right  = padMin + Math.floor(Math.random() * padMax);
    var top    = padMin + Math.floor(Math.random() * padMax);
    var bottom = padMin + Math.floor(Math.random() * padMax);

    // Минимальный размер комнаты 4×4
    if (leaf.w - left - right < 4) { left = 1; right = 1; }
    if (leaf.h - top - bottom < 4) { top = 1; bottom = 1; }

    leaf.room = {
        x: leaf.x + left,
        y: leaf.y + top,
        w: leaf.w - left - right,
        h: leaf.h - top - bottom
    };
}

/**
 * Выкопать комнату в массиве тайлов
 * @param {number[][]} grid — 2D массив MAP_H × MAP_W
 * @param {Object} room — {x, y, w, h}
 */
function carveRoom(grid, room) {
    for (var ty = room.y; ty < room.y + room.h; ty++) {
        for (var tx = room.x; tx < room.x + room.w; tx++) {
            if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) {
                grid[ty][tx] = TILE.FLOOR;
            }
        }
    }
}

/**
 * Проверить, пересекается ли прямоугольник с какой-либо комнатой
 * @param {Object[]} rooms — массив {x, y, w, h}
 * @param {Object} rect — {x, y, w, h}
 * @returns {boolean}
 */
function rectIntersectsRoom(rect, rooms) {
    for (var i = 0; i < rooms.length; i++) {
        var r = rooms[i];
        if (rect.x < r.x + r.w && rect.x + rect.w > r.x &&
            rect.y < r.y + r.h && rect.y + rect.h > r.y) {
            return true;
        }
    }
    return false;
}

/**
 * Выкопать коридор (L-образный) между двумя точками
 * @param {number[][]} grid
 * @param {number} x1 — начало x (тайлы)
 * @param {number} y1 — начало y (тайлы)
 * @param {number} x2 — конец x
 * @param {number} y2 — конец y
 */
function carveCorridor(grid, x1, y1, x2, y2) {
    // Выбираем случайный порядок: сначала по X потом по Y, или наоборот
    var horizontalFirst = Math.random() < 0.5;
    
    if (horizontalFirst) {
        // Горизонталь
        for (var x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            grid[y1][x] = TILE.FLOOR;
            if (y1 + 1 < MAP_H - 1) grid[y1 + 1][x] = TILE.FLOOR;
        }
        // Вертикаль
        for (var y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            grid[y][x2] = TILE.FLOOR;
            if (x2 + 1 < MAP_W - 1) grid[y][x2 + 1] = TILE.FLOOR;
        }
    } else {
        // Вертикаль
        for (var y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            grid[y][x1] = TILE.FLOOR;
            if (x1 + 1 < MAP_W - 1) grid[y][x1 + 1] = TILE.FLOOR;
        }
        // Горизонталь
        for (var x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            grid[y2][x] = TILE.FLOOR;
            if (y2 + 1 < MAP_H - 1) grid[y2 + 1][x] = TILE.FLOOR;
        }
    }
}

/**
 * Получить случайную точку в любой комнате поддерева BSP или в конкретной комнате
 */
function randomPointInRoom(nodeOrRoom) {
    if (!nodeOrRoom) return null;

    // Если это просто комната (объект {x, y, w, h})
    if (nodeOrRoom.w && nodeOrRoom.h && !nodeOrRoom.left && !nodeOrRoom.right && !nodeOrRoom.room) {
        return {
            x: nodeOrRoom.x + Math.floor(Math.random() * nodeOrRoom.w),
            y: nodeOrRoom.y + Math.floor(Math.random() * nodeOrRoom.h)
        };
    }

    // Если это узел BSP с уже созданной комнатой
    if (nodeOrRoom.room) {
        var r = nodeOrRoom.room;
        return {
            x: r.x + Math.floor(Math.random() * r.w),
            y: r.y + Math.floor(Math.random() * r.h)
        };
    }

    // Если это внутренний узел BSP, идем в потомков
    if (Math.random() < 0.5) {
        return (nodeOrRoom.left ? randomPointInRoom(nodeOrRoom.left) : null) || (nodeOrRoom.right ? randomPointInRoom(nodeOrRoom.right) : null);
    } else {
        return (nodeOrRoom.right ? randomPointInRoom(nodeOrRoom.right) : null) || (nodeOrRoom.left ? randomPointInRoom(nodeOrRoom.left) : null);
    }
}

/**
 * Найти мёртвые-end коридоры для размещения сундуков
 * @param {number[][]} grid
 * @returns {{x: number, y: number}[]}
 */
function findDeadEnds(grid) {
    var deadEnds = [];
    var h = grid.length;
    var w = grid[0].length;
    for (var y = 1; y < h - 1; y++) {
        for (var x = 1; x < w - 1; x++) {
            if (grid[y][x] === TILE.FLOOR) {
                // Считаем количество смежных полей (пол)
                var neighbors = 0;
                if (grid[y-1][x] === TILE.FLOOR) neighbors++;
                if (grid[y+1][x] === TILE.FLOOR) neighbors++;
                if (grid[y][x-1] === TILE.FLOOR) neighbors++;
                if (grid[y][x+1] === TILE.FLOOR) neighbors++;

                if (neighbors === 1) {
                    deadEnds.push({ x: x, y: y });
                }
            }
        }
    }
    return deadEnds;
}

/**
 * Добавить стены вокруг всех полей
 * @param {number[][]} grid
 */
function addWalls(grid) {
    for (var y = 0; y < MAP_H; y++) {
        for (var x = 0; x < MAP_W; x++) {
            if (grid[y][x] === TILE.FLOOR) {
                // Проверяем 8 соседей — если рядом есть не-пол, ставим стену
                for (var dy = -1; dy <= 1; dy++) {
                    for (var dx = -1; dx <= 1; dx++) {
                        var ny = y + dy;
                        var nx = x + dx;
                        if (ny >= 0 && ny < MAP_H && nx >= 0 && nx < MAP_W) {
                            if (grid[ny][nx] === TILE.WALL) {
                                // Соседняя стена — оставляем
                            }
                        }
                    }
                }
            }
        }
    }
}

// ============================================================
// ОСНОВНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ УРОВНЯ
// ============================================================

/**
 * Основная функция генерации уровня
 */
function generateLevel(floorNumber) {
    console.log("Generating level for floor", floorNumber);
    // Просто генерируем уровень. Новая система соединений гарантирует проходимость.
    return _generateSingleAttempt(floorNumber);
}

function _generateSingleAttempt(floorNumber) {
    // Обновляем ГЛОБАЛЬНЫЕ переменные (без var)
    MAP_W = 40 + (floorNumber * 2);
    MAP_H = 40 + (floorNumber * 2);
    
    // Ограничение размера
    if (MAP_W > 100) MAP_W = 100;
    if (MAP_H > 100) MAP_H = 100;

    WORLD_W = MAP_W * TILE_SIZE;
    WORLD_H = MAP_H * TILE_SIZE;

    var grid = [];
    for (var y = 0; y < MAP_H; y++) {
        grid[y] = [];
        for (var x = 0; x < MAP_W; x++) {
            grid[y][x] = TILE.WALL;
        }
    }

    // --- BSP ---
    // Начинаем с небольшого отступа от краёв карты
    var margin = 2;
    var root = new BSPNode(margin, margin, MAP_W - margin * 2, MAP_H - margin * 2);
    bspSplit(root, 0);

    // Создаём комнаты в листьях
    var leaves = bspGetLeaves(root);
    var rooms  = [];

    for (var i = 0; i < leaves.length; i++) {
        createRoomInLeaf(leaves[i]);
        if (leaves[i].room) {
            carveRoom(grid, leaves[i].room);
            rooms.push(leaves[i].room);
        }
    }

    // Гарантированное соединение комнат (Кольцо + Случайные связи)
    if (rooms.length > 1) {
        for (var i = 0; i < rooms.length; i++) {
            var r1 = rooms[i];
            var r2 = rooms[(i + 1) % rooms.length]; // Соединяем в кольцо
            
            var x1 = r1.x + Math.floor(r1.w / 2);
            var y1 = r1.y + Math.floor(r1.h / 2);
            var x2 = r2.x + Math.floor(r2.w / 2);
            var y2 = r2.y + Math.floor(r2.h / 2);

            carveCorridor(grid, x1, y1, x2, y2);
        }
        
        // Дополнительные 2-3 случайные связи для нелинейности
        for (var k = 0; k < 3; k++) {
            var ra = rooms[Math.floor(Math.random() * rooms.length)];
            var rb = rooms[Math.floor(Math.random() * rooms.length)];
            if (ra !== rb) {
                carveCorridor(grid, 
                    ra.x + Math.floor(ra.w/2), ra.y + Math.floor(ra.h/2),
                    rb.x + Math.floor(rb.w/2), rb.y + Math.floor(rb.h/2)
                );
            }
        }
    }

    // --- Дополнительная обработка ---

    // Убираем одиночные стены, оставшиеся внутри пустот (сглаживание)
    // Простая двупроходная стена: если у стены >= 3 соседних пола — делаем пол
    for (var pass = 0; pass < 2; pass++) {
        var changes = [];
        for (var y2 = 1; y2 < MAP_H - 1; y2++) {
            for (var x2 = 1; x2 < MAP_W - 1; x2++) {
                if (grid[y2][x2] === TILE.WALL) {
                    var floorCount = 0;
                    if (grid[y2-1][x2]   === TILE.FLOOR) floorCount++;
                    if (grid[y2+1][x2]   === TILE.FLOOR) floorCount++;
                    if (grid[y2][x2-1]   === TILE.FLOOR) floorCount++;
                    if (grid[y2][x2+1]   === TILE.FLOOR) floorCount++;
                    if (floorCount >= 3) {
                        changes.push({ x: x2, y: y2 });
                    }
                }
            }
        }
        for (var c = 0; c < changes.length; c++) {
            grid[changes[c].y][changes[c].x] = TILE.FLOOR;
        }
    }

    // --- Размещение дверей ---
    // Дверь ставится там, где проход (пол) пересекает границу комнаты
    for (var r = 0; r < rooms.length; r++) {
        var room = rooms[r];
        for (var ty = room.y - 1; ty <= room.y + room.h; ty++) {
            for (var tx = room.x - 1; tx <= room.x + room.w; tx++) {
                if (ty === room.y - 1 || ty === room.y + room.h || tx === room.x - 1 || tx === room.x + room.w) {
                    if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) {
                        // Если это пол и он зажат между двумя стенами
                        if (grid[ty][tx] === TILE.FLOOR) {
                            var wallT = (ty-1 >= 0 && grid[ty-1][tx] === TILE.WALL);
                            var wallB = (ty+1 < MAP_H && grid[ty+1][tx] === TILE.WALL);
                            var wallL = (tx-1 >= 0 && grid[ty][tx-1] === TILE.WALL);
                            var wallR = (tx+1 < MAP_W && grid[ty][tx+1] === TILE.WALL);
                            
                            var roomFloorNearby = false;
                            // Проверяем, что хотя бы одна соседняя клетка - это пол ВНУТРИ комнаты
                            if (ty > room.y && ty < room.y + room.h - 1) roomFloorNearby = true;
                            if (tx > room.x && tx < room.x + room.w - 1) roomFloorNearby = true;

                            if ((wallT && wallB && !wallL && !wallR) || (wallL && wallR && !wallT && !wallB)) {
                                // Дополнительная проверка: не ставим дверь рядом с другой дверью
                                var nearbyDoor = false;
                                if (grid[ty-1] && grid[ty-1][tx] === TILE.DOOR_CLOSED) nearbyDoor = true;
                                if (grid[ty+1] && grid[ty+1][tx] === TILE.DOOR_CLOSED) nearbyDoor = true;
                                if (grid[ty][tx-1] === TILE.DOOR_CLOSED) nearbyDoor = true;
                                if (grid[ty][tx+1] === TILE.DOOR_CLOSED) nearbyDoor = true;

                                if (!nearbyDoor) {
                                    grid[ty][tx] = TILE.DOOR_CLOSED;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // --- Размещение входа и выхода ---
    // Вход — в комнате, ближайшей к левому краю
    var entranceRoom = null;
    var minRoomX = MAP_W;
    for (var r = 0; r < rooms.length; r++) {
        if (rooms[r].x < minRoomX) {
            minRoomX = rooms[r].x;
            entranceRoom = rooms[r];
        }
    }

    // Выход — в комнате, ближайшей к правому краю
    var exitRoom = null;
    var maxRoomX = 0;
    for (var r2 = 0; r2 < rooms.length; r2++) {
        if (rooms[r2].x + rooms[r2].w > maxRoomX) {
            maxRoomX = rooms[r2].x + rooms[r2].w;
            exitRoom = rooms[r2];
        }
    }

    var entrance = {
        x: entranceRoom.x + 1,
        y: Math.floor(entranceRoom.y + entranceRoom.h / 2)
    };

    var exit = {
        x: exitRoom.x + exitRoom.w - 2,
        y: Math.floor(exitRoom.y + exitRoom.h / 2)
    };

    // --- Размещение сундуков (в мёртвых-end) ---
    var deadEnds    = findDeadEnds(grid);
    var chestCount  = Math.min(2 + floorNumber, deadEnds.length);
    var chests      = [];
    var shuffledDE  = deadEnds.slice();
    // Перемешиваем dead ends
    for (var s = shuffledDE.length - 1; s > 0; s--) {
        var si = Math.floor(Math.random() * (s + 1));
        var tmp = shuffledDE[s];
        shuffledDE[s] = shuffledDE[si];
        shuffledDE[si] = tmp;
    }
    for (var ce = 0; ce < chestCount; ce++) {
        chests.push({
            x: shuffledDE[ce].x,
            y: shuffledDE[ce].y,
            opened: false,
            // Тип определяется при открытии (случайно: оружие / предмет / аптечка)
            type: 'unknown'
        });
    }

    // --- Размещение врагов ---
    // Базовое количество: 3 + этаж * 2
    var enemyCount  = Math.min(3 + floorNumber * 2, 20 + floorNumber);
    var enemies     = [];
    var spawnRooms  = rooms.filter(function(r) {
        return r !== entranceRoom && r !== exitRoom;
    });

    for (var e = 0; e < enemyCount && spawnRooms.length > 0; e++) {
        var spawnRoom = spawnRooms[Math.floor(Math.random() * spawnRooms.length)];
        var pos = randomPointInRoom(spawnRoom);

        // Тип зомби зависит от этажа
        var roll = Math.random();
        var type = 'walker'; 

        if (floorNumber >= 6 && roll < 0.1) {
            type = 'boomer';
        } else if (floorNumber >= 5 && roll < 0.25) {
            type = 'spitter';
        } else if (floorNumber >= 4 && roll < 0.35) {
            type = 'brute';
        } else if (floorNumber >= 3 && roll < 0.45) {
            type = 'crawler';
        } else if (floorNumber >= 2 && roll < 0.6) {
            type = 'runner';
        }

        enemies.push({
            type: type,
            x: pos.x * TILE_SIZE + TILE_SIZE / 2,
            y: pos.y * TILE_SIZE + TILE_SIZE / 2
        });
    }

    // --- Размещение предметов (лута) при генерации ---
    var items = [];
    var itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 предмета
    for (var it = 0; it < itemCount; it++) {
        var itemRoom = rooms[Math.floor(Math.random() * rooms.length)];
        var itemPos = randomPointInRoom(itemRoom);
        items.push({
            type: Math.random() < 0.5 ? 'medkit' : 'ammo',
            x: itemPos.x * TILE_SIZE + TILE_SIZE / 2,
            y: itemPos.y * TILE_SIZE + TILE_SIZE / 2
        });
    }

    // --- Босс каждые 5 этажей ---
    var boss = null;
    if (floorNumber > 0 && floorNumber % 5 === 0) {
        // Размещаем босса в комнате, наиболее удалённой от входа
        var farthestRoom = null;
        var farthestDist = 0;
        for (var br = 0; br < rooms.length; br++) {
            var dist = Math.abs(rooms[br].x - entranceRoom.x) + Math.abs(rooms[br].y - entranceRoom.y);
            if (dist > farthestDist) {
                farthestDist = dist;
                farthestRoom = rooms[br];
            }
        }
        if (farthestRoom) {
            var bp = randomPointInRoom(farthestRoom);
            boss = {
                type: 'tank',
                x: bp.x * TILE_SIZE + TILE_SIZE / 2,
                y: bp.y * TILE_SIZE + TILE_SIZE / 2
            };
        }
    }

    return {
        width: MAP_W,
        height: MAP_H,
        tiles: grid,
        rooms: rooms,
        entrance: entrance,
        exit: exit,
        chests: chests,
        enemies: enemies,
        items: items,
        boss: boss
    };
}

/**
 * Простой BFS pathfinding для проверки достижимости выхода
 * Использует ТАЙЛОВЫЕ координаты
 */
function findPath(level, startX, startY, endX, endY) {
    // Принудительно к целым числам
    startX = Math.floor(startX);
    startY = Math.floor(startY);
    endX = Math.floor(endX);
    endY = Math.floor(endY);

    if (startX === endX && startY === endY) return true;
    
    var w = level.width;
    var h = level.height;
    var queue = [{ x: startX, y: startY }];
    var visited = new Set();
    visited.add(startX + "," + startY);

    var head = 0;
    while (head < queue.length) {
        var curr = queue[head++];
        
        var neighbors = [
            {x: curr.x, y: curr.y - 1},
            {x: curr.x, y: curr.y + 1},
            {x: curr.x - 1, y: curr.y},
            {x: curr.x + 1, y: curr.y}
        ];

        for (var i = 0; i < neighbors.length; i++) {
            var nx = Math.floor(neighbors[i].x);
            var ny = Math.floor(neighbors[i].y);

            if (nx === endX && ny === endY) {
                console.log("Path found! Nodes visited:", visited.size);
                return true;
            }

            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                var key = nx + "," + ny;
                if (!visited.has(key)) {
                    var tile = level.tiles[ny][nx];
                    // Проходимы все тайлы, кроме стен (2)
                    if (tile !== 2) { 
                        visited.add(key);
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
        }
    }
    console.warn("Path NOT found. Nodes visited:", visited.size);
    return false;
}

/**
 * Проверка проходимости тайла (в тайловых координатах)
 */
function isWalkable(grid, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
    var t = grid[Math.floor(ty)][Math.floor(tx)];
    return t === TILE.FLOOR || t === TILE.DOOR_OPEN;
}

/**
 * Проверка коллизии прямоугольника со стенами
 * @param {number[][]} grid
 * @param {number} px — пиксельная X
 * @param {number} py — пиксельная Y
 * @param {number} pw — ширина в пикселях
 * @param {number} ph — высота в пикселях
 * @returns {boolean} — true если коллизия
 */
function collidesWithWall(grid, px, py, pw, ph) {
    // Переводим пиксельные координаты в тайловые
    var left   = Math.floor(px / TILE_SIZE);
    var right  = Math.floor((px + pw - 1) / TILE_SIZE);
    var top    = Math.floor(py / TILE_SIZE);
    var bottom = Math.floor((py + ph - 1) / TILE_SIZE);

    for (var ty = top; ty <= bottom; ty++) {
        for (var tx = left; tx <= right; tx++) {
            if (!isWalkable(grid, tx, ty)) {
                return true;
            }
        }
    }
    return false;
}