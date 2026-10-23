/* Sanitização e validação. Regra do projeto: dado externo (Supabase, CSV, JSON, URL) nunca vai para innerHTML. */

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

/* Texto simples: remove caracteres de controle e tags, limita o tamanho. */
export function cleanText(v, max = 500) {
  return String(v ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

/* Somente https:. Bloqueia javascript:, data:, blob:, http: e URLs com credenciais. */
export function safeHttpsUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.length > 2048) return "";
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password) return "";
    return u.href;
  } catch { return ""; }
}

export const isValidEmail = (v) =>
  String(v ?? "").length <= 254 && /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(String(v ?? "").trim());

export function slugify(v) {
  return String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "produto";
}

/* Evita "CSV injection" (=, +, -, @ no início da célula) ao exportar. */
export const csvSafe = (v) => { const s = String(v ?? ""); return /^[=+\-@\t\r]/.test(s) ? "'" + s : s; };

/* ---------- upload de imagens: validação dupla ---------- */
const TYPES = {
  "image/jpeg": { exts: ["jpg", "jpeg"], magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png":  { exts: ["png"], magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  "image/webp": { exts: ["webp"], magic: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
};
export const ALLOWED_MIME = Object.keys(TYPES);

/* Cliente: extensão + MIME + tamanho + assinatura real dos bytes.
   Servidor: o bucket repete limite de tamanho e MIME (supabase/schema.sql).
   SVG é recusado de propósito (pode conter script). */
export async function validateImageFile(file, maxBytes) {
  if (!(file instanceof File)) return { ok: false, error: "Arquivo inválido." };
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const type = TYPES[file.type];
  if (!type) return { ok: false, error: "Formato não permitido. Use JPG, PNG ou WEBP." };
  if (!type.exts.includes(ext)) return { ok: false, error: "A extensão do arquivo não corresponde ao tipo da imagem." };
  if (file.size <= 0) return { ok: false, error: "Arquivo vazio." };
  if (file.size > maxBytes) return { ok: false, error: `A imagem deve ter até ${Math.round(maxBytes / 1048576)} MB.` };
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!type.magic(head)) return { ok: false, error: "O conteúdo do arquivo não é uma imagem válida." };
  return { ok: true, ext: ext === "jpeg" ? "jpg" : ext, mime: file.type };
}

/* Nome seguro e imprevisível no Storage (nunca usa o nome original). */
export const randomName = (ext) => `${crypto.randomUUID()}.${ext}`;

/* srcset responsivo para o Unsplash (as demais origens usam só src). */
export function unsplashSrcset(url, widths = [400, 640, 900]) {
  try {
    const u = new URL(url);
    if (u.hostname !== "images.unsplash.com") return "";
    return widths.map((w) => { const c = new URL(u); c.searchParams.set("w", w); return `${c.href} ${w}w`; }).join(", ");
  } catch { return ""; }
}
