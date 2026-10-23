/* Acessibilidade global: skip link, Esc universal, anúncios. */
import { closeLayer, isLayerOpen } from "./modal.js";
import { $ } from "./dom.js";

const closers = [];   // { isOpen, close } — menu mobile, menu do usuário, busca…
export const registerEscape = (isOpen, close) => closers.push({ isOpen, close });

export function initAccessibility() {
  // Skip link: move o foco de verdade para o <main> (âncoras sozinhas não movem o foco em todos os navegadores)
  $(".skip-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    const main = $("#conteudo");
    main.focus({ preventScroll: true });
    main.scrollIntoView();
  });

  // Esc: fecha primeiro a camada modal; depois, o que estiver aberto no cabeçalho
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    if (isLayerOpen()) { e.preventDefault(); closeLayer(); return; }
    const open = closers.find((c) => c.isOpen());
    if (open) { e.preventDefault(); open.close(); }
  });
}
