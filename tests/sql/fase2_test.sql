-- Testes da Fase 2: concursos, situação calculada, links, turmas e documentos.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'editora@ex.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'prof@ex.com'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'outro@ex.com');
insert into public.user_roles (user_id, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'editor');

-- 1. Situação calculada (data de referência fixa: 2026-10-12).
do $$
declare h date := '2026-10-12'; v timestamptz := '2026-10-10';
begin
  assert public.situacao_concurso('previsto', null, null, null, h) = 'previsto';
  assert public.situacao_concurso('cancelado', '2026-10-01', '2026-10-30', v, h) = 'cancelado';
  assert public.situacao_concurso('edital_publicado', '2026-10-01', '2026-10-30', v, h) = 'inscricoes_abertas';
  assert public.situacao_concurso('edital_publicado', '2026-10-20', '2026-10-30', v, h) = 'inscricoes_em_breve';
  assert public.situacao_concurso('edital_publicado', '2026-09-01', '2026-10-01', v, h) = 'inscricoes_encerradas';
  assert public.situacao_concurso('edital_publicado', null, null, v, h) = 'edital_publicado';
  -- Sem verificação recente, nunca aparece como aberto.
  assert public.situacao_concurso('edital_publicado', '2026-10-01', '2026-10-30', '2026-09-01', h) = 'verificacao_pendente',
    'aberto sem verificação recente';
  assert public.situacao_concurso('edital_publicado', '2026-10-01', '2026-10-30', null, h) = 'verificacao_pendente';
end $$;

-- Agir como editora.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
-- Editora com segundo fator concluído (a partir da Fase 4 o banco exige MFA).
select set_config('request.jwt.claims', '{"aal":"aal2"}', false);

-- 2. Editora cria concurso não publicado com cargo.
insert into public.concursos (id, slug, titulo, orgao, esfera, uf, tipo_selecao, fase, edital_url, fonte_nome, fonte_url, inscricao_inicio, inscricao_fim)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'teste-ingles-2026', 'Concurso de teste', 'Prefeitura Teste', 'municipal', 'MG',
        'concurso', 'edital_publicado', 'https://exemplo.gov.br/edital.pdf', 'Prefeitura Teste', 'https://exemplo.gov.br',
        current_date - 1, current_date + 10);
insert into public.concurso_cargos (concurso_id, cargo, area, escolaridade, vagas, remuneracao)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'Professor de Inglês', 'professor', 'superior', 3, 3500);

-- 3. Não publica sem verificação.
do $$ begin
  begin
    update public.concursos set publicado = true where id = 'bbbbbbbb-0000-0000-0000-000000000001';
    raise exception 'FALHA: publicou sem verificação';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
end $$;

-- 4. Com verificação, publica e a data é registrada.
insert into public.concurso_verificacoes (concurso_id, verificado_por, fonte_url)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'https://exemplo.gov.br/edital.pdf');
update public.concursos set publicado = true where id = 'bbbbbbbb-0000-0000-0000-000000000001';
do $$ begin
  assert (select ultima_verificacao_em from public.concursos where slug = 'teste-ingles-2026') is not null;
  assert (select situacao from public.concursos_publicos where slug = 'teste-ingles-2026') = 'inscricoes_abertas';
end $$;

-- 5. Edital publicado exige link do edital.
do $$ begin
  begin
    insert into public.concursos (slug, titulo, orgao, esfera, uf, tipo_selecao, fase, fonte_nome, fonte_url)
    values ('sem-edital', 'Sem edital link', 'Órgão', 'estadual', 'SP', 'concurso', 'edital_publicado', 'Fonte', 'https://x.gov.br');
    raise exception 'FALHA: edital publicado sem link';
  exception when check_violation then null;
  end;
end $$;

-- 6. Rascunho não publicado de outro concurso.
insert into public.concursos (slug, titulo, orgao, esfera, uf, tipo_selecao, fase, fonte_nome, fonte_url)
values ('rascunho-2026', 'Rascunho previsto', 'Órgão', 'estadual', 'SP', 'concurso', 'previsto', 'Fonte', 'https://x.gov.br');

-- 7. Professor comum: lê só publicados e não escreve.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', false);
do $$ begin
  assert (select count(*) from public.concursos) = 1, 'professor vê rascunho';
  assert (select count(*) from public.concurso_cargos) = 1;
  begin
    insert into public.concursos (slug, titulo, orgao, esfera, uf, tipo_selecao, fase, fonte_nome, fonte_url)
    values ('invasao', 'Invasão teste', 'X', 'estadual', 'SP', 'concurso', 'previsto', 'F', 'https://x.gov.br');
    raise exception 'FALHA: professor criou concurso';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.concurso_verificacoes (concurso_id, verificado_por, fonte_url)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'https://x.gov.br');
    raise exception 'FALHA: professor registrou verificação';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 8. Turmas e documentos são privados.
