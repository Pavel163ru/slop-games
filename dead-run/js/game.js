'use strict';

/* ============================================================
 * game.js — конечный автомат состояний игры
 * ============================================================ */

var GameState = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
    GEN_ERROR: 'GEN_ERROR'
};

var Game = {
    state: GameState.MENU,
    _player: null,
    _level: null,
    _explored: null,
    _zombies: [],
    _items: [],
    _floor: 1,
    _camera: { x: 0, y: 0 },
    _shake: 0,
    _fade: 0, // 0 to 1 (black overlay)
    _isTransitioning: false
};

/** Инициализация игры — вызывается один раз из main.js */
Game.init = function () {
    this.state = GameState.MENU;
};

/**
 * Смена состояния
 * @param {string} newState — одно из GameState.*
 */
Game.setState = function (newState) {
    if (newState === GameState.PLAYING && this.state === GameState.MENU) {
        this.startNewGame();
    }
    this.state = newState;
};

Game.startNewGame = function() {
    this._floor = 1;
    var lvl = generateLevel(this._floor);
    if (!lvl) {
        this.state = GameState.GEN_ERROR;
        return;
    }
    this._level = lvl;
    
    this._explored = [];
    for (var y = 0; y < this._level.height; y++) {
        this._explored[y] = [];
        for (var x = 0; x < this._level.width; x++) {
            this._explored[y][x] = false;
        }
    }
    
    var startX = this._level.entrance.x * TILE_SIZE + TILE_SIZE / 2;
    var startY = this._level.entrance.y * TILE_SIZE + TILE_SIZE / 2;
    this._player = new Player(startX, startY);
    
    this._zombies = [];
    for (var i = 0; i < this._level.enemies.length; i++) {
        var e = this._level.enemies[i];
        this._zombies.push(createZombie(e.type, e.x, e.y));
    }
    
    this._items = [];
    if (this._level.items) {
        for (var j = 0; j < this._level.items.length; j++) {
            var it = this._level.items[j];
            this._items.push(new Item(it.type, it.x, it.y));
        }
    }
    
    window.onZombieHit = function(dmg) {
        if (Game._player) {
            Game._player.takeDamage(dmg);
            Game._shake = 10;
            AudioManager.play('hit');
            if (Game._player.hp <= 0) {
                Game.setState(GameState.GAME_OVER);
            }
        }
    };
};

/**
 * Обновление логики — вызывается каждый кадр
 * @param {number} dt — deltaTime в секундах
 */
