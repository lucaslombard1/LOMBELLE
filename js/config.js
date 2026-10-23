/* Configuração pública do projeto. NUNCA coloque service_role ou sb_secret aqui:
   a publishable key é segura no navegador porque quem protege os dados é o RLS (ver supabase/schema.sql). */
export const SUPABASE_URL = "https://bcmkdkxojdqrrxtgsajx.supabase.co";
export const SUPABASE_KEY = "sb_publishable_Xj5itm3Th1oVLEn3WAH1Sg_p4jl6Dq2";

export const SITE = {
  url: "https://www.lombelle.com.br",   // ajuste para o domínio real
  demoMode: true,                        // true = mantém avisos de "checkout demonstrativo"
};

/* Imagens institucionais padrão (usadas se a tabela site_images estiver vazia). */
export const DEFAULT_SITE_IMAGES = {
  hero: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1300&q=85",
  quiz: "https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?auto=format&fit=crop&w=1200&q=85",
  auth: "https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?auto=format&fit=crop&w=1200&q=85",
};
export const SITE_IMAGE_SLOTS = [
  { key: "hero", title: "Imagem principal do cabeçalho", where: "01 · PÁGINA INICIAL", help: "Imagem ao lado do texto principal da página inicial." },
  { key: "quiz", title: "Imagem da seção do quiz", where: "02 · DESCOBERTA OLFATIVA", help: "Aparece em “Seu aroma conta uma história”." },
  { key: "auth", title: "Imagem das telas de login", where: "03 · LOGIN E CADASTRO", help: "Painel lateral de login, cadastro e recuperação de senha." },
];

/* Login social: ative só depois de configurar o provedor em Supabase → Authentication → Providers. */
export const SOCIAL = { google: false, apple: false };

export const LIMITS = {
  catalogImageBytes: 5 * 1024 * 1024,
  siteImageBytes: 8 * 1024 * 1024,
  maxGallery: 4,
  maxQty: 10,
  passwordMin: 10,
};
export const CATEGORIES = ["Feminino", "Masculino", "Unissex"];
export const FAMILIES = ["amadeirado", "floral", "fresco", "doce"];
export const STORAGE_KEYS = {
  cart: "lombelle-cart",
  favorites: "lombelle-favorites",
  catalogCache: "lombelle:catalog:v2",
  siteImagesCache: "lombelle:site-images:v1",
  authLock: "lombelle:auth-lock",
  newsletterAt: "lombelle:newsletter-at",
};
