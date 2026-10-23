# LOMBELLE · Loja + painel (versão refatorada)

HTML + CSS + JavaScript (ES Modules), **sem etapa de build**. Back-end: Supabase (Auth, Postgres, Storage). Hospedagem: Vercel/GitHub.

- Guia completo (arquitetura, alterações por arquivo, fluxo de login, checklist de produção): **[docs/ARQUITETURA.md](docs/ARQUITETURA.md)**
- Banco de dados: **[supabase/schema.sql](supabase/schema.sql)** (rode inteiro no SQL Editor)

## Subir em 6 passos
1. Supabase → SQL Editor → cole e execute `supabase/schema.sql`.
2. Authentication → crie o seu usuário, depois rode (trocando o e-mail):
   `insert into public.admins (user_id) select id from auth.users where email = 'seu-email@dominio.com';`
3. Authentication → faça os ajustes listados na seção 9 do `schema.sql` (confirmação de e-mail, senha forte, URLs de redirecionamento, CAPTCHA).
4. Confira `js/config.js` (URL/chave públicas e `SITE.url` com o seu domínio) e troque o domínio em `index.html`, `robots.txt` e `sitemap.xml`.
5. Envie a pasta ao GitHub; a Vercel publica (o `vercel.json` aplica os cabeçalhos de segurança).
6. Entre em `/login.html` → aba **Administrador** → cadastre/edite produtos em `/admin.html`.

## Testar localmente
Os módulos ES não funcionam em `file://`. Use `npx serve .` ou a extensão Live Server.
