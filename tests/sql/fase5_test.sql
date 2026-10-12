-- Testes da Fase 5: instituições, convites, biblioteca com moderação, cursos e planos.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('99999999-0000-0000-0000-000000000001', 'gestora@ex.com'),
  ('99999999-0000-0000-0000-000000000002', 'membro@ex.com'),
  ('99999999-0000-0000-0000-000000000003', 'autor@ex.com'),
  ('99999999-0000-0000-0000-000000000004', 'editor5@ex.com');
insert into public.user_roles (user_id, role) values ('99999999-0000-0000-0000-000000000004', 'editor'), ('99999999-0000-0000-0000-000000000004', 'admin');

set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);

-- 1. Gestora cria organização e convite.
select set_config('request.jwt.claim.sub', '99999999-0000-0000-0000-000000000001', false);
create temp table t_org as select public.criar_organizacao('Escola Estadual Teste', 'escola', 'MG', 'Belo Horizonte') as id;
do $$ declare o uuid := (select id from t_org); begin
  assert public.is_org_gestor(o), 'criadora deveria ser gestora';
  insert into public.org_convites (org_id, token_hash, expira_em) values (o, encode(sha256(convert_to('token-secreto', 'UTF8')), 'hex'), now() + interval '7 days');
  begin
    update public.organizacoes set plano_ativo = true where id = o;
    raise exception 'FALHA: gestora ativou plano';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
  begin
    delete from public.org_membros where org_id = o;
    raise exception 'FALHA: organização ficou sem gestor';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
end $$;

-- 2. Membro entra pelo convite; token errado falha.
select set_config('request.jwt.claim.sub', '99999999-0000-0000-0000-000000000002', false);
do $$ begin
  begin
    perform public.aceitar_convite('token-errado');
    raise exception 'FALHA: token errado aceito';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
  assert public.aceitar_convite('token-secreto') = (select id from t_org);
  assert public.is_org_membro((select id from t_org));
  assert not public.is_org_gestor((select id from t_org));
  assert public.plano_efetivo() = 'gratuito', 'plano efetivo sem ativação';
  -- Membro publica material na organização: publicado direto.
  insert into public.recursos (titulo, descricao, tipo, documento_tipo, conteudo, licenca, autor_id, origem, visibilidade, org_id)
  values ('Plano interno', 'Plano compartilhado com a escola', 'plano', 'plano', '{}', 'cc-by-4.0', '99999999-0000-0000-0000-000000000002', 'curadoria', 'organizacao', (select id from t_org));
  assert (select status from public.recursos where titulo = 'Plano interno') = 'publicado';
  assert (select origem from public.recursos where titulo = 'Plano interno') = 'organizacao', 'origem forçada';
end $$;

-- 3. Autor externo: publica para todos → vai para revisão; não vê material da escola; não faz curadoria.
select set_config('request.jwt.claim.sub', '99999999-0000-0000-0000-000000000003', false);
do $$ begin
  insert into public.recursos (id, titulo, descricao, tipo, documento_tipo, conteudo, licenca, autor_id, origem, status)
  values ('88888888-0000-0000-0000-000000000001', 'Sequência de frações', 'Sequência didática sobre frações', 'sequencia', 'plano', '{"tema":"x"}', 'cc-by-sa-4.0',
          '99999999-0000-0000-0000-000000000003', 'comunidade', 'publicado');
  assert (select status from public.recursos where id = '88888888-0000-0000-0000-000000000001') = 'em_revisao', 'publicou sem revisão';
  assert (select count(*) from public.recursos where titulo = 'Plano interno') = 0, 'externo vê material da escola';
  begin
    update public.recursos set status = 'publicado' where id = '88888888-0000-0000-0000-000000000001';
    raise exception 'FALHA: autor aprovou o próprio material';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.recursos (titulo, descricao, tipo, documento_tipo, conteudo, licenca, autor_id, origem, visibilidade, org_id)
    values ('Invasão', 'Tentando publicar na escola', 'plano', 'plano', '{}', 'cc-by-4.0', '99999999-0000-0000-0000-000000000003', 'organizacao', 'organizacao', (select id from t_org));
    raise exception 'FALHA: não membro publicou na organização';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.recursos (titulo, descricao, tipo, documento_tipo, conteudo, licenca, autor_id, origem)
    values ('Sem licença aberta', 'Material hospedado com licença de link', 'plano', 'plano', '{}', 'link-externo', '99999999-0000-0000-0000-000000000003', 'comunidade');
    raise exception 'FALHA: material hospedado sem licença aberta';
  exception when check_violation then null;
  end;
