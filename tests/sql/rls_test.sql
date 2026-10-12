-- Testes de RLS e regras do banco. Cada bloco falha com exceção se a regra não valer.
\set ON_ERROR_STOP on

-- Dois usuários criados como faria o Supabase Auth.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@ex.com', '{"display_name":"Ana","terms_version":"2026-10"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@ex.com', '{"display_name":"Bruno"}');

-- 1. Gatilho de cadastro criou perfil, preferências, papel, consentimento e evento.
do $$ begin
  assert (select count(*) from public.profiles) = 2, 'perfis não criados';
  assert (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 'Ana', 'nome não copiado';
  assert (select count(*) from public.notification_preferences) = 2, 'preferências não criadas';
  assert (select count(*) from public.user_roles where role = 'usuario') = 2, 'papéis não criados';
  assert (select count(*) from public.consents) = 1, 'consentimento deveria existir só para quem enviou versão';
  assert (select count(*) from public.security_events where event_type = 'cadastro') = 2, 'eventos não criados';
end $$;

-- Agir como Ana (usuária autenticada).
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

-- 2. Ana só enxerga o próprio perfil.
do $$ begin
  assert (select count(*) from public.profiles) = 1, 'Ana vê perfis de outros';
  assert (select count(*) from public.notification_preferences) = 1, 'Ana vê preferências de outros';
end $$;

-- 3. Ana atualiza o próprio perfil; não consegue alterar o de Bruno.
update public.profiles set uf = 'SP', etapas = '{medio}' where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set display_name = 'hack' where id = '22222222-2222-2222-2222-222222222222';
do $$ begin
  assert (select uf from public.profiles) = 'SP', 'atualização própria falhou';
end $$;

-- 4. Ana não consegue mudar o próprio plano.
do $$ begin
  begin
    update public.profiles set plan = 'profissional' where id = '11111111-1111-1111-1111-111111111111';
    raise exception 'FALHA: plano alterado pelo cliente';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
end $$;

-- 5. Ana não consegue se dar papel de admin.
do $$ begin
  begin
    insert into public.user_roles (user_id, role) values ('11111111-1111-1111-1111-111111111111', 'admin');
    raise exception 'FALHA: autopromoção a admin';
  exception when insufficient_privilege then null;
  end;
  assert public.has_role('usuario'), 'has_role usuario deveria ser verdadeiro';
  assert not public.has_role('admin'), 'has_role admin deveria ser falso';
end $$;

-- 6. Favoritos: Ana cria os próprios e não cria em nome de Bruno.
insert into public.favorites (user_id, item_type, item_id) values ('11111111-1111-1111-1111-111111111111', 'link', 'mec');
do $$ begin
  begin
    insert into public.favorites (user_id, item_type, item_id) values ('22222222-2222-2222-2222-222222222222', 'link', 'x');
    raise exception 'FALHA: favorito em nome de outro';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 7. UF inválida e tópico de notificação inválido são rejeitados.
do $$ begin
  begin
    update public.profiles set uf = 'XX' where id = '11111111-1111-1111-1111-111111111111';
    raise exception 'FALHA: UF inválida aceita';
  exception when check_violation then null;
  end;
  begin
    update public.notification_preferences set topics = '{spam}' where user_id = '11111111-1111-1111-1111-111111111111';
    raise exception 'FALHA: tópico inválido aceito';
  exception when check_violation then null;
  end;
end $$;

-- 8. Evento de segurança só em nome próprio.
insert into public.security_events (user_id, event_type) values ('11111111-1111-1111-1111-111111111111', 'login');
do $$ begin
  begin
    insert into public.security_events (user_id, event_type) values ('22222222-2222-2222-2222-222222222222', 'login');
    raise exception 'FALHA: evento em nome de outro';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 9. Anônimo não lê nada.
reset role;
set role anon;
do $$ begin
  begin
    perform 1 from public.profiles limit 1;
    raise exception 'FALHA: anônimo leu perfis';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 10. Excluir o usuário apaga todos os dados ligados a ele (cascata).
reset role;
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
do $$ begin
  assert (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 0, 'perfil sobrou';
  assert (select count(*) from public.favorites) = 0, 'favoritos sobraram';
  assert (select count(*) from public.security_events where user_id = '11111111-1111-1111-1111-111111111111') = 0, 'eventos sobraram';
  assert (select count(*) from public.consents) = 0, 'consentimentos sobraram';
end $$;

select 'TODOS OS TESTES DE BANCO PASSARAM' as resultado;