insert into public.turmas (id, nome) values ('cccccccc-0000-0000-0000-000000000001', '7º ano A');
insert into public.documentos (tipo, titulo, turma_id, conteudo)
values ('plano', 'Aula 1', 'cccccccc-0000-0000-0000-000000000001', '{"objetivos":"x"}');

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000003', false);
do $$ begin
  assert (select count(*) from public.documentos) = 0, 'outro usuário vê documentos';
  assert (select count(*) from public.turmas) = 0, 'outro usuário vê turmas';
  -- Não pode anexar documento à turma de outra pessoa.
  begin
    insert into public.documentos (tipo, titulo, turma_id) values ('atividade', 'X', 'cccccccc-0000-0000-0000-000000000001');
    raise exception 'FALHA: documento em turma alheia';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
end $$;

-- 9. Anônimo lê concursos publicados e links, mas nada privado.
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  assert (select count(*) from public.concursos_publicos) = 1;
  assert (select count(*) from public.links_uteis) = 16, 'links semeados';
  begin
    perform 1 from public.documentos limit 1;
    raise exception 'FALHA: anônimo leu documentos';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.links_uteis (titulo, url, descricao, orgao, categoria) values ('x', 'https://x.com', 'descrição longa', 'x', 'pesquisa');
    raise exception 'FALHA: anônimo criou link';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'TESTES DA FASE 2 PASSARAM' as resultado;

-- 10. Busca: filtros, situação e ordenação.
insert into public.concursos (id, slug, titulo, orgao, esfera, uf, municipio, tipo_selecao, fase, banca, fonte_nome, fonte_url, edital_url, inscricao_inicio, inscricao_fim)
values ('bbbbbbbb-0000-0000-0000-000000000002', 'pss-sp', 'Processo seletivo pedagogos', 'Estado SP', 'estadual', 'SP', 'Campinas',
        'processo_seletivo_simplificado', 'edital_publicado', 'Banca JCM', 'Fonte', 'https://x.gov.br', 'https://x.gov.br/e.pdf', current_date + 5, current_date + 20);
insert into public.concurso_cargos (concurso_id, cargo, area, escolaridade, remuneracao) values
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Pedagogo', 'pedagogo', 'superior', 2800);
insert into public.concurso_verificacoes (concurso_id, fonte_url) values ('bbbbbbbb-0000-0000-0000-000000000002', 'https://x.gov.br');
update public.concursos set publicado = true where id = 'bbbbbbbb-0000-0000-0000-000000000002';

set role anon;
do $$ begin
  assert (select count(*) from public.buscar_concursos()) = 2, 'total sem filtros';
  assert (select max(total) from public.buscar_concursos()) = 2;
  -- Abertas antes de "em breve".
  assert (select situacao from public.buscar_concursos() limit 1) = 'inscricoes_abertas', 'ordenação';
  assert (select count(*) from public.buscar_concursos(_q => 'pedagog')) = 1, 'busca por texto';
  assert (select count(*) from public.buscar_concursos(_q => 'campinas')) = 1, 'busca por município';
  assert (select count(*) from public.buscar_concursos(_ufs => array['MG'])) = 1, 'filtro UF';
  assert (select count(*) from public.buscar_concursos(_ufs => array['RS','SC','PR'])) = 0, 'filtro região';
  assert (select count(*) from public.buscar_concursos(_area => 'professor')) = 1, 'filtro área';
  assert (select count(*) from public.buscar_concursos(_salario => 3000)) = 1, 'filtro salário';
  assert (select count(*) from public.buscar_concursos(_banca => 'jcm')) = 1, 'filtro banca';
  assert (select count(*) from public.buscar_concursos(_tipo => 'concurso')) = 1, 'filtro tipo';
  assert (select count(*) from public.buscar_concursos(_situacao => 'inscricoes_em_breve')) = 1, 'filtro situação';
  assert (select count(*) from public.buscar_concursos(_situacao => 'inscricoes_abertas', _hoje => current_date + 30)) = 0, 'encerradas no futuro';
  assert (select count(*) from public.buscar_concursos(_limit => 1)) = 1, 'paginação';
  assert (select count(*) from public.buscar_concursos(_q => '%')) = 0, 'curinga tratado como texto não casa';
end $$;
reset role;
select 'BUSCA DE CONCURSOS OK' as resultado;
