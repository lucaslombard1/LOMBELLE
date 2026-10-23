/* Bloqueio VISUAL de força bruta: 5 falhas → espera crescente (30s, 60s, 120s… máx. 15 min).
   É só uma barreira de UX no navegador (dá para limpar o localStorage). A proteção real é o rate limit
   + CAPTCHA do Supabase Auth, configurados no painel (ver supabase/schema.sql, seção 9). */
import { STORAGE_KEYS } from "../config.js";
import { load, save, remove } from "./storage.js";

const MAX_FAILS = 5;
export const lockRemaining = () => Math.max(0, Math.ceil(((load(STORAGE_KEYS.authLock, {}).until || 0) - Date.now()) / 1000));
export function registerFailure() {
  const s = load(STORAGE_KEYS.authLock, { fails: 0, level: 0, until: 0 });
  s.fails += 1;
  if (s.fails >= MAX_FAILS) { s.level += 1; s.fails = 0; s.until = Date.now() + Math.min(900, 30 * 2 ** (s.level - 1)) * 1000; }
  save(STORAGE_KEYS.authLock, s);
  return lockRemaining();
}
export const registerSuccess = () => remove(STORAGE_KEYS.authLock);

/* Atualiza o botão com a contagem regressiva enquanto estiver bloqueado. */
export function watchLock(button, label, onTick) {
  let t;
  const tick = () => {
    const s = lockRemaining();
    button.disabled = s > 0;
    button.textContent = s > 0 ? `Aguarde ${s}s` : label;
    onTick?.(s);
    if (s > 0) t = setTimeout(tick, 1000);
  };
  tick();
  return () => clearTimeout(t);
}
