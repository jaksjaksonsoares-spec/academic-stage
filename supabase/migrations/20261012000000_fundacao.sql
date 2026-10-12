-- ═══════════════════════════════════════════════════════════════════
-- AcademiC Stage — Fase 1: fundação
-- Perfis, papéis, preferências, favoritos, consentimentos e eventos de
-- segurança. Toda tabela tem RLS ativa; nada é legível por anônimos.
-- ═══════════════════════════════════════════════════════════════════

-- ── Papéis ─────────────────────────────────────────────────────────
-- Papéis ficam em tabela própria, sem política de escrita para usuários:
-- ninguém consegue se promover a admin pelo cliente.
create type public.app_role as enum ('usuario', 'editor', 'admin');

create table public.user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.app_role not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users (id) on delete set null,
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;

create policy "usuario le os proprios papeis"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));

-- Verificação de papel para políticas e para o servidor.
create or replace function public.has_role(_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = _role
  );
$$;

revoke all on function public.has_role(public.app_role) from public;
grant execute on function public.has_role(public.app_role) to authenticated;

-- ── Perfis ─────────────────────────────────────────────────────────
create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  display_name            text not null default '' check (char_length(display_name) <= 80),
  uf                      char(2) check (uf is null or uf in (
                            'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
                            'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  municipios              text[] not null default '{}' check (cardinality(municipios) <= 10),
  etapas                  text[] not null default '{}' check (cardinality(etapas) <= 12),
  componentes             text[] not null default '{}' check (cardinality(componentes) <= 12),
  objetivos               text not null default '' check (char_length(objetivos) <= 500),
  interesses              text[] not null default '{}' check (cardinality(interesses) <= 8),
  onboarding_completed_at timestamptz,
  plan                    text not null default 'gratuito'
                            check (plan in ('gratuito', 'profissional', 'institucional')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "usuario le o proprio perfil"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "usuario atualiza o proprio perfil"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- O plano só muda pelo servidor (futura integração de pagamentos).
create or replace function public.protect_profile_plan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.plan is distinct from old.plan and (select auth.role()) <> 'service_role' then
    raise exception 'O plano não pode ser alterado pelo cliente.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.protect_profile_plan();

-- ── Preferências de notificação ───────────────────────────────────
create table public.notification_preferences (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  email_enabled boolean not null default false,
  in_app_enabled boolean not null default true,
  frequency     text not null default 'semanal' check (frequency in ('imediata', 'diaria', 'semanal')),
  topics        text[] not null default '{}'
                  check (topics <@ array['prazos','novos-concursos','estudos','novidades']::text[]),
  updated_at    timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "usuario le as proprias preferencias"
  on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));

create policy "usuario atualiza as proprias preferencias"
  on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── Favoritos ──────────────────────────────────────────────────────
-- Genérico: item_type indica a tabela de origem (concurso, material...),
-- preenchida nas próximas fases.
create table public.favorites (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  item_type  text not null check (item_type in ('concurso','edital','material','curso','link','ferramenta')),
  item_id    text not null check (char_length(item_id) <= 120),
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create index favorites_user_idx on public.favorites (user_id, created_at desc);

alter table public.favorites enable row level security;

create policy "usuario gerencia os proprios favoritos"
  on public.favorites for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── Consentimentos ─────────────────────────────────────────────────
-- Registra a versão do documento aceito (Termos) no cadastro.
create table public.consents (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  document    text not null check (document in ('termos', 'privacidade', 'cookies-opcionais')),
  version     text not null check (char_length(version) <= 20),
  accepted_at timestamptz not null default now()
);

create index consents_user_idx on public.consents (user_id);

alter table public.consents enable row level security;

create policy "usuario le os proprios consentimentos"
  on public.consents for select to authenticated
  using (user_id = (select auth.uid()));

-- ── Eventos de segurança ───────────────────────────────────────────
-- Sem IP, sem e-mail: só o tipo do evento e quando ocorreu.
create table public.security_events (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users (id) on delete cascade,
  event_type text not null check (event_type in (
               'cadastro','login','logout','senha_redefinida','perfil_atualizado',
               'dados_exportados','preferencias_atualizadas')),
  created_at timestamptz not null default now()
);

create index security_events_user_idx on public.security_events (user_id, created_at desc);

alter table public.security_events enable row level security;

create policy "usuario le os proprios eventos"
  on public.security_events for select to authenticated
  using (user_id = (select auth.uid()));

create policy "usuario registra eventos proprios"
  on public.security_events for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Retenção: eventos com mais de 180 dias podem ser apagados por rotina agendada.
create or replace function public.purge_old_security_events()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.security_events where created_at < now() - interval '180 days';
$$;

revoke all on function public.purge_old_security_events() from public, anon, authenticated;

-- ── Criação automática no cadastro ────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80));

  insert into public.notification_preferences (user_id) values (new.id);
  insert into public.user_roles (user_id, role) values (new.id, 'usuario');

  if (new.raw_user_meta_data ->> 'terms_version') is not null then
    insert into public.consents (user_id, document, version)
    values (new.id, 'termos', left(new.raw_user_meta_data ->> 'terms_version', 20));
  end if;

  insert into public.security_events (user_id, event_type) values (new.id, 'cadastro');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Permissões de tabela ───────────────────────────────────────────
revoke all on all tables in schema public from anon;
grant select, update on public.profiles to authenticated;
grant select, update on public.notification_preferences to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select on public.consents to authenticated;
grant select, insert on public.security_events to authenticated;
grant select on public.user_roles to authenticated;