Game.update = function (dt) {
    switch (this.state) {

        case GameState.MENU:
            // Пробел или Enter — начать игру
            if (Input.isDown('Enter') || Input.isDown('NumpadEnter')) {
                Game.setState(GameState.PLAYING);
            }
            break;

        case GameState.GEN_ERROR:
            if (Input.wasPressed('Enter')) {
                if (this._floor === 1) {
                    this.startNewGame();
                } else {
                    this.executeLevelSwitch();
                }
            }
            break;

        case GameState.PLAYING:
            // Esc или Tab — пауза
            if (Input.isDown('Escape') || Input.isDown('Tab')) {
                Game.setState(GameState.PAUSED);
            }
            if (this._player && this._level) {
                this._player.update(dt, this._level, Input, this._camera);
                this.updateFogOfWar();
                
                // --- Combat Input ---
                if (Input.wasPressed('Digit1')) COMBAT.currentWeapon = 0;
                if (Input.wasPressed('Digit2')) COMBAT.currentWeapon = 1;
                if (Input.wasPressed('KeyR')) COMBAT.startReload();
                
                // --- Interaction (Key E) ---
                if (Input.wasPressed('KeyE')) {
                    var interacted = false;

                    // 1. Check chests
                    for (var c = 0; c < this._level.chests.length; c++) {
                        var chest = this._level.chests[c];
                        if (!chest.opened) {
                            var cx = chest.x * TILE_SIZE + TILE_SIZE / 2;
                            var cy = chest.y * TILE_SIZE + TILE_SIZE / 2;
                            var dist = Math.sqrt(Math.pow(this._player.x - cx, 2) + Math.pow(this._player.y - cy, 2));
                            if (dist < 60) { // Increased from 40
                                chest.opened = true;
                                interacted = true;
                                AudioManager.play('door');
                                // Spawn loot
                                var numLoot = Math.floor(Math.random() * 2) + 1;
                                for (var l = 0; l < numLoot; l++) {
                                    var lx = cx + (Math.random() - 0.5) * 32;
                                    var ly = cy + (Math.random() - 0.5) * 32;
                                    this._items.push(new Item(Math.random() < 0.5 ? 'medkit' : 'ammo', lx, ly));
                                }
                                break;
                            }
                        }
                    }

                    // 2. Check doors
                    if (!interacted) {
                        var ptx = Math.floor(this._player.x / TILE_SIZE);
                        var pty = Math.floor(this._player.y / TILE_SIZE);
                        for (var dy = -1; dy <= 1; dy++) {
                            for (var dx = -1; dx <= 1; dx++) {
                                var tx = ptx + dx;
                                var ty = pty + dy;
                                if (ty >= 0 && ty < this._level.height && tx >= 0 && tx < this._level.width) {
                                    var dx2 = tx * TILE_SIZE + TILE_SIZE / 2 - this._player.x;
                                    var dy2 = ty * TILE_SIZE + TILE_SIZE / 2 - this._player.y;
                                    var d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                                    if (d2 < 60) {
                                        this._level.tiles[ty][tx] = TILE.DOOR_OPEN;
                                        interacted = true;
                                        AudioManager.play('door');
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                // --- Combat Update ---
                if (Input.mouse.left) {
                    if (COMBAT.currentWeapon === 0) {
                        playerMeleeAttack(this._player, this._level.enemies, this._zombies);
                    } else if (COMBAT.currentWeapon === 1) {
                        playerShoot(this._player, Input);
                    }
                }
                updateCombat(dt, this._level, this._level.enemies, this._zombies, this._player);
                
                // --- Zombies Update ---
                for (var i = this._zombies.length - 1; i >= 0; i--) {
                    var z = this._zombies[i];
                    updateZombie(z, this._player, this._level, dt, projectiles, explosions);
                    if (z.destroy) {
                        this._zombies.splice(i, 1);
                    }
                }
                
                // --- Items Update ---
                for (var j = this._items.length - 1; j >= 0; j--) {
                    var itm = this._items[j];
                    itm.update(dt, this._player);
                    if (itm.pickedUp) {
                        this._items.splice(j, 1);
                    }
                }
                
                // Center camera on player
                this._camera.x = this._player.x - ctx.canvas.width / 2;
                this._camera.y = this._player.y - ctx.canvas.height / 2;
                
                // Keep camera in bounds
                if (this._camera.x < 0) this._camera.x = 0;
                if (this._camera.y < 0) this._camera.y = 0;
                var maxCamX = this._level.width * TILE_SIZE - ctx.canvas.width;
                var maxCamY = this._level.height * TILE_SIZE - ctx.canvas.height;
                if (this._camera.x > maxCamX) this._camera.x = maxCamX;
                if (this._camera.y > maxCamY) this._camera.y = maxCamY;

                // Shake decay
                if (this._shake > 0) this._shake -= dt * 30;
                if (this._shake < 0) this._shake = 0;

                // Fade handling
                if (this._isTransitioning) {
                    this._fade += dt * 2;
                    if (this._fade >= 1) {
                        this._fade = 1;
                        this.executeLevelSwitch();
                        this._isTransitioning = false;
                    }
                } else if (this._fade > 0) {
                    this._fade -= dt * 2;
                    if (this._fade < 0) this._fade = 0;
                }

                // --- Check for Level Exit ---
                var ptx = Math.floor(this._player.x / TILE_SIZE);
                var pty = Math.floor(this._player.y / TILE_SIZE);
                if (ptx === this._level.exit.x && pty === this._level.exit.y && !this._isTransitioning) {
                    this._isTransitioning = true;
                }
            }
            break;

        case GameState.PAUSED:
            // Esc или Tab — вернуться в игру
            if (Input.isDown('Escape') || Input.isDown('Tab')) {
                Game.setState(GameState.PLAYING);
            }
            break;

        case GameState.GAME_OVER:
            // Enter — рестарт
            if (Input.isDown('Enter') || Input.isDown('NumpadEnter')) {
                Game.setState(GameState.MENU);
            }
            break;

        default:
            break;
    }
};

/**
 * Переход на следующий этаж (запуск анимации)
 */
Game.nextLevel = function () {
    this._isTransitioning = true;
};

/**
 * Обновление тумана войны вокруг игрока
 */
Game.updateFogOfWar = function () {
    if (!this._player || !this._level) return;
    
    var px = Math.floor(this._player.x / TILE_SIZE);
    var py = Math.floor(this._player.y / TILE_SIZE);
    var radius = 6; // радиус обзора в тайлах

    for (var dy = -radius; dy <= radius; dy++) {
        for (var dx = -radius; dx <= radius; dx++) {
            var tx = px + dx;
            var ty = py + dy;
            
            if (tx >= 0 && tx < this._level.width && ty >= 0 && ty < this._level.height) {
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= radius) {
                    this._explored[ty][tx] = true;
                }
            }
        }
    }
};

/**
 * Непосредственная смена этажа
 */
Game.executeLevelSwitch = function () {
    this._floor++;
    
    // Сохраняем текущее состояние игрока
    var hp = this._player.hp;
    var ammo = COMBAT.playerPistolAmmo;
    
    // Генерируем новый уровень
    var lvl = generateLevel(this._floor);
    if (!lvl) {
        this.state = GameState.GEN_ERROR;
        this._isTransitioning = false;
        return;
    }
    this._level = lvl;
    
    // Туман войны
    this._explored = [];
    for (var y = 0; y < this._level.height; y++) {
        this._explored[y] = [];
        for (var x = 0; x < this._level.width; x++) {
            this._explored[y][x] = false;
        }
    }
    
    // Респавн игрока
    this._player.x = this._level.entrance.x * TILE_SIZE + TILE_SIZE / 2;
    this._player.y = this._level.entrance.y * TILE_SIZE + TILE_SIZE / 2;
    this._player.hp = hp;
    COMBAT.playerPistolAmmo = ammo;
    
    // Сущности
    this._zombies = [];
    for (var i = 0; i < this._level.enemies.length; i++) {
        var e = this._level.enemies[i];
        this._zombies.push(createZombie(e.type, e.x, e.y));
    }
    
    this._items = [];
    if (this._level.items) {
        for (var j = 0; j < this._level.items.length; j++) {
            var it = this._level.items[j];
            this._items.push(new Item(it.type, it.x, it.y));
        }
    }
    
    // Очистка эффектов боя
    if (typeof projectiles !== 'undefined') projectiles.length = 0;
    if (typeof slashes !== 'undefined') slashes.length = 0;
    if (typeof explosions !== 'undefined') explosions.length = 0;
};

/**
 * Отрисовка — вызывается каждый кадр
 * @param {CanvasRenderingContext2D} ctx
 */
Game.render = function (ctx) {
    Renderer.clear(ctx);

    switch (this.state) {

        case GameState.MENU:
            Renderer.drawScreen(ctx, 'DEAD RUN', 'Press ENTER to Start');
            break;

        case GameState.PLAYING:
            if (this._level && this._player) {
                // Shake offset
                var sx = 0, sy = 0;
                if (this._shake > 0) {
                    sx = (Math.random() - 0.5) * this._shake;
                    sy = (Math.random() - 0.5) * this._shake;
                }

                ctx.save();
                ctx.translate(sx, sy);

                LevelRenderer.draw(ctx, this._level, this._explored, this._camera.x, this._camera.y);
                
                for (var i = 0; i < this._items.length; i++) {
                    var itm = this._items[i];
                    var itx = Math.floor(itm.x / TILE_SIZE);
                    var ity = Math.floor(itm.y / TILE_SIZE);
                    if (ity >= 0 && ity < this._level.height && itx >= 0 && itx < this._level.width) {
                        if (this._explored[ity][itx]) {
                            itm.draw(ctx, itm.x - this._camera.x, itm.y - this._camera.y);
                        }
                    }
                }
                
                for (var i = 0; i < this._zombies.length; i++) {
                    var zmb = this._zombies[i];
                    var ztx = Math.floor(zmb.x / TILE_SIZE);
                    var zty = Math.floor(zmb.y / TILE_SIZE);
                    if (zty >= 0 && zty < this._level.height && ztx >= 0 && ztx < this._level.width) {
                        if (this._explored[zty][ztx]) {
                            drawZombie(ctx, zmb, this._camera.x, this._camera.y);
                        }
                    }
                }
                
                this._player.draw(ctx, this._player.x - this._camera.x, this._player.y - this._camera.y);
                renderCombat(ctx, this._camera.x, this._camera.y);
                
                ctx.restore();

                // --- HUD ---
                ctx.save();
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(10, ctx.canvas.height - 90, 250, 80);
                
                // HP Bar
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(20, ctx.canvas.height - 80, 230, 20);
                var hpRatio = Math.max(0, this._player.hp / this._player.maxHp);
                var hpRed = Math.round(255 * (1 - hpRatio));
                var hpGreen = Math.round(255 * hpRatio);
                ctx.fillStyle = 'rgb(' + hpRed + ', ' + hpGreen + ', 0)';
                ctx.fillRect(20, ctx.canvas.height - 80, 230 * hpRatio, 20);
                
                ctx.fillStyle = '#ffffff';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this._player.hp + ' / ' + this._player.maxHp, 135, ctx.canvas.height - 70);
                
                // --- Weapon HUD & Cooldown ---
                ctx.fillStyle = '#cccccc';
                ctx.font = '16px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                
                var wpnText = COMBAT.currentWeapon === 0 ? "1: Fists" : "2: Pistol";
                var ammoText = COMBAT.currentWeapon === 1 ? (" | Ammo: " + COMBAT.playerPistolAmmo + "/" + COMBAT.playerPistolMaxAmmo) : "";
                ctx.fillText(wpnText + ammoText, 20, ctx.canvas.height - 35);

                // Progress Bar for Cooldown or Reload
                var progress = 0;
                var barColor = '#ffff00';
                var isVisible = false;

                if (COMBAT.currentWeapon === 1) {
                    if (COMBAT.playerIsReloading) {
                        progress = 1 - (COMBAT.playerReloadTime / COMBAT.playerMaxReloadTime);
                        barColor = '#00bbff';
                        isVisible = true;
                    } else if (COMBAT.playerPistolCooldown > 0) {
                        var maxCooldown = 1.0 / COMBAT.playerPistolFireRate;
                        progress = 1 - (COMBAT.playerPistolCooldown / maxCooldown);
                        barColor = '#ffff00';
                        isVisible = true;
                    }
                } else if (COMBAT.currentWeapon === 0 && COMBAT.playerMeleeTimer > 0) {
                    progress = 1 - (COMBAT.playerMeleeTimer / COMBAT.playerMeleeCooldown);
                    barColor = '#ffffff';
                    isVisible = true;
                }

                if (isVisible) {
                    // HUD Bar
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.fillRect(20, ctx.canvas.height - 20, 230, 4);
                    ctx.fillStyle = barColor;
                    ctx.fillRect(20, ctx.canvas.height - 20, 230 * progress, 4);

                    // Crosshair Circle
                    ctx.strokeStyle = barColor;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(Input.mouse.x, Input.mouse.y, 15, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
                    ctx.stroke();
                }

                // Floor text
                ctx.fillStyle = '#ffd700';
                ctx.textAlign = 'right';
                ctx.fillText('Floor: ' + this._floor, 245, ctx.canvas.height - 35);
                
                // --- Crosshair ---
                ctx.strokeStyle = isVisible ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(Input.mouse.x - 10, Input.mouse.y);
                ctx.lineTo(Input.mouse.x + 10, Input.mouse.y);
                ctx.moveTo(Input.mouse.x, Input.mouse.y - 10);
                ctx.lineTo(Input.mouse.x, Input.mouse.y + 10);
                ctx.stroke();

                // --- Minimap ---
                LevelRenderer.drawMinimap(ctx, this._level, this._explored, this._player);

                // Fade overlay
                if (this._fade > 0) {
                    ctx.fillStyle = 'rgba(0, 0, 0, ' + this._fade + ')';
                    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                }
                
                ctx.restore();
            }
            break;

        case GameState.PAUSED:
            Renderer.drawScreen(ctx, 'PAUSED', 'Press ESC to Resume');
            break;

        case GameState.GAME_OVER:
            Renderer.drawScreen(ctx, 'GAME OVER', 'Press ENTER to Restart');
            break;

        case GameState.GEN_ERROR:
            Renderer.drawScreen(ctx, 'GENERATION ERROR', 'Press ENTER to Retry');
            break;

        default:
            Renderer.clear(ctx);
            break;
    }
};
