-- Testes da Fase 4: MFA obrigatório, papéis, auditoria, suporte e notificações.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('ffffffff-0000-0000-0000-000000000001', 'admin@ex.com'),
  ('ffffffff-0000-0000-0000-000000000002', 'prof4@ex.com');
insert into public.user_roles (user_id, role) values ('ffffffff-0000-0000-0000-000000000001', 'admin');

-- Solicitações criadas pelo servidor (sem RLS para a chave de serviço).
insert into public.suporte_solicitacoes (protocolo, user_id, nome, email, categoria, assunto, descricao, email_admin_status, email_usuario_status, consentimento_em)
values
  ('AS-20261012-ABC123', 'ffffffff-0000-0000-0000-000000000002', 'Prof', 'prof4@ex.com', 'uso', 'Dúvida', 'Descrição longa o bastante', 'enviado', 'enviado', now()),
  ('AS-20261012-XYZ789', null, 'Visitante', 'v@ex.com', 'outros', 'Contato', 'Outra descrição longa', 'nao_configurado', 'nao_configurado', now());

do $$ begin
  begin
    insert into public.suporte_solicitacoes (protocolo, nome, email, categoria, assunto, descricao, email_admin_status, email_usuario_status, consentimento_em)
    values ('AS-123', 'X', 'x@ex.com', 'uso', 'Assunto', 'Descrição longa', 'enviado', 'enviado', now());
    raise exception 'FALHA: protocolo fora do formato';
  exception when check_violation then null;
  end;
end $$;

-- 1. Admin SEM segundo fator não tem poderes.
set role authenticated;
select set_config('request.jwt.claim.sub', 'ffffffff-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
do $$ begin
  assert not public.is_admin(), 'admin sem MFA reconhecido';
  assert not public.is_editor(), 'editor sem MFA reconhecido';
  assert public.tem_papel_administrativo(), 'deveria saber que tem papel';
  begin
    perform public.admin_metricas();
    raise exception 'FALHA: métricas sem MFA';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.suporte_solicitacoes) = 0, 'admin sem MFA vê solicitações';
  begin
    insert into public.concursos (slug, titulo, orgao, esfera, uf, tipo_selecao, fase, fonte_nome, fonte_url)
    values ('sem-mfa', 'Sem MFA teste', 'X', 'estadual', 'SP', 'concurso', 'previsto', 'F', 'https://x.gov.br');
    raise exception 'FALHA: escrita administrativa sem MFA';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 2. Com MFA: métricas, usuários, papéis e auditoria.
select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
do $$ begin
  assert public.is_admin();
  assert (public.admin_metricas() ->> 'suporte_abertas')::int = 2, 'métricas de suporte';
  assert (select count(*) from public.admin_usuarios()) >= 2, 'lista de usuários';
  assert (select count(*) from public.admin_usuarios('prof4')) = 1, 'busca de usuários';
  perform public.admin_definir_papel('ffffffff-0000-0000-0000-000000000002', 'editor', true);
  assert (select count(*) from public.auditoria where acao = 'papel_concedido') = 1, 'auditoria do papel';
  begin
    perform public.admin_definir_papel('ffffffff-0000-0000-0000-000000000001', 'admin', false);
    raise exception 'FALHA: removeu o próprio admin';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
  assert (select count(*) from public.suporte_solicitacoes) = 2, 'admin vê todas';
  update public.suporte_solicitacoes set status = 'respondida', resposta = 'Resolvido' where protocolo = 'AS-20261012-ABC123';
  perform public.registrar_auditoria('teste', 'x', '1', '{}');
  update public.config_plataforma set valor = '{"gratuito":{"assistente":10,"edital":1}}' where chave = 'limites_ia';
end $$;

-- 3. Professor: vê só a própria solicitação, não altera, não vê auditoria nem erros.
select set_config('request.jwt.claim.sub', 'ffffffff-0000-0000-0000-000000000002', false);
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
do $$ begin
  assert (select count(*) from public.suporte_solicitacoes) = 1, 'professor vê solicitações alheias';
  assert (select status from public.suporte_solicitacoes) = 'respondida';
  update public.suporte_solicitacoes set status = 'encerrada';
  assert (select status from public.suporte_solicitacoes) = 'respondida', 'professor alterou status';
  assert (select count(*) from public.auditoria) = 0, 'professor vê auditoria';
  assert (select count(*) from public.erros_app) = 0;
  update public.config_plataforma set valor = '{}' where chave = 'limites_ia';
  assert (select valor -> 'gratuito' ->> 'assistente' from public.config_plataforma where chave = 'limites_ia') = '10', 'professor alterou config';
  begin
    perform public.registrar_auditoria('falsa', null, null, '{}');
    raise exception 'FALHA: professor registrou auditoria';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_definir_papel('ffffffff-0000-0000-0000-000000000002', 'admin', true);
    raise exception 'FALHA: autopromoção';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.destinatarios_notificacao();
    raise exception 'FALHA: usuário leu lista de e-mails';
  exception when insufficient_privilege then null;
  end;
  -- Editor recém-nomeado só age com MFA.
  assert not public.is_editor();
end $$;

-- 4. Notificações: cada um só as próprias.
reset role;
insert into public.notificacoes (user_id, chave, titulo, link) values
  ('ffffffff-0000-0000-0000-000000000002', 'prazo:1', 'Prazo perto', '/concursos/x'),
  ('ffffffff-0000-0000-0000-000000000001', 'prazo:2', 'Outro', '/painel');
do $$ begin
  begin
    insert into public.notificacoes (user_id, chave, titulo, link) values ('ffffffff-0000-0000-0000-000000000002', 'prazo:1', 'Duplicada', '/x');
    raise exception 'FALHA: notificação duplicada';
  exception when unique_violation then null;
  end;
  begin
    insert into public.notificacoes (user_id, chave, titulo, link) values ('ffffffff-0000-0000-0000-000000000002', 'ext', 'Link externo', 'https://malicioso.com');
    raise exception 'FALHA: link externo em notificação';
  exception when check_violation then null;
  end;
end $$;
set role authenticated;
do $$ begin
  assert (select count(*) from public.notificacoes) = 1;
  update public.notificacoes set lida_em = now();
end $$;

-- 5. A rotina do servidor lê os destinatários.
reset role;
set role service_role;
do $$ begin
  perform * from public.destinatarios_notificacao();
end $$;

reset role;
select 'TESTES DA FASE 4 PASSARAM' as resultado;
