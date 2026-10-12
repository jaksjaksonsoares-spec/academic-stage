# AcademiC Stage

Plataforma para professores e profissionais da educação no Brasil: concursos com fonte oficial, ferramentas pedagógicas e desenvolvimento profissional.

Este repositório contém a **Fase 1 — Fundação**: identidade visual, navegação, banco de dados com segurança por linha, autenticação completa, painel do usuário e direitos LGPD (exportar e excluir dados).

## Arquitetura

| Camada | Escolha | Por quê |
|---|---|---|
| App | Next.js 15 (App Router) + TypeScript | Páginas no servidor (bom para SEO e conexões lentas), Server Actions para formulários sem expor lógica |
| Interface | Tailwind CSS 4, componentes próprios acessíveis | Sem biblioteca pesada; foco visível, rótulos e ARIA em todos os campos |
| Banco, login e arquivos | Supabase (PostgreSQL + Auth + Storage) | Row Level Security no próprio banco: mesmo que o código tenha um erro, um usuário não lê dados de outro |
| Validação | Zod, no servidor | Toda entrada é validada antes de tocar o banco |
| Hospedagem | Vercel | Feita para Next.js; HTTPS automático |
| CI | GitHub Actions | Testa banco, tipos, unidades e build a cada envio |

### Segurança implementada

- **RLS em todas as tabelas**: cada usuário só lê e altera os próprios dados; anônimos não leem nada.
- **Papéis em tabela separada** sem permissão de escrita pelo cliente — ninguém se promove a admin.
- **Plano protegido por gatilho**: o cliente não muda o próprio plano.
- **Dupla verificação de acesso**: middleware + `requireUser()` em cada página e ação privada, validando o token no servidor de autenticação (`getUser`, não apenas o cookie).
- **CSP com nonce por requisição**, `frame-ancestors 'none'`, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **Proteção contra redirecionamento aberto** no parâmetro `next`.
- **Limitação de tentativas** em login, cadastro, recuperação e exclusão de conta.
- **Sem enumeração de contas**: cadastro e recuperação respondem igual exista ou não o e-mail.
- **Troca de senha encerra as outras sessões**; botão para sair de todos os dispositivos.
- **Exclusão de conta** exige a palavra EXCLUIR + senha e apaga tudo em cascata.
- **Chave de serviço só no servidor** (`server-only` impede importação acidental no navegador).
- Registros de segurança sem IP nem e-mail, com retenção de 180 dias.

## Rodar localmente

Requisitos: Node 20.9+.

```bash
npm install
cp .env.example .env.local   # preencha com os dados do Supabase
npm run dev                  # http://localhost:3000
npm test                     # testes unitários
```

Sem Supabase configurado o site abre normalmente; as telas de conta mostram que a autenticação está pendente e a área privada fica bloqueada.

## Ativar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (região **South America (São Paulo)**).
2. **SQL Editor** → cole e execute `supabase/migrations/20261012000000_fundacao.sql`.
   (Ou, com a CLI: `supabase link` e `supabase db push`.)
3. **Project Settings → API**: copie *Project URL*, *anon key* e *service_role key* para as variáveis de ambiente.
4. **Authentication → URL Configuration**
   - Site URL: `https://SEU-DOMINIO`
   - Redirect URLs: `https://SEU-DOMINIO/auth/confirmar` e `http://localhost:3000/auth/confirmar`
5. **Authentication → Providers → Email**: confirmação de e-mail ligada; senha mínima 10; ative *Leaked password protection* (se o seu plano tiver).
6. **Authentication → Email Templates** — para os links funcionarem mesmo abertos em outro aparelho, troque o link dos modelos:
   - *Confirm signup*: `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=email&next=/boas-vindas`
   - *Reset password*: `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery`
7. **E-mail de produção**: o servidor de e-mail padrão do Supabase tem limite baixo de envios e é só para testes. Antes de abrir ao público, configure SMTP próprio em **Authentication → SMTP Settings** (ex.: Resend), com SPF, DKIM e DMARC no seu domínio.

### Dar papel de administrador

No SQL Editor (nunca pelo site):

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'SEU-EMAIL';
```

O painel administrativo chega na fase 4; o papel já fica registrado.

## Publicar na Vercel

1. Importe este repositório em [vercel.com/new](https://vercel.com/new).
2. Em *Environment Variables*, cadastre as variáveis do `.env.example` (a `SUPABASE_SERVICE_ROLE_KEY` **sem** o prefixo `NEXT_PUBLIC_`).
3. Deploy. Depois, em *Settings → Domains*, adicione seu domínio e siga as instruções de DNS.
4. Atualize `NEXT_PUBLIC_SITE_URL` e as URLs do Supabase (passo 4 acima) com o domínio final.

## Testes

| O que | Onde | Como |
|---|---|---|
| RLS, papéis, plano protegido, exclusão em cascata | `tests/sql/rls_test.sql` | Postgres 16 com um esquema `auth` simulado (`tests/sql/supabase_stub.sql`) |
| Redirecionamento seguro, limitador, rotas protegidas, CSP | `tests/security.test.ts` | Vitest |
| Busca global e mapa de áreas | `tests/search.test.ts` | Vitest |
| Validação de formulários | `tests/validation.test.ts` | Vitest |
| Tipos e build de produção | CI | `next build` + `tsc` |

**Ainda não automatizado** (planejado): testes ponta a ponta com navegador (Playwright) contra um projeto Supabase de teste, cobrindo cadastro → confirmação → login → exclusão; auditoria automática de acessibilidade (axe).

## Estado das funcionalidades

**Concluído na Fase 1**
- Página inicial, navegação por categorias (desktop e celular), tema claro/escuro, busca global sobre as páginas existentes
- Cadastro com aceite versionado dos Termos, confirmação por e-mail, login, recuperação e troca de senha, sair, sair de todos os dispositivos
- Boas-vindas opcional com interesses → painel personalizado
- Perfil opcional (etapas, componentes, UF, municípios, objetivos)
- Preferências de notificação (canal, tópicos, frequência) salvas
- Exportar dados (JSON) e excluir conta
- Política de Privacidade, Termos de Uso e Política de Cookies (versões iniciais, para revisão jurídica)
- SEO base: metadados, `sitemap.xml`, `robots.txt`, canonical; páginas em construção marcadas como `noindex`

**Depende de credenciais ou serviços externos**
- Supabase (contas e banco) — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Exclusão automática de conta — `SUPABASE_SERVICE_ROLE_KEY`
- E-mails de confirmação em volume — SMTP próprio no Supabase
- Envio das notificações por e-mail — fase 4 (preferências já são salvas)

**Limitações conhecidas**
- O limitador de tentativas é por instância do servidor; o Supabase Auth aplica seus próprios limites globais. Para limite global, trocar por Upstash Redis (interface pronta em `src/lib/rate-limit.ts`).
- O nonce da CSP torna as páginas renderizadas por requisição (sem cache estático). Aceitável na fase 1; reavaliar quando houver tráfego.

## Próximas fases

Veja [`docs/roadmap.md`](docs/roadmap.md).
