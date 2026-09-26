'use strict';

/* ============================================================
 * entities/item.js — предметы (лут)
 * ============================================================ */

function Item(type, x, y) {
    this.type = type || 'ammo'; // 'ammo' или 'medkit'
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.pickedUp = false;
}

Item.prototype.update = function(dt, player) {
    if (this.pickedUp) return;

    // Проверка коллизии с игроком
    var dx = player.x - this.x;
    var dy = player.y - this.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    // У игрока радиус PLAYER_RADIUS (14)
    if (dist < this.radius + 14) {
        if (this.type === 'medkit') {
            if (player.hp < player.maxHp) {
                player.heal(25);
                this.pickedUp = true;
                AudioManager.play('pickup');
            }
        } else if (this.type === 'ammo') {
            if (typeof COMBAT !== 'undefined' && COMBAT.playerPistolAmmo < COMBAT.playerPistolMaxAmmo) {
                COMBAT.playerPistolAmmo = Math.min(COMBAT.playerPistolMaxAmmo, COMBAT.playerPistolAmmo + 12);
                this.pickedUp = true;
                AudioManager.play('pickup');
            }
        }
    }
};

Item.prototype.draw = function(ctx, screenX, screenY) {
    if (this.pickedUp) return;

    var cx = screenX;
    var cy = screenY;

    ctx.save();
    
    // Эффект "прыгания" или пульсации
    var time = Date.now() / 200;
    var bob = Math.sin(time) * 2;

    ctx.translate(cx, cy + bob);

    if (this.type === 'medkit') {
        // Зеленая аптечка с крестом
        ctx.fillStyle = '#22cc22';
        ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        ctx.strokeStyle = '#005500';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);

        // Белый крест
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2, -this.radius + 2, 4, this.radius * 2 - 4);
        ctx.fillRect(-this.radius + 2, -2, this.radius * 2 - 4, 4);

    } else if (this.type === 'ammo') {
        // Желтые патроны
        ctx.fillStyle = '#dddd22';
        ctx.fillRect(-this.radius, -this.radius + 2, this.radius * 2, this.radius * 2 - 4);
        ctx.strokeStyle = '#555500';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.radius, -this.radius + 2, this.radius * 2, this.radius * 2 - 4);

        // Полоски на патронах
        ctx.strokeStyle = '#999900';
        ctx.beginPath();
        ctx.moveTo(-this.radius + 4, -this.radius + 2);
        ctx.lineTo(-this.radius + 4, this.radius - 2);
        ctx.moveTo(-this.radius + 8, -this.radius + 2);
        ctx.lineTo(-this.radius + 8, this.radius - 2);
        ctx.stroke();
    }

    ctx.restore();
};
