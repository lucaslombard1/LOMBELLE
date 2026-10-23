/* Painel de produtos: CRUD direto no Supabase (RLS exige is_lombelle_admin()). Sem innerHTML. */
import { supabase } from "../supabase.js";
import { requireAdmin } from "./guard.js";
import { $, h, money } from "../modules/dom.js";
import { LIMITS } from "../config.js";
import { normalizeProduct } from "../catalog.js";
import { validateImageFile, randomName, safeHttpsUrl, slugify } from "../modules/security.js";
import { toast } from "../modules/toast.js";
import { parseCSV, toCSV, rowsToProducts, CSV_HEADERS, CSV_EXAMPLE } from "./csv.js";

await requireAdmin();

let products = [], photos = [], editingId = null;
const PH = "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'><rect width='4' height='5' fill='#e8dfcf'/></svg>");
const msg = (t, err) => { const el = $("#formMessage"); el.textContent = t; el.classList.toggle("is-error", !!err); };

/* ---------- dados ---------- */
async function reload() {
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: true });
  if (error) return toast("Erro ao carregar: " + error.message);
  products = data.map((r) => ({ ...r, price: Number(r.price), gallery: r.gallery || [] }));
  render();
}

function render() {
  const q = $("#searchProducts").value.trim().toLowerCase(), st = $("#statusFilter").value;
  const list = products.filter((p) => `${p.name} ${p.category} ${p.type}`.toLowerCase().includes(q) &&
    (st === "all" || (st === "active") === p.active));
  $("#productRows").replaceChildren(...list.map((p) => h("tr", {},
    h("td", {}, h("div", { class: "product-cell" }, h("img", { src: p.image || PH, alt: "", width: 40, height: 50 }), h("div", {}, h("strong", {}, p.name), h("small", {}, `${p.size} · ${p.type}`)))),
    h("td", {}, p.category), h("td", {}, money(p.price)),
    h("td", {}, h("span", { class: `status ${p.active ? "active" : "inactive"}` }, p.active ? "Ativo" : "Inativo")),
    h("td", {}, h("div", { class: "row-actions" },
      h("button", { type: "button", class: "small-action", "aria-label": `Editar ${p.name}`, onClick: () => edit(p.id) }, "Editar"),
      h("button", { type: "button", class: "small-action", "aria-label": `${p.active ? "Desativar" : "Ativar"} ${p.name}`, onClick: () => toggle(p) }, p.active ? "Desativar" : "Ativar"),
      h("button", { type: "button", class: "small-action delete", "aria-label": `Excluir ${p.name}`, onClick: () => remove(p) }, "Excluir"))))));
  $("#emptyList").hidden = list.length > 0;
  $("#statTotal").textContent = products.length;
  $("#statActive").textContent = products.filter((p) => p.active).length;
  $("#statAverage").textContent = money(products.length ? products.reduce((s, p) => s + p.price, 0) / products.length : 0);
}

async function toggle(p) {
  const { error } = await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
  if (error) return toast("Não foi possível alterar: " + error.message);
  toast(p.active ? "Produto desativado." : "Produto ativado."); reload();
}
async function remove(p) {
  if (!confirm(`Excluir "${p.name}" definitivamente? Esta ação não pode ser desfeita.`)) return;
  const { error } = await supabase.from("products").delete().eq("id", p.id);
  if (error) return toast("Não foi possível excluir: " + error.message);
  if (editingId === p.id) clearForm();
  toast("Produto excluído."); reload();
}

