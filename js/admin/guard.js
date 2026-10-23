/* Guarda das páginas administrativas. O navegador só ESCONDE a interface: quem protege os dados é o RLS
   (is_lombelle_admin() em cada policy). Mesmo que alguém burle este arquivo, o Supabase recusa a escrita. */
import { initAuth, onAuth, signOut } from "../modules/auth.js";

export async function requireAdmin() {
  document.body.classList.add("is-checking");
  const gate = document.getElementById("gate");
  const page = location.pathname.split("/").pop() || "admin.html";
  const { user, isAdmin } = await initAuth();
  if (!user) { location.replace(`login.html?next=${encodeURIComponent(page)}`); return new Promise(() => {}); }
  if (!isAdmin) {
    gate.replaceChildren(document.createTextNode("Esta conta não tem acesso administrativo. "), Object.assign(document.createElement("a"), { href: "index.html", textContent: "Voltar à loja" }));
    return new Promise(() => {});
  }
  gate.hidden = true;
  document.body.classList.remove("is-checking");
  onAuth(({ user: u }) => { if (!u) location.replace("login.html"); });
  document.getElementById("logoutBtn")?.addEventListener("click", async () => { await signOut(); location.replace("login.html"); });
  return user;
}
