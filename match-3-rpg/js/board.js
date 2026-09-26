// board.js — модель поля 8x8. Ничего не знает про бой,
// возвращает только факты: [{ type, len, cells: [{r,c}] }].

export const SIZE = 8;

export const TYPES = ['sword', 'shield', 'mana', 'potion', 'gold'];

// Веса спавна (GAME_DESIGN.md §2): зелье редкое.
const WEIGHTS = { sword: 22, shield: 20, mana: 22, gold: 24, potion: 12 };
const BAG = [];
for (const t of TYPES) for (let i = 0; i < WEIGHTS[t]; i++) BAG.push(t);

export function randomTile() {
  return BAG[(Math.random() * BAG.length) | 0];
}

function wouldMatch(grid, r, c, type) {
  // проверка только влево и вверх — достаточно при построчной генерации
  const left1 = c > 0 ? grid[r][c - 1] : null;
  const left2 = c > 1 ? grid[r][c - 2] : null;
  if (left1 === type && left2 === type) return true;
  const up1 = r > 0 ? grid[r - 1][c] : null;
  const up2 = r > 1 ? grid[r - 2][c] : null;
  if (up1 === type && up2 === type) return true;
  return false;
}

export function createBoard() {
  // Генерация без стартовых троек + гарантия возможного хода.
  for (let attempt = 0; attempt < 100; attempt++) {
    const grid = [];
    for (let r = 0; r < SIZE; r++) {
      grid.push([]);
      for (let c = 0; c < SIZE; c++) {
        let t;
        do { t = randomTile(); } while (wouldMatch(grid, r, c, t));
        grid[r].push(t);
      }
    }
    if (findMatches(grid).length === 0 && hasPossibleMove(grid)) return grid;
  }
  throw new Error('createBoard: не удалось сгенерировать поле');
}

export function isAdjacent(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function swapCells(grid, a, b) {
  const t = grid[a.r][a.c];
  grid[a.r][a.c] = grid[b.r][b.c];
  grid[b.r][b.c] = t;
}

/** Поиск всех серий длины ≥3 по строкам и столбцам. */
export function findMatches(grid) {
  const groups = [];
  // строки
  for (let r = 0; r < SIZE; r++) {
    let c = 0;
    while (c < SIZE) {
      const type = grid[r][c];
      if (type == null) { c++; continue; }
      let len = 1;
      while (c + len < SIZE && grid[r][c + len] === type) len++;
      if (len >= 3) {
        const cells = [];
        for (let i = 0; i < len; i++) cells.push({ r, c: c + i });
        groups.push({ type, len, cells });
      }
      c += len;
    }
  }
  // столбцы
  for (let c = 0; c < SIZE; c++) {
    let r = 0;
    while (r < SIZE) {
      const type = grid[r][c];
      if (type == null) { r++; continue; }
      let len = 1;
      while (r + len < SIZE && grid[r + len][c] === type) len++;
      if (len >= 3) {
        const cells = [];
        for (let i = 0; i < len; i++) cells.push({ r: r + i, c });
        groups.push({ type, len, cells });
      }
      r += len;
    }
  }
  return groups;
}

/** Есть ли хоть один свап, дающий матч. Перебор 8x8 дёшев. */
export function hasPossibleMove(grid) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const a = { r, c };
      const neighbours = [
        { r, c: c + 1 },
        { r: r + 1, c },
      ];
      for (const b of neighbours) {
        if (b.r >= SIZE || b.c >= SIZE) continue;
        swapCells(grid, a, b);
        const hit = findMatches(grid).length > 0;
        swapCells(grid, a, b); // откат
        if (hit) return true;
      }
    }
  }
  return false;
}

/**
 * Убирает matched-клетки, роняет верхние, досыпает новые сверху.
 * Возвращает Map "r,c" → сдвиг в клетках (для анимации падения).
 * Новые фишки получают отрицательный сдвиг (падают сверху).
 */
export function collapse(grid, matchedKeys) {
  const moves = new Map();
  for (let c = 0; c < SIZE; c++) {
    const kept = []; // {type, fromR}
    for (let r = SIZE - 1; r >= 0; r--) {
      if (!matchedKeys.has(r + ',' + c)) kept.push({ type: grid[r][c], fromR: r });
    }
    const missing = SIZE - kept.length;
    let r = SIZE - 1;
    for (let k = 0; k < kept.length; k++, r--) {
      grid[r][c] = kept[k].type;
      const dy = r - kept[k].fromR;
      if (dy > 0) moves.set(r + ',' + c, dy);
    }
    for (let s = 0; s < missing; s++, r--) {
      grid[r][c] = randomTile();
      moves.set(r + ',' + c, r + 1 + s); // летит из-за верхнего края
    }
  }
  return moves;
}

/** Первая найденная пара для свапа с матчем (кнопка-подсказка). */
export function findHintMove(grid) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const a = { r, c };
      for (const d of [{ r, c: c + 1 }, { r: r + 1, c }]) {
        if (d.r >= SIZE || d.c >= SIZE) continue;
        swapCells(grid, a, d);
        const hit = findMatches(grid).length > 0;
        swapCells(grid, a, d);
        if (hit) return { a, b: d };
      }
    }
  }
  return null;
}

export function matchKeys(matches) {
  const set = new Set();
  for (const m of matches) for (const cell of m.cells) set.add(cell.r + ',' + cell.c);
  return set;
}
