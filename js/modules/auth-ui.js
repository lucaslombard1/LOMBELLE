/* Helpers das telas de autenticação. */
import { $, $$, h } from "./dom.js";
import { LIMITS, SOCIAL, DEFAULT_SITE_IMAGES } from "../config.js";
import { applySiteImages } from "./site-images.js";
import { signInWithProvider } from "./auth.js";

export function status(kind, text) {            // kind: error | success | info | ""
  const el = $("#authStatus");
  el.className = `auth-status${kind ? ` is-${kind}` : ""}`;
  el.textContent = text || "";
}
export function setBusy(button, busy, busyText, idleText) {
  button.disabled = busy; button.setAttribute("aria-busy", String(busy));
  button.textContent = busy ? busyText : idleText;
}
export function fieldError(input, msg) {
  const err = document.getElementById(`${input.id}-error`);
  input.setAttribute("aria-invalid", msg ? "true" : "false");
  if (err) err.textContent = msg || "";
}
export function initPasswordToggles() {
  $$("[data-toggle-password]").forEach((btn) => {
    const input = document.getElementById(btn.dataset.togglePassword);
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "OCULTAR" : "MOSTRAR";
      btn.setAttribute("aria-pressed", String(show));
    });
  });
}
/* Regras de senha (o servidor repete a validação: Auth → Password requirements). */
export function passwordIssues(pw) {
  const issues = [];
  if (pw.length < LIMITS.passwordMin) issues.push(`pelo menos ${LIMITS.passwordMin} caracteres`);
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) issues.push("letras maiúsculas e minúsculas");
  if (!/\d/.test(pw)) issues.push("um número");
  return issues;
}
export function initSocial() {
  const box = $("#socialRow"); if (!box) return;
  for (const [provider, label] of [["google", "Google"], ["apple", "Apple"]]) {
    const on = SOCIAL[provider];
    box.append(h("button", { type: "button", class: "button button-outline", "aria-disabled": String(!on),
      onClick: async () => { if (!on) return status("info", `Login com ${label} em breve.`); const { error } = await signInWithProvider(provider); if (error) status("error", "Não foi possível iniciar o login social."); } },
      on ? `Continuar com ${label}` : `${label} · em breve`));
  }
}
export function safeNext(defaultUrl) {
  const n = new URLSearchParams(location.search).get("next") || "";
  return /^[\w-]+\.html$/.test(n) ? n : defaultUrl;          // só páginas do próprio site: sem open redirect
}
export const initAuthPage = () => { applySiteImages(); initPasswordToggles(); initSocial(); };
void DEFAULT_SITE_IMAGES;
