/* Sacola: estado persistido, validado contra o catálogo, renderização por DOM (sem innerHTML). */
import { catalog, onCatalog } from "../catalog.js";
import { LIMITS, SITE, STORAGE_KEYS } from "../config.js";
import { $, h, money } from "./dom.js";
import { load, save } from "./storage.js";
import { openLayer } from "./modal.js";
import { toast } from "./toast.js";

const clamp = (n) => Math.min(LIMITS.maxQty, Math.max(0, Math.floor(Number(n) || 0)));
let cart = {};
for (const [id, q] of Object.entries(load(STORAGE_KEYS.cart, {}))) if (typeof id === "string" && clamp(q) > 0) cart[id] = clamp(q);

const entries = () => Object.entries(cart).map(([id, qty]) => ({ p: catalog.byId.get(id), qty })).filter((e) => e.p);

function render() {
  const list = entries();
  const count = list.reduce((s, e) => s + e.qty, 0);
  const subtotal = list.reduce((s, e) => s + e.p.price * e.qty, 0);
  const badge = $("#cartCount");
  badge.textContent = count;
  $("#cartToggle").setAttribute("aria-label", `Abrir sacola, ${count} ${count === 1 ? "item" : "itens"}`);
  $("#drawerItemCount").textContent = `(${count})`;
  $("#cartSubtotal").textContent = money(subtotal);
  $("#cartBottom").hidden = !list.length;
  $("#cartItems").replaceChildren(...(list.length ? list.map(({ p, qty }) =>
    h("div", { class: "cart-item" },
      h("img", { src: p.image, alt: "", width: 80, height: 100, loading: "lazy" }),
      h("div", {},
        h("h3", {}, p.name),
        h("p", {}, `${p.size} · ${p.type}`),
        h("strong", {}, money(p.price)),
        h("div", { class: "quantity-control", role: "group", "aria-label": `Quantidade de ${p.name}` },
          h("button", { type: "button", "aria-label": `Diminuir quantidade de ${p.name}`, onClick: () => setQty(p.id, qty - 1) }, "−"),
          h("span", { "aria-live": "polite" }, String(qty)),
          h("button", { type: "button", "aria-label": `Aumentar quantidade de ${p.name}`, disabled: qty >= LIMITS.maxQty, onClick: () => setQty(p.id, qty + 1) }, "+")),
        h("button", { type: "button", class: "remove-item", "aria-label": `Remover ${p.name} da sacola`, onClick: () => setQty(p.id, 0) }, "Remover")),
      h("span"))) : [
    h("div", { class: "cart-empty" }, h("strong", {}, "Sua sacola está à espera."), "Encontre uma fragrância que conte sua história.", h("br"),
      h("button", { type: "button", class: "button button-outline", "data-close": "" }, "EXPLORAR A COLEÇÃO"))]));
  $(".demo-note").hidden = !SITE.demoMode;
}

function setQty(id, qty) {
  const q = clamp(qty);
  q ? (cart[id] = q) : delete cart[id];
  save(STORAGE_KEYS.cart, cart);
  render();
}
export function addToCart(id) {
  const p = catalog.byId.get(id);
  if (!p) return;
  if ((cart[id] || 0) >= LIMITS.maxQty) return toast(`Limite de ${LIMITS.maxQty} unidades por produto.`);
  setQty(id, (cart[id] || 0) + 1);
  toast(`${p.name} adicionado à sacola.`);
}
export const openCart = () => openLayer($("#cartDrawer"), { initialFocus: ".close-button" });

export function initCart() {
  $("#cartToggle").addEventListener("click", openCart);
  $("#checkoutButton").addEventListener("click", () => toast("Checkout demonstrativo: conecte um provedor de pagamento antes de vender."));
  onCatalog(() => {
    if (catalog.status === "ready") {                       // remove itens de produtos que não existem mais
      const valid = Object.fromEntries(Object.entries(cart).filter(([id]) => catalog.byId.has(id)));
      if (Object.keys(valid).length !== Object.keys(cart).length) { cart = valid; save(STORAGE_KEYS.cart, cart); }
    }
    render();
  });
  render();
}
