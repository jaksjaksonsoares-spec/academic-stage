-- ═══════════════════════════════════════════════════════════════════
-- AcademiC Stage — Fase 4: atendimento, administração e notificações
-- ═══════════════════════════════════════════════════════════════════

-- ── MFA obrigatório para funções administrativas ───────────────────
-- A sessão precisa ter passado pelo segundo fator (aal2). A regra fica no
-- banco: mesmo um erro na interface não libera escrita administrativa.
create or replace function public.aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.aal2() and exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role in ('editor', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.aal2() and exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Saber se o usuário TEM o papel (sem exigir MFA) serve só para mostrar o caminho do MFA.
create or replace function public.tem_papel_administrativo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role in ('editor', 'admin'));
$$;

revoke all on function public.aal2(), public.is_admin(), public.tem_papel_administrativo() from public;
grant execute on function public.aal2(), public.is_admin(), public.tem_papel_administrativo() to anon, authenticated;

-- ── Auditoria ──────────────────────────────────────────────────────
create table public.auditoria (
  id         bigint generated always as identity primary key,
  ator_id    uuid references auth.users (id) on delete set null,
  acao       text not null check (char_length(acao) between 3 and 80),
  alvo_tipo  text check (alvo_tipo is null or char_length(alvo_tipo) <= 40),
  alvo_id    text check (alvo_id is null or char_length(alvo_id) <= 120),
  detalhes   jsonb not null default '{}'::jsonb check (pg_column_size(detalhes) < 20000),
  created_at timestamptz not null default now()
);

create index auditoria_created_idx on public.auditoria (created_at desc);
alter table public.auditoria enable row level security;
create policy "admin le auditoria" on public.auditoria for select to authenticated using (public.is_admin());

