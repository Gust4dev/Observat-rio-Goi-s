-- M5: operações administrativas atômicas, motivos fechados e auditoria consultável.
create table public.motivos_remocao (
 codigo text primary key,
 rotulo text not null
);
insert into public.motivos_remocao values
 ('dados_pessoais','Dados pessoais'),('conteudo_ofensivo','Conteúdo ofensivo'),
 ('fora_escopo','Fora do escopo'),('spam','Spam'),('duplicidade','Duplicidade'),('outro','Outro');
alter table public.motivos_remocao enable row level security;
create policy admin_le on public.motivos_remocao for select to authenticated using (interno.eh_admin('moderador'));
revoke all on public.motivos_remocao from public,anon,authenticated,service_role;
grant select on public.motivos_remocao to authenticated;
alter table public.ocorrencias add column motivo_remocao_codigo text references public.motivos_remocao(codigo);
alter table public.ocorrencias add column duplicata_de uuid references public.ocorrencias(id);
alter table public.ocorrencias add constraint duplicata_distinta check (duplicata_de is null or duplicata_de<>id);

drop function public.admin_moderar_ocorrencia(uuid,text,text);
create function public.admin_moderar_ocorrencia(p_id uuid,p_acao text,p_motivo text default null,p_motivo_codigo text default null)
returns void language plpgsql security definer set search_path='' as $$
declare antes public.ocorrencias; depois public.ocorrencias; novo public.moderacao_ocorrencia;
begin
 perform interno.exige_admin('moderador');
 select * into antes from public.ocorrencias where id=p_id for update;
 if not found then raise exception 'ocorrência não encontrada' using errcode='P0002'; end if;
 if antes.moderacao='removido' and p_acao is distinct from 'restaurar' then raise exception 'ocorrência removida: restaure antes' using errcode='22023'; end if;
 case p_acao
 when 'aprovar' then novo:='publicado';
 when 'reter' then novo:='retido';
 when 'remover' then novo:='removido';
 when 'restaurar' then perform interno.exige_admin('gestor'); novo:='pendente';
 else raise exception 'ação inválida' using errcode='22023'; end case;
 if p_acao<>'aprovar' and nullif(btrim(p_motivo),'') is null then raise exception 'complemento obrigatório' using errcode='22023'; end if;
 if p_acao='remover' and (p_motivo_codigo is null or not exists(select 1 from public.motivos_remocao where codigo=p_motivo_codigo)) then
  raise exception 'motivo de remoção inválido' using errcode='22023';
 end if;
 update public.ocorrencias set moderacao=novo,
 publicado_em=case when novo='publicado' then coalesce(publicado_em,now()) else publicado_em end,
 removido_em=case when novo='removido' then now() end,
 motivo_remocao=case when novo='removido' then btrim(p_motivo) end,
 motivo_remocao_codigo=case when novo='removido' then p_motivo_codigo end,
 duplicata_de=null where id=p_id returning * into depois;
 perform interno.registra_historico(p_id,p_acao,p_motivo,to_jsonb(antes),to_jsonb(depois));
end $$;

create function public.admin_mesclar_duplicata(p_origem uuid,p_destino uuid,p_motivo text)
returns void language plpgsql security definer set search_path='' as $$
declare antes public.ocorrencias; destino public.ocorrencias; depois public.ocorrencias;
begin
 perform interno.exige_admin('moderador');
 if p_origem is null or p_destino is null or p_origem=p_destino or nullif(btrim(p_motivo),'') is null then raise exception 'origem, destino distintos e motivo obrigatórios' using errcode='22023'; end if;
 -- Ordem consistente impede deadlock entre duas mesclas concorrentes.
 perform 1 from public.ocorrencias where id in (p_origem,p_destino) order by id for update;
 select * into antes from public.ocorrencias where id=p_origem;
 select * into destino from public.ocorrencias where id=p_destino;
 if antes.id is null or destino.id is null then raise exception 'ocorrência não encontrada' using errcode='P0002'; end if;
 if antes.moderacao='removido' or destino.moderacao<>'publicado' then raise exception 'origem removida ou destino não publicado' using errcode='22023'; end if;
 update public.ocorrencias set moderacao='removido',removido_em=now(),motivo_remocao=btrim(p_motivo),motivo_remocao_codigo='duplicidade',duplicata_de=p_destino
 where id=p_origem returning * into depois;
 -- Filhos permanecem na origem; nenhuma denúncia, imagem ou confirmação é transferida.
 perform interno.registra_historico(p_origem,'mesclar_duplicata',p_motivo,to_jsonb(antes),to_jsonb(depois));
