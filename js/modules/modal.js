/* Camadas modais (produto, quiz, sacola): foco aprisionado, inert no resto da página, retorno de foco.
   Uma camada por vez; Esc é tratado em accessibility.js chamando closeLayer(). */
import { $ } from "./dom.js";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
let current = null;

const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
const focusables = (root) => [...root.querySelectorAll(FOCUSABLE)].filter(visible);
const background = () => [...document.body.children].filter((n) => !n.matches("script, [data-layer], .overlay, .toast"));
const setInert = (on) => background().forEach((n) => { n.inert = on; });

function show(el) { if (el.classList.contains("drawer")) { el.classList.add("open"); el.inert = false; el.setAttribute("aria-hidden", "false"); } else el.hidden = false; }
function hide(el) { if (el.classList.contains("drawer")) { el.classList.remove("open"); el.inert = true; el.setAttribute("aria-hidden", "true"); } else el.hidden = true; }

export const isLayerOpen = () => !!current;

export function openLayer(el, { initialFocus } = {}) {
  const returnTo = current ? current.returnTo : document.activeElement;
  if (current) hide(current.el);
  current = { el, returnTo };
  $("#overlay").hidden = false;
  document.body.classList.add("no-scroll");
  setInert(true);
  show(el);
  const target = (initialFocus && el.querySelector(initialFocus)) || focusables(el)[0] || el;
  if (!target.hasAttribute("tabindex") && target === el) el.setAttribute("tabindex", "-1");
  requestAnimationFrame(() => target.focus({ preventScroll: true }));
}

export function closeLayer({ restore = true } = {}) {
  if (!current) return;
  const { el, returnTo } = current;
  current = null;
  hide(el);
  $("#overlay").hidden = true;
  document.body.classList.remove("no-scroll");
  setInert(false);
  if (restore && returnTo && document.contains(returnTo) && typeof returnTo.focus === "function") returnTo.focus({ preventScroll: true });
}

/* TAB / SHIFT+TAB circulam dentro da camada aberta. */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Tab" || !current) return;
  const items = focusables(current.el);
  if (!items.length) { e.preventDefault(); current.el.focus(); return; }
  const first = items[0], last = items[items.length - 1], active = document.activeElement;
  if (!current.el.contains(active)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && (active === first || active === current.el)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
});
/* Rede de segurança: se o foco escapar (ex.: clique no overlay), traz de volta. */
document.addEventListener("focusin", (e) => {
  if (current && !current.el.contains(e.target) && !e.target.closest(".toast")) focusables(current.el)[0]?.focus();
});

export function initModals() {
  $("#overlay").addEventListener("click", () => closeLayer());
  document.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeLayer(); });
  // estado inicial coerente: sacola fechada fica inerte
  const drawer = $("#cartDrawer"); if (drawer) { drawer.inert = true; }
}
