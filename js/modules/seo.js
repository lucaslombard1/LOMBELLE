/* JSON-LD do catálogo (ItemList de Product) gerado a partir dos dados já sanitizados. */
import { catalog, onCatalog } from "../catalog.js";
import { SITE } from "../config.js";

export function initSeo() {
  onCatalog(() => {
    if (!catalog.products.length) return;
    const data = {
      "@context": "https://schema.org", "@type": "ItemList", name: "Coleção LOMBELLE",
      itemListElement: catalog.products.map((p, i) => ({
        "@type": "ListItem", position: i + 1,
        item: { "@type": "Product", name: p.name, description: p.description, image: [p.image, ...p.gallery], category: p.category, brand: { "@type": "Brand", name: "LOMBELLE" },
          offers: { "@type": "Offer", url: `${SITE.url}/#colecao`, priceCurrency: "BRL", price: p.price.toFixed(2), availability: "https://schema.org/InStock" } },
      })),
    };
    let el = document.getElementById("ld-catalog");
    if (!el) { el = document.createElement("script"); el.type = "application/ld+json"; el.id = "ld-catalog"; document.head.append(el); }
    el.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
  });
}
