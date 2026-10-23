-- =====================================================================
-- LOMBELLE · Schema completo do Supabase (idempotente: pode rodar de novo)
-- Execute no SQL Editor. Depois, crie o administrador (ver seção 9).
-- =====================================================================

-- 1) ADMINISTRADORES ---------------------------------------------------
-- IMPORTANTE: com cadastro de clientes aberto, "authenticated" NÃO significa mais "administrador".
-- Toda escrita administrativa passa por is_lombelle_admin().
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "admins_read_own" on public.admins;
create policy "admins_read_own" on public.admins for select to authenticated using (user_id = auth.uid());
-- (sem policies de escrita: só o SQL Editor / service role insere administradores)

create or replace function public.is_lombelle_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_lombelle_admin() from public;
grant execute on function public.is_lombelle_admin() to anon, authenticated;

-- 2) PRODUTOS ----------------------------------------------------------
create table if not exists public.products (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name        text not null check (char_length(name) between 1 and 100),
  category    text not null check (category in ('Feminino','Masculino','Unissex')),
  type        text not null default '' check (char_length(type) <= 80),
  notes       text not null default '' check (char_length(notes) <= 160),
  price       numeric(10,2) not null check (price > 0),
  size        text not null default '' check (char_length(size) <= 20),
  tag         text not null default 'LOMBELLE' check (char_length(tag) <= 30),
  image       text not null default '' check (image = '' or image ~ '^https://'),
  gallery     text[] not null default '{}' check (cardinality(gallery) <= 3),
  description text not null default '' check (char_length(description) <= 1200),
  family      text not null default 'amadeirado' check (family in ('amadeirado','floral','fresco','doce')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists products_active_idx on public.products (active, created_at);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

alter table public.products enable row level security;
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products for select to anon, authenticated
  using (active = true or public.is_lombelle_admin());
drop policy if exists "products_admin_insert" on public.products;
create policy "products_admin_insert" on public.products for insert to authenticated with check (public.is_lombelle_admin());
drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update" on public.products for update to authenticated using (public.is_lombelle_admin()) with check (public.is_lombelle_admin());
drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete" on public.products for delete to authenticated using (public.is_lombelle_admin());

-- 3) IMAGENS INSTITUCIONAIS ---------------------------------------------
create table if not exists public.site_images (
  id text primary key check (id in ('hero','quiz','auth')),
  image_url text not null check (image_url ~ '^https://'),
  updated_at timestamptz not null default now()
);
alter table public.site_images enable row level security;
drop policy if exists "site_images_public_read" on public.site_images;
drop policy if exists "site_images_admin_insert" on public.site_images;
drop policy if exists "site_images_admin_update" on public.site_images;
drop policy if exists "site_images_admin_delete" on public.site_images;
create policy "site_images_public_read" on public.site_images for select to anon, authenticated using (true);
create policy "site_images_admin_insert" on public.site_images for insert to authenticated with check (public.is_lombelle_admin());
create policy "site_images_admin_update" on public.site_images for update to authenticated using (public.is_lombelle_admin()) with check (public.is_lombelle_admin());
create policy "site_images_admin_delete" on public.site_images for delete to authenticated using (public.is_lombelle_admin());

-- 4) CLIENTES: PERFIL, FAVORITOS, PEDIDOS, NEWSLETTER --------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  newsletter boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles_own_select" on public.profiles;
drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_own_update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- cria o perfil automaticamente quando alguém se cadastra
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null check (char_length(product_id) <= 80),
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table public.favorites enable row level security;
drop policy if exists "favorites_own_all" on public.favorites;
create policy "favorites_own_all" on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Pedidos: leitura pelo próprio cliente. A ESCRITA fica para o backend de checkout (service role),
-- nunca para o navegador — por isso não há policy de insert/update.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','paid','shipped','delivered','cancelled')),
  total numeric(10,2) not null check (total >= 0),
  items jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
alter table public.orders enable row level security;
drop policy if exists "orders_own_select" on public.orders;
create policy "orders_own_select" on public.orders for select to authenticated using (user_id = auth.uid());

create table if not exists public.newsletter_subscribers (
  email text primary key check (email ~* '^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$' and char_length(email) <= 254),
  created_at timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;
drop policy if exists "newsletter_anyone_insert" on public.newsletter_subscribers;
drop policy if exists "newsletter_admin_read" on public.newsletter_subscribers;
create policy "newsletter_anyone_insert" on public.newsletter_subscribers for insert to anon, authenticated with check (true);
create policy "newsletter_admin_read" on public.newsletter_subscribers for select to authenticated using (public.is_lombelle_admin());

-- 5) STORAGE: BUCKETS COM LIMITE DE TAMANHO E MIME NO SERVIDOR ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('site-images',    'site-images',    true, 8388608, array['image/jpeg','image/png','image/webp']),
  ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- remove as policies antigas (abertas a qualquer usuário autenticado)
