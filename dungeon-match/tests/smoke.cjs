const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const root = require("node:path").join(__dirname, "..");
const storage = new Map();
const spriteDir = require("node:path").join(root, "assets", "sprites");
const svgFiles = fs.readdirSync(spriteDir).filter(function (name) { return name.endsWith(".svg"); });
assert.equal(svgFiles.length, 27, "the local sprite catalog should contain 27 SVGs");
svgFiles.forEach(function (name) {
  const svg = fs.readFileSync(require("node:path").join(spriteDir, name), "utf8");
  assert.match(svg, /viewBox="0 0 128 128"/, name + " should use the shared sprite viewBox");
});
const gameSource = fs.readFileSync(require("node:path").join(root, "js/game.js"), "utf8");
const assetList = gameSource.match(/const ASSET_IDS = \[(.*?)\];/s);
assert.ok(assetList, "the full game should declare its sprite dependencies");
const assetIds = Array.from(assetList[1].matchAll(/"([^"]+)"/g), function (match) { return match[1]; });
assetIds.forEach(function (id) { assert.ok(fs.existsSync(require("node:path").join(spriteDir, id + ".svg")), "missing game sprite: " + id); });
[
  "index.html", "demo.html", "sprite-viewer.html"
].forEach(function (page) {
  const html = fs.readFileSync(require("node:path").join(root, page), "utf8");
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const ref = match[1].split("#")[0];
    if (/^(?:https?:|mailto:|#)/.test(ref)) continue;
    assert.ok(fs.existsSync(require("node:path").join(root, ref)), page + " has a broken local reference: " + ref);
  }
});

function makeElement(id) {
  const listeners = Object.create(null);
  const element = {
    id: id,
    style: {},
    dataset: {},
    children: [],
    disabled: false,
    textContent: "",
    title: "",
    listeners: listeners,
    appendChild: function (child) { this.children.push(child); return child; },
    setAttribute: function () {},
    addEventListener: function (name, callback) { listeners[name] = callback; },
    querySelectorAll: function (selector) {
      const key = selector.indexOf("spell-action") >= 0 ? "spellAction" : "itemAction";
      return this.children.filter(function (child) { return child.dataset[key] !== undefined; });
    },
    getBoundingClientRect: function () {
      const width = Number.parseFloat(frame.style.width) || 512;
      const height = Number.parseFloat(frame.style.height) || 940;
      return { left: 0, top: 0, width: width, height: height };
    },
    classList: { toggle: function () {} }
  };
  return element;
}

const gradient = { addColorStop: function () {} };
const context2d = new Proxy({}, {
  get: function (target, key) {
    if (key === "createLinearGradient") return function () { return gradient; };
    if (key === "measureText") return function (value) { return { width: String(value).length * 5 }; };
    if (key in target) return target[key];
    return function () {};
  },
  set: function (target, key, value) { target[key] = value; return true; }
});

const elements = Object.create(null);
let frame;
[
  "game-canvas", "game-frame", "game-layout", "spell-rail", "rail-spells", "rail-potions",
  "rail-bombs", "rail-shuffles", "rail-mana", "mute-button"
].forEach(function (id) { elements[id] = makeElement(id); });
frame = elements["game-frame"];
const canvas = elements["game-canvas"];
canvas.getContext = function () { return context2d; };
canvas.getBoundingClientRect = function () { return frame.getBoundingClientRect(); };
elements["game-layout"].getBoundingClientRect = function () { return { left: 0, top: 0, width: 900, height: 900 }; };
elements["game-layout"].clientWidth = 900;
elements["game-layout"].clientHeight = 900;
elements["spell-rail"].querySelectorAll = function (selector) {
  const action = selector.indexOf("spell-action") >= 0 ? "spellAction" : "itemAction";
  const list = elements["spell-rail"].children;
  return list.filter(function (child) { return child.dataset[action] !== undefined; });
};
elements["spell-rail"].children = ["potion", "bomb", "shuffle", "hint"].map(function (action) {
  const button = makeElement("rail-" + action);
  button.dataset.itemAction = action;
  return button;
});
elements["rail" ] = elements["spell-rail"];

const windowObject = {
  devicePixelRatio: 1,
  location: {},
  confirm: function () { return true; },
  addEventListener: function () {},
  getComputedStyle: function () { return { columnGap: "10px" }; },
  requestAnimationFrame: function () { return 0; },
  setTimeout: function (callback) { queueMicrotask(callback); return 1; }
};
class FakeImage {
  set src(value) { this._src = value; queueMicrotask(() => { if (this.onload) this.onload(); }); }
  get src() { return this._src; }
}
const documentObject = {
  getElementById: function (id) { return elements[id]; },
  createElement: function () { return makeElement("created"); }
};
const localStorage = {
  getItem: function (key) { return storage.has(key) ? storage.get(key) : null; },
  setItem: function (key, value) { storage.set(key, String(value)); },
  removeItem: function (key) { storage.delete(key); }
};
const sandbox = { window: windowObject, document: documentObject, Image: FakeImage, localStorage: localStorage, console: console };
vm.createContext(sandbox);
[
  "js/sprites.js",
  "js/board.js",
  "js/game.js"
].forEach(function (file) { vm.runInContext(fs.readFileSync(require("node:path").join(root, file), "utf8"), sandbox, { filename: file }); });

const board = windowObject.DungeonBoard;
for (let i = 0; i < 100; i += 1) {
  const generated = board.create();
  assert.equal(board.findMatches(generated).length, 0, "new boards must not contain a free match");
  const move = board.findPossibleMove(generated);
  assert.ok(move, "new boards must always have a legal move");
  board.swap(generated, move[0], move[1]);
  assert.ok(board.findMatches(generated).length > 0, "the suggested move must make a match");
}

function click(x, y, logicalHeight) {
  const bounds = canvas.getBoundingClientRect();
  elements["game-canvas"].listeners.pointerdown({
    clientX: bounds.left + x * bounds.width / 512,
    clientY: bounds.top + y * bounds.height / logicalHeight,
    preventDefault: function () {}
  });
}

click(256, 457, 940);
let saved = JSON.parse(storage.get("dungeon-match-save-v1"));
assert.equal(saved.v, 2);
assert.equal(saved.run.screen, "map", "new game opens on the dungeon map");
assert.equal(saved.run.player.hp, 50);

click(170, 694, 940);
saved = JSON.parse(storage.get("dungeon-match-save-v1"));
assert.equal(saved.run.screen, "battle", "the current map room starts a battle");
assert.equal(saved.run.enemy.name, "Крыса");
assert.equal(saved.run.board.length, 8);
assert.ok(saved.run.board.every(function (row) { return row.length === 8; }));
assert.ok(board.hasPossibleMove(saved.run.board));

(async function () {
  const move = board.findPossibleMove(saved.run.board);
  click(move[0].x * 64 + 32, 134 + move[0].y * 64 + 32, 690);
  click(move[1].x * 64 + 32, 134 + move[1].y * 64 + 32, 690);
  await new Promise(function (resolve) { setImmediate(resolve); });
  saved = JSON.parse(storage.get("dungeon-match-save-v1"));
  assert.equal(saved.run.battle.moves, 1, "a legal swap should resolve as one player move");
  assert.ok(saved.run.screen === "battle" || saved.run.screen === "battleResult");
  console.log("Smoke test passed: campaign start, battle move and autosave, 100 playable boards, SVGs, and page references.");
})().catch(function (error) { console.error(error); process.exitCode = 1; });
