import { $ } from "../modules/dom.js";
import { initAuth, signIn, signOut, getAuth } from "../modules/auth.js";
import { isValidEmail } from "../modules/security.js";
import { lockRemaining, registerFailure, registerSuccess, watchLock } from "../modules/rate-limit.js";
import { initAuthPage, status, setBusy, fieldError, safeNext } from "../modules/auth-ui.js";

initAuthPage();
const form = $("#loginForm"), btn = $("#submitBtn"), email = $("#email"), pass = $("#password");
let stopWatch = watchLock(btn, "ENTRAR");

(async () => {                                   // já está logado? segue direto
  const { user, isAdmin } = await initAuth();
  if (user) location.replace(isAdmin ? "admin.html" : "conta.html");
})();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  status("", "");
  if (lockRemaining() > 0) return status("error", "Muitas tentativas. Aguarde o tempo indicado no botão.");
  fieldError(email, ""); fieldError(pass, "");
  if (!isValidEmail(email.value)) { fieldError(email, "Informe um e-mail válido."); return email.focus(); }
  if (!pass.value) { fieldError(pass, "Informe sua senha."); return pass.focus(); }

  stopWatch(); setBusy(btn, true, "Entrando...", "ENTRAR");
  status("info", "Entrando...");
  const wantsAdmin = form.elements.profile.value === "admin";
  const { error } = await signIn(email.value, pass.value);
  if (error) {
    const wait = registerFailure();
    setBusy(btn, false, "", "ENTRAR"); stopWatch = watchLock(btn, "ENTRAR");
    pass.value = "";
    // Mensagem genérica: não revela se o e-mail existe
    status("error", wait ? "Muitas tentativas. Aguarde antes de tentar de novo." : "Email ou senha inválidos.");
    return pass.focus();
  }
  registerSuccess();
  // aguarda o papel ser resolvido
  const { isAdmin } = await new Promise((res) => { const t = setInterval(() => { const a = getAuth(); if (a.ready && a.user) { clearInterval(t); res(a); } }, 50); setTimeout(() => { clearInterval(t); res(getAuth()); }, 4000); });
  if (wantsAdmin && !isAdmin) {
    await signOut();
    setBusy(btn, false, "", "ENTRAR"); stopWatch = watchLock(btn, "ENTRAR");
    return status("error", "Email ou senha inválidos.");   // mesma mensagem: não revela que a conta existe
  }
  status("success", "Redirecionando...");
  location.replace(safeNext(isAdmin && wantsAdmin ? "admin.html" : "index.html"));
});
