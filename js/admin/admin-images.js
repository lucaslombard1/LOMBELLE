import { supabase } from "../supabase.js";
import { requireAdmin } from "./guard.js";
import { $, h } from "../modules/dom.js";
import { DEFAULT_SITE_IMAGES, SITE_IMAGE_SLOTS, LIMITS } from "../config.js";
import { validateImageFile, randomName, safeHttpsUrl } from "../modules/security.js";

await requireAdmin();
const say = (t) => { $("#globalStatus").textContent = t; };
const current = { ...DEFAULT_SITE_IMAGES }, pending = {};

const { data } = await supabase.from("site_images").select("id,image_url");
(data || []).forEach((r) => { if (r.id in current && safeHttpsUrl(r.image_url)) current[r.id] = r.image_url; });

const previews = {};
function card(slot) {
  const img = h("img", { src: current[slot.key], alt: `Prévia: ${slot.title}`, width: 640, height: 360 });
  previews[slot.key] = img;
  const url = h("input", { id: `${slot.key}Url`, type: "url", placeholder: "https://...", value: current[slot.key] });
  const file = h("input", { id: `${slot.key}File`, type: "file", accept: "image/jpeg,image/png,image/webp" });
  url.addEventListener("input", () => { const u = safeHttpsUrl(url.value); if (u) { delete pending[slot.key]; img.src = u; } });
  file.addEventListener("change", async () => {
    const f = file.files[0]; if (!f) return;
    const v = await validateImageFile(f, LIMITS.siteImageBytes);
    if (!v.ok) { file.value = ""; return say(`${slot.title}: ${v.error}`); }
    pending[slot.key] = { file: f, ...v }; img.src = URL.createObjectURL(f);
    say("Imagem pronta. Clique em “Salvar no site”.");
  });
  const save = h("button", { type: "button", class: "button primary", onClick: async () => {
    save.disabled = true;
    try {
      let u = current[slot.key];
      if (pending[slot.key]) {
        const { file: f, ext, mime } = pending[slot.key], path = `${slot.key}/${randomName(ext)}`;
        const up = await supabase.storage.from("site-images").upload(path, f, { contentType: mime, cacheControl: "31536000" });
        if (up.error) throw up.error;
        u = supabase.storage.from("site-images").getPublicUrl(path).data.publicUrl;
      } else {
        u = safeHttpsUrl(url.value);
        if (!u) throw new Error("Informe um endereço https:// válido ou escolha um arquivo.");
      }
      const { error } = await supabase.from("site_images").upsert({ id: slot.key, image_url: u, updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (error) throw error;
      current[slot.key] = u; delete pending[slot.key]; url.value = u; say(`${slot.title}: salva e publicada.`);
    } catch (e) { say(`Não foi possível salvar: ${e.message}`); } finally { save.disabled = false; }
  } }, "Salvar no site");
  const reset = h("button", { type: "button", class: "button secondary", onClick: async () => {
    const { error } = await supabase.from("site_images").delete().eq("id", slot.key);
    if (error) return say(`Não foi possível restaurar: ${error.message}`);
    current[slot.key] = DEFAULT_SITE_IMAGES[slot.key]; img.src = current[slot.key]; url.value = current[slot.key]; delete pending[slot.key]; say("Imagem original restaurada.");
  } }, "Restaurar original");
  return h("article", { class: "image-card" },
    h("div", { class: "preview" }, img),
    h("div", { class: "card-body" }, h("p", { class: "eyebrow" }, slot.where), h("h2", {}, slot.title), h("p", { class: "description" }, slot.help),
      h("label", { for: `${slot.key}Url` }, "Endereço da imagem (https)"), url,
      h("label", { for: `${slot.key}File` }, "Ou envie do computador (JPG, PNG ou WEBP, até 8 MB)"), file,
      h("div", { class: "actions" }, reset, save)));
}
$("#slots").replaceChildren(...SITE_IMAGE_SLOTS.map(card));
say("Conectado. As imagens salvas estão carregadas.");
