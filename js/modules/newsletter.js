import { supabase } from "../supabase.js";
import { STORAGE_KEYS } from "../config.js";
import { $ } from "./dom.js";
import { isValidEmail } from "./security.js";
import { load, save } from "./storage.js";

export function initNewsletter() {
  const form = $("#newsletterForm"), msg = $("#newsletterMessage"), input = $("#newsletterEmail");
  const say = (t, err) => { msg.textContent = t; msg.classList.toggle("is-error", !!err); };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.elements.website.value) return say("Obrigada! Cadastro realizado.");           // honeypot: bots caem aqui
    const email = input.value.trim().toLowerCase();
    if (!isValidEmail(email)) { input.setAttribute("aria-invalid", "true"); return say("Informe um e-mail válido.", true); }
    input.removeAttribute("aria-invalid");
    if (Date.now() - load(STORAGE_KEYS.newsletterAt, 0) < 30000) return say("Aguarde alguns segundos antes de tentar novamente.", true);
    save(STORAGE_KEYS.newsletterAt, Date.now());
    say("Enviando…");
    const { error } = await supabase.from("newsletter_subscribers").insert({ email });
    // 23505 = e-mail já cadastrado: responde igual para não revelar quem já está na lista
    if (error && error.code !== "23505") return say("Não foi possível cadastrar agora. Tente novamente.", true);
    input.value = ""; say("Obrigada! Cadastro realizado.");
  });
}
