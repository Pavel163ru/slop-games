(function () {
  "use strict";

  const WIDTH = 512;
  const NORMAL_HEIGHT = 840;
  const RAIL_HEIGHT = 690;
  const RAIL_WIDTH = 110;
  const SIZE = 8;
  const CELL = 64;
  const BOARD_TOP = 118;
  const MAX_CASCADES = 14;
  const TYPES = ["sword", "shield", "mana", "gold", "potion"];
  const WEIGHTS = { sword: 22, shield: 20, mana: 22, gold: 24, potion: 12 };
  const TYPE_SPRITES = {
    sword: "token-sword",
    shield: "token-shield",
    mana: "token-mana",
    gold: "token-gold",
    potion: "token-potion"
  };
  const COLORS = {
    sword: "#5a2526",
    shield: "#213b4a",
    mana: "#302e5f",
    gold: "#59431e",
    potion: "#25492e"
  };
  const SPELLS = [
    { id: "spell-fireball", action: "fireball", title: "Фаербол", cost: 15, effect: "12 урона" },
    { id: "spell-heal", action: "heal", title: "Лечение", cost: 12, effect: "+15 HP" },
    { id: "spell-stone-shield", action: "shield", title: "Каменный щит", cost: 10, effect: "+10 брони" }
  ];
  const SPELL_BUTTONS = [
    { x: 12, y: 651, w: 156, h: 46 },
    { x: 178, y: 651, w: 156, h: 46 },
    { x: 344, y: 651, w: 156, h: 46 }
  ];
  const ITEM_BUTTONS = [
    { x: 12, y: 705, w: 156, h: 44, action: "potion" },
    { x: 178, y: 705, w: 156, h: 44, action: "hint" },
    { x: 344, y: 705, w: 156, h: 44, action: "restart" }
  ];
  const ASSET_IDS = [
    "hero", "enemy-rat",
    "token-sword", "token-shield", "token-mana", "token-gold", "token-potion",
    "spell-fireball", "spell-heal", "spell-stone-shield"
  ];

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const frame = canvas.parentElement;
  const layout = document.querySelector(".demo-layout");
  const notes = document.querySelector(".play-notes");
  const rail = document.getElementById("spell-rail");
  const railMana = document.getElementById("rail-mana");
  const railPotionCount = document.getElementById("rail-potions");
  const images = Object.create(null);
  let dpr = 1;
  let viewHeight = NORMAL_HEIGHT;
  let railSignature = "";
  let game;
  let animationStarted = false;

  function roundedRect(x, y, w, h, radius, fill, stroke, lineWidth) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.lineWidth = lineWidth || 1;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  function text(value, x, y, font, color, align) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(value, x, y);
  }

  function resizeCanvas() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const layoutStyle = window.getComputedStyle(layout);
    const notesVisible = notes && window.getComputedStyle(notes).display !== "none";
    const notesWidth = notesVisible ? notes.getBoundingClientRect().width : 0;
    const gap = parseFloat(layoutStyle.columnGap) || 0;
    const widthWithoutRail = Math.max(1, layout.clientWidth - notesWidth - (notesVisible ? gap : 0));
    const shouldUseRail = layout.clientHeight < NORMAL_HEIGHT && widthWithoutRail >= WIDTH + RAIL_WIDTH + gap;
    if (game) game.railMode = shouldUseRail;
    if (rail) rail.classList.toggle("is-visible", shouldUseRail);
    viewHeight = shouldUseRail ? RAIL_HEIGHT : NORMAL_HEIGHT;

    const railVisible = shouldUseRail;
    const visibleItems = 1 + (notesVisible ? 1 : 0) + (railVisible ? 1 : 0);
    const availableWidth = Math.max(1, layout.clientWidth - notesWidth - (railVisible ? RAIL_WIDTH : 0) - Math.max(0, visibleItems - 1) * gap);
    const availableHeight = Math.max(1, layout.clientHeight);
    const scale = Math.min(1, availableWidth / WIDTH, availableHeight / viewHeight);

    canvas.width = WIDTH * dpr;
    canvas.height = viewHeight * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    frame.style.width = (WIDTH * scale) + "px";
    frame.style.height = (viewHeight * scale) + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    railSignature = "";
    syncSpellRail();
    render();
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function weightedType(allowedTypes) {
    const options = allowedTypes || TYPES;
    const total = options.reduce(function (sum, type) { return sum + WEIGHTS[type]; }, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < options.length; i += 1) {
      roll -= WEIGHTS[options[i]];
      if (roll < 0) return options[i];
    }
    return options[options.length - 1];
  }

  function swapCells(a, b) {
    const value = game.board[a.y][a.x];
    game.board[a.y][a.x] = game.board[b.y][b.x];
    game.board[b.y][b.x] = value;
  }

  function collectRuns(horizontal) {
    const groups = [];
    const lineCount = SIZE;
    const lineLength = SIZE;

    for (let line = 0; line < lineCount; line += 1) {
      let offset = 0;
      while (offset < lineLength) {
        const x = horizontal ? offset : line;
        const y = horizontal ? line : offset;
        const type = game.board[y][x];
        if (!type) {
          offset += 1;
          continue;
        }

        let end = offset + 1;
        while (end < lineLength) {
          const nextX = horizontal ? end : line;
          const nextY = horizontal ? line : end;
          if (game.board[nextY][nextX] !== type) break;
          end += 1;
        }

        if (end - offset >= 3) {
          const cells = [];
          for (let i = offset; i < end; i += 1) {
            cells.push(horizontal ? { x: i, y: line } : { x: line, y: i });
          }
          groups.push({ type: type, cells: cells, length: cells.length });
        }
        offset = end;
      }
    }
    return groups;
  }

  function findMatches() {
    return collectRuns(true).concat(collectRuns(false));
  }

  function hasPossibleMove() {
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const a = { x: x, y: y };
        const neighbors = [];
        if (x + 1 < SIZE) neighbors.push({ x: x + 1, y: y });
        if (y + 1 < SIZE) neighbors.push({ x: x, y: y + 1 });
        for (let i = 0; i < neighbors.length; i += 1) {
          swapCells(a, neighbors[i]);
          const hasMatch = findMatches().length > 0;
          swapCells(a, neighbors[i]);
          if (hasMatch) return true;
        }
      }
    }
    return false;
  }

  function makePlayableBoard() {
    for (let attempt = 0; attempt < 250; attempt += 1) {
      game.board = Array.from({ length: SIZE }, function () { return Array(SIZE).fill(null); });
      for (let y = 0; y < SIZE; y += 1) {
        for (let x = 0; x < SIZE; x += 1) {
          let allowed = TYPES.filter(function (type) {
            const makesHorizontal = x >= 2 && game.board[y][x - 1] === type && game.board[y][x - 2] === type;
            const makesVertical = y >= 2 && game.board[y - 1][x] === type && game.board[y - 2][x] === type;
            return !makesHorizontal && !makesVertical;
          });
          if (allowed.length === 0) allowed = TYPES;
          game.board[y][x] = weightedType(allowed);
        }
      }
      if (findMatches().length === 0 && hasPossibleMove()) return;
    }
  }

  function addLog(message) {
    game.log.unshift(message);
    if (game.log.length > 4) game.log.length = 4;
  }

  function delay(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
  }

  function addFloat(label, x, y, color, size) {
    game.floats.push({ label: label, x: x, y: y, color: color, size: size || 13, start: Date.now(), duration: 900 });
  }

  function spawnBurst(x, y, color, count) {
    const amount = count || 7;
    for (let i = 0; i < amount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 18 + Math.random() * 52;
      game.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 12,
        size: 1.5 + Math.random() * 2.8,
        color: color,
        start: Date.now(),
        duration: 420 + Math.random() * 220
      });
    }
  }

  function resetDemo() {
    game = {
      board: [],
      player: { hp: 50, maxHp: 50, armor: 0, mana: 0, atk: 0, gold: 0, potions: 1, xp: 0 },
      enemy: { hp: 40, maxHp: 40, nextAttack: randomInt(6, 8), burn: 0, bleed: 0, weakness: 0 },
      phase: "player",
      railMode: Boolean(rail && rail.classList.contains("is-visible")),
      selected: null,
      hint: null,
      notice: "",
      log: [],
      floats: [],
      particles: [],
      matchFx: null,
      dropFx: [],
      shakeUntil: 0,
      shakeAmount: 0,
      hitFlashUntil: 0,
      critFlashUntil: 0,
      enemyFlashUntil: 0,
      playerFlashUntil: 0,
      hovered: "",
      moves: 0,
      cascades: 0,
      rewarded: false
    };
    makePlayableBoard();
    addLog("Крыса выходит из темноты. Следи за её намерением.");
    render();
  }

  function healthBar(x, y, width, current, maximum, color) {
    roundedRect(x, y, width, 7, 3, "#332d28", "#55493c", 1);
    const ratio = maximum > 0 ? Math.max(0, Math.min(1, current / maximum)) : 0;
    if (ratio > 0) roundedRect(x, y, Math.max(5, width * ratio), 7, 3, color, null, 0);
  }

  function drawHud(now) {
    const time = now || Date.now();
    text("ПЕРВЫЙ БОЙ", WIDTH / 2, 23, "700 10px system-ui, sans-serif", "#d7a65f", "center");
    text("Подземелье · ряд 1", WIDTH / 2, 41, "12px Georgia, serif", "#eee2cf", "center");

    const panelGradient = ctx.createLinearGradient(10, 48, 10, 110);
    panelGradient.addColorStop(0, "#28221b");
    panelGradient.addColorStop(1, "#171615");
    roundedRect(10, 48, 239, 62, 8, panelGradient, "#665239", 1);
    if (images.hero) {
      ctx.save();
      if (time < game.playerFlashUntil) {
        ctx.shadowColor = "#ff7765";
        ctx.shadowBlur = 14;
      }
      ctx.drawImage(images.hero, 17, 56, 46, 46);
      ctx.restore();
    }
    text("ГЕРОЙ", 70, 65, "700 11px system-ui, sans-serif", "#e8d9c2");
    text(game.player.hp + " / " + game.player.maxHp + " HP", 70, 79, "10px system-ui, sans-serif", "#b9aea0");
    healthBar(70, 85, 165, game.player.hp, game.player.maxHp, "#78b875");
    text("Броня " + game.player.armor + " · Мана " + game.player.mana + " · G " + game.player.gold, 70, 103, "9px system-ui, sans-serif", "#b9aea0");

    roundedRect(263, 48, 239, 62, 8, panelGradient, "#665239", 1);
    if (images["enemy-rat"]) {
      ctx.save();
      if (time < game.enemyFlashUntil) {
        ctx.shadowColor = "#ff9a67";
        ctx.shadowBlur = 18;
      }
      ctx.drawImage(images["enemy-rat"], 441, 55, 51, 51);
      ctx.restore();
    }
    text("КРЫСА", 277, 65, "700 11px system-ui, sans-serif", "#e8d9c2");
    text(game.enemy.hp + " / " + game.enemy.maxHp + " HP", 277, 79, "10px system-ui, sans-serif", "#b9aea0");
    healthBar(277, 85, 151, game.enemy.hp, game.enemy.maxHp, "#c65d57");
    let intent = "Удар: " + game.enemy.nextAttack;
    if (game.enemy.bleed > 0) intent += " · Кровь " + game.enemy.bleed;
    if (game.enemy.burn > 0) intent += " · Ожог " + game.enemy.burn;
    if (game.enemy.weakness > 0) intent += " · Слабость " + game.enemy.weakness;
    text(intent, 277, 103, "8px system-ui, sans-serif", "#d9ad81");
  }

  function drawBoard(now) {
    const time = now || Date.now();
    const shakeProgress = game.shakeUntil > time ? (game.shakeUntil - time) / 360 : 0;
    const shakeX = shakeProgress > 0 ? Math.sin(time / 19) * game.shakeAmount * shakeProgress : 0;
    ctx.save();
    ctx.translate(shakeX, 0);
    roundedRect(3, BOARD_TOP - 3, 506, 518, 11, "#171615", "#463c30", 1);
    const dropTargets = new Set(game.dropFx.map(function (drop) { return drop.x + "," + drop.toY; }));
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const type = game.board[y][x];
        const px = x * CELL + 3;
        const py = BOARD_TOP + y * CELL + 1;
        roundedRect(px, py, 58, 58, 8, COLORS[type] || "#302c28", "#5a4c3b", 1);

        if (type && images[TYPE_SPRITES[type]] && !dropTargets.has(x + "," + y)) {
          ctx.drawImage(images[TYPE_SPRITES[type]], px + 4, py + 4, 50, 50);
        } else if (type && !images[TYPE_SPRITES[type]]) {
          text(type ? type.slice(0, 1).toUpperCase() : "", px + 29, py + 36, "700 20px system-ui, sans-serif", "#f4d8a7", "center");
        }

        const isSelected = game.selected && game.selected.x === x && game.selected.y === y;
        const isHint = game.hint && time < game.hint.expires && game.hint.cells.some(function (cell) { return cell.x === x && cell.y === y; });
        if (isSelected) {
          ctx.save();
          ctx.shadowColor = "#ffd47a";
          ctx.shadowBlur = 9 + Math.sin(time / 150) * 4;
          roundedRect(px + 1, py + 1, 56, 56, 8, null, "#ffe5a3", 2.5);
          ctx.restore();
        } else if (isHint) {
          ctx.save();
          ctx.globalAlpha = 0.64 + Math.sin(time / 190) * 0.25;
          ctx.shadowColor = "#67ded4";
          ctx.shadowBlur = 10;
          roundedRect(px + 1, py + 1, 56, 56, 8, null, "#93fff0", 2);
          ctx.restore();
        }
      }
    }

    if (game.matchFx) {
      const progress = Math.min(1, Math.max(0, (time - game.matchFx.start) / game.matchFx.duration));
      game.matchFx.pieces.forEach(function (piece) {
        const image = images[TYPE_SPRITES[piece.type]];
        if (!image) return;
        const scale = 1 + progress * 0.42;
        const size = 50 * scale;
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        ctx.shadowColor = piece.color;
        ctx.shadowBlur = 18 * (1 - progress);
        ctx.drawImage(image, piece.x * CELL + 32 - size / 2, BOARD_TOP + piece.y * CELL + 32 - size / 2, size, size);
        ctx.restore();
      });
    }

    if (game.dropFx.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(3, BOARD_TOP, 506, SIZE * CELL);
      ctx.clip();
      game.dropFx.forEach(function (drop) {
        const image = images[TYPE_SPRITES[drop.type]];
        if (!image) return;
        const progress = Math.min(1, Math.max(0, (time - drop.start) / drop.duration));
        const eased = 1 - Math.pow(1 - progress, 3);
        const y = BOARD_TOP + (drop.fromY + (drop.toY - drop.fromY) * eased) * CELL;
        ctx.drawImage(image, drop.x * CELL + 7, y + 5, 50, 50);
      });
      ctx.restore();
    }
    ctx.restore();
  }

  function drawActionButton(rect, options, now) {
    const disabled = Boolean(options.disabled);
    const hovered = !disabled && game.hovered === options.key;
    const fill = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    fill.addColorStop(0, disabled ? "#22201d" : (hovered ? "#40301d" : "#2b241b"));
    fill.addColorStop(1, disabled ? "#171615" : (hovered ? "#252019" : "#1c1a17"));
    const stroke = disabled ? "#302d29" : (hovered ? "#d0a666" : (options.primary ? "#8c6839" : "#66543b"));
    ctx.save();
    if (hovered) {
      ctx.shadowColor = "#d8a858";
      ctx.shadowBlur = 13;
    }
    roundedRect(rect.x, rect.y, rect.w, rect.h, 7, fill, stroke, hovered ? 1.5 : 1);
    if (options.icon && images[options.icon]) {
      ctx.shadowColor = disabled ? "transparent" : "#e3b66b66";
      ctx.shadowBlur = hovered ? 10 : 3;
      ctx.drawImage(images[options.icon], rect.x + 8, rect.y + Math.floor((rect.h - 32) / 2), 32, 32);
    }
    const textX = options.icon ? rect.x + 46 : rect.x + 10;
    const color = disabled ? "#756d63" : "#eee3d1";
    text(options.title, textX, rect.y + 20, "600 10px system-ui, sans-serif", color);
    text(options.detail, textX, rect.y + rect.h - 8, "9px system-ui, sans-serif", disabled ? "#675f56" : "#b7a58b");
    ctx.restore();
  }

  function canCast(spell) {
    return game.player.mana >= spell.cost && game.phase === "player";
  }

  function syncSpellRail() {
    if (!rail || !game) return;
    const signature = [game.railMode, game.phase, game.player.mana, game.player.hp, game.player.potions].join("/");
    if (signature === railSignature) return;
    railSignature = signature;
    if (railMana) railMana.textContent = "МАНА · " + game.player.mana;
    rail.querySelectorAll("[data-spell-action]").forEach(function (button) {
      const spell = SPELLS.find(function (item) { return item.action === button.dataset.spellAction; });
      if (!spell) return;
      button.disabled = !canCast(spell);
      button.classList.toggle("is-ready", canCast(spell));
    });
    rail.querySelectorAll("[data-item-action]").forEach(function (button) {
      const action = button.dataset.itemAction;
      const disabled = action === "potion"
        ? game.player.potions <= 0 || game.player.hp >= game.player.maxHp || game.phase !== "player"
        : game.phase !== "player";
      button.disabled = disabled;
      button.classList.toggle("is-ready", !disabled);
    });
    if (railPotionCount) railPotionCount.textContent = String(game.player.potions);
  }

  function drawControls() {
    let status = "Твой ход · выбери две соседние фишки";
    if (game.phase === "resolving") status = "Матч разбирается…";
    else if (game.phase === "enemy") status = "Крыса атакует…";
    else if (game.phase === "won") status = "Победа! Первый бой пройден.";
    else if (game.phase === "lost") status = "Герой пал. Попробуй другую тактику.";
    else if (game.notice) status = game.notice;
    text(status, 14, 642, "600 11px system-ui, sans-serif", game.phase === "player" ? "#d6c6ad" : "#d7a65f");

    if (!game.railMode) {
      SPELLS.forEach(function (spell, index) {
        drawActionButton(SPELL_BUTTONS[index], {
          title: spell.title,
          detail: spell.cost + " маны · " + spell.effect,
          icon: spell.id,
          key: "spell-" + spell.action,
          disabled: !canCast(spell),
          primary: false
        });
      });
    }

    if (!game.railMode) {
      const canUsePotion = game.player.potions > 0 && game.player.hp < game.player.maxHp && game.phase === "player";
      drawActionButton(ITEM_BUTTONS[0], {
        title: "Зелье · +25 HP",
        detail: "Зелий: " + game.player.potions + " · тратит ход",
        icon: "token-potion",
        key: "potion",
        disabled: !canUsePotion
      });
      drawActionButton(ITEM_BUTTONS[1], {
        title: "Подсказка",
        detail: "Бесплатно · покажет ход",
        icon: null,
        key: "hint",
        disabled: game.phase !== "player"
      });
      drawActionButton(ITEM_BUTTONS[2], {
        title: "Начать заново",
        detail: "Сбросить бой",
        icon: null,
        key: "restart",
        disabled: game.phase !== "player"
      });
    }
  }

  function drawLog() {
    if (game.railMode) {
      if (game.log.length > 0) {
        ctx.font = "10px system-ui, sans-serif";
        ctx.fillStyle = "#b9aa95";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(game.log[0], 14, 676, WIDTH - 28);
      }
      return;
    }
    const titleY = 768;
    const firstLineY = 786;
    text("ЖУРНАЛ БОЯ", 14, titleY, "700 9px system-ui, sans-serif", "#a99576");
    game.log.slice(0, 3).forEach(function (line, index) {
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillStyle = index === 0 ? "#ded2c0" : "#928779";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(line, 14, firstLineY + index * 17, WIDTH - 28);
    });
  }

  function drawEndOverlay() {
    if (game.phase !== "won" && game.phase !== "lost") return;
    const cardTop = (viewHeight - 216) / 2;
    ctx.fillStyle = "rgba(10, 9, 8, .78)";
    ctx.fillRect(0, 0, WIDTH, viewHeight);
    roundedRect(42, cardTop, 428, 216, 12, "#1d1a17", game.phase === "won" ? "#a17a45" : "#784440", 2);
    text(game.phase === "won" ? "ПОБЕДА" : "ПОРАЖЕНИЕ", WIDTH / 2, cardTop + 45, "700 28px Georgia, serif", game.phase === "won" ? "#f0c47b" : "#d58c82", "center");
    if (game.phase === "won") {
      text("Крыса побеждена", WIDTH / 2, cardTop + 76, "13px system-ui, sans-serif", "#ddd2c1", "center");
      text("Награда: 40 XP · 30 золота", WIDTH / 2, cardTop + 99, "12px system-ui, sans-serif", "#d5b887", "center");
      text("Ходов: " + game.moves + " · каскадов: " + game.cascades, WIDTH / 2, cardTop + 122, "10px system-ui, sans-serif", "#aaa092", "center");
    } else {
      text("Крыса оказалась сильнее в этот раз.", WIDTH / 2, cardTop + 81, "12px system-ui, sans-serif", "#c7b7a7", "center");
      text("Попробуй щиты, лечение или длинные матчи.", WIDTH / 2, cardTop + 105, "11px system-ui, sans-serif", "#a99a89", "center");
    }
    roundedRect(115, cardTop + 139, 282, 48, 7, "#382a1b", "#a17a45", 1);
    text("Сыграть ещё раз", WIDTH / 2, cardTop + 169, "600 13px system-ui, sans-serif", "#f3d6a5", "center");
  }

  function drawAmbient(now) {
    ctx.save();
    for (let i = 0; i < 23; i += 1) {
      const drift = now * (0.004 + (i % 4) * 0.001);
      const x = (i * 137 + Math.sin(drift + i) * 13 + WIDTH) % WIDTH;
      const y = (i * 89 + drift * 9 + viewHeight) % viewHeight;
      const alpha = 0.08 + (Math.sin(drift * 1.8 + i * 3) + 1) * 0.08;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = i % 4 === 0 ? "#f4cc85" : "#b7a489";
      ctx.beginPath();
      ctx.arc(x, y, i % 5 === 0 ? 1.5 : 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEffects(now) {
    ctx.save();
    game.particles.forEach(function (particle) {
      const progress = Math.min(1, Math.max(0, (now - particle.start) / particle.duration));
      const x = particle.x + particle.vx * progress;
      const y = particle.y + particle.vy * progress + 35 * progress * progress;
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 9;
      ctx.beginPath();
      ctx.arc(x, y, particle.size * (1 - progress * 0.45), 0, Math.PI * 2);
      ctx.fill();
    });

    game.floats.forEach(function (item) {
      const progress = Math.min(1, Math.max(0, (now - item.start) / item.duration));
      ctx.globalAlpha = progress < 0.14 ? progress / 0.14 : 1 - progress;
      ctx.shadowColor = item.color;
      ctx.shadowBlur = 12;
      ctx.font = "800 " + item.size + "px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = item.color;
      ctx.fillText(item.label, item.x, item.y - progress * 39);
    });
    ctx.restore();
  }

  function render(nowValue) {
    if (!game) return;
    const now = nowValue || Date.now();
    syncSpellRail();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, WIDTH, viewHeight);
    const background = ctx.createLinearGradient(0, 0, 0, viewHeight);
    background.addColorStop(0, "#211a13");
    background.addColorStop(0.42, "#151412");
    background.addColorStop(1, "#100f0e");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, WIDTH, viewHeight);
    drawAmbient(now);
    drawHud(now);
    drawBoard(now);
    drawControls();
    drawLog();
    drawEffects(now);
    if (game.hitFlashUntil > now) {
      ctx.save();
      ctx.globalAlpha = 0.11 * (game.hitFlashUntil - now) / 240;
      ctx.fillStyle = "#ff5548";
      ctx.fillRect(0, 0, WIDTH, viewHeight);
      ctx.restore();
    }
    if (game.critFlashUntil > now) {
      ctx.save();
      ctx.globalAlpha = 0.09 * (game.critFlashUntil - now) / 260;
      ctx.fillStyle = "#f6c76b";
      ctx.fillRect(0, 0, WIDTH, viewHeight);
      ctx.restore();
    }
    drawEndOverlay();
  }

  function animationFrame() {
    if (!game) return;
    const now = Date.now();
    game.floats = game.floats.filter(function (item) { return now - item.start < item.duration; });
    game.particles = game.particles.filter(function (particle) { return now - particle.start < particle.duration; });
    game.dropFx = game.dropFx.filter(function (drop) { return now - drop.start < drop.duration; });
    if (game.matchFx && now - game.matchFx.start >= game.matchFx.duration) game.matchFx = null;
    render(now);
    window.requestAnimationFrame(animationFrame);
  }

  function findPossibleMove() {
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const a = { x: x, y: y };
        const candidates = [];
        if (x + 1 < SIZE) candidates.push({ x: x + 1, y: y });
        if (y + 1 < SIZE) candidates.push({ x: x, y: y + 1 });
        for (let i = 0; i < candidates.length; i += 1) {
          swapCells(a, candidates[i]);
          const valid = findMatches().length > 0;
          swapCells(a, candidates[i]);
          if (valid) return [a, candidates[i]];
        }
      }
    }
    return null;
  }

  function collapseBoard() {
    const drops = [];
    const started = Date.now();
    for (let x = 0; x < SIZE; x += 1) {
      const survivors = [];
      for (let y = SIZE - 1; y >= 0; y -= 1) {
        if (game.board[y][x]) survivors.push({ type: game.board[y][x], fromY: y });
      }
      let index = 0;
      let spawnIndex = 0;
      for (let y = SIZE - 1; y >= 0; y -= 1) {
        if (index < survivors.length) {
          const survivor = survivors[index++];
          game.board[y][x] = survivor.type;
          if (survivor.fromY !== y) {
            drops.push({ x: x, type: survivor.type, fromY: survivor.fromY, toY: y, start: started, duration: 230 });
          }
        } else {
          const type = weightedType();
          game.board[y][x] = type;
          drops.push({ x: x, type: type, fromY: -1 - spawnIndex * 0.7, toY: y, start: started, duration: 240 + spawnIndex * 8 });
          spawnIndex += 1;
        }
      }
    }
    game.matchFx = null;
    game.dropFx = drops;
  }

  function ensurePlayableBoard() {
    if (hasPossibleMove()) return;
    makePlayableBoard();
    addLog("Нет ходов — поле создано заново бесплатно.");
  }

  async function resolveMatches() {
    let extraTurn = false;
    let extraTurnFloatShown = false;
    let cascadeNumber = 0;

    while (cascadeNumber < MAX_CASCADES) {
      const groups = findMatches();
      if (groups.length === 0) break;
      cascadeNumber += 1;
      game.cascades += 1;

      let swordDamage = 0;
      let armorGain = 0;
      let manaGain = 0;
      let healing = 0;
      let goldGain = 0;
      let criticalGroups = 0;
      let appliedBleed = false;
      let appliedWeakness = false;
      const removedCells = new Set();
      const matchedPieces = [];

      groups.forEach(function (group) {
        const multiplier = group.length >= 5 ? 3 : (group.length === 4 ? 2 : 1);
        group.cells.forEach(function (cell) { removedCells.add(cell.x + "," + cell.y); });
        if (group.length >= 4) extraTurn = true;
        const center = group.cells.reduce(function (sum, cell) {
          sum.x += cell.x;
          sum.y += cell.y;
          return sum;
        }, { x: 0, y: 0 });
        const centerX = center.x / group.length * CELL + CELL / 2;
        const centerY = BOARD_TOP + center.y / group.length * CELL + CELL / 2;

        if (group.type === "sword") {
          let damage = (3 + game.player.atk) * multiplier;
          if (group.length >= 5 && Math.random() < 0.25) {
            damage *= 2;
            criticalGroups += 1;
            game.critFlashUntil = Date.now() + 260;
            game.shakeUntil = Date.now() + 250;
            game.shakeAmount = 3;
            addFloat("КРИТ!", centerX, centerY - 10, "#ffe18d", 12);
          }
          swordDamage += damage;
          addFloat("−" + damage, centerX, centerY, "#ff978c", 15);
          if (group.length >= 4) {
            game.enemy.bleed = Math.max(game.enemy.bleed, 3);
            appliedBleed = true;
          }
        } else if (group.type === "shield") {
          const amount = 3 * multiplier;
          armorGain += amount;
          addFloat("+" + amount + " БРОНЯ", centerX, centerY, "#a7e6ef", 10);
          if (group.length >= 4) {
            game.enemy.weakness = Math.max(game.enemy.weakness, 2);
            appliedWeakness = true;
          }
        } else if (group.type === "mana") {
          const amount = 3 * multiplier;
          manaGain += amount;
          addFloat("+" + amount + " МАНА", centerX, centerY, "#b6a7ff", 10);
        } else if (group.type === "potion") {
          const amount = 3 * multiplier;
          healing += amount;
          addFloat("+" + amount + " HP", centerX, centerY, "#9fe0a4", 10);
        } else if (group.type === "gold") {
          const amount = 3 * multiplier;
          goldGain += amount;
          addFloat("+" + amount + " ЗОЛОТА", centerX, centerY, "#f4cf83", 10);
        }
      });

      game.enemy.hp = Math.max(0, game.enemy.hp - swordDamage);
      if (swordDamage > 0) {
        game.enemyFlashUntil = Date.now() + 280;
        game.shakeUntil = Date.now() + 220;
        game.shakeAmount = Math.max(game.shakeAmount, 2.5);
        addFloat("−" + swordDamage, 389, 65, "#ff8c7e", 15);
        spawnBurst(466, 79, "#ff916c", 12);
      }
      game.player.armor += armorGain;
      game.player.mana += manaGain;
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + healing);
      game.player.gold += goldGain;
      if (extraTurn && !extraTurnFloatShown) {
        addFloat("EXTRA TURN", WIDTH / 2, BOARD_TOP + SIZE * CELL - 6, "#ffe08a", 12);
        extraTurnFloatShown = true;
      }
      removedCells.forEach(function (key) {
        const parts = key.split(",");
        const x = Number(parts[0]);
        const y = Number(parts[1]);
        const type = game.board[y][x];
        matchedPieces.push({ x: x, y: y, type: type, color: COLORS[type] });
        spawnBurst(x * CELL + CELL / 2, BOARD_TOP + y * CELL + CELL / 2, COLORS[type], 5);
        game.board[y][x] = null;
      });
      game.matchFx = { pieces: matchedPieces, start: Date.now(), duration: 220 };

      let summary = "Каскад " + cascadeNumber + ": убрано " + removedCells.size + " фишек";
      if (swordDamage > 0) summary += " · мечи " + swordDamage + " урона";
      if (armorGain > 0) summary += " · броня +" + armorGain;
      if (manaGain > 0) summary += " · мана +" + manaGain;
      if (healing > 0) summary += " · лечение +" + healing;
      if (goldGain > 0) summary += " · золото +" + goldGain;
      if (criticalGroups > 0) summary += " · крит!";
      if (appliedBleed) summary += " · кровотечение";
      if (appliedWeakness) summary += " · слабость";
      addLog(summary);
      render();
      await delay(190);

      collapseBoard();
      render();
      await delay(310);

      if (game.enemy.hp <= 0) break;
    }

    if (cascadeNumber >= MAX_CASCADES && findMatches().length > 0 && game.enemy.hp > 0) {
      makePlayableBoard();
      addLog("Длинная цепочка завершена — поле обновлено.");
    }
    if (game.enemy.hp > 0) ensurePlayableBoard();
    return extraTurn;
  }

  function endGame(won) {
    if (game.phase === "won" || game.phase === "lost") return;
    if (won) {
      game.enemy.hp = 0;
      if (!game.rewarded) {
        game.rewarded = true;
        game.player.xp += 40;
        game.player.gold += 30;
      }
      game.phase = "won";
      addLog("Победа! Получено 40 XP и 30 золота.");
    } else {
      game.player.hp = 0;
      game.phase = "lost";
      addLog("Герой повержен. Можно сразу попробовать ещё раз.");
    }
    render();
  }

  async function tickEnemyStatuses() {
    const statuses = [
      { key: "burn", damage: 3, label: "Ожог" },
      { key: "bleed", damage: 2, label: "Кровотечение" }
    ];
    for (let i = 0; i < statuses.length; i += 1) {
      const status = statuses[i];
      if (game.enemy[status.key] <= 0) continue;
      game.enemy[status.key] -= 1;
      game.enemy.hp = Math.max(0, game.enemy.hp - status.damage);
      game.enemyFlashUntil = Date.now() + 240;
      addFloat("−" + status.damage, 390, 70, status.key === "burn" ? "#ffac68" : "#f08d82", 13);
      spawnBurst(466, 79, status.key === "burn" ? "#ffad56" : "#f36d66", 8);
      addLog(status.label + ": крыса получает " + status.damage + " урона.");
      render();
      await delay(190);
      if (game.enemy.hp <= 0) return false;
    }
    return true;
  }

  async function enemyTurn() {
    if (game.enemy.hp <= 0) {
      endGame(true);
      return;
    }
    game.phase = "enemy";
    game.selected = null;
    render();
    await delay(420);

    const enemyAlive = await tickEnemyStatuses();
    if (!enemyAlive) {
      endGame(true);
      return;
    }

    const intent = game.enemy.nextAttack;
    let damage = intent;
    if (game.enemy.weakness > 0) {
      damage = Math.max(1, Math.floor(damage * 0.7));
      game.enemy.weakness -= 1;
    }
    const blocked = Math.min(game.player.armor, damage);
    const healthDamage = damage - blocked;
    game.player.armor = 0;
    game.player.hp = Math.max(0, game.player.hp - healthDamage);
    if (healthDamage > 0) {
      game.playerFlashUntil = Date.now() + 280;
      game.hitFlashUntil = Date.now() + 230;
      game.shakeUntil = Date.now() + 340;
      game.shakeAmount = 5;
      addFloat("−" + healthDamage + " HP", 87, 67, "#ff8e83", 14);
      spawnBurst(39, 79, "#f37465", 10);
    }
    if (blocked > 0) addFloat("БЛОК " + blocked, 112, 98, "#a8e5ef", 11);
    addLog("Крыса бьёт на " + damage + (blocked > 0 ? " · броня поглотила " + blocked : "") + ".");

    if (game.player.hp <= 0) {
      endGame(false);
      return;
    }

    game.enemy.nextAttack = randomInt(6, 8);
    game.phase = "player";
    render();
  }

  async function finishPlayerAction(extraTurn) {
    if (game.enemy.hp <= 0) {
      endGame(true);
      return;
    }
    if (extraTurn) {
      addLog("Матч 4+ — крыса пропускает удар.");
      game.phase = "player";
      render();
      return;
    }
    await enemyTurn();
  }

  async function resolvePlayerSwap(a, b) {
    game.phase = "resolving";
    game.selected = null;
    swapCells(a, b);
    const matches = findMatches();
    if (matches.length === 0) {
      render();
      await delay(170);
      swapCells(a, b);
      game.phase = "player";
      addLog("Нет совпадения — обмен отменён, ход сохранён.");
      render();
      return;
    }

    game.moves += 1;
    addLog("Ход " + game.moves + ": удачный обмен.");
    render();
    const extraTurn = await resolveMatches();
    await finishPlayerAction(extraTurn);
  }

  async function castSpell(spell) {
    if (game.phase !== "player" || game.player.mana < spell.cost) return;
    game.phase = "resolving";
    game.player.mana -= spell.cost;
    game.moves += 1;

    if (spell.action === "fireball") {
      const actualDamage = Math.min(12, game.enemy.hp);
      game.enemy.hp = Math.max(0, game.enemy.hp - 12);
      game.enemy.burn = Math.max(game.enemy.burn, 2);
      game.enemyFlashUntil = Date.now() + 300;
      game.shakeUntil = Date.now() + 260;
      game.shakeAmount = 4;
      addFloat("−" + actualDamage, 389, 69, "#ffab67", 16);
      spawnBurst(465, 79, "#ff9b50", 17);
      addLog("Фаербол: 12 урона, ожог на 2 хода.");
    } else if (spell.action === "heal") {
      const before = game.player.hp;
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 15);
      const gained = game.player.hp - before;
      game.playerFlashUntil = Date.now() + 350;
      addFloat("+" + gained + " HP", 87, 67, "#a4eca7", 15);
      spawnBurst(40, 79, "#8fe5a0", 12);
      addLog("Лечение: здоровье +" + (game.player.hp - before) + ".");
    } else if (spell.action === "shield") {
      game.player.armor += 10;
      addFloat("+10 БРОНИ", 110, 95, "#9de7f1", 13);
      spawnBurst(44, 93, "#8ddfec", 9);
      addLog("Каменный щит: броня +10.");
    }

    render();
    await delay(220);
    await finishPlayerAction(false);
  }

  async function usePotion() {
    if (game.phase !== "player" || game.player.potions <= 0 || game.player.hp >= game.player.maxHp) return;
    game.phase = "resolving";
    game.player.potions -= 1;
    const before = game.player.hp;
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + 25);
    game.moves += 1;
    addFloat("+" + (game.player.hp - before) + " HP", 87, 67, "#9fe3a1", 14);
    spawnBurst(40, 79, "#86d78f", 11);
    addLog("Зелье: здоровье +" + (game.player.hp - before) + ".");
    render();
    await delay(180);
    await finishPlayerAction(false);
  }

  function showHint() {
    if (game.phase !== "player") return;
    const move = findPossibleMove();
    if (!move) {
      makePlayableBoard();
      addLog("Поле перемешано бесплатно.");
      render();
      return;
    }
    game.hint = { cells: move, expires: Date.now() + 1600 };
    addLog("Подсказка отмечена на поле.");
    render();
    window.setTimeout(function () {
      if (game && game.hint && game.hint.expires <= Date.now()) {
        game.hint = null;
        render();
      }
    }, 1650);
  }

  function adjacent(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  function handleBoardClick(x, y) {
    const cell = { x: Math.floor(x / CELL), y: Math.floor((y - BOARD_TOP) / CELL) };
    if (cell.x < 0 || cell.x >= SIZE || cell.y < 0 || cell.y >= SIZE) return;
    if (!game.selected) {
      game.selected = cell;
      render();
      return;
    }
    if (game.selected.x === cell.x && game.selected.y === cell.y) {
      game.selected = null;
      render();
      return;
    }
    if (!adjacent(game.selected, cell)) {
      game.selected = cell;
      render();
      return;
    }
    const first = game.selected;
    game.selected = null;
    resolvePlayerSwap(first, cell).catch(function (error) {
      console.error(error);
      game.phase = "player";
      addLog("Не удалось завершить ход.");
      render();
    });
  }

  function isInside(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function handlePointer(event) {
    event.preventDefault();
    const bounds = canvas.getBoundingClientRect();
    const point = {
      x: (event.clientX - bounds.left) * WIDTH / bounds.width,
      y: (event.clientY - bounds.top) * viewHeight / bounds.height
    };

    if (game.phase === "won" || game.phase === "lost") {
      const cardTop = (viewHeight - 216) / 2;
      if (point.x >= 100 && point.x <= 412 && point.y >= cardTop + 132 && point.y <= cardTop + 200) resetDemo();
      return;
    }
    if (game.phase !== "player") return;

    if (!game.railMode) {
      for (let i = 0; i < SPELL_BUTTONS.length; i += 1) {
        if (isInside(point, SPELL_BUTTONS[i])) {
          castSpell(SPELLS[i]).catch(console.error);
          return;
        }
      }
    }
    if (!game.railMode) {
      if (isInside(point, ITEM_BUTTONS[0])) {
        usePotion().catch(console.error);
        return;
      }
      if (isInside(point, ITEM_BUTTONS[1])) {
        showHint();
        return;
      }
      if (isInside(point, ITEM_BUTTONS[2])) {
        resetDemo();
        return;
      }
    }
    if (point.y >= BOARD_TOP && point.y < BOARD_TOP + SIZE * CELL) handleBoardClick(point.x, point.y);
  }

  function handlePointerMove(event) {
    if (!game || game.phase !== "player") return;
    const bounds = canvas.getBoundingClientRect();
    const point = {
      x: (event.clientX - bounds.left) * WIDTH / bounds.width,
      y: (event.clientY - bounds.top) * viewHeight / bounds.height
    };
    let hovered = "";
    if (!game.railMode) {
      SPELL_BUTTONS.forEach(function (rect, index) {
        if (isInside(point, rect) && canCast(SPELLS[index])) hovered = "spell-" + SPELLS[index].action;
      });
    }
    if (!game.railMode) {
      if (isInside(point, ITEM_BUTTONS[0]) && game.player.potions > 0 && game.player.hp < game.player.maxHp) hovered = "potion";
      if (isInside(point, ITEM_BUTTONS[1])) hovered = "hint";
      if (isInside(point, ITEM_BUTTONS[2])) hovered = "restart";
    }
    game.hovered = hovered;
  }

  canvas.addEventListener("pointerdown", handlePointer);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerleave", function () { if (game) game.hovered = ""; });
  window.addEventListener("resize", resizeCanvas);
  canvas.addEventListener("contextmenu", function (event) { event.preventDefault(); });
  rail.addEventListener("click", function (event) {
    if (!game.railMode) return;
    const spellButton = event.target.closest("[data-spell-action]");
    if (spellButton) {
      const spell = SPELLS.find(function (item) { return item.action === spellButton.dataset.spellAction; });
      if (spell) castSpell(spell).catch(console.error);
      return;
    }
    const itemButton = event.target.closest("[data-item-action]");
    if (!itemButton) return;
    if (itemButton.dataset.itemAction === "potion") usePotion().catch(console.error);
    else if (itemButton.dataset.itemAction === "hint") showHint();
    else if (itemButton.dataset.itemAction === "restart") resetDemo();
  });

  resetDemo();
  resizeCanvas();
  if (!animationStarted && typeof window.requestAnimationFrame === "function") {
    animationStarted = true;
    window.requestAnimationFrame(animationFrame);
  }
  DungeonSprites.preload(ASSET_IDS).then(function (loaded) {
    ASSET_IDS.forEach(function (id, index) { images[id] = loaded[index]; });
    render();
  }).catch(function (error) {
    console.error(error);
    addLog("Часть спрайтов не загрузилась; ходы всё равно доступны.");
    render();
  });
})();
