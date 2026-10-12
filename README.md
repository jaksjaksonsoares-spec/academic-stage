# AcademiC Stage

Plataforma para professores e profissionais da educação no Brasil: concursos com fonte oficial, ferramentas pedagógicas e desenvolvimento profissional.

Fases concluídas:

- **Fase 1 — Fundação**: identidade visual, navegação, banco com segurança por linha, autenticação completa, painel do usuário e direitos LGPD (exportar e excluir dados).
- **Fase 2 — Ferramentas essenciais**: concursos com verificação na fonte oficial, links úteis com checagem diária, planos de aula, atividades e avaliações com exportação para PDF e Word.
- **Fase 3 — Inteligência e personalização**: central de editais (PDF ou link, com páginas citadas), planos de estudo com revisões espaçadas, flashcards, assistente pedagógico com IA e recomendações de concursos pela região.

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
2. **SQL Editor** → execute, nesta ordem, os arquivos de `supabase/migrations/`:
   `20261012000000_fundacao.sql`, `20261012010000_ferramentas.sql`, `20261012020000_busca_concursos.sql`, `20261012030000_inteligencia.sql`.
   A última também cria o bucket privado `editais` no Storage, usado só durante a análise (o PDF é apagado em seguida).
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

### Dar papel de editor ou administrador

