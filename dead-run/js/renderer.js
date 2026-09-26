'use strict';

/* ============================================================
 * renderer.js — рендерер: примитивы отрисовки на Canvas 2D
 * ============================================================ */

var Renderer = {

    /** Очистка канваса чёрным цветом */
    clear: function (ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    },

    /**
     * Рисование текста
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {number} x
     * @param {number} y
     * @param {number} size — размер шрифта в px
     * @param {string} color — цвет текста (CSS-строка)
     * @param {string} align — 'left' | 'center' | 'right'
     */
    drawText: function (ctx, text, x, y, size, color, align) {
        ctx.save();
        ctx.font = size + 'px "Courier New", monospace';
        ctx.fillStyle = color || '#fff';
        ctx.textAlign = align || 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
        ctx.restore();
    },

    /**
     * Рисование залитого прямоугольника
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {string} color — цвет заливки (CSS-строка)
     */
    drawRect: function (ctx, x, y, w, h, color) {
        ctx.save();
        ctx.fillStyle = color || '#fff';
        ctx.fillRect(x, y, w, h);
        ctx.restore();
    },

    /**
     * Рисование заглушки экрана — текст по центру канваса
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} title — крупный текст
     * @param {string} subtitle — мелкий текст (опционально)
     */
    drawScreen: function (ctx, title, subtitle) {
        var w = ctx.canvas.width;
        var h = ctx.canvas.height;

        this.drawText(ctx, title, w / 2, h / 2 - 20, 48, '#fff', 'center');

        if (subtitle) {
            this.drawText(ctx, subtitle, w / 2, h / 2 + 30, 18, '#aaa', 'center');
        }
    }
};
