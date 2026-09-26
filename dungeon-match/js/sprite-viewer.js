(function () {
  "use strict";

  const grid = document.getElementById("sprite-grid");
  const filters = document.getElementById("category-filters");
  const search = document.getElementById("sprite-search");
  const count = document.getElementById("results-count");
  const empty = document.getElementById("empty-state");
  const sizeInput = document.getElementById("sprite-size");
  const sizeOutput = document.getElementById("sprite-size-value");
  let currentCategory = "Все";
  let query = "";

  const categories = ["Все"].concat(Array.from(new Set(DungeonSprites.list.map(function (sprite) {
    return sprite.category;
  }))));

  function makeFilter(label) {
    const button = document.createElement("button");
    button.className = "filter-button" + (label === currentCategory ? " is-active" : "");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-pressed", label === currentCategory ? "true" : "false");
    button.addEventListener("click", function () {
      currentCategory = label;
      filters.querySelectorAll("button").forEach(function (item) {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", active ? "true" : "false");
      });
      render();
    });
    return button;
  }

  function makeCard(sprite) {
    const card = document.createElement("article");
    card.className = "sprite-card";

    const preview = document.createElement("div");
    preview.className = "sprite-preview";
    const image = document.createElement("img");
    image.src = sprite.src;
    image.alt = sprite.name;
    image.width = sprite.width;
    image.height = sprite.height;
    image.loading = "lazy";
    image.addEventListener("error", function () {
      preview.classList.add("is-missing");
      image.hidden = true;
    }, { once: true });
    preview.appendChild(image);

    const info = document.createElement("div");
    info.className = "sprite-info";
    const heading = document.createElement("div");
    heading.className = "sprite-name-row";
    const name = document.createElement("h2");
    name.className = "sprite-name";
    name.textContent = sprite.name;
    const category = document.createElement("span");
    category.className = "sprite-category";
    category.textContent = sprite.category;
    heading.append(name, category);

    const description = document.createElement("p");
    description.className = "sprite-description";
    description.textContent = sprite.description;
    const id = document.createElement("code");
    id.className = "sprite-id";
    id.textContent = sprite.id;
    info.append(heading, description, id);
    card.append(preview, info);
    return card;
  }

  function render() {
    const visible = DungeonSprites.list.filter(function (sprite) {
      const inCategory = currentCategory === "Все" || sprite.category === currentCategory;
      const searchable = (sprite.name + " " + sprite.id + " " + sprite.description + " " + sprite.tags).toLocaleLowerCase("ru");
      return inCategory && searchable.includes(query);
    });

    grid.replaceChildren.apply(grid, visible.map(makeCard));
    count.textContent = "Показано " + visible.length + " из " + DungeonSprites.list.length + " спрайтов";
    empty.hidden = visible.length !== 0;
    grid.hidden = visible.length === 0;
  }

  categories.forEach(function (category) { filters.appendChild(makeFilter(category)); });
  search.addEventListener("input", function () { query = search.value.trim().toLocaleLowerCase("ru"); render(); });

  sizeInput.addEventListener("input", function () {
    document.documentElement.style.setProperty("--sprite-size", sizeInput.value + "px");
    sizeOutput.value = sizeInput.value + "px";
    sizeOutput.textContent = sizeInput.value + "px";
  });

  document.querySelectorAll("[data-background-choice]").forEach(function (button) {
    button.addEventListener("click", function () {
      const background = button.dataset.backgroundChoice;
      document.body.dataset.background = background;
      document.querySelectorAll("[data-background-choice]").forEach(function (item) {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", active ? "true" : "false");
      });
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "/" && document.activeElement !== search && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      search.focus();
    }
    if (event.key === "Escape" && document.activeElement === search) {
      search.value = "";
      query = "";
      render();
      search.blur();
    }
  });

  render();
})();
