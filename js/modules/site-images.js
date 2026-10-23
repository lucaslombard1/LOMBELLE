/* Imagens institucionais: <img> reais (LCP/CLS) com troca vinda do Supabase (tabela site_images). */
import { supabase } from "../supabase.js";
import { DEFAULT_SITE_IMAGES, STORAGE_KEYS } from "../config.js";
import { load, save } from "./storage.js";
import { safeHttpsUrl, unsplashSrcset } from "./security.js";

const TARGETS = { hero: ".hero-image", quiz: ".discovery-image img", auth: ".auth-hero img" };

function setImg(el, url) {
  const safe = safeHttpsUrl(url);
  if (!el || !safe || el.getAttribute("src") === safe) return;
  const srcset = unsplashSrcset(safe, [600, 900, 1300]);
  srcset ? el.setAttribute("srcset", srcset) : el.removeAttribute("srcset");
  el.src = safe;
}
export async function applySiteImages() {
  const cached = load(STORAGE_KEYS.siteImagesCache, {});
  const apply = (map) => Object.entries(TARGETS).forEach(([k, sel]) => setImg(document.querySelector(sel), map[k]));
  apply({ ...DEFAULT_SITE_IMAGES, ...cached });
  const { data, error } = await supabase.from("site_images").select("id,image_url");
  if (error || !data) return;
  const fresh = {};
  data.forEach((r) => { if (r.id in TARGETS && safeHttpsUrl(r.image_url)) fresh[r.id] = r.image_url; });
  save(STORAGE_KEYS.siteImagesCache, fresh);
  apply({ ...DEFAULT_SITE_IMAGES, ...fresh });
}
