import { $, h, money } from "../modules/dom.js";
import { initAuth, signOut } from "../modules/auth.js";
import { cleanText } from "../modules/security.js";
import { status, setBusy, fieldError } from "../modules/auth-ui.js";
import { supabase } from "../supabase.js";

const { user } = await initAuth();
if (!user) location.replace("login.html?next=conta.html");
else {
  $("#who").textContent = user.email;
  $("#logoutBtn").addEventListener("click", async () => { await signOut(); location.replace("index.html"); });

  const { data: p } = await supabase.from("profiles").select("full_name,newsletter").eq("id", user.id).maybeSingle();
  $("#name").value = p?.full_name || ""; $("#newsletter").checked = !!p?.newsletter;

  $("#profileForm").addEventListener("submit", async (e) => {
    e.preventDefault(); status("", ""); fieldError($("#name"), "");
    const name = cleanText($("#name").value, 100);
    if (name.length < 2) { fieldError($("#name"), "Informe seu nome."); return $("#name").focus(); }
    setBusy($("#submitBtn"), true, "Salvando...", "SALVAR PERFIL");
    const { error } = await supabase.from("profiles").update({ full_name: name, newsletter: $("#newsletter").checked }).eq("id", user.id);
    setBusy($("#submitBtn"), false, "", "SALVAR PERFIL");
    status(error ? "error" : "success", error ? "Não foi possível salvar agora." : "Perfil atualizado.");
  });

  const { data: orders } = await supabase.from("orders").select("id,status,total,created_at").order("created_at", { ascending: false }).limit(20);
  const LABEL = { pending: "Aguardando pagamento", paid: "Pago", shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado" };
  $("#orders").replaceChildren(...(orders?.length ? orders.map((o) => h("li", {},
    h("span", {}, `${new Date(o.created_at).toLocaleDateString("pt-BR")} · ${LABEL[o.status] || o.status}`), h("strong", {}, money(o.total))))
    : [h("li", {}, "Você ainda não fez nenhum pedido.")]));
}
