-- ═══════════════════════════════════════════════════════════════════
-- AcademiC Stage — Fase 3: editais, estudos, flashcards e uso de IA
-- ═══════════════════════════════════════════════════════════════════

-- ── Documento de texto livre (respostas salvas do assistente) ─────
alter table public.documentos drop constraint documentos_tipo_check;
alter table public.documentos add constraint documentos_tipo_check check (tipo in ('plano', 'atividade', 'avaliacao', 'texto'));

-- ── Editais analisados ─────────────────────────────────────────────
-- O PDF não é guardado: só o resultado da análise.
create table public.editais_analises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo      text not null check (char_length(titulo) between 1 and 200),
  origem      text not null check (origem in ('pdf', 'url')),
  origem_url  text check (origem_url is null or origem_url ~ '^https://'),
  paginas     integer check (paginas is null or paginas >= 0),
  metodo      text not null check (metodo in ('palavras-chave', 'ia')),
  resultado   jsonb not null check (pg_column_size(resultado) < 1000000),
  created_at  timestamptz not null default now()
);

create index editais_analises_user_idx on public.editais_analises (user_id, created_at desc);

-- ── Planos de estudo ───────────────────────────────────────────────
create table public.planos_estudo (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo          text not null check (char_length(titulo) between 1 and 160),
  data_prova      date,
  inicio          date not null default (now() at time zone 'America/Sao_Paulo')::date,
  dias_semana     smallint[] not null default '{1,2,3,4,5}' check (dias_semana <@ array[0,1,2,3,4,5,6]::smallint[] and cardinality(dias_semana) between 1 and 7),
  minutos_dia     integer not null default 60 check (minutos_dia between 15 and 720),
  minutos_sessao  integer not null default 50 check (minutos_sessao between 10 and 240),
  meta_semanal_minutos integer check (meta_semanal_minutos is null or meta_semanal_minutos between 0 and 10080),
  topicos         jsonb not null default '[]'::jsonb check (jsonb_typeof(topicos) = 'array' and jsonb_array_length(topicos) <= 400),
  edital_id       uuid references public.editais_analises (id) on delete set null,
  concurso_id     uuid references public.concursos (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (data_prova is null or data_prova >= inicio)
);

create index planos_estudo_user_idx on public.planos_estudo (user_id, created_at desc);
create trigger planos_estudo_touch before update on public.planos_estudo
  for each row execute function public.touch_updated_at();

create table public.sessoes_estudo (
  id                bigint generated always as identity primary key,
  plano_id          uuid not null references public.planos_estudo (id) on delete cascade,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data              date not null,
  topico_id         text not null check (char_length(topico_id) <= 40),
  materia           text not null default '' check (char_length(materia) <= 120),
  topico            text not null check (char_length(topico) <= 400),
  tipo              text not null check (tipo in ('estudo', 'revisao', 'revisao_geral')),
  minutos_planejados integer not null check (minutos_planejados between 5 and 480),
  concluida         boolean not null default false,
  minutos_estudados integer check (minutos_estudados is null or minutos_estudados between 0 and 720),
  dificuldade       smallint check (dificuldade is null or dificuldade between 1 and 3),
  concluida_em      timestamptz
);

create index sessoes_estudo_plano_idx on public.sessoes_estudo (plano_id, data);
create index sessoes_estudo_user_data_idx on public.sessoes_estudo (user_id, data);

-- A sessão precisa pertencer a um plano do mesmo dono.
create or replace function public.sessao_do_dono()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.planos_estudo p where p.id = new.plano_id and p.user_id = new.user_id) then
    raise exception 'Plano inválido.';
  end if;
  return new;
end;
$$;

create trigger sessoes_estudo_check before insert or update on public.sessoes_estudo
  for each row execute function public.sessao_do_dono();

-- ── Flashcards (sistema de caixas de Leitner) ─────────────────────
create table public.flashcards (
  id               bigint generated always as identity primary key,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plano_id         uuid references public.planos_estudo (id) on delete set null,
  materia          text not null default '' check (char_length(materia) <= 120),
  frente           text not null check (char_length(frente) between 1 and 1000),
  verso            text not null check (char_length(verso) between 1 and 2000),
  caixa            smallint not null default 1 check (caixa between 1 and 5),
  proxima_revisao  date not null default (now() at time zone 'America/Sao_Paulo')::date,
  acertos          integer not null default 0 check (acertos >= 0),
  erros            integer not null default 0 check (erros >= 0),
  created_at       timestamptz not null default now()
);

create index flashcards_user_revisao_idx on public.flashcards (user_id, proxima_revisao);

-- ── Uso de IA (cotas diárias) ──────────────────────────────────────
create table public.ia_uso (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recurso    text not null check (recurso in ('assistente', 'edital')),
  created_at timestamptz not null default now()
);

create index ia_uso_user_idx on public.ia_uso (user_id, recurso, created_at desc);

-- ── RLS ────────────────────────────────────────────────────────────
alter table public.editais_analises enable row level security;
alter table public.planos_estudo enable row level security;
alter table public.sessoes_estudo enable row level security;
alter table public.flashcards enable row level security;
alter table public.ia_uso enable row level security;

create policy "dono gerencia editais analisados" on public.editais_analises
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono gerencia planos de estudo" on public.planos_estudo
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono gerencia sessoes" on public.sessoes_estudo
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono gerencia flashcards" on public.flashcards
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Uso de IA: o usuário registra e consulta o próprio uso, mas não apaga (a cota não pode ser burlada).
create policy "dono registra uso de ia" on public.ia_uso
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dono consulta uso de ia" on public.ia_uso
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.editais_analises, public.planos_estudo, public.sessoes_estudo, public.flashcards, public.ia_uso from anon;
grant select, insert, update, delete on public.editais_analises, public.planos_estudo, public.sessoes_estudo, public.flashcards to authenticated;
grant select, insert on public.ia_uso to authenticated;
revoke update, delete on public.ia_uso from authenticated;

-- ── Armazenamento temporário de PDFs de editais ────────────────────
-- Bucket privado; cada usuário só acessa a própria pasta (user_id/...).
-- O arquivo é apagado logo depois da análise.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('editais', 'editais', false, 31457280, array['application/pdf'])
on conflict (id) do nothing;

create policy "dono envia edital" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'editais' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "dono le edital" on storage.objects
  for select to authenticated
  using (bucket_id = 'editais' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "dono apaga edital" on storage.objects
  for delete to authenticated
  using (bucket_id = 'editais' and (storage.foldername(name))[1] = (select auth.uid())::text);
