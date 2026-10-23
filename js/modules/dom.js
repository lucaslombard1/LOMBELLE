/* Construtor de DOM seguro: texto sempre via textContent; src/href de dados externos passam por safeHttpsUrl. */
import { safeHttpsUrl } from "./security.js";

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "class") el.className = v;
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "src" || k === "href") {
      const s = String(v);
      const ok = k === "href" && /^(#|mailto:|[\w-]+\.html(\?[\w=&%-]*)?(#[\w-]*)?$)/.test(s) ? s : safeHttpsUrl(s);
      if (ok) el.setAttribute(k, ok);
    } else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
