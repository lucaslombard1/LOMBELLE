import { csvSafe } from "../modules/security.js";

/* Parser de CSV (aspas, vírgula ou ponto e vírgula, CRLF, BOM). */
export function parseCSV(text) {
  const src = String(text).replace(/^\uFEFF/, "");
  const first = src.split(/\r?\n/, 1)[0] || "";
  const delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ";" : ",";
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && src[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((v) => v.trim())) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell); if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export const toCSV = (rows) => rows.map((r) => r.map((v) => `"${csvSafe(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");

export const CSV_HEADERS = ["id", "nome", "categoria", "preco", "volume", "etiqueta", "tipo", "notas", "descricao", "familia", "ativo", "imagem"];
export const CSV_EXAMPLE = ["", "Lumière No. 12", "Feminino", "319,00", "75 ml", "LUMINOSO", "Floral · Cítrico", "Neroli, mandarina e jasmim", "Fresco como a luz da manhã.", "floral", "sim", "https://exemplo.com/foto1.jpg|https://exemplo.com/foto2.jpg"];

/* Converte linhas do CSV em objetos de produto "crus" (a validação final é normalizeProduct). */
export function rowsToProducts(rows) {
  const [head, ...body] = rows;
  const idx = Object.fromEntries(head.map((h, i) => [h.trim().toLowerCase(), i]));
  const need = ["nome", "categoria", "preco"];
  const missing = need.filter((k) => !(k in idx));
  if (missing.length) throw new Error(`Colunas obrigatórias ausentes: ${missing.join(", ")}.`);
  const get = (r, k) => (k in idx ? String(r[idx[k]] ?? "").trim() : "");
  return body.map((r, n) => {
    const imgs = get(r, "imagem").split("|").map((s) => s.trim()).filter(Boolean);
    return { line: n + 2, raw: { id: get(r, "id"), name: get(r, "nome"), category: get(r, "categoria"), price: get(r, "preco"), size: get(r, "volume"), tag: get(r, "etiqueta"),
      type: get(r, "tipo"), notes: get(r, "notas"), description: get(r, "descricao"), family: get(r, "familia"), active: !/^(n|nao|não|0|false|inativo)$/i.test(get(r, "ativo")),
      image: imgs[0] || "", gallery: imgs.slice(1) } };
  });
}
