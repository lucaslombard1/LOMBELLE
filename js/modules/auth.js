/* Sessão e papéis. "Admin" NUNCA é decidido no cliente: vem da função SQL is_lombelle_admin() (tabela admins). */
import { supabase } from "../supabase.js";

const listeners = new Set();
let current = { user: null, isAdmin: false, ready: false };

async function refresh(session) {
  const user = session?.user ?? null;
  let isAdmin = false;
  if (user) {
    const { data, error } = await supabase.rpc("is_lombelle_admin");
    isAdmin = !error && data === true;
  }
  current = { user, isAdmin, ready: true };
  listeners.forEach((fn) => { try { fn(current); } catch (e) { console.error(e); } });
}

export const getAuth = () => current;
export function onAuth(fn) { listeners.add(fn); if (current.ready) fn(current); return () => listeners.delete(fn); }

export async function initAuth() {
  const { data } = await supabase.auth.getSession();
  await refresh(data.session);
  supabase.auth.onAuthStateChange((_event, session) => {
    // setTimeout evita deadlock do SDK ao chamar o Supabase dentro do callback
    setTimeout(() => refresh(session), 0);
  });
  return current;
}

export const signIn = (email, password) => supabase.auth.signInWithPassword({ email: email.trim(), password });
export const signOut = () => supabase.auth.signOut();

export const signUp = (email, password, fullName) =>
  supabase.auth.signUp({
    email: email.trim(), password,
    options: { data: { full_name: fullName }, emailRedirectTo: `${location.origin}/login.html` },
  });

export const requestPasswordReset = (email) =>
  supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/recuperar-senha.html` });

export const updatePassword = (password) => supabase.auth.updateUser({ password });

export const signInWithProvider = (provider) =>
  supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}/login.html` } });