/* ---------- formulário ---------- */
const FIELDS = ["name", "category", "price", "size", "tag", "type", "notes", "description", "family"];
function clearForm() {
  editingId = null; photos = [];
  FIELDS.forEach((f) => { $("#" + f).value = f === "category" ? "Feminino" : f === "family" ? "amadeirado" : ""; });
  $("#active").checked = true; $("#productId").value = ""; $("#formHeading").textContent = "Novo produto"; msg("");
  renderThumbs();
}
function edit(id) {
  const p = products.find((x) => x.id === id); if (!p) return;
  editingId = id; $("#productId").value = id;
  FIELDS.forEach((f) => { $("#" + f).value = p[f] ?? ""; });
  $("#active").checked = p.active; photos = [p.image, ...p.gallery].filter(Boolean);
  $("#formHeading").textContent = `Editar: ${p.name}`; msg(""); renderThumbs();
  $("#name").focus(); $("#editorPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}
function renderThumbs() {
  $("#thumbs").replaceChildren(...photos.map((u, i) => h("figure", {},
    h("img", { src: u, alt: `Foto ${i + 1}` }),
    i === 0 ? h("div", { class: "main" }, "Principal") : null,
    h("figcaption", {},
      i > 0 ? h("button", { type: "button", onClick: () => { photos.unshift(...photos.splice(i, 1)); renderThumbs(); } }, "Tornar principal") : null,
      h("button", { type: "button", "aria-label": `Remover foto ${i + 1}`, onClick: () => { photos.splice(i, 1); renderThumbs(); } }, "Remover")))));
}

$("#productForm").addEventListener("submit", async (e) => {
  e.preventDefault(); msg("");
  const raw = { id: editingId || slugify($("#name").value), active: $("#active").checked, image: photos[0] || "", gallery: photos.slice(1) };
  FIELDS.forEach((f) => { raw[f] = $("#" + f).value; });
  const p = normalizeProduct(raw);
  if (!p) return msg("Confira nome e preço (maior que zero).", true);
  if (!p.type || !p.notes || !p.description || !p.size) return msg("Preencha volume, tipo, notas e descrição.", true);
  if (!p.image) return msg("Adicione ao menos uma foto (arquivo ou endereço https).", true);
  p.id = raw.id;
  const btn = $("#saveProduct"); btn.disabled = true;
  const { error } = editingId
    ? await supabase.from("products").update({ ...p, id: undefined }).eq("id", editingId)
    : await supabase.from("products").insert(p);
  btn.disabled = false;
  if (error) return msg(error.code === "23505" ? "Já existe um produto com esse nome." : "Não foi possível salvar: " + error.message, true);
  msg("Produto salvo e publicado na loja."); toast("Produto salvo."); editingId = p.id; await reload();
});
$("#newProduct").addEventListener("click", () => { clearForm(); $("#name").focus(); });
$("#clearForm").addEventListener("click", clearForm);
["searchProducts", "statusFilter"].forEach((id) => $("#" + id).addEventListener("input", render));

/* ---------- fotos: validação (extensão+MIME+tamanho+bytes) e envio ao bucket product-images ---------- */
async function addFiles(files) {
  for (const file of files) {
    if (photos.length >= LIMITS.maxGallery) { msg(`Máximo de ${LIMITS.maxGallery} fotos por produto.`, true); break; }
    const v = await validateImageFile(file, LIMITS.catalogImageBytes);
    if (!v.ok) { msg(`${file.name}: ${v.error}`, true); continue; }
    const path = `${slugify($("#name").value || "produto")}/${randomName(v.ext)}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: v.mime, cacheControl: "31536000", upsert: false });
    if (error) { msg(`${file.name}: falha no envio (${error.message}).`, true); continue; }
    photos.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    renderThumbs(); msg("");
  }
}
$("#photoInput").addEventListener("change", async (e) => { await addFiles([...e.target.files]); e.target.value = ""; });
const drop = $("#drop");
["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", (e) => addFiles([...e.dataTransfer.files]));
$("#addUrl").addEventListener("click", () => {
  const u = safeHttpsUrl($("#imageUrl").value);
  if (!u) return msg("Use um endereço que comece com https:// (outros formatos são bloqueados).", true);
  if (photos.length >= LIMITS.maxGallery) return msg(`Máximo de ${LIMITS.maxGallery} fotos.`, true);
  photos.push(u); $("#imageUrl").value = ""; renderThumbs(); msg("");
});

/* ---------- importação / exportação ---------- */
const report = (t) => { $("#importReport").textContent = t; };
async function saveMany(items, label) {
  const valid = [], errors = [];
  items.forEach(({ raw, line }) => { const p = normalizeProduct(raw); if (p && p.type && p.notes && p.description && p.size && p.image) valid.push(p); else errors.push(`linha ${line}: dados inválidos (nome, preço, imagem https, volume, tipo, notas e descrição são obrigatórios)`); });
  if (valid.length) {
    const { error } = await supabase.from("products").upsert(valid, { onConflict: "id" });
    if (error) return report(`Erro ao importar: ${error.message}`);
  }
  report(`${label}: ${valid.length} produto(s) importado(s)${errors.length ? `, ${errors.length} ignorado(s):\n${errors.slice(0, 10).join("\n")}` : "."}`);
  reload();
}
function download(name, text, type) {
  const a = h("a", { href: "#", download: name }); const url = URL.createObjectURL(new Blob([text], { type }));
  a.setAttribute("href", url); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#csvModel").addEventListener("click", () => download("lombelle-modelo-catalogo.csv", "\uFEFF" + toCSV([CSV_HEADERS, CSV_EXAMPLE]), "text/csv;charset=utf-8"));
$("#exportProducts").addEventListener("click", () => download("lombelle-backup.json", JSON.stringify(products, null, 2), "application/json"));
$("#importCsv").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  if (f.size > 2 * 1048576) return report("Arquivo CSV grande demais (máx. 2 MB).");
  try { await saveMany(rowsToProducts(parseCSV(await f.text())), "CSV"); } catch (err) { report(err.message); }
});
$("#importProducts").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  if (f.size > 2 * 1048576) return report("Arquivo JSON grande demais (máx. 2 MB).");
  try {
    const data = JSON.parse(await f.text());
    if (!Array.isArray(data)) throw new Error("O JSON precisa ser uma lista de produtos.");
    await saveMany(data.map((raw, i) => ({ raw, line: i + 1 })), "Backup");
  } catch (err) { report("Não foi possível ler o JSON: " + err.message); }
});

clearForm(); await reload();
