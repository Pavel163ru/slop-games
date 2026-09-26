/* Локальный реестр спрайтов. Обычный script без модулей и сетевых запросов. */
(function (global) {
  "use strict";

  const sprites = [
    { id: "token-sword", name: "Меч", category: "Фишки", file: "token-sword.svg", description: "Матч наносит урон врагу.", tags: "меч урон атака" },
    { id: "token-shield", name: "Щит", category: "Фишки", file: "token-shield.svg", description: "Матч добавляет броню.", tags: "щит броня защита" },
    { id: "token-mana", name: "Мана", category: "Фишки", file: "token-mana.svg", description: "Матч пополняет ману.", tags: "мана магия ресурс" },
    { id: "token-potion", name: "Зелье", category: "Фишки", file: "token-potion.svg", description: "Матч восстанавливает здоровье.", tags: "зелье лечение здоровье hp" },
    { id: "token-gold", name: "Золото", category: "Фишки", file: "token-gold.svg", description: "Матч приносит золото.", tags: "золото монета награда" },

    { id: "hero", name: "Герой", category: "Персонажи", file: "hero.svg", description: "Путник подземелья с мечом.", tags: "игрок герой персонаж" },
    { id: "enemy-rat", name: "Крыса", category: "Враги", file: "enemy-rat.svg", description: "Первый противник подземелья.", tags: "враг крыса ряд 1" },
    { id: "enemy-bat", name: "Летучая мышь", category: "Враги", file: "enemy-bat.svg", description: "Летающий обитатель подземелья.", tags: "враг мышь летучая ряд 2" },
    { id: "enemy-skeleton-warrior", name: "Скелет-воин", category: "Враги", file: "enemy-skeleton-warrior.svg", description: "Вооружённый костяной страж.", tags: "враг скелет воин ряд 3" },
    { id: "enemy-skeleton-archer", name: "Скелет-лучник", category: "Враги", file: "enemy-skeleton-archer.svg", description: "Лучник, пробивающий часть брони.", tags: "враг скелет лучник ряд 4" },
    { id: "enemy-slime", name: "Слайм", category: "Враги", file: "enemy-slime.svg", description: "Слизь, которая периодически восстанавливается.", tags: "враг слайм слизь ряд 6" },
    { id: "enemy-cultist", name: "Культист", category: "Враги", file: "enemy-cultist.svg", description: "Служитель тёмного культа.", tags: "враг культист маг ряд 6" },
    { id: "enemy-dark-knight", name: "Тёмный рыцарь", category: "Враги", file: "enemy-dark-knight.svg", description: "Тяжёлый противник в доспехах.", tags: "враг рыцарь броня ряд 7" },
    { id: "enemy-necromancer", name: "Некромант", category: "Враги", file: "enemy-necromancer.svg", description: "Маг, призывающий прислужников.", tags: "враг некромант маг ряд 8" },
    { id: "enemy-dungeon-guardian", name: "Страж подземелья", category: "Враги", file: "enemy-dungeon-guardian.svg", description: "Каменный хранитель нижних рядов.", tags: "враг страж голем ряд 9" },
    { id: "enemy-lich", name: "Лич", category: "Враги", file: "enemy-lich.svg", description: "Финальный босс подземелья.", tags: "враг лич босс ряд 10" },

    { id: "item-bomb", name: "Бомба", category: "Предметы", file: "item-bomb.svg", description: "Расходник для прямого урона.", tags: "бомба расходник взрыв" },
    { id: "item-shuffle", name: "Перемешка", category: "Предметы", file: "item-shuffle.svg", description: "Бесплатно создаёт новое поле.", tags: "перемешка поле shuffle" },
    { id: "item-chest", name: "Сундук", category: "Предметы", file: "item-chest.svg", description: "Сокровищница подземелья.", tags: "сундук сокровище золото" },

    { id: "spell-fireball", name: "Фаербол", category: "Заклинания", file: "spell-fireball.svg", description: "Огненный шар и ожог.", tags: "фаербол огонь ожог заклинание" },
    { id: "spell-heal", name: "Лечение", category: "Заклинания", file: "spell-heal.svg", description: "Восстанавливает здоровье героя.", tags: "лечение здоровье сердце заклинание" },
    { id: "spell-stone-shield", name: "Каменный щит", category: "Заклинания", file: "spell-stone-shield.svg", description: "Создаёт дополнительную броню.", tags: "каменный щит броня заклинание" },
    { id: "spell-stone-skin", name: "Каменная кожа", category: "Заклинания", file: "spell-stone-skin.svg", description: "Укрепляет героя и ослабляет врага.", tags: "каменная кожа броня слабость заклинание" },
    { id: "spell-lightning", name: "Молния", category: "Заклинания", file: "spell-lightning.svg", description: "Мгновенный электрический удар.", tags: "молния урон заклинание" },
    { id: "spell-vampirism", name: "Вампиризм", category: "Заклинания", file: "spell-vampirism.svg", description: "Наносит урон и лечит героя.", tags: "вампиризм урон лечение заклинание" },
    { id: "spell-berserk", name: "Берсерк", category: "Заклинания", file: "spell-berserk.svg", description: "Усиливает урон мечей.", tags: "берсерк ярость мечи заклинание" },
    { id: "spell-chain-lightning", name: "Цепная молния", category: "Заклинания", file: "spell-chain-lightning.svg", description: "Молния перескакивает между целями.", tags: "цепная молния заклинание" }
  ].map(function (sprite) {
    return Object.freeze({
      id: sprite.id,
      name: sprite.name,
      category: sprite.category,
      file: sprite.file,
      src: "assets/sprites/" + sprite.file,
      width: 128,
      height: 128,
      description: sprite.description,
      tags: sprite.tags
    });
  });

  const byId = Object.create(null);
  sprites.forEach(function (sprite) { byId[sprite.id] = sprite; });

  function get(id) {
    return byId[id] || null;
  }

  function load(id) {
    const sprite = get(id);
    if (!sprite) return Promise.reject(new Error("Неизвестный спрайт: " + id));

    return new Promise(function (resolve, reject) {
      const image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(new Error("Не удалось загрузить спрайт: " + sprite.src)); };
      image.src = sprite.src;
    });
  }

  function preload(ids) {
    const list = ids ? ids.map(get).filter(Boolean) : sprites;
    return Promise.all(list.map(function (sprite) { return load(sprite.id); }));
  }

  global.DungeonSprites = Object.freeze({
    list: Object.freeze(sprites.slice()),
    get: get,
    load: load,
    preload: preload
  });
})(window);
