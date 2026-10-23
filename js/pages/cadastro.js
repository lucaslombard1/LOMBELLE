import { $ } from "../modules/dom.js";
import { signUp } from "../modules/auth.js";
import { isValidEmail, cleanText } from "../modules/security.js";
import { initAuthPage, status, setBusy, fieldError, passwordIssues } from "../modules/auth-ui.js";
import { supabase } from "../supabase.js";

initAuthPage();
const f = { name: $("#name"), email: $("#email"), pass: $("#password"), confirm: $("#confirm") };
const btn = $("#submitBtn");

$("#signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  status("", "");
  Object.values(f).forEach((i) => fieldError(i, ""));
  const name = cleanText(f.name.value, 100);
  const errors = [];
  if (name.length < 2) errors.push([f.name, "Informe seu nome."]);
  if (!isValidEmail(f.email.value)) errors.push([f.email, "Informe um e-mail válido."]);
  const issues = passwordIssues(f.pass.value);
  if (issues.length) errors.push([f.pass, `A senha precisa ter ${issues.join(", ")}.`]);
  if (f.confirm.value !== f.pass.value) errors.push([f.confirm, "As senhas não coincidem."]);
  if (errors.length) { errors.forEach(([i, m]) => fieldError(i, m)); return errors[0][0].focus(); }

  setBusy(btn, true, "Criando conta...", "CRIAR CONTA");
  const { data, error } = await signUp(f.email.value, f.pass.value, name);
  setBusy(btn, false, "", "CRIAR CONTA");
  if (error && /password|senha|weak/i.test(error.message)) return status("error", "Escolha uma senha mais forte.");
  if (error) return status("error", "Não foi possível criar a conta agora. Tente novamente em instantes.");

  // opt-in de newsletter só é gravado se já houver sessão (sem confirmação de e-mail)
  if (data.session && $("#newsletter").checked) await supabase.from("profiles").update({ newsletter: true }).eq("id", data.user.id);
  // Mensagem idêntica para e-mail novo ou já existente: evita enumeração de contas
  status("success", "Se o e-mail puder ser cadastrado, enviamos um link de confirmação. Verifique sua caixa de entrada.");
  $("#signupForm").reset();
});