drop policy if exists "site_images_storage_public_read" on storage.objects;
drop policy if exists "site_images_storage_admin_insert" on storage.objects;
drop policy if exists "site_images_storage_admin_update" on storage.objects;
drop policy if exists "site_images_storage_admin_delete" on storage.objects;
drop policy if exists "lombelle_storage_public_read" on storage.objects;
drop policy if exists "lombelle_storage_admin_insert" on storage.objects;
drop policy if exists "lombelle_storage_admin_update" on storage.objects;
drop policy if exists "lombelle_storage_admin_delete" on storage.objects;

create policy "lombelle_storage_public_read" on storage.objects for select to anon, authenticated
  using (bucket_id in ('site-images','product-images'));
create policy "lombelle_storage_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('site-images','product-images') and public.is_lombelle_admin());
create policy "lombelle_storage_admin_update" on storage.objects for update to authenticated
  using (bucket_id in ('site-images','product-images') and public.is_lombelle_admin())
  with check (bucket_id in ('site-images','product-images') and public.is_lombelle_admin());
create policy "lombelle_storage_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id in ('site-images','product-images') and public.is_lombelle_admin());

-- 6) CATÁLOGO INICIAL (os 8 produtos que estavam em products-data.js) ------
insert into public.products (id,name,category,type,notes,price,size,tag,image,gallery,description,family,active) values
 ('sillage-01','Sillage No. 01','Unissex','Amadeirado · Âmbar','Bergamota, cedro e âmbar',389,'100 ml','ASSINATURA','https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=85','{}','Uma presença elegante e envolvente. A abertura cítrica encontra madeiras suaves e um fundo âmbar que permanece na pele.','amadeirado',true),
 ('nocturne-07','Nocturne No. 07','Masculino','Amadeirado · Especiado','Pimenta preta, vetiver e couro',429,'100 ml','INTENSO','https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=800&q=85','{}','Profundo e magnético, combina especiarias vibrantes com vetiver e um acorde de couro refinado.','amadeirado',true),
 ('atelier-03','Atelier No. 03','Feminino','Floral · Almiscarado','Rosa, peônia e musk branco',359,'75 ml','ELEGANTE','https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=85','{}','Uma composição floral delicada, luminosa e contemporânea. A rosa encontra a peônia em uma base macia de musk.','floral',true),
 ('lumiere-12','Lumière No. 12','Feminino','Floral · Cítrico','Neroli, mandarina e jasmim',319,'75 ml','LUMINOSO','https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?auto=format&fit=crop&w=800&q=85','{}','Fresco como a luz da manhã: cítricos delicados, neroli e jasmim em uma fragrância radiante e fácil de usar.','floral',true),
 ('bois-05','Bois No. 05','Masculino','Amadeirado · Aromático','Sálvia, sândalo e vetiver',399,'100 ml','CLÁSSICO','https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=800&q=85','{}','Uma interpretação moderna das madeiras clássicas, com sálvia aromática e sândalo cremoso.','amadeirado',true),
 ('peau-09','Peau No. 09','Unissex','Almiscarado · Suave','Algodão, íris e musk',349,'75 ml','SEGUNDA PELE','https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=800&q=85','{}','Íntimo e confortável, como uma segunda pele. Íris e musk criam uma assinatura discreta, limpa e sofisticada.','fresco',true),
 ('velours-04','Velours No. 04','Feminino','Oriental · Baunilha','Baunilha, âmbar e flor de laranjeira',419,'75 ml','ENVOLVENTE','https://images.unsplash.com/photo-1590156221284-6c7d9f9b5b24?auto=format&fit=crop&w=800&q=85','{}','Um abraço quente de baunilha e âmbar, equilibrado pela luminosidade da flor de laranjeira.','doce',true),
 ('azur-02','Azur No. 02','Unissex','Fresco · Aromático','Limão siciliano, chá e almíscar',299,'100 ml','FRESCOR','https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=85','{}','A energia dos cítricos encontra a serenidade do chá. Uma fragrância limpa, versátil e revigorante.','fresco',true)
on conflict (id) do nothing;

-- 7) PERMISSÕES BÁSICAS ---------------------------------------------------
grant select on public.products, public.site_images to anon, authenticated;
grant insert on public.newsletter_subscribers to anon, authenticated;

-- 8) NOVO ADMINISTRADOR (rode manualmente, trocando o e-mail) -------------
-- insert into public.admins (user_id) select id from auth.users where email = 'seu-email@dominio.com';

-- 9) CONFIGURAÇÕES NO PAINEL (não dá para fazer por SQL) -------------------
--  Authentication → Sign In / Providers → Email: ative "Confirm email"
--  Authentication → Policies/Password: mínimo 10 caracteres + exigir maiúsc./minúsc./número; ligar "Leaked password protection" (plano Pro)
--  Authentication → URL Configuration: Site URL = https://SEU-DOMINIO; Redirect URLs = https://SEU-DOMINIO/login.html e /recuperar-senha.html
--  Authentication → Attack Protection: ativar CAPTCHA (Turnstile/hCaptcha) — é a defesa real contra força bruta
--  Authentication → Rate Limits: revise os limites de e-mail e de tentativas de login