end $$;

-- 4. Anônimo não vê material em revisão.
reset role; set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  assert (select count(*) from public.recursos) = 0, 'anônimo vê material não publicado';
end $$;

-- 5. Editor sem MFA não aprova; com MFA aprova; edição do autor volta para revisão.
reset role; set role authenticated;
select set_config('request.jwt.claim.sub', '99999999-0000-0000-0000-000000000004', false);
do $$ begin
  -- Sem MFA, o editor nem enxerga o material em revisão: a atualização não alcança nenhuma linha.
  update public.recursos set status = 'publicado' where id = '88888888-0000-0000-0000-000000000001';
  assert (select count(*) from public.recursos where id = '88888888-0000-0000-0000-000000000001') = 0, 'editor sem MFA vê material em revisão';
end $$;
select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
update public.recursos set status = 'publicado', revisado_por = '99999999-0000-0000-0000-000000000004', revisado_em = now() where id = '88888888-0000-0000-0000-000000000001';
-- Editor ativa o plano institucional da escola.
select public.admin_plano_organizacao((select id from t_org), true);
select public.admin_definir_plano('99999999-0000-0000-0000-000000000003', 'profissional');

select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
select set_config('request.jwt.claim.sub', '99999999-0000-0000-0000-000000000003', false);
do $$ begin
  assert public.plano_efetivo() = 'profissional', 'plano definido pelo admin';
  update public.recursos set descricao = 'Sequência didática revisada sobre frações' where id = '88888888-0000-0000-0000-000000000001';
  assert (select status from public.recursos where id = '88888888-0000-0000-0000-000000000001') = 'em_revisao', 'edição não voltou para revisão';
  insert into public.recurso_denuncias (recurso_id, motivo) values ('88888888-0000-0000-0000-000000000001', 'erro_conteudo');
  insert into public.colecoes (id, nome) values ('77777777-0000-0000-0000-000000000001', 'Minha coleção');
  insert into public.colecao_itens (colecao_id, recurso_id) values ('77777777-0000-0000-0000-000000000001', '88888888-0000-0000-0000-000000000001');
end $$;

select set_config('request.jwt.claim.sub', '99999999-0000-0000-0000-000000000002', false);
do $$ begin
  assert public.plano_efetivo() = 'institucional', 'membro de escola com plano ativo';
  assert (select count(*) from public.colecoes) = 0, 'vê coleção alheia';
  begin
    insert into public.colecao_itens (colecao_id, recurso_id) values ('77777777-0000-0000-0000-000000000001', '88888888-0000-0000-0000-000000000001');
    raise exception 'FALHA: item em coleção alheia';
  exception when insufficient_privilege then null;
  end;
  -- Membro sai; gestora continua.
  delete from public.org_membros where user_id = '99999999-0000-0000-0000-000000000002';
  assert not public.is_org_membro((select id from t_org));
end $$;

