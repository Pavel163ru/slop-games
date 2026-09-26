/* 06_spritedata.js — внешность персонажей (данные). Палитра в духе NES. */
(function (G) {
  'use strict';

  var SKIN = {
    light: '#f8c8a0',
    tan:   '#e0a070',
    olive: '#c88858',
    dark:  '#8a5a38'
  };

  G.Specs = {
    /* ---- герой ---- */
    alex:     { skin: SKIN.light, hair: '#e04828', shirt: '#f0f0f0', pants: '#2048b8', shoe: '#181820', belt: '#101018', style: 'spike', build: 'normal', accent: '#d84020' },

    /* ---- банды ---- */
    punk:     { skin: SKIN.tan,   hair: '#301820', shirt: '#8a2038', pants: '#383850', shoe: '#181820', belt: '#181820', style: 'short',  build: 'normal', accent: '#601828' },
    punkB:    { skin: SKIN.olive, hair: '#201820', shirt: '#a02828', pants: '#404048', shoe: '#202028', belt: '#c87018', style: 'bandana', build: 'normal', accent: '#781818' },
    skinhead: { skin: SKIN.tan,   hair: '#c88040', shirt: '#d8d0c0', pants: '#202038', shoe: '#181820', belt: '#181820', style: 'mohawk', build: 'normal' },
    jock:     { skin: SKIN.tan,   hair: '#503018', shirt: '#f8c820', pants: '#f8f8f8', shoe: '#c82020', belt: '#c82020', style: 'cap',    build: 'big', accent: '#202060' },
    goth:     { skin: SKIN.light, hair: '#181018', shirt: '#301838', pants: '#181018', shoe: '#101018', belt: '#582858', style: 'long',   build: 'thin' },
    chick:    { skin: SKIN.light, hair: '#d88030', shirt: '#e05090', pants: '#383868', shoe: '#f8f8f8', belt: '#202040', style: 'pony',   build: 'thin' },
    worker:   { skin: SKIN.olive, hair: '#301818', shirt: '#e08020', pants: '#383848', shoe: '#202018', belt: '#202018', style: 'helmet', build: 'normal', accent: '#f8f8f8' },
    student:  { skin: SKIN.light, hair: '#201820', shirt: '#204070', pants: '#202038', shoe: '#181820', belt: '#181820', style: 'short',  build: 'normal', accent: '#f0e8d0' },
    teacher:  { skin: SKIN.tan,   hair: '#606060', shirt: '#506078', pants: '#282830', shoe: '#101018', belt: '#101018', style: 'buzz',   build: 'normal', accent: '#c8c8c8' },
    yakuza:   { skin: SKIN.olive, hair: '#101010', shirt: '#181820', pants: '#181820', shoe: '#101018', belt: '#c02020', style: 'short',  build: 'normal', accent: '#c02020' },
    ninja:    { skin: SKIN.olive, hair: '#101018', shirt: '#202038', pants: '#181828', shoe: '#101018', belt: '#882020', style: 'bandana', build: 'thin', accent: '#882020' },

    /* ---- боссы ---- */
    rat:      { skin: SKIN.tan,   hair: '#181818', shirt: '#607040', pants: '#303828', shoe: '#181818', belt: '#181818', style: 'mohawk', build: 'thin',    accent: '#405020' },
    tony:     { skin: SKIN.tan,   hair: '#281818', shirt: '#c8a020', pants: '#483820', shoe: '#201810', belt: '#f8d040', style: 'afro',   build: 'big', accent: '#806010' },
    hulk:     { skin: SKIN.olive, hair: '#201010', shirt: '#404048', pants: '#282830', shoe: '#181818', belt: '#181818', style: 'bald',   build: 'big', accent: '#787880' },
    blade:    { skin: SKIN.dark,  hair: '#101010', shirt: '#181050', pants: '#181028', shoe: '#101018', belt: '#d82040', style: 'pony',   build: 'normal', accent: '#d82040' },
    satoru:   { skin: SKIN.light, hair: '#101018', shirt: '#101018', pants: '#101018', shoe: '#08080c', belt: '#f8d040', style: 'long',   build: 'big', accent: '#f8d040' }
  };

  G.PlayerSpec = 'alex';
})(window.G);
