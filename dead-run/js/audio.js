'use strict';

/* ============================================================
 * audio.js — генерация звуковых эффектов (Web Audio API)
 * ============================================================ */

var AudioManager = {
    ctx: null,
    
    /** Инициализация контекста (требует жеста пользователя) */
    init: function () {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    },
    
    /** Резюмировать контекст (необходимо для Chrome/Safari) */
    resume: function () {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    
    /** Воспроизвести звук по типу */
    play: function (type) {
        if (!this.ctx) this.init();
        if (!this.ctx) return;
        this.resume();
        
        switch (type) {
            case 'shoot':  this.playShoot(); break;
            case 'hit':    this.playHit(); break;
            case 'pickup': this.playPickup(); break;
            case 'death':  this.playDeath(); break;
            case 'door':   this.playDoor(); break;
        }
    },
    
    /** Звук выстрела (быстрый спад частоты) */
    playShoot: function () {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    },
    
    /** Звук удара/урона (низкий "бум") */
    playHit: function () {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    },
    
    /** Звук подбора предмета (высокий "блинг") */
    playPickup: function () {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, this.ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    },
    
    /** Звук смерти (низкий стон) */
    playDeath: function () {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.5);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    },
    
    /** Звук открытия двери (скрип/движение) */
    playDoor: function () {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(180, this.ctx.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }
};
