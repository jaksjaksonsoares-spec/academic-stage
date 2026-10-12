-- Busca de concursos com todos os filtros num só lugar (testável e coerente
-- com public.situacao_concurso). Roda com as permissões de quem chama (RLS vale).
create or replace function public.buscar_concursos(
  _q            text    default null,
  _ufs          text[]  default null,
  _tipo         text    default null,
  _modalidade   text    default null,
  _banca        text    default null,
  _ate          date    default null,
  _area         text    default null,
  _escolaridade text    default null,
  _regime       text    default null,
  _salario      numeric default null,
  _situacao     text    default null,
  _limit        integer default 20,
  _offset       integer default 0,
  _hoje         date    default (now() at time zone 'America/Sao_Paulo')::date
)
returns table (id uuid, situacao text, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with p as (
    -- Escapa curingas: o que a pessoa digita é sempre texto literal.
    select nullif(replace(replace(replace(trim(_q), '\', '\\'), '%', '\%'), '_', '\_'), '') as q,
           nullif(replace(replace(replace(trim(_banca), '\', '\\'), '%', '\%'), '_', '\_'), '') as banca
  ), base as (
    select c.id,
           c.inscricao_fim,
           c.updated_at,
           public.situacao_concurso(c.fase, c.inscricao_inicio, c.inscricao_fim, c.ultima_verificacao_em, _hoje) as situacao
      from public.concursos c, p
     where c.publicado
       and (p.q is null or c.titulo ilike '%' || p.q || '%' or c.orgao ilike '%' || p.q || '%' or c.municipio ilike '%' || p.q || '%')
       and (_ufs is null or c.uf = any (_ufs))
       and (_tipo is null or c.tipo_selecao = _tipo)
       and (_modalidade is null or c.modalidade = _modalidade)
       and (p.banca is null or c.banca ilike '%' || p.banca || '%')
       and (_ate is null or c.inscricao_fim <= _ate)
       and (
         (_area is null and _escolaridade is null and _regime is null and _salario is null)
         or exists (
           select 1 from public.concurso_cargos k
            where k.concurso_id = c.id
              and (_area is null or k.area = _area)
              and (_escolaridade is null or k.escolaridade = _escolaridade)
              and (_regime is null or k.regime = _regime)
              and (_salario is null or k.remuneracao >= _salario)
         )
       )
  ), filtrado as (
    select * from base where _situacao is null or base.situacao = _situacao
  )
  select f.id, f.situacao, count(*) over () as total
    from filtrado f
   order by
     case f.situacao
       when 'inscricoes_abertas' then 0 when 'inscricoes_em_breve' then 1 when 'edital_publicado' then 2
       when 'verificacao_pendente' then 3 when 'previsto' then 4 else 5 end,
     f.inscricao_fim asc nulls last,
     f.updated_at desc
   limit least(greatest(_limit, 1), 50)
  offset greatest(_offset, 0);
$$;

grant execute on function public.buscar_concursos(text, text[], text, text, text, date, text, text, text, numeric, text, integer, integer, date)
  to anon, authenticated;
