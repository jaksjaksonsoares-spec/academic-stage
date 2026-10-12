-- ═══════════════════════════════════════════════════════════════════
-- AcademiC Stage — Fase 5: biblioteca, formação, instituições e planos
-- ═══════════════════════════════════════════════════════════════════

-- ── Instituições ───────────────────────────────────────────────────
create table public.organizacoes (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null check (char_length(nome) between 3 and 160),
  tipo         text not null check (tipo in ('escola', 'rede', 'instituicao')),
  uf           char(2),
  municipio    text check (municipio is null or char_length(municipio) <= 120),
  -- Benefícios do plano institucional só valem quando a administração ativa (sem cobrança automática).
  plano_ativo  boolean not null default false,
  criado_por   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table public.org_membros (
  org_id     uuid not null references public.organizacoes (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  papel      text not null check (papel in ('gestor', 'membro')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index org_membros_user_idx on public.org_membros (user_id);

create table public.org_convites (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizacoes (id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  papel      text not null default 'membro' check (papel in ('gestor', 'membro')),
  expira_em  timestamptz not null,
  usos_max   integer not null default 50 check (usos_max between 1 and 500),
  usos       integer not null default 0 check (usos >= 0),
  revogado   boolean not null default false,
  criado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.is_org_membro(_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.org_membros where org_id = _org and user_id = (select auth.uid()));
$$;

create or replace function public.is_org_gestor(_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.org_membros where org_id = _org and user_id = (select auth.uid()) and papel = 'gestor');
$$;

grant execute on function public.is_org_membro(uuid), public.is_org_gestor(uuid) to authenticated;

alter table public.organizacoes enable row level security;
alter table public.org_membros enable row level security;
alter table public.org_convites enable row level security;

create policy "membros veem a organizacao" on public.organizacoes for select to authenticated
  using (public.is_org_membro(id) or public.is_admin());
create policy "gestor edita a organizacao" on public.organizacoes for update to authenticated
  using (public.is_org_gestor(id)) with check (public.is_org_gestor(id));
create policy "gestor exclui a organizacao" on public.organizacoes for delete to authenticated
  using (public.is_org_gestor(id));

create policy "membros veem membros" on public.org_membros for select to authenticated
  using (public.is_org_membro(org_id) or public.is_admin());
create policy "gestor gerencia membros" on public.org_membros for delete to authenticated
  using (public.is_org_gestor(org_id) or user_id = (select auth.uid()));
create policy "gestor muda papel" on public.org_membros for update to authenticated
  using (public.is_org_gestor(org_id)) with check (public.is_org_gestor(org_id));

create policy "gestor gerencia convites" on public.org_convites for all to authenticated
  using (public.is_org_gestor(org_id)) with check (public.is_org_gestor(org_id));

-- O plano só muda pela administração.
create or replace function public.protege_plano_org()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.plano_ativo is distinct from old.plano_ativo and not public.is_admin() and (select auth.role()) <> 'service_role' then
    raise exception 'O plano institucional só é ativado pela administração.';
  end if;
  return new;
end;
$$;
create trigger organizacoes_plano before update on public.organizacoes for each row execute function public.protege_plano_org();

-- Um gestor não pode deixar a organização sem gestor.
create or replace function public.mantem_um_gestor()
returns trigger language plpgsql security definer set search_path = '' as $$
declare restantes int;
begin
  if (tg_op = 'DELETE' and old.papel = 'gestor') or (tg_op = 'UPDATE' and old.papel = 'gestor' and new.papel <> 'gestor') then
    select count(*) into restantes from public.org_membros
     where org_id = old.org_id and papel = 'gestor' and user_id <> old.user_id;
    if restantes = 0 and exists (select 1 from public.organizacoes where id = old.org_id) then
      raise exception 'A organização precisa de pelo menos um gestor.';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger org_membros_gestor before update or delete on public.org_membros for each row execute function public.mantem_um_gestor();

-- Criar organização: quem cria vira gestor (limite de 5 por pessoa).
create or replace function public.criar_organizacao(_nome text, _tipo text, _uf text default null, _municipio text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare novo uuid;
begin
  if (select auth.uid()) is null then raise exception 'Não autenticado.' using errcode = '42501'; end if;
  if (select count(*) from public.org_membros where user_id = (select auth.uid()) and papel = 'gestor') >= 5 then
    raise exception 'Limite de 5 organizações por pessoa.';
  end if;
  insert into public.organizacoes (nome, tipo, uf, municipio, criado_por)
  values (trim(_nome), _tipo, nullif(_uf, ''), nullif(trim(coalesce(_municipio, '')), ''), (select auth.uid()))
  returning id into novo;
  insert into public.org_membros (org_id, user_id, papel) values (novo, (select auth.uid()), 'gestor');
  return novo;
end;
$$;

-- Aceitar convite pelo token (só o hash fica no banco).
create or replace function public.aceitar_convite(_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.org_convites;
begin
  if (select auth.uid()) is null then raise exception 'Não autenticado.' using errcode = '42501'; end if;
  select * into c from public.org_convites
   where token_hash = encode(sha256(convert_to(_token, 'UTF8')), 'hex')
   for update;
  if not found or c.revogado or c.expira_em < now() or c.usos >= c.usos_max then
    raise exception 'Convite inválido ou expirado.';
  end if;
  insert into public.org_membros (org_id, user_id, papel) values (c.org_id, (select auth.uid()), c.papel)
  on conflict (org_id, user_id) do nothing;
  update public.org_convites set usos = usos + 1 where id = c.id;
  return c.org_id;
end;
$$;

revoke all on function public.criar_organizacao(text, text, text, text), public.aceitar_convite(text) from public, anon;
grant execute on function public.criar_organizacao(text, text, text, text), public.aceitar_convite(text) to authenticated;

-- ── Plano efetivo ──────────────────────────────────────────────────
-- Institucional se a pessoa participa de organização com plano ativo; senão, o plano do perfil.
create or replace function public.plano_efetivo()
returns text language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.org_membros m join public.organizacoes o on o.id = m.org_id
                  where m.user_id = (select auth.uid()) and o.plano_ativo) then 'institucional'
    else coalesce((select plan from public.profiles where id = (select auth.uid())), 'gratuito')
  end;
$$;
grant execute on function public.plano_efetivo() to authenticated;

-- A administração pode definir o plano de um perfil (pilotos, parcerias), com auditoria.
create or replace function public.protect_profile_plan()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.plan is distinct from old.plan and (select auth.role()) <> 'service_role' and not public.is_admin() then
    raise exception 'O plano não pode ser alterado pelo cliente.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.admin_definir_plano(_usuario uuid, _plano text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if _plano not in ('gratuito', 'profissional', 'institucional') then raise exception 'Plano inválido.'; end if;
  update public.profiles set plan = _plano where id = _usuario;
  insert into public.auditoria (ator_id, acao, alvo_tipo, alvo_id, detalhes)
  values ((select auth.uid()), 'plano_definido', 'usuario', _usuario::text, jsonb_build_object('plano', _plano));
end;
$$;

create or replace function public.admin_plano_organizacao(_org uuid, _ativo boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  update public.organizacoes set plano_ativo = _ativo where id = _org;
  insert into public.auditoria (ator_id, acao, alvo_tipo, alvo_id, detalhes)
  values ((select auth.uid()), case when _ativo then 'plano_org_ativado' else 'plano_org_desativado' end, 'organizacao', _org::text, '{}');
end;
$$;

revoke all on function public.admin_definir_plano(uuid, text), public.admin_plano_organizacao(uuid, boolean) from public, anon;
grant execute on function public.admin_definir_plano(uuid, text), public.admin_plano_organizacao(uuid, boolean) to authenticated;

-- Lista de interesse nos planos pagos (não há cobrança).
create table public.interesse_planos (
  user_id    uuid not null references auth.users (id) on delete cascade,
  plano      text not null check (plano in ('profissional', 'institucional')),
  created_at timestamptz not null default now(),
  primary key (user_id, plano)
);
alter table public.interesse_planos enable row level security;
create policy "dono registra interesse" on public.interesse_planos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "admin ve interesse" on public.interesse_planos for select to authenticated using (public.is_admin());

-- Limites por plano (além dos de IA).
alter table public.config_plataforma drop constraint config_plataforma_chave_check;
alter table public.config_plataforma add constraint config_plataforma_chave_check check (chave in ('limites_ia', 'limites_planos'));
insert into public.config_plataforma (chave, valor) values
  ('limites_planos', '{"gratuito":{"documentos":300},"profissional":{"documentos":3000},"institucional":{"documentos":3000}}');

-- ── Biblioteca ─────────────────────────────────────────────────────
create table public.recursos (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null check (char_length(titulo) between 3 and 160),
  descricao       text not null check (char_length(descricao) between 10 and 1500),
  tipo            text not null check (tipo in (
                    'plano', 'atividade', 'prova', 'projeto', 'sequencia', 'modelo', 'apresentacao', 'jogo',
                    'acessivel', 'guia_estudo', 'livro', 'documento_oficial', 'legislacao', 'recurso_digital', 'ferramenta', 'formacao')),
  etapas          text[] not null default '{}' check (cardinality(etapas) <= 9),
  componente      text check (componente is null or char_length(componente) <= 80),
  documento_tipo  text check (documento_tipo is null or documento_tipo in ('plano', 'atividade', 'avaliacao', 'texto')),
  conteudo        jsonb check (conteudo is null or pg_column_size(conteudo) < 512000),
  link_url        text check (link_url is null or link_url ~ '^https://'),
  fonte_nome      text check (fonte_nome is null or char_length(fonte_nome) <= 200),
  licenca         text not null check (licenca in ('cc-by-4.0', 'cc-by-sa-4.0', 'cc-by-nc-4.0', 'cc-by-nc-sa-4.0', 'cc0', 'dominio-publico', 'link-externo')),
  autor_id        uuid references auth.users (id) on delete set null,
  autor_nome      text check (autor_nome is null or char_length(autor_nome) <= 120),
  origem          text not null check (origem in ('curadoria', 'comunidade', 'organizacao')),
  visibilidade    text not null default 'publica' check (visibilidade in ('publica', 'organizacao')),
  org_id          uuid references public.organizacoes (id) on delete cascade,
  status          text not null default 'em_revisao' check (status in ('em_revisao', 'publicado', 'recusado', 'arquivado')),
  motivo_recusa   text check (motivo_recusa is null or char_length(motivo_recusa) <= 500),
  revisado_por    uuid references auth.users (id) on delete set null,
  revisado_em     timestamptz,
  copias          integer not null default 0 check (copias >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (conteudo is not null or link_url is not null),
  check ((conteudo is null) = (documento_tipo is null)),
  check (visibilidade = 'publica' or org_id is not null),
  -- Material hospedado precisa de licença aberta; link externo só aponta para a fonte.
  check (link_url is not null or licenca <> 'link-externo')
);

create index recursos_publicos_idx on public.recursos (status, visibilidade, tipo, created_at desc);
create index recursos_autor_idx on public.recursos (autor_id);
create index recursos_org_idx on public.recursos (org_id);
create index recursos_busca_idx on public.recursos using gin (to_tsvector('portuguese', titulo || ' ' || descricao));
create trigger recursos_touch before update on public.recursos for each row execute function public.touch_updated_at();

/*
  Moderação: publicação pública da comunidade sempre passa por revisão;
  material de organização é publicado direto para os membros; curadoria
  só por editores. Editar um material publico publicado volta para revisão.
*/
create or replace function public.recurso_moderacao()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_editor() then return new; end if;
  if tg_op = 'INSERT' then
    if new.visibilidade = 'organizacao' then
      if not public.is_org_membro(new.org_id) then raise exception 'Você não participa desta organização.' using errcode = '42501'; end if;
      new.origem := 'organizacao';
      new.status := 'publicado';
    elsif new.origem = 'curadoria' then
      raise exception 'Somente editores fazem curadoria.' using errcode = '42501';
    else
      new.origem := 'comunidade';
      new.status := 'em_revisao';
    end if;
    new.revisado_por := null; new.revisado_em := null; new.motivo_recusa := null; new.copias := 0;
  else
    if new.status is distinct from old.status and not (new.status = 'arquivado') and not public.is_org_gestor(new.org_id) then
      raise exception 'Só a revisão editorial muda a situação.' using errcode = '42501';
    end if;
    if new.visibilidade = 'publica' and old.status = 'publicado' and new.status <> 'arquivado'
       and (new.titulo, new.descricao, new.conteudo, new.link_url, new.licenca) is distinct from (old.titulo, old.descricao, old.conteudo, old.link_url, old.licenca) then
      new.status := 'em_revisao';
    end if;
    new.origem := old.origem; new.autor_id := old.autor_id; new.copias := old.copias;
    new.revisado_por := old.revisado_por; new.revisado_em := old.revisado_em;
  end if;
  return new;
end;
$$;
create trigger recursos_moderacao before insert or update on public.recursos for each row execute function public.recurso_moderacao();

alter table public.recursos enable row level security;
create policy "ver recursos" on public.recursos for select to anon, authenticated using (
  (status = 'publicado' and visibilidade = 'publica')
  or autor_id = (select auth.uid())
  or (visibilidade = 'organizacao' and status = 'publicado' and public.is_org_membro(org_id))
  or (org_id is not null and public.is_org_gestor(org_id))
  or public.is_editor()
);
create policy "autor publica" on public.recursos for insert to authenticated with check (autor_id = (select auth.uid()));
create policy "autor, gestor ou editor altera" on public.recursos for update to authenticated
  using (autor_id = (select auth.uid()) or public.is_editor() or (org_id is not null and public.is_org_gestor(org_id)))
  with check (autor_id = (select auth.uid()) or public.is_editor() or (org_id is not null and public.is_org_gestor(org_id)));
create policy "autor, gestor ou editor remove" on public.recursos for delete to authenticated
  using (autor_id = (select auth.uid()) or public.is_editor() or (org_id is not null and public.is_org_gestor(org_id)));

-- Contador de cópias (qualquer pessoa que consegue ver o material).
create or replace function public.registrar_copia_recurso(_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.recursos set copias = copias + 1
   where id = _id and status = 'publicado'
     and (visibilidade = 'publica' or public.is_org_membro(org_id));
$$;
grant execute on function public.registrar_copia_recurso(uuid) to authenticated;

create table public.recurso_denuncias (
  id         bigint generated always as identity primary key,
  recurso_id uuid not null references public.recursos (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  motivo     text not null check (motivo in ('direitos_autorais', 'erro_conteudo', 'inadequado', 'dados_pessoais', 'outro')),
  detalhe    text check (detalhe is null or char_length(detalhe) <= 1000),
  resolvida  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (recurso_id, user_id)
);
alter table public.recurso_denuncias enable row level security;
create policy "usuario denuncia" on public.recurso_denuncias for insert to authenticated with check (user_id = (select auth.uid()));
create policy "editor ve denuncias" on public.recurso_denuncias for select to authenticated using (public.is_editor() or user_id = (select auth.uid()));
create policy "editor resolve denuncias" on public.recurso_denuncias for update to authenticated using (public.is_editor()) with check (public.is_editor());

create table public.colecoes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome       text not null check (char_length(nome) between 1 and 80),
  created_at timestamptz not null default now()
);
create table public.colecao_itens (
  colecao_id uuid not null references public.colecoes (id) on delete cascade,
  recurso_id uuid not null references public.recursos (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (colecao_id, recurso_id)
);
alter table public.colecoes enable row level security;
alter table public.colecao_itens enable row level security;
create policy "dono gerencia colecoes" on public.colecoes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono gerencia itens" on public.colecao_itens for all to authenticated
  using (exists (select 1 from public.colecoes c where c.id = colecao_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.colecoes c where c.id = colecao_id and c.user_id = (select auth.uid())));

-- ── Formação continuada ────────────────────────────────────────────
create table public.cursos (
  id                       uuid primary key default gen_random_uuid(),
  slug                     text not null unique check (slug ~ '^[a-z0-9-]{3,120}$'),
  titulo                   text not null check (char_length(titulo) between 5 and 200),
  instituicao              text not null check (char_length(instituicao) between 2 and 200),
  tipo                     text not null check (tipo in ('livre', 'extensao', 'aperfeicoamento', 'lato_sensu', 'mestrado', 'doutorado', 'evento', 'webinar', 'bolsa', 'programa', 'selecao_academica')),
  modalidade               text not null check (modalidade in ('presencial', 'ead', 'hibrido')),
  gratuito                 boolean not null,
  custo                    text check (custo is null or char_length(custo) <= 200),
  carga_horaria            integer check (carga_horaria is null or carga_horaria between 1 and 10000),
  duracao                  text check (duracao is null or char_length(duracao) <= 100),
  publico                  text check (publico is null or char_length(publico) <= 500),
  requisitos               text check (requisitos is null or char_length(requisitos) <= 2000),
  inscricao_fim            date,
  inicio                   date,
  certificacao             text check (certificacao is null or char_length(certificacao) <= 500),
  -- Só verdadeiro quando o editor conferiu o reconhecimento (ex.: e-MEC, CAPES).
  reconhecimento_conferido boolean not null default false,
  reconhecimento_fonte     text check (reconhecimento_fonte is null or reconhecimento_fonte ~ '^https://'),
  uf                       char(2),
  link_oficial             text not null check (link_oficial ~ '^https://'),
  fonte_nome               text not null check (char_length(fonte_nome) between 2 and 200),
  publicado                boolean not null default false,
  ultima_verificacao_em    timestamptz,
  criado_por               uuid references auth.users (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (not reconhecimento_conferido or reconhecimento_fonte is not null),
  check (gratuito or custo is not null)
);
create index cursos_publicos_idx on public.cursos (publicado, tipo, inscricao_fim);
create trigger cursos_touch before update on public.cursos for each row execute function public.touch_updated_at();

create or replace function public.curso_publicacao_exige_verificacao()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.publicado and new.ultima_verificacao_em is null then
    raise exception 'Confira o curso na fonte oficial antes de publicar.';
  end if;
  return new;
end;
$$;
create trigger cursos_check_publicacao before insert or update on public.cursos for each row execute function public.curso_publicacao_exige_verificacao();

alter table public.cursos enable row level security;
create policy "publico le cursos publicados" on public.cursos for select to anon, authenticated using (publicado or public.is_editor());
create policy "editores gerenciam cursos" on public.cursos for all to authenticated using (public.is_editor()) with check (public.is_editor());

-- Favoritos passam a aceitar recursos da biblioteca e cursos (já previstos).

-- ── Permissões ─────────────────────────────────────────────────────
revoke all on public.organizacoes, public.org_membros, public.org_convites, public.recursos, public.recurso_denuncias,
  public.colecoes, public.colecao_itens, public.cursos, public.interesse_planos from anon;
grant select on public.recursos, public.cursos to anon;
grant select, update, delete on public.organizacoes to authenticated;
grant select, update, delete on public.org_membros to authenticated;
grant select, insert, update, delete on public.org_convites, public.recursos, public.colecoes, public.colecao_itens, public.cursos, public.interesse_planos to authenticated;
grant select, insert, update on public.recurso_denuncias to authenticated;

-- Membros com nome (para todos os membros) e e-mail (só para a gestão).
create or replace function public.membros_organizacao(_org uuid)
returns table (user_id uuid, nome text, email text, papel text, desde timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_org_membro(_org) or public.is_admin()) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  return query
    select m.user_id, coalesce(nullif(p.display_name, ''), 'Membro'),
           case when public.is_org_gestor(_org) or public.is_admin() then u.email::text else null end,
           m.papel, m.created_at
      from public.org_membros m
      join auth.users u on u.id = m.user_id
      left join public.profiles p on p.id = m.user_id
     where m.org_id = _org
     order by m.papel, p.display_name;
end;
$$;
revoke all on function public.membros_organizacao(uuid) from public, anon;
grant execute on function public.membros_organizacao(uuid) to authenticated;

-- ── Exclusão de conta ──────────────────────────────────────────────
-- Antes de apagar a conta: (1) organizações em que a pessoa é a única gestora passam
-- para o membro mais antigo ou, sem outros membros, são excluídas — assim a exclusão
-- da conta nunca fica bloqueada; (2) materiais que ela compartilhou saem da biblioteca
-- (curadoria editorial permanece, sem vínculo com a conta).
create or replace function public.antes_de_excluir_conta()
returns trigger language plpgsql security definer set search_path = '' as $$
declare o record; sucessor uuid;
begin
  for o in
    select m.org_id from public.org_membros m
     where m.user_id = old.id and m.papel = 'gestor'
       and not exists (select 1 from public.org_membros g where g.org_id = m.org_id and g.papel = 'gestor' and g.user_id <> old.id)
  loop
    select user_id into sucessor from public.org_membros
     where org_id = o.org_id and user_id <> old.id order by created_at, user_id limit 1;
    if sucessor is null then
      delete from public.organizacoes where id = o.org_id;
    else
      update public.org_membros set papel = 'gestor' where org_id = o.org_id and user_id = sucessor;
    end if;
  end loop;
  delete from public.recursos where autor_id = old.id and origem <> 'curadoria';
  return old;
end;
$$;
revoke all on function public.antes_de_excluir_conta() from public, anon, authenticated;
create trigger antes_de_excluir_conta before delete on auth.users for each row execute function public.antes_de_excluir_conta();
