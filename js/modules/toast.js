let timer;
/* #toast tem role="status": leitores de tela anunciam a mensagem. */
export function toast(message, ms = 2800) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = "";
  requestAnimationFrame(() => { el.textContent = message; });
  el.classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove("show"), ms);
}
