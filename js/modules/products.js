/* Vitrine: filtros/ordenação, cards em cache e renderização parcial (só reordena/atualiza o que mudou). */
import { catalog, onCatalog } from "../catalog.js";
import { $, $$, h, money } from "./dom.js";
import { matchesQuery } from "./search.js";
import { isFavorite, onFavorites, toggleFavorite, favoriteCount } from "./favorites.js";
import { addToCart } from "./cart.js";
import { openLayer, closeLayer } from "./modal.js";
import { unsplashSrcset } from "./security.js";
import { toast } from "./toast.js";

export const view = { filter: "Todos", query: "", sort: "featured", favoritesOnly: false };
const collator = new Intl.Collator("pt-BR");
const SIZES = "(max-width: 1050px) 50vw, 25vw";
let cards = new Map();        // id → { el, fav }
let lastKey = "";
let lastVersion = -1;

function buildCard(p) {
  const srcset = unsplashSrcset(p.image);
  const fav = h("button", { type: "button", class: "favorite-button", "aria-pressed": "false", "aria-label": `Favoritar ${p.name}`, onClick: () => toggleFavorite(p.id) }, h("span", { "aria-hidden": "true" }, "♡"));
  const el = h("article", { class: "product-card", dataset: { id: p.id } },
    h("div", { class: "product-image-wrap" },
      h("button", { type: "button", class: "product-open", "aria-label": `Ver detalhes de ${p.name}`, onClick: (e) => openProduct(p.id, e.currentTarget) },
        h("img", { class: "product-image", src: p.image, srcset: srcset || false, sizes: srcset ? SIZES : false, alt: `Frasco de perfume ${p.name}`, width: 640, height: 810, loading: "lazy", decoding: "async" })),
      h("span", { class: "product-tag" }, p.tag),
      fav,
      h("button", { type: "button", class: "quick-add", "aria-label": `Adicionar ${p.name} à sacola`, onClick: () => addToCart(p.id) }, "ADICIONAR À SACOLA +")),
    h("div", { class: "product-info" },
      h("div", { class: "product-category" }, `${p.category} · ${p.type.split(" · ")[0]}`),
      h("h3", { class: "product-name" }, p.name),
      h("div", { class: "product-notes" }, p.notes),
      h("div", { class: "product-bottom" }, h("span", { class: "product-price" }, money(p.price)), h("span", { class: "product-size" }, p.size))));
  const entry = { el, fav };
  paintFav(p.id, entry);
  return entry;
}
function paintFav(id, entry = cards.get(id)) {
  if (!entry) return;
  const on = isFavorite(id);
  entry.fav.setAttribute("aria-pressed", String(on));
  entry.fav.firstChild.textContent = on ? "♥" : "♡";
}

function visible() {
  const list = catalog.products.filter((p) =>
    (view.filter === "Todos" || p.category === view.filter) &&
    (!view.favoritesOnly || isFavorite(p.id)) && matchesQuery(p.id, view.query));
  if (view.sort === "low") list.sort((a, b) => a.price - b.price);
  else if (view.sort === "high") list.sort((a, b) => b.price - a.price);
  else if (view.sort === "name") list.sort((a, b) => collator.compare(a.name, b.name));
  return list;
}

