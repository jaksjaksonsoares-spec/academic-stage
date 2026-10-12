-- Testes da Fase 3: estudos, flashcards, cota de IA e arquivos de editais.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('dddddddd-0000-0000-0000-000000000001', 'a3@ex.com'),
  ('dddddddd-0000-0000-0000-000000000002', 'b3@ex.com');

set role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

-- 1. Documento do tipo texto passa a ser aceito.
insert into public.documentos (tipo, titulo) values ('texto', 'Resposta salva');

-- 2. Plano, sessão e flashcard próprios.
insert into public.planos_estudo (id, titulo, data_prova, inicio) values ('eeeeeeee-0000-0000-0000-000000000001', 'Concurso X', '2026-12-13', '2026-10-12');
insert into public.sessoes_estudo (plano_id, data, topico_id, topico, tipo, minutos_planejados)
values ('eeeeeeee-0000-0000-0000-000000000001', '2026-10-13', 't1', 'LDB', 'estudo', 50);
insert into public.flashcards (frente, verso) values ('Artigo 205 da CF', 'Educação, direito de todos');

-- 3. Regras de integridade.
do $$ begin
  begin
    insert into public.planos_estudo (titulo, data_prova, inicio) values ('Inválido', '2026-01-01', '2026-10-12');
    raise exception 'FALHA: prova antes do início';
  exception when check_violation then null;
  end;
  begin
    insert into public.planos_estudo (titulo, dias_semana) values ('Dia inválido', '{7}');
    raise exception 'FALHA: dia da semana 7 aceito';
  exception when check_violation then null;
  end;
  begin
    update public.flashcards set caixa = 6;
    raise exception 'FALHA: caixa 6 aceita';
  exception when check_violation then null;
  end;
end $$;

-- 4. Uso de IA: registra e consulta, mas não apaga.
insert into public.ia_uso (recurso) values ('assistente');
do $$ begin
  assert (select count(*) from public.ia_uso) = 1;
  begin
    delete from public.ia_uso;
    raise exception 'FALHA: usuário apagou o próprio uso de IA';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.ia_uso) = 1;
end $$;

-- 5. Arquivos: só na própria pasta.
insert into storage.objects (bucket_id, name) values ('editais', 'dddddddd-0000-0000-0000-000000000001/a.pdf');
do $$ begin
  begin
    insert into storage.objects (bucket_id, name) values ('editais', 'dddddddd-0000-0000-0000-000000000002/b.pdf');
    raise exception 'FALHA: upload na pasta de outro usuário';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 6. Outro usuário não vê nada disso e não cria sessão em plano alheio.
select set_config('request.jwt.claim.sub', 'dddddddd-0000-0000-0000-000000000002', false);
do $$ begin
  assert (select count(*) from public.planos_estudo) = 0, 'vê plano alheio';
  assert (select count(*) from public.sessoes_estudo) = 0, 'vê sessões alheias';
  assert (select count(*) from public.flashcards) = 0, 'vê flashcards alheios';
  assert (select count(*) from public.ia_uso) = 0, 'vê uso de IA alheio';
  assert (select count(*) from storage.objects) = 0, 'vê arquivo alheio';
  begin
    insert into public.sessoes_estudo (plano_id, data, topico_id, topico, tipo, minutos_planejados)
    values ('eeeeeeee-0000-0000-0000-000000000001', '2026-10-13', 't1', 'X', 'estudo', 50);
    raise exception 'FALHA: sessão em plano alheio';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
end $$;

-- 7. Excluir o plano apaga as sessões.
select set_config('request.jwt.claim.sub', 'dddddddd-0000-0000-0000-000000000001', false);
delete from public.planos_estudo where id = 'eeeeeeee-0000-0000-0000-000000000001';
do $$ begin
  assert (select count(*) from public.sessoes_estudo) = 0, 'sessões sobraram';
  assert (select count(*) from public.flashcards) = 1, 'flashcard deveria ficar';
end $$;

reset role;
select 'TESTES DA FASE 3 PASSARAM' as resultado;
