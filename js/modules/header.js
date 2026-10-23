/* Cabeçalho: menu mobile, painel de busca, menu da conta (padrão disclosure). */
import { $, $$, h } from "./dom.js";
import { registerEscape } from "./accessibility.js";
import { onAuth, signOut } from "./auth.js";
import { toast } from "./toast.js";

export function initHeader({ closeSearchResults }) {
  const menuBtn = $("#menuToggle"), nav = $("#mainNav");
  const searchBtn = $("#searchToggle"), panel = $("#searchPanel");
  const userBtn = $("#userToggle"), userMenu = $("#userMenu");

  const setMenu = (open, focusBack) => { nav.classList.toggle("open", open); menuBtn.setAttribute("aria-expanded", String(open)); menuBtn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu"); if (!open && focusBack) menuBtn.focus(); };
  const setSearch = (open, focusBack) => { panel.hidden = !open; searchBtn.setAttribute("aria-expanded", String(open)); if (open) $("#searchInput").focus(); else { closeSearchResults(); if (focusBack) searchBtn.focus(); } };
  const setUser = (open, focusBack) => { userMenu.hidden = !open; userBtn.setAttribute("aria-expanded", String(open)); if (open) userMenu.querySelector("a,button")?.focus(); else if (focusBack) userBtn.focus(); };

  menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  searchBtn.addEventListener("click", () => setSearch(panel.hidden));
  userBtn.addEventListener("click", (e) => { e.stopPropagation(); setUser(userMenu.hidden); });
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".user-wrap")) setUser(false); });
  userMenu.addEventListener("focusout", (e) => { if (!userMenu.contains(e.relatedTarget) && e.relatedTarget !== userBtn) setUser(false); });

  registerEscape(() => !userMenu.hidden, () => setUser(false, true));
  registerEscape(() => nav.classList.contains("open"), () => setMenu(false, true));
  registerEscape(() => !panel.hidden, () => setSearch(false, true));

  // Itens do menu conforme o papel do usuário
  onAuth(({ user, isAdmin }) => {
    const items = [];
    if (!user) {
      items.push(h("a", { href: "login.html", class: "user-menu-link" }, "Entrar"), h("a", { href: "cadastro.html", class: "user-menu-link" }, "Criar conta"));
    } else {
      items.push(h("a", { href: "conta.html", class: "user-menu-link" }, "Minha conta"));
      if (isAdmin) items.push(h("small", {}, "ÁREA DO LOJISTA"),
        h("a", { href: "admin.html", class: "user-menu-link" }, "Painel administrativo"),
        h("a", { href: "admin-imagens.html", class: "user-menu-link" }, "Imagens do site"));
      items.push(h("button", { type: "button", onClick: async () => { await signOut(); setUser(false); toast("Você saiu da sua conta."); } }, "Sair"));
    }
    userMenu.replaceChildren(...items);
    userBtn.setAttribute("aria-label", user ? "Minha conta" : "Entrar ou criar conta");
  });
  return { closeMenu: () => setMenu(false) };
}
