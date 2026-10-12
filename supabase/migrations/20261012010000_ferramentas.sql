-- ═══════════════════════════════════════════════════════════════════
-- AcademiC Stage — Fase 2: concursos, links úteis, turmas e documentos
-- ═══════════════════════════════════════════════════════════════════

-- Editores e administradores podem publicar conteúdo.
create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role in ('editor', 'admin')
  );
$$;

revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to anon, authenticated;

-- ── Concursos e processos seletivos ────────────────────────────────
create table public.concursos (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique check (slug ~ '^[a-z0-9-]{3,120}$'),
  titulo                text not null check (char_length(titulo) between 5 and 200),
  orgao                 text not null check (char_length(orgao) between 2 and 200),
  esfera                text not null check (esfera in ('municipal', 'estadual', 'federal', 'privada')),
  uf                    char(2) not null check (uf in (
                          'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
                          'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  municipio             text check (municipio is null or char_length(municipio) <= 120),
  tipo_selecao          text not null check (tipo_selecao in ('concurso', 'processo_seletivo_simplificado')),
  -- Fase informada por quem cadastrou, a partir da fonte oficial.
  fase                  text not null check (fase in ('previsto', 'edital_publicado', 'encerrado', 'suspenso', 'cancelado')),
  banca                 text check (banca is null or char_length(banca) <= 120),
  modalidade            text check (modalidade is null or modalidade in ('presencial', 'remota', 'hibrida')),
  data_publicacao       date,
  inscricao_inicio      date,
  inscricao_fim         date,
  data_prova            date,
  taxa_inscricao        numeric(10,2) check (taxa_inscricao is null or taxa_inscricao >= 0),
  edital_url            text check (edital_url is null or edital_url ~ '^https?://'),
  inscricao_url         text check (inscricao_url is null or inscricao_url ~ '^https?://'),
  fonte_nome            text not null check (char_length(fonte_nome) between 2 and 200),
  fonte_url             text not null check (fonte_url ~ '^https?://'),
  conteudo_programatico text check (conteudo_programatico is null or char_length(conteudo_programatico) <= 20000),
  observacoes           text check (observacoes is null or char_length(observacoes) <= 2000),
  publicado             boolean not null default false,
  ultima_verificacao_em timestamptz,
  criado_por            uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (inscricao_fim is null or inscricao_inicio is null or inscricao_fim >= inscricao_inicio),
  -- Com edital publicado é obrigatório ter o link do edital.
  check (fase <> 'edital_publicado' or edital_url is not null)
);

create index concursos_publicos_idx on public.concursos (publicado, uf, inscricao_fim);
create index concursos_banca_idx on public.concursos (lower(banca));

create table public.concurso_cargos (
  id               bigint generated always as identity primary key,
  concurso_id      uuid not null references public.concursos (id) on delete cascade,
  cargo            text not null check (char_length(cargo) between 2 and 200),
  area             text not null check (area in ('professor', 'pedagogo', 'gestor', 'apoio', 'educacao_especial', 'outro')),
  escolaridade     text not null check (escolaridade in ('medio', 'tecnico', 'superior', 'especializacao', 'mestrado', 'doutorado')),
  formacao_exigida text check (formacao_exigida is null or char_length(formacao_exigida) <= 500),
  requisitos       text check (requisitos is null or char_length(requisitos) <= 2000),
  vagas            integer check (vagas is null or vagas >= 0),
  cadastro_reserva boolean not null default false,
  remuneracao      numeric(10,2) check (remuneracao is null or remuneracao >= 0),
  carga_horaria    text check (carga_horaria is null or char_length(carga_horaria) <= 60),
  regime           text check (regime is null or regime in ('estatutario', 'celetista', 'temporario', 'outro'))
);

create index concurso_cargos_concurso_idx on public.concurso_cargos (concurso_id);
create index concurso_cargos_area_idx on public.concurso_cargos (area, escolaridade);

create table public.concurso_verificacoes (
  id            bigint generated always as identity primary key,
  concurso_id   uuid not null references public.concursos (id) on delete cascade,
  verificado_em timestamptz not null default now(),
  verificado_por uuid references auth.users (id) on delete set null,
  fonte_url     text not null check (fonte_url ~ '^https?://'),
  observacao    text check (observacao is null or char_length(observacao) <= 1000)
);

create index concurso_verificacoes_idx on public.concurso_verificacoes (concurso_id, verificado_em desc);

-- Mantém ultima_verificacao_em e updated_at coerentes.
create or replace function public.concurso_after_verificacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.concursos
     set ultima_verificacao_em = greatest(coalesce(ultima_verificacao_em, new.verificado_em), new.verificado_em)
   where id = new.concurso_id;
  return new;
end;
$$;

create trigger concurso_verificacoes_after_insert
  after insert on public.concurso_verificacoes
  for each row execute function public.concurso_after_verificacao();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger concursos_touch before update on public.concursos
  for each row execute function public.touch_updated_at();

-- Publicar exige ao menos uma verificação registrada.
create or replace function public.concurso_publicacao_exige_verificacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.publicado and new.ultima_verificacao_em is null then
    raise exception 'Registre uma verificação na fonte oficial antes de publicar.';
  end if;
  return new;
end;
$$;

create trigger concursos_check_publicacao before insert or update on public.concursos
  for each row execute function public.concurso_publicacao_exige_verificacao();

/*
  Situação exibida ao público. Nunca "inscrições abertas" sem verificação
  recente (7 dias): nesse caso a situação é "verificacao_pendente".
*/
create or replace function public.situacao_concurso(
  _fase text, _inicio date, _fim date, _verificado timestamptz, _hoje date default (now() at time zone 'America/Sao_Paulo')::date
)
returns text
language sql
stable
as $$
  select case
    when _fase in ('previsto', 'encerrado', 'suspenso', 'cancelado') then _fase
    when _fim is not null and _fim < _hoje then 'inscricoes_encerradas'
    when _verificado is null or _verificado < (_hoje - 7)::timestamptz then 'verificacao_pendente'
    when _inicio is not null and _inicio > _hoje then 'inscricoes_em_breve'
    when _fim is not null and (_inicio is null or _inicio <= _hoje) then 'inscricoes_abertas'
    else 'edital_publicado'
  end;
$$;

create view public.concursos_publicos
with (security_invoker = true) as
  select c.*,
         public.situacao_concurso(c.fase, c.inscricao_inicio, c.inscricao_fim, c.ultima_verificacao_em) as situacao
    from public.concursos c
   where c.publicado;

alter table public.concursos enable row level security;
alter table public.concurso_cargos enable row level security;
alter table public.concurso_verificacoes enable row level security;

create policy "publico le concursos publicados" on public.concursos
  for select to anon, authenticated using (publicado or public.is_editor());
create policy "editores gerenciam concursos" on public.concursos
  for all to authenticated using (public.is_editor()) with check (public.is_editor());

create policy "publico le cargos de concursos publicados" on public.concurso_cargos
  for select to anon, authenticated
  using (exists (select 1 from public.concursos c where c.id = concurso_id and (c.publicado or public.is_editor())));
create policy "editores gerenciam cargos" on public.concurso_cargos
  for all to authenticated using (public.is_editor()) with check (public.is_editor());

create policy "publico le verificacoes de concursos publicados" on public.concurso_verificacoes
  for select to anon, authenticated
  using (exists (select 1 from public.concursos c where c.id = concurso_id and (c.publicado or public.is_editor())));
create policy "editores registram verificacoes" on public.concurso_verificacoes
  for insert to authenticated with check (public.is_editor() and verificado_por = (select auth.uid()));

-- ── Links úteis ────────────────────────────────────────────────────
create table public.links_uteis (
  id                    bigint generated always as identity primary key,
  titulo                text not null check (char_length(titulo) between 2 and 120),
  url                   text not null unique check (url ~ '^https?://'),
  descricao             text not null check (char_length(descricao) between 10 and 400),
  orgao                 text not null check (char_length(orgao) between 2 and 120),
  categoria             text not null check (categoria in (
                          'legislacao', 'concursos', 'formacao', 'planejamento',
                          'avaliacao', 'inclusao', 'pesquisa', 'tecnologia')),
  ativo                 boolean not null default true,
  ultimo_status         integer,
  ultima_verificacao_em timestamptz,
  falhas_consecutivas   integer not null default 0 check (falhas_consecutivas >= 0),
  created_at            timestamptz not null default now()
);

alter table public.links_uteis enable row level security;

create policy "publico le links ativos" on public.links_uteis
  for select to anon, authenticated using (ativo or public.is_editor());
create policy "editores gerenciam links" on public.links_uteis
  for all to authenticated using (public.is_editor()) with check (public.is_editor());

-- Fontes conferidas manualmente em 12/10/2026. A verificação automática
-- (rota /api/cron/verificar-links) preenche status e data após o deploy.
insert into public.links_uteis (titulo, url, descricao, orgao, categoria) values
  ('Ministério da Educação', 'https://www.gov.br/mec/pt-br', 'Portal do MEC: programas, notícias, legislação e ações do governo federal para a educação.', 'MEC', 'legislacao'),
  ('Constituição Federal de 1988', 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm', 'Texto compilado da Constituição. Os artigos 205 a 214 tratam da educação.', 'Presidência da República', 'legislacao'),
  ('LDB — Lei nº 9.394/1996', 'https://www.planalto.gov.br/ccivil_03/leis/l9394.htm', 'Lei de Diretrizes e Bases da Educação Nacional, texto compilado com as alterações.', 'Presidência da República', 'legislacao'),
  ('ECA — Lei nº 8.069/1990', 'https://www.planalto.gov.br/ccivil_03/leis/l8069.htm', 'Estatuto da Criança e do Adolescente, texto compilado.', 'Presidência da República', 'legislacao'),
  ('Lei Brasileira de Inclusão — Lei nº 13.146/2015', 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm', 'Estatuto da Pessoa com Deficiência; o capítulo IV trata do direito à educação.', 'Presidência da República', 'inclusao'),
  ('Base Nacional Comum Curricular', 'https://basenacionalcomum.mec.gov.br/', 'Documento oficial da BNCC, com competências e habilidades por etapa e componente.', 'MEC', 'planejamento'),
  ('Diário Oficial da União', 'https://www.in.gov.br/', 'Publicações oficiais do governo federal, incluindo editais de concursos federais.', 'Imprensa Nacional', 'concursos'),
  ('Inep', 'https://www.gov.br/inep/pt-br', 'Censo Escolar, Saeb, Ideb, Enem e demais avaliações e estatísticas educacionais.', 'Inep', 'avaliacao'),
  ('Enem — provas e gabaritos', 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos', 'Provas e gabaritos das edições anteriores do Enem, publicados pelo Inep.', 'Inep', 'avaliacao'),
  ('AVAMEC', 'https://avamec.mec.gov.br/', 'Ambiente virtual do MEC com cursos e recursos para professores e estudantes.', 'MEC', 'formacao'),
  ('MEC RED', 'https://mecred.mec.gov.br/', 'Plataforma MEC de Recursos Educacionais Digitais.', 'MEC', 'tecnologia'),
  ('Portal de Periódicos CAPES', 'https://www.periodicos.capes.gov.br/', 'Acesso a periódicos científicos, livros e bases de dados.', 'CAPES', 'pesquisa'),
  ('SciELO Brasil', 'https://www.scielo.br/', 'Biblioteca de periódicos científicos brasileiros em acesso aberto.', 'SciELO', 'pesquisa'),
  ('CAPES', 'https://www.gov.br/capes/pt-br', 'Programas de formação de professores da educação básica e pós-graduação.', 'CAPES', 'formacao'),
  ('Plataforma Lattes', 'https://lattes.cnpq.br/', 'Currículo acadêmico usado em seleções de pós-graduação e concursos de prova e títulos.', 'CNPq', 'pesquisa'),
  ('VLibras', 'https://www.gov.br/governodigital/pt-br/vlibras', 'Ferramentas gratuitas de tradução de português para Libras.', 'Governo Digital', 'inclusao');

-- ── Turmas e documentos pedagógicos ───────────────────────────────
create table public.turmas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome        text not null check (char_length(nome) between 1 and 80),
  etapa       text check (etapa is null or char_length(etapa) <= 40),
  componente  text check (componente is null or char_length(componente) <= 60),
  created_at  timestamptz not null default now()
);

create index turmas_user_idx on public.turmas (user_id);

create table public.documentos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  turma_id    uuid references public.turmas (id) on delete set null,
  tipo        text not null check (tipo in ('plano', 'atividade', 'avaliacao')),
  titulo      text not null check (char_length(titulo) between 1 and 160),
  conteudo    jsonb not null default '{}'::jsonb check (pg_column_size(conteudo) < 512000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index documentos_user_idx on public.documentos (user_id, tipo, updated_at desc);

create trigger documentos_touch before update on public.documentos
  for each row execute function public.touch_updated_at();

-- A turma de um documento precisa ser do mesmo dono.
create or replace function public.documento_turma_do_dono()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.turma_id is not null and not exists (
    select 1 from public.turmas t where t.id = new.turma_id and t.user_id = new.user_id
  ) then
    raise exception 'Turma inválida.';
  end if;
  return new;
end;
$$;

create trigger documentos_check_turma before insert or update on public.documentos
  for each row execute function public.documento_turma_do_dono();

alter table public.turmas enable row level security;
alter table public.documentos enable row level security;

create policy "usuario gerencia as proprias turmas" on public.turmas
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "usuario gerencia os proprios documentos" on public.documentos
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── Permissões ─────────────────────────────────────────────────────
revoke insert, update, delete, truncate on public.concursos, public.concurso_cargos, public.concurso_verificacoes,
  public.links_uteis, public.turmas, public.documentos from anon;
grant select on public.concursos, public.concurso_cargos, public.concurso_verificacoes, public.links_uteis to anon, authenticated;
grant select on public.concursos_publicos to anon, authenticated;
grant insert, update, delete on public.concursos, public.concurso_cargos, public.links_uteis to authenticated;
grant insert on public.concurso_verificacoes to authenticated;
grant select, insert, update, delete on public.turmas, public.documentos to authenticated;
