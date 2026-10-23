/* Camada de dados do catálogo: Supabase → sanitização → cache local → índices (byId, byFamily).
   Substitui products-data.js: o catálogo é administrado no painel e publicado sem deploy. */
import { supabase } from "./supabase.js";
import { CATEGORIES, FAMILIES, LIMITS, STORAGE_KEYS } from "./config.js";
import { cleanText, safeHttpsUrl, slugify } from "./modules/security.js";
import { load, save } from "./modules/storage.js";

export const catalog = { products: [], byId: new Map(), byFamily: new Map(), version: 0, status: "idle" };
const subs = new Set();
export const onCatalog = (fn) => { subs.add(fn); return () => subs.delete(fn); };

/* Valida/sanitiza UMA linha vinda do Supabase, CSV ou JSON. Retorna null se inválida. */
export function normalizeProduct(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = cleanText(raw.name, 100);
  const price = Number(String(raw.price ?? "").replace(",", "."));
  if (!name || !Number.isFinite(price) || price <= 0) return null;
  const category = CATEGORIES.includes(raw.category) ? raw.category : "Unissex";
  const family = FAMILIES.includes(String(raw.family).toLowerCase()) ? String(raw.family).toLowerCase() : "amadeirado";
  const gallery = (Array.isArray(raw.gallery) ? raw.gallery : []).map(safeHttpsUrl).filter(Boolean).slice(0, LIMITS.maxGallery - 1);
  return {
    id: /^[a-z0-9][a-z0-9-]{0,79}$/.test(String(raw.id)) ? String(raw.id) : slugify(name),
    name, category, family,
    type: cleanText(raw.type, 80),
    notes: cleanText(raw.notes, 160),
    price: Math.round(price * 100) / 100,
    size: cleanText(raw.size, 20),
    tag: cleanText(raw.tag, 30).toUpperCase() || "LOMBELLE",
    image: safeHttpsUrl(raw.image),
    gallery,
    description: cleanText(raw.description, 1200),
    active: raw.active !== false,
  };
}

function apply(list) {
  catalog.products = list;
  catalog.byId = new Map(list.map((p) => [p.id, p]));              // productsById
  catalog.byFamily = new Map();
  for (const p of list) if (!catalog.byFamily.has(p.family)) catalog.byFamily.set(p.family, p);
  catalog.version++;
  subs.forEach((fn) => fn(catalog));
}

export async function loadCatalog() {
  const cached = load(STORAGE_KEYS.catalogCache, null);
  if (cached?.products?.length) { catalog.status = "cached"; apply(cached.products.map(normalizeProduct).filter(Boolean)); }
  else { catalog.status = "loading"; subs.forEach((fn) => fn(catalog)); }

  const { data, error } = await supabase.from("products").select("*").eq("active", true).order("created_at", { ascending: true });
  if (error) {
    console.error("LOMBELLE: erro ao carregar produtos:", error.message);
    if (!catalog.products.length) { catalog.status = "error"; subs.forEach((fn) => fn(catalog)); }
    return;
  }
  const fresh = (data || []).map(normalizeProduct).filter(Boolean);
  catalog.status = "ready";
  if (JSON.stringify(fresh) !== JSON.stringify(catalog.products) || !cached) {
    save(STORAGE_KEYS.catalogCache, { ts: Date.now(), products: fresh });
    apply(fresh);
  } else subs.forEach((fn) => fn(catalog));
}
