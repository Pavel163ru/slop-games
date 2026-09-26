/* Логика поля match-3. Не зависит от Canvas и DOM. */
(function (global) {
  "use strict";

  const SIZE = 8;
  const TYPES = ["sword", "shield", "mana", "gold", "potion"];
  const WEIGHTS = { sword: 22, shield: 20, mana: 22, gold: 24, potion: 12 };

  function randomType() {
    const roll = Math.random() * 100;
    let total = 0;
    for (let i = 0; i < TYPES.length; i += 1) {
      total += WEIGHTS[TYPES[i]];
      if (roll < total) return TYPES[i];
    }
    return "gold";
  }

  function swap(board, a, b) {
    const value = board[a.y][a.x];
    board[a.y][a.x] = board[b.y][b.x];
    board[b.y][b.x] = value;
  }

  function collectRuns(board, horizontal) {
    const groups = [];
    for (let line = 0; line < SIZE; line += 1) {
      let offset = 0;
      while (offset < SIZE) {
        const x = horizontal ? offset : line;
        const y = horizontal ? line : offset;
        const type = board[y][x];
        if (!type) { offset += 1; continue; }
        let end = offset + 1;
        while (end < SIZE) {
          const nextX = horizontal ? end : line;
          const nextY = horizontal ? line : end;
          if (board[nextY][nextX] !== type) break;
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

  function findMatches(board) {
    return collectRuns(board, true).concat(collectRuns(board, false));
  }

  function findPossibleMove(board) {
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const a = { x: x, y: y };
        const candidates = [];
        if (x + 1 < SIZE) candidates.push({ x: x + 1, y: y });
        if (y + 1 < SIZE) candidates.push({ x: x, y: y + 1 });
        for (let i = 0; i < candidates.length; i += 1) {
          swap(board, a, candidates[i]);
          const valid = findMatches(board).length > 0;
          swap(board, a, candidates[i]);
          if (valid) return [a, candidates[i]];
        }
      }
    }
    return null;
  }

  function hasPossibleMove(board) {
    return Boolean(findPossibleMove(board));
  }

  function createPlayableBoard() {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const board = Array.from({ length: SIZE }, function () { return Array(SIZE).fill(null); });
      for (let y = 0; y < SIZE; y += 1) {
        for (let x = 0; x < SIZE; x += 1) {
          let allowed = TYPES.filter(function (type) {
            return !(x >= 2 && board[y][x - 1] === type && board[y][x - 2] === type)
              && !(y >= 2 && board[y - 1][x] === type && board[y - 2][x] === type);
          });
          if (allowed.length === 0) allowed = TYPES;
          let roll = Math.random() * allowed.reduce(function (sum, type) { return sum + WEIGHTS[type]; }, 0);
          board[y][x] = allowed[allowed.length - 1];
          for (let i = 0; i < allowed.length; i += 1) {
            roll -= WEIGHTS[allowed[i]];
            if (roll < 0) { board[y][x] = allowed[i]; break; }
          }
        }
      }
      if (findMatches(board).length === 0 && hasPossibleMove(board)) return board;
    }
    return Array.from({ length: SIZE }, function () { return Array.from({ length: SIZE }, randomType); });
  }

  function collapse(board) {
    const drops = [];
    for (let x = 0; x < SIZE; x += 1) {
      const survivors = [];
      for (let y = SIZE - 1; y >= 0; y -= 1) {
        if (board[y][x]) survivors.push({ type: board[y][x], fromY: y });
      }
      let index = 0;
      let spawnIndex = 0;
      for (let y = SIZE - 1; y >= 0; y -= 1) {
        if (index < survivors.length) {
          const survivor = survivors[index++];
          board[y][x] = survivor.type;
          if (survivor.fromY !== y) drops.push({ x: x, fromY: survivor.fromY, toY: y, type: survivor.type });
        } else {
          const type = randomType();
          board[y][x] = type;
          drops.push({ x: x, fromY: -1 - spawnIndex * 0.7, toY: y, type: type });
          spawnIndex += 1;
        }
      }
    }
    return drops;
  }

  global.DungeonBoard = Object.freeze({
    size: SIZE,
    types: Object.freeze(TYPES.slice()),
    create: createPlayableBoard,
    swap: swap,
    findMatches: findMatches,
    findPossibleMove: findPossibleMove,
    hasPossibleMove: hasPossibleMove,
    collapse: collapse
  });
})(window);