export function renderProducts() {
  const grid = $("#productGrid");
  if (catalog.version !== lastVersion) { cards = new Map(); lastKey = ""; lastVersion = catalog.version; }
  if (catalog.status === "loading" && !catalog.products.length) {
    grid.replaceChildren(...Array.from({ length: 4 }, () => h("div", { class: "product-skeleton", "aria-hidden": "true" })));
    grid.setAttribute("aria-busy", "true"); return;
  }
  grid.setAttribute("aria-busy", "false");
  if (catalog.status === "error" && !catalog.products.length) {
    grid.replaceChildren(h("div", { class: "catalog-error", role: "alert" }, "Não foi possível carregar a coleção agora.", h("br"),
      h("button", { type: "button", class: "button button-outline", onClick: () => location.reload() }, "TENTAR NOVAMENTE")));
    return;
  }
  const list = visible();
  const key = list.map((p) => p.id).join("|");
  if (key !== lastKey) {                                         // só toca no DOM se a lista mudou
    lastKey = key;
    grid.replaceChildren(...list.map((p) => { if (!cards.has(p.id)) cards.set(p.id, buildCard(p)); return cards.get(p.id).el; }));
  }
  $("#emptyState").hidden = list.length > 0;
  $("#showAllButton").textContent = view.favoritesOnly ? "VOLTAR À COLEÇÃO" : "VER TODA A COLEÇÃO ↗";
  $$("#filterTabs [data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === view.filter)));
  $$("#filterTabs [data-filter]").forEach((b) => b.classList.toggle("active", b.dataset.filter === view.filter));
}

function updateFavoriteBadge() {
  const n = favoriteCount();
  $("#favoriteCount").textContent = n;
  const btn = $("#favoritesToggle");
  btn.setAttribute("aria-label", `Ver favoritos, ${n} ${n === 1 ? "item" : "itens"}`);
  btn.setAttribute("aria-pressed", String(view.favoritesOnly));
}

export function openProduct(id, trigger) {
  const p = catalog.byId.get(id);
  if (!p) return;
  const srcset = unsplashSrcset(p.image, [500, 800, 1100]);
  const main = h("img", { class: "product-detail-image", src: p.image, srcset: srcset || false, sizes: "(max-width: 720px) 100vw, 410px", alt: `Frasco de ${p.name}`, width: 410, height: 520 });
  const thumbs = p.gallery.length ? [p.image, ...p.gallery].map((u, i) => h("button", { type: "button", "aria-label": `Ver foto ${i + 1} de ${p.name}`, "aria-current": String(i === 0),
    onClick: (e) => { main.removeAttribute("srcset"); main.src = u; $$(".detail-thumbs button").forEach((b) => b.setAttribute("aria-current", "false")); e.currentTarget.setAttribute("aria-current", "true"); } },
    h("img", { src: u, alt: "", width: 54, height: 66, loading: "lazy" }))) : [];
  $("#productModalContent").replaceChildren(h("div", { class: "product-detail" }, main,
    h("div", { class: "product-detail-copy" },
      h("p", { class: "eyebrow" }, `${p.category.toUpperCase()} · EAU DE PARFUM`),
      h("h2", { id: "modalTitle" }, p.name),
      h("p", {}, p.description),
      h("div", { class: "detail-notes" }, h("strong", {}, "NOTAS OLFATIVAS"), h("p", {}, p.notes), h("span", { class: "product-size" }, p.size)),
      thumbs.length ? h("div", { class: "detail-thumbs" }, thumbs) : null,
      h("div", { class: "detail-price" }, money(p.price)),
      h("button", { type: "button", class: "button button-dark full-button", onClick: () => { addToCart(p.id); closeLayer(); } }, "ADICIONAR À SACOLA ", h("span", { "aria-hidden": "true" }, "↗")),
      h("p", {}, "Produto demonstrativo. Valores e disponibilidade são ilustrativos."))));
  openLayer($("#productModal"), { initialFocus: ".modal-close" });
}

export function initProducts() {
  $("#filterTabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-filter]"); if (!b) return;
    setFilter(b.dataset.filter);
  });
  $$("[data-category-link]").forEach((a) => a.addEventListener("click", () => setFilter(a.dataset.categoryLink)));
  $("#sortSelect").addEventListener("change", (e) => { view.sort = e.target.value; renderProducts(); });
  $("#favoritesToggle").addEventListener("click", () => {
    view.favoritesOnly = !view.favoritesOnly; view.filter = "Todos";
    $("#colecao").scrollIntoView({ behavior: "smooth" });
    renderProducts(); updateFavoriteBadge();
    toast(view.favoritesOnly ? "Exibindo seus favoritos." : "Exibindo toda a coleção.");
  });
  $("#showAllButton").addEventListener("click", () => {
    Object.assign(view, { filter: "Todos", favoritesOnly: false, query: "" });
    $("#searchInput").value = ""; renderProducts(); updateFavoriteBadge();
  });
  onFavorites((id) => {
    if (id) paintFav(id);
    else cards.forEach((_, k) => paintFav(k));
    if (view.favoritesOnly && favoriteCount() === 0) view.favoritesOnly = false;
    if (view.favoritesOnly) renderProducts();
    updateFavoriteBadge();
  });
  onCatalog(() => { renderProducts(); updateFavoriteBadge(); });
  renderProducts(); updateFavoriteBadge();
}
function setFilter(f) { view.filter = f; view.favoritesOnly = false; renderProducts(); updateFavoriteBadge(); }