end $$;

create function public.admin_moderar_lote(p_ids uuid[],p_acao text,p_motivo text default null)
returns table(out_id uuid,out_moderacao public.moderacao_ocorrencia)
language plpgsql security definer set search_path='' as $$
declare item uuid;
begin
 perform interno.exige_admin('moderador');
 if p_acao is null or p_acao not in ('aprovar','reter') or coalesce(cardinality(p_ids),0) not between 1 and 50 or
 exists(select 1 from unnest(p_ids) id where id is null) or
 (select count(distinct id) from unnest(p_ids) id)<>cardinality(p_ids) then raise exception 'lote inválido (1 a 50 IDs únicos)' using errcode='22023'; end if;
 perform 1 from public.ocorrencias where id=any(p_ids) order by id for update;
 foreach item in array p_ids loop
  -- Não capturar erros: qualquer falha desfaz todo o lote e seus históricos.
  perform public.admin_moderar_ocorrencia(item,p_acao,p_motivo,null);
  return query select o.id,o.moderacao from public.ocorrencias o where o.id=item;
 end loop;
end $$;

create function public.admin_listar_auditoria(p_ocorrencia_id uuid default null,p_admin_id uuid default null,p_acao text default null,p_desde timestamptz default null,p_ate timestamptz default null,p_limite integer default 50,p_offset integer default 0)
returns setof public.historico_moderacao language plpgsql stable security definer set search_path='' as $$
begin
 perform interno.exige_admin('gestor');
 if p_limite is null or p_limite not between 1 and 100 or p_offset is null or p_offset<0 or p_desde>p_ate then raise exception 'paginação ou período inválido' using errcode='22023'; end if;
 return query select h.* from public.historico_moderacao h where
 (p_ocorrencia_id is null or h.ocorrencia_id=p_ocorrencia_id) and (p_admin_id is null or h.admin_id=p_admin_id) and
 (p_acao is null or h.acao=p_acao) and (p_desde is null or h.criado_em>=p_desde) and (p_ate is null or h.criado_em<=p_ate)
 order by h.criado_em desc,h.id desc limit p_limite offset p_offset;
end $$;

create function public.admin_detalhar_ocorrencia(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare resultado jsonb;
begin
 perform interno.exige_admin('moderador');
 select jsonb_build_object('ocorrencia',to_jsonb(o),
 'imagens',coalesce((select jsonb_agg(to_jsonb(i) order by i.ordem) from public.imagens i where i.ocorrencia_id=o.id),'[]'::jsonb),
 'atualizacoes',coalesce((select jsonb_agg(to_jsonb(a) order by a.criado_em,a.id) from public.atualizacoes a where a.ocorrencia_id=o.id),'[]'::jsonb),
 'denuncias',coalesce((select jsonb_agg(to_jsonb(d) order by d.id) from public.denuncias d where d.ocorrencia_id=o.id),'[]'::jsonb),
 'respostas',coalesce((select jsonb_agg(to_jsonb(r)-'contato' order by r.id) from public.respostas r where r.ocorrencia_id=o.id),'[]'::jsonb))
 into resultado from public.ocorrencias o where o.id=p_id;
 if resultado is null then raise exception 'ocorrência não encontrada' using errcode='P0002'; end if;
 return resultado;
end $$;

revoke all on function public.admin_moderar_ocorrencia(uuid,text,text,text),public.admin_mesclar_duplicata(uuid,uuid,text),public.admin_moderar_lote(uuid[],text,text),public.admin_listar_auditoria(uuid,uuid,text,timestamptz,timestamptz,integer,integer),public.admin_detalhar_ocorrencia(uuid) from public,anon,service_role;
grant execute on function public.admin_moderar_ocorrencia(uuid,text,text,text),public.admin_mesclar_duplicata(uuid,uuid,text),public.admin_moderar_lote(uuid[],text,text),public.admin_listar_auditoria(uuid,uuid,text,timestamptz,timestamptz,integer,integer),public.admin_detalhar_ocorrencia(uuid) to authenticated;