No SQL Editor (nunca pelo site):

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'SEU-EMAIL';   -- ou 'editor'
```

Editores e administradores acessam **/editor/concursos** para cadastrar concursos. O painel administrativo completo chega na fase 4.

### Cadastrar concursos

1. Em `/editor/concursos`, crie um rascunho com os dados do edital (só o que estiver na fonte; o resto fica em branco).
2. Confira o concurso na fonte oficial e **registre a verificação**.
3. Publique. Sem verificação o banco recusa a publicação.
4. Repita a verificação sempre que conferir de novo: se a última tiver mais de 7 dias, o concurso deixa de aparecer como “inscrições abertas” e passa a “aguardando nova verificação”.

## Publicar na Vercel

1. Importe este repositório em [vercel.com/new](https://vercel.com/new).
2. Em *Environment Variables*, cadastre as variáveis do `.env.example` (a `SUPABASE_SERVICE_ROLE_KEY` **sem** o prefixo `NEXT_PUBLIC_`).
3. Deploy. Depois, em *Settings → Domains*, adicione seu domínio e siga as instruções de DNS.
4. Atualize `NEXT_PUBLIC_SITE_URL` e as URLs do Supabase (passo 4 acima) com o domínio final.
5. Para ativar a IA, cadastre `ANTHROPIC_API_KEY` (crie em [console.anthropic.com](https://console.anthropic.com)). Opcional: `AI_MODEL` (padrão `claude-sonnet-5-5`). Sem a chave, o assistente e a análise de edital com IA aparecem como “pendentes de configuração”; a leitura de edital por palavras-chave funciona sem ela.
   A análise com IA de editais longos pode levar perto de um minuto: no plano gratuito da Vercel, confira o limite de duração das funções.
6. Cadastre `CRON_SECRET` (gere com `openssl rand -hex 32`). O `vercel.json` agenda a verificação diária dos links úteis às 9h UTC; a Vercel envia o segredo automaticamente.

## Testes

| O que | Onde | Como |
|---|---|---|
| RLS, papéis, plano protegido, exclusão em cascata | `tests/sql/rls_test.sql` | Postgres 16 com um esquema `auth` simulado (`tests/sql/supabase_stub.sql`) |
| Concursos: publicação exige verificação, situação calculada, busca e filtros, privacidade de turmas e documentos | `tests/sql/fase2_test.sql` | Postgres 16 |
| Caça-palavras, cruzadinha, códigos BNCC, situação de concurso | `tests/geradores.test.ts` | Vitest |
| Versões de prova, gabarito, pendências | `tests/documentos.test.ts` | Vitest |
| Exportação para Word (conteúdo conferido dentro do .docx) | `tests/docx.test.ts` | Vitest |
| Verificador de links | `tests/link-check.test.ts` | Vitest |
| Estudos, flashcards e IA: dono de cada registro, cota de IA que não pode ser apagada, arquivos só na própria pasta | `tests/sql/fase3_test.sql` | Postgres 16 com Storage simulado |
| Leitura de PDF real, análise de edital com páginas, cronograma, revisões, Leitner, dados pessoais, calendário .ics | `tests/fase3.test.ts` | Vitest |
| Chamada à IA (cabeçalhos, streaming, erros), seções com páginas citadas, proteção contra SSRF | `tests/ia.test.ts` | Vitest com API simulada |
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

**Concluído na Fase 2**
- Concursos: busca com filtros (estado, região, área, escolaridade, tipo, contratação, modalidade, banca, salário, prazo, situação), página de detalhe com cargos, datas, fonte e histórico de verificações, botão “Acompanhar” e prazos no painel
- Editor de concursos para editores: rascunho → verificação → publicação; exclusão com confirmação
- Links úteis: 16 fontes oficiais conferidas manualmente em 12/10/2026, com verificação automática diária
- Planos de aula (aula, semanal, mensal, sequência didática) com as 12 seções e conferência de formato, etapa e ano dos códigos da BNCC
- Atividades: questões (múltipla escolha, V ou F, associação, discursiva), caça-palavras e cruzadinha gerados automaticamente
- Avaliações: cabeçalho, pontuação, dificuldade, até 4 versões equivalentes, gabarito separado com resolução e critérios, fonte/tamanho/espaçamento, versão ampliada e econômica
- Turmas, duplicar, excluir, salvar com Ctrl+S e aviso de alterações não salvas
- Exportação: PDF pela página de impressão e Word (.docx) gerado no servidor

**Ainda não incluído na Fase 2**
- Alertas por e-mail de novos concursos e prazos (dependem do envio de e-mails, fase 4; a preferência já é salva)
- Questões com imagens e tabelas (dependem do armazenamento de arquivos)
- Textos oficiais das habilidades da BNCC dentro da plataforma: o professor copia do documento oficial; a plataforma confere o código
- Coleta automática de concursos: o cadastro é manual e conferido, de propósito, até haver fontes com API ou termos de uso que permitam coleta

**Concluído na Fase 3**
- Central de editais: envio de PDF (até 30 MB, apagado após a análise) ou endereço oficial; datas, conteúdos por matéria e 12 tópicos (cargo, requisitos, etapas, pontuação, documentos, desempate, recursos, isenção, pontos de atenção) com o número da página; aviso do que não foi encontrado; PDF digitalizado detectado
- Análise com IA opcional, com páginas citadas pela própria API, cota diária e queda automática para a leitura por palavras-chave
- Endereço de página oficial: lista os PDFs da página para escolher o edital; proteção contra endereços internos (SSRF)
- “Transformar este edital em plano de estudos”: conteúdos revisáveis, data da prova sugerida a partir das datas do edital
- Planos de estudo: cronograma pelos dias e minutos disponíveis, matérias intercaladas, revisões em 1, 7 e 30 dias, revisão geral antes da prova, agenda semanal, registro de minutos e dificuldade, meta semanal, relatório por matéria, reorganizar a partir de hoje, exportar para a agenda (.ics)
- Flashcards com caixas de Leitner
- Assistente pedagógico com respostas em tempo real, rótulo de conteúdo gerado por IA, bloqueio de CPF/telefone/e-mail/data de nascimento/matrícula, cota diária por plano, salvar resposta em “Meus documentos” (editar, PDF e Word)
- Recomendações: concursos do estado do perfil no painel

**Ainda não incluído na Fase 3**
- Simulados com questões de provas anteriores: dependem de banco de questões com autorização de uso
- Tabela oficial das habilidades da BNCC e imagens em questões
- Mapas conceituais e resumos editáveis específicos de estudo (resumos podem ser feitos em documentos de texto)
- O assistente não consulta a internet: não cita fontes externas atualizadas

**Depende de credenciais ou serviços externos**
- Supabase (contas e banco) — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Exclusão automática de conta e verificação de links — `SUPABASE_SERVICE_ROLE_KEY`
- Rotina diária dos links — `CRON_SECRET` + Vercel Cron
- Assistente e análise de edital com IA — `ANTHROPIC_API_KEY`
- E-mails de confirmação em volume — SMTP próprio no Supabase
- Envio das notificações por e-mail — fase 4 (preferências já são salvas)

**Limitações conhecidas**
- O limitador de tentativas é por instância do servidor; o Supabase Auth aplica seus próprios limites globais. Para limite global, trocar por Upstash Redis (interface pronta em `src/lib/rate-limit.ts`).
- O nonce da CSP torna as páginas renderizadas por requisição (sem cache estático). Aceitável na fase 1; reavaliar quando houver tráfego.

## Próximas fases

Veja [`docs/roadmap.md`](docs/roadmap.md).
