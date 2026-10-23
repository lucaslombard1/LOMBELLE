/* Busca: o índice é construído UMA vez por versão do catálogo (sem toLowerCase por renderização). */
import { catalog, onCatalog } from "../catalog.js";
import { $, h, money } from "./dom.js";

export const normalize = (v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

let searchIndex = new Map();   // id → texto normalizado
onCatalog(() => {
  searchIndex = new Map(catalog.products.map((p) =>
    [p.id, normalize(`${p.name} ${p.category} ${p.type} ${p.notes} ${p.family} ${p.tag}`)]));
});

export function matchesQuery(id, query) {
  if (!query) return true;
  const text = searchIndex.get(id) || "";
  return query.split(" ").every((t) => text.includes(t));
}
export const searchProducts = (query, limit = 8) =>
  catalog.products.filter((p) => matchesQuery(p.id, query)).slice(0, limit);

/* Combobox acessível (ARIA 1.2): setas, Enter, Esc. */
export function initSearch({ onQuery, onPick }) {
  const input = $("#searchInput"), list = $("#searchResults"), clear = $("#searchClear");
  let active = -1, items = [], timer;
  const close = () => { list.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); active = -1; };
  const setActive = (i) => {
    active = i;
    [...list.children].forEach((li, n) => li.setAttribute("aria-selected", String(n === i)));
    if (i >= 0) { input.setAttribute("aria-activedescendant", list.children[i].id); list.children[i].scrollIntoView({ block: "nearest" }); }
    else input.removeAttribute("aria-activedescendant");
  };
  function render() {
    const q = normalize(input.value);
    onQuery(q);
    list.replaceChildren();
    if (!q) return close();
    items = searchProducts(q);
    if (!items.length) list.append(h("li", { class: "search-empty", role: "presentation" }, "Nenhum perfume encontrado. Tente o nome ou uma nota olfativa."));
    items.forEach((p, i) => list.append(h("li", { id: `sr-${p.id}`, class: "search-result", role: "option", "aria-selected": "false",
      onClick: () => { close(); onPick(p.id); } },
      p.image ? h("img", { src: p.image, alt: "", loading: "lazy", width: 48, height: 58 }) : null,
      h("div", {}, h("strong", {}, p.name), h("span", {}, `${p.category} · ${money(p.price)}`)))));
    list.hidden = false; input.setAttribute("aria-expanded", "true");
  }
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(render, 120); });
  input.addEventListener("keydown", (e) => {
    if (list.hidden || !items.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((active + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((active - 1 + items.length) % items.length); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); const id = items[active].id; close(); onPick(id); }
  });
  clear.addEventListener("click", () => { input.value = ""; render(); input.focus(); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".search-line")) close(); });
  return { close, isOpen: () => !list.hidden };
}
