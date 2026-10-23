/* Favoritos: localStorage para visitantes; sincronizados com a conta (tabela favorites) quando logado. */
import { supabase } from "../supabase.js";
import { STORAGE_KEYS } from "../config.js";
import { load, save } from "./storage.js";
import { onAuth } from "./auth.js";
import { toast } from "./toast.js";

let ids = new Set(load(STORAGE_KEYS.favorites, []).filter((v) => typeof v === "string"));
let userId = null;
const subs = new Set();
const emit = (changedId) => subs.forEach((fn) => fn(changedId));
const persist = () => save(STORAGE_KEYS.favorites, [...ids]);

export const isFavorite = (id) => ids.has(id);
export const favoriteCount = () => ids.size;
export const favoriteIds = () => ids;
export const onFavorites = (fn) => { subs.add(fn); return () => subs.delete(fn); };

export async function toggleFavorite(id) {
  const adding = !ids.has(id);
  adding ? ids.add(id) : ids.delete(id);
  persist(); emit(id);
  if (!userId) return;
  const q = adding
    ? supabase.from("favorites").upsert({ user_id: userId, product_id: id }, { onConflict: "user_id,product_id" })
    : supabase.from("favorites").delete().eq("user_id", userId).eq("product_id", id);
  const { error } = await q;
  if (error) toast("Não foi possível sincronizar seus favoritos agora.");
}

/* Ao entrar: une favoritos locais + da conta e grava os que faltavam. */
async function syncOnLogin(uid) {
  const { data, error } = await supabase.from("favorites").select("product_id");
  if (error) return;
  const remote = new Set((data || []).map((r) => r.product_id));
  const missing = [...ids].filter((id) => !remote.has(id));
  if (missing.length) await supabase.from("favorites").upsert(missing.map((product_id) => ({ user_id: uid, product_id })), { onConflict: "user_id,product_id" });
  ids = new Set([...ids, ...remote]);
  persist(); emit(null);
}

onAuth(({ user }) => {
  const next = user?.id ?? null;
  if (next === userId) return;
  userId = next;
  if (userId) syncOnLogin(userId);
});
