import { $, h } from "../modules/dom.js";
import { requestPasswordReset, updatePassword, signOut } from "../modules/auth.js";
import { isValidEmail } from "../modules/security.js";
import { initAuthPage, status, setBusy, fieldError, passwordIssues } from "../modules/auth-ui.js";
import { supabase } from "../supabase.js";

initAuthPage();
const req = $("#requestForm"), rst = $("#resetForm");
const sayReset = (k, t) => { const el = $("#resetStatus"); el.className = `auth-status is-${k}`; el.textContent = t; };

/* Link do e-mail → Supabase dispara PASSWORD_RECOVERY → mostra o formulário de nova senha. */
supabase.auth.onAuthStateChange((event) => {
  if (event !== "PASSWORD_RECOVERY") return;
  req.hidden = true; rst.hidden = false;
  $("#recTitle").replaceChildren("Nova ", h("em", {}, "senha"));
  $("#recLead").textContent = "Crie uma nova senha para sua conta.";
  $("#password").focus();
});

req.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#email"), btn = $("#submitBtn");
  fieldError(email, "");
  if (!isValidEmail(email.value)) { fieldError(email, "Informe um e-mail válido."); return email.focus(); }
  setBusy(btn, true, "Enviando...", "ENVIAR LINK");
  await requestPasswordReset(email.value);               // o resultado é ignorado de propósito
  setBusy(btn, false, "", "ENVIAR LINK");
  status("success", "Se existir uma conta com esse e-mail, enviaremos um link para redefinir a senha.");
});

rst.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pass = $("#password"), conf = $("#confirm"), btn = $("#resetBtn");
  fieldError(pass, ""); fieldError(conf, "");
  const issues = passwordIssues(pass.value);
  if (issues.length) { fieldError(pass, `A senha precisa ter ${issues.join(", ")}.`); return pass.focus(); }
  if (pass.value !== conf.value) { fieldError(conf, "As senhas não coincidem."); return conf.focus(); }
  setBusy(btn, true, "Salvando...", "SALVAR NOVA SENHA");
  const { error } = await updatePassword(pass.value);
  if (error) { setBusy(btn, false, "", "SALVAR NOVA SENHA"); return sayReset("error", "Não foi possível salvar. O link pode ter expirado: solicite um novo."); }
  sayReset("success", "Senha atualizada. Redirecionando...");
  await signOut();
  setTimeout(() => location.replace("login.html"), 1500);
});