create or replace function public.registrar_auditoria(_acao text, _alvo_tipo text, _alvo_id text, _detalhes jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_editor() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  insert into public.auditoria (ator_id, acao, alvo_tipo, alvo_id, detalhes)
  values ((select auth.uid()), _acao, _alvo_tipo, _alvo_id, coalesce(_detalhes, '{}'::jsonb));
end;
$$;

revoke all on function public.registrar_auditoria(text, text, text, jsonb) from public, anon;
grant execute on function public.registrar_auditoria(text, text, text, jsonb) to authenticated;

-- ── Atendimento ────────────────────────────────────────────────────
create table public.suporte_solicitacoes (
  id                    uuid primary key default gen_random_uuid(),
  protocolo             text not null unique check (protocolo ~ '^AS-\d{8}-[A-Z0-9]{6}$'),
  user_id               uuid references auth.users (id) on delete set null,
  nome                  text not null check (char_length(nome) between 2 and 120),
  email                 text not null check (char_length(email) between 5 and 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  categoria             text not null check (categoria in ('uso', 'tecnico', 'concursos', 'materiais', 'sugestao', 'parceria', 'financeiro', 'privacidade', 'outros')),
  assunto               text not null check (char_length(assunto) between 3 and 160),
  descricao             text not null check (char_length(descricao) between 10 and 5000),
  anexos                jsonb not null default '[]'::jsonb check (jsonb_typeof(anexos) = 'array' and jsonb_array_length(anexos) <= 3),
  status                text not null default 'aberta' check (status in ('aberta', 'em_andamento', 'respondida', 'encerrada')),
  email_admin_status    text not null check (email_admin_status in ('enviado', 'falhou', 'nao_configurado')),
  email_admin_id        text,
  email_usuario_status  text not null check (email_usuario_status in ('enviado', 'falhou', 'nao_configurado')),
  resposta              text check (resposta is null or char_length(resposta) <= 10000),
  respondida_em         timestamptz,
  respondida_por        uuid references auth.users (id) on delete set null,
  consentimento_em      timestamptz not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index suporte_user_idx on public.suporte_solicitacoes (user_id, created_at desc);
create index suporte_status_idx on public.suporte_solicitacoes (status, created_at desc);
create index suporte_email_idx on public.suporte_solicitacoes (lower(email), created_at desc);
create trigger suporte_touch before update on public.suporte_solicitacoes for each row execute function public.touch_updated_at();

alter table public.suporte_solicitacoes enable row level security;
-- Inserção só pelo servidor (chave de serviço), depois de validar e filtrar spam.
create policy "usuario acompanha as proprias solicitacoes" on public.suporte_solicitacoes
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "admin atualiza solicitacoes" on public.suporte_solicitacoes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Anexos: bucket privado, sem políticas para usuários (acesso só pelo servidor).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('suporte', 'suporte', false, 5242880, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- ── Notificações no site ───────────────────────────────────────────
create table public.notificacoes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  chave      text not null check (char_length(chave) <= 200),
  titulo     text not null check (char_length(titulo) <= 200),
  corpo      text not null default '' check (char_length(corpo) <= 2000),
  link       text check (link is null or link ~ '^/'),
  lida_em    timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, chave)
);

create index notificacoes_user_idx on public.notificacoes (user_id, created_at desc);
alter table public.notificacoes enable row level security;
create policy "usuario le as proprias notificacoes" on public.notificacoes for select to authenticated using (user_id = (select auth.uid()));
create policy "usuario marca as proprias notificacoes" on public.notificacoes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "usuario apaga as proprias notificacoes" on public.notificacoes for delete to authenticated using (user_id = (select auth.uid()));

-- Destinatários das notificações: só a rotina do servidor (service_role) pode chamar.
create or replace function public.destinatarios_notificacao()
returns table (user_id uuid, email text, email_enabled boolean, in_app_enabled boolean, frequency text, topics text[])
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email::text, p.email_enabled, p.in_app_enabled, p.frequency, p.topics
    from auth.users u
    join public.notification_preferences p on p.user_id = u.id
   where cardinality(p.topics) > 0 and (p.email_enabled or p.in_app_enabled);
$$;

revoke all on function public.destinatarios_notificacao() from public, anon, authenticated;
grant execute on function public.destinatarios_notificacao() to service_role;

-- ── Registro de falhas técnicas ────────────────────────────────────
create table public.erros_app (
  id         bigint generated always as identity primary key,
  rota       text check (rota is null or char_length(rota) <= 300),
  mensagem   text not null check (char_length(mensagem) <= 1000),
  digest     text check (digest is null or char_length(digest) <= 100),
  created_at timestamptz not null default now()
);

create index erros_app_created_idx on public.erros_app (created_at desc);
alter table public.erros_app enable row level security;
create policy "admin le erros" on public.erros_app for select to authenticated using (public.is_admin());

-- ── Configurações da plataforma ────────────────────────────────────
create table public.config_plataforma (
  chave      text primary key check (chave in ('limites_ia')),
  valor      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.config_plataforma enable row level security;
create policy "todos leem configuracoes" on public.config_plataforma for select to anon, authenticated using (true);
create policy "admin altera configuracoes" on public.config_plataforma for update to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.config_plataforma (chave, valor) values
  ('limites_ia', '{"gratuito":{"assistente":20,"edital":3},"profissional":{"assistente":150,"edital":20},"institucional":{"assistente":300,"edital":40}}');

-- ── Funções do painel administrativo ───────────────────────────────
create or replace function public.admin_metricas()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  hoje timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
  if not public.is_admin() then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  return jsonb_build_object(
    'usuarios', (select count(*) from auth.users),
    'usuarios_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'ativos_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'documentos', (select count(*) from public.documentos),
    'planos_estudo', (select count(*) from public.planos_estudo),
    'editais_analisados', (select count(*) from public.editais_analises),
    'concursos_publicados', (select count(*) from public.concursos where publicado),
    'concursos_verificacao_pendente', (select count(*) from public.concursos where publicado and fase = 'edital_publicado'
                                         and (inscricao_fim is null or inscricao_fim >= (now() at time zone 'America/Sao_Paulo')::date)
                                         and (ultima_verificacao_em is null or ultima_verificacao_em < now() - interval '7 days')),
    'links_fora_do_ar', (select count(*) from public.links_uteis where falhas_consecutivas > 0),
    'suporte_abertas', (select count(*) from public.suporte_solicitacoes where status in ('aberta', 'em_andamento')),
    'suporte_email_falhou', (select count(*) from public.suporte_solicitacoes where email_admin_status <> 'enviado' and status = 'aberta'),
    'erros_24h', (select count(*) from public.erros_app where created_at > now() - interval '24 hours'),
    'ia_hoje', (select count(*) from public.ia_uso where created_at >= hoje)
  );
end;
$$;

create or replace function public.admin_usuarios(_busca text default null, _limit integer default 50, _offset integer default 0)
returns table (id uuid, email text, display_name text, plano text, papeis text[], criado_em timestamptz, ultimo_acesso timestamptz, total bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  termo text := nullif(replace(replace(replace(trim(coalesce(_busca, '')), '\', '\\'), '%', '\%'), '_', '\_'), '');
begin
  if not public.is_admin() then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  return query
    select u.id, u.email::text, p.display_name, p.plan,
           coalesce((select array_agg(r.role::text order by r.role) from public.user_roles r where r.user_id = u.id), '{}'),
           u.created_at, u.last_sign_in_at, count(*) over ()
      from auth.users u
      left join public.profiles p on p.id = u.id
     where termo is null or u.email ilike '%' || termo || '%' or p.display_name ilike '%' || termo || '%'
     order by u.created_at desc
     limit least(greatest(_limit, 1), 100) offset greatest(_offset, 0);
end;
$$;

create or replace function public.admin_definir_papel(_usuario uuid, _papel public.app_role, _ativo boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if _papel = 'usuario' then raise exception 'O papel básico não pode ser alterado.'; end if;
  if _usuario = (select auth.uid()) and _papel = 'admin' and not _ativo then
    raise exception 'Você não pode remover o seu próprio acesso de administrador.';
  end if;
  if _ativo then
    insert into public.user_roles (user_id, role, granted_by) values (_usuario, _papel, (select auth.uid())) on conflict do nothing;
  else
    delete from public.user_roles where user_id = _usuario and role = _papel;
  end if;
  insert into public.auditoria (ator_id, acao, alvo_tipo, alvo_id, detalhes)
  values ((select auth.uid()), case when _ativo then 'papel_concedido' else 'papel_removido' end, 'usuario', _usuario::text, jsonb_build_object('papel', _papel));
end;
$$;

revoke all on function public.admin_metricas(), public.admin_usuarios(text, integer, integer), public.admin_definir_papel(uuid, public.app_role, boolean) from public, anon;
grant execute on function public.admin_metricas(), public.admin_usuarios(text, integer, integer), public.admin_definir_papel(uuid, public.app_role, boolean) to authenticated;

-- Retenção: falhas técnicas por 30 dias.
create or replace function public.purge_old_erros()
returns void language sql security definer set search_path = '' as $$
  delete from public.erros_app where created_at < now() - interval '30 days';
$$;
revoke all on function public.purge_old_erros() from public, anon, authenticated;

-- ── Permissões ─────────────────────────────────────────────────────
revoke all on public.auditoria, public.suporte_solicitacoes, public.notificacoes, public.erros_app, public.config_plataforma from anon;
grant select on public.config_plataforma to anon;
grant select on public.auditoria, public.erros_app, public.config_plataforma to authenticated;
grant select, update on public.suporte_solicitacoes to authenticated;
grant select, update, delete on public.notificacoes to authenticated;
grant update on public.config_plataforma to authenticated;