-- 6. Cursos: publicação exige verificação; reconhecimento exige fonte.
reset role;
do $$ begin
  begin
    insert into public.cursos (slug, titulo, instituicao, tipo, modalidade, gratuito, link_oficial, fonte_nome, publicado)
    values ('curso-x', 'Curso de teste', 'Universidade X', 'lato_sensu', 'ead', true, 'https://x.edu.br', 'Site', true);
    raise exception 'FALHA: curso publicado sem verificação';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
  begin
    insert into public.cursos (slug, titulo, instituicao, tipo, modalidade, gratuito, link_oficial, fonte_nome, reconhecimento_conferido)
    values ('curso-y', 'Curso de teste', 'Universidade X', 'mestrado', 'presencial', true, 'https://x.edu.br', 'Site', true);
    raise exception 'FALHA: reconhecimento sem fonte';
  exception when check_violation then null;
  end;
  begin
    insert into public.cursos (slug, titulo, instituicao, tipo, modalidade, gratuito, link_oficial, fonte_nome)
    values ('curso-z', 'Curso de teste', 'Universidade X', 'livre', 'ead', false, 'https://x.edu.br', 'Site');
    raise exception 'FALHA: pago sem custo informado';
  exception when check_violation then null;
  end;
end $$;

-- 7. Excluir a organização apaga membros, convites e materiais internos.
delete from public.organizacoes where id = (select id from t_org);
do $$ begin
  assert (select count(*) from public.recursos where titulo = 'Plano interno') = 0;
  assert (select count(*) from public.org_convites) = 0;
end $$;

select 'TESTES DA FASE 5 PASSARAM' as resultado;

-- 8. Lista de membros: e-mail só para a gestão.
insert into auth.users (id, email) values ('99999999-0000-0000-0000-000000000005', 'g2@ex.com'), ('99999999-0000-0000-0000-000000000006', 'm2@ex.com');
set role authenticated;
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
select set_config('request.jwt.claim.sub', '99999999-0000-0000-0000-000000000005', false);
create temp table t_org2 as select public.criar_organizacao('Rede Municipal Teste', 'rede') as id;
reset role;
insert into public.org_membros (org_id, user_id, papel) select id, '99999999-0000-0000-0000-000000000006', 'membro' from t_org2;
grant select on t_org2 to authenticated;
set role authenticated;
do $$ begin
  assert (select count(*) from public.membros_organizacao((select id from t_org2)) where email is not null) = 2, 'gestora deveria ver e-mails';
end $$;
select set_config('request.jwt.claim.sub', '99999999-0000-0000-0000-000000000006', false);
do $$ begin
  assert (select count(*) from public.membros_organizacao((select id from t_org2))) = 2;
  assert (select count(*) from public.membros_organizacao((select id from t_org2)) where email is not null) = 0, 'membro vê e-mails';
end $$;
select set_config('request.jwt.claim.sub', '99999999-0000-0000-0000-000000000003', false);
do $$ begin
  begin
    perform * from public.membros_organizacao((select id from t_org2));
    raise exception 'FALHA: externo listou membros';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'MEMBROS OK' as resultado;

-- 9. Exclusão de conta não é bloqueada por ser a única gestora.
-- g2 é a única gestora da Rede (com m2 como membro) → m2 vira gestor; materiais de g2 somem.
reset role;
insert into public.recursos (titulo, descricao, tipo, link_url, licenca, autor_id, origem, status)
values ('Material da g2', 'Descrição suficiente aqui', 'recurso_digital', 'https://exemplo.gov.br/x', 'link-externo', '99999999-0000-0000-0000-000000000005', 'comunidade', 'em_revisao');
-- Organização onde g2 está sozinha deve ser excluída junto.
set role authenticated;
select set_config('request.jwt.claim.sub', '99999999-0000-0000-0000-000000000005', false);
create temp table t_org3 as select public.criar_organizacao('Escola Solo Teste', 'escola') as id;
reset role;
delete from auth.users where id = '99999999-0000-0000-0000-000000000005';
do $$ begin
  assert (select papel from public.org_membros where org_id = (select id from t_org2) and user_id = '99999999-0000-0000-0000-000000000006') = 'gestor', 'sucessor não virou gestor';
  assert not exists (select 1 from public.organizacoes where id = (select id from t_org3)), 'organização solo não foi excluída';
  assert not exists (select 1 from public.recursos where titulo = 'Material da g2'), 'material da conta excluída permaneceu';
end $$;
select 'EXCLUSAO DE CONTA OK' as resultado;
