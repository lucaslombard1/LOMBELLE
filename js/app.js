/* Ponto de entrada da loja. Cada responsabilidade vive em js/modules/. */
import { loadCatalog, catalog } from "./catalog.js";
import { initAuth } from "./modules/auth.js";
import { initAccessibility } from "./modules/accessibility.js";
import { initModals } from "./modules/modal.js";
import { initHeader } from "./modules/header.js";
import { initSearch } from "./modules/search.js";
import { initCart } from "./modules/cart.js";
import { initProducts, openProduct, renderProducts, view } from "./modules/products.js";
import { initQuiz } from "./modules/quiz.js";
import { initNewsletter } from "./modules/newsletter.js";
import { applySiteImages } from "./modules/site-images.js";
import { initSeo } from "./modules/seo.js";
import { toast } from "./modules/toast.js";
import { $ } from "./modules/dom.js";

initAccessibility();
initModals();
const search = initSearch({
  onQuery: (q) => { view.query = q; renderProducts(); },
  onPick: (id) => { $("#colecao").scrollIntoView({ behavior: "smooth", block: "start" }); openProduct(id, $("#searchToggle")); },
});
initHeader({ closeSearchResults: search.close });
initCart();
initProducts();
initQuiz({ openProduct });
initNewsletter();
initSeo();
$("#year").textContent = new Date().getFullYear();
$("#policyLink").addEventListener("click", (e) => { e.preventDefault(); toast("Inclua aqui suas políticas reais antes de publicar."); });
$("#privacyLink").addEventListener("click", (e) => { e.preventDefault(); toast("Inclua aqui sua política de privacidade antes de publicar."); });

applySiteImages();
initAuth().catch((e) => console.error("LOMBELLE: falha ao iniciar a sessão", e));
loadCatalog();
