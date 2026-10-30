-- Deduplica denúncia e resposta enquanto aguardam revisão sem armazenar IP.
alter table public.denuncias
  add column if not exists origem_hash bytea
    check (origem_hash is null or octet_length(origem_hash) = 32);
alter table public.respostas
  add column if not exists origem_hash bytea
    check (origem_hash is null or octet_length(origem_hash) = 32);

create unique index if not exists denuncias_origem_pendente_uq
  on public.denuncias (ocorrencia_id, origem_hash)
  where origem_hash is not null and status in ('aberta','em_analise');
create unique index if not exists respostas_origem_pendente_uq
  on public.respostas (ocorrencia_id, origem_hash)
  where origem_hash is not null and status = 'pendente';

-- A chave pseudônima só é mantida enquanto a manifestação aguarda decisão.
create or replace function interno.limpar_origem_denuncia_resolvida() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status in ('procedente','improcedente') then new.origem_hash := null; end if;
  return new;
end $$;
create or replace function interno.limpar_origem_resposta_revisada() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status in ('publicada','rejeitada') then new.origem_hash := null; end if;
  return new;
end $$;
drop trigger if exists denuncias_limpar_origem_resolvida on public.denuncias;
create trigger denuncias_limpar_origem_resolvida before insert or update of status on public.denuncias
  for each row execute function interno.limpar_origem_denuncia_resolvida();
drop trigger if exists respostas_limpar_origem_revisada on public.respostas;
create trigger respostas_limpar_origem_revisada before insert or update of status on public.respostas
  for each row execute function interno.limpar_origem_resposta_revisada();
revoke all on function interno.limpar_origem_denuncia_resolvida(), interno.limpar_origem_resposta_revisada() from public, anon, authenticated, service_role;

drop function if exists public.registrar_denuncia(uuid,text,text);
create function public.registrar_denuncia(p_ocorrencia_id uuid, p_motivo text, p_texto text, p_origem_hash bytea)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_inserida integer;
begin
  if p_origem_hash is null or octet_length(p_origem_hash) <> 32 then
    raise exception 'origem inválida' using errcode = '22023';
  end if;
  if not exists (select 1 from public.ocorrencias o where o.id = p_ocorrencia_id and o.moderacao = 'publicado') then
    return false;
  end if;
  insert into public.denuncias (ocorrencia_id, motivo, texto, origem_hash)
    values (p_ocorrencia_id, p_motivo, p_texto, p_origem_hash)
    on conflict do nothing;
  get diagnostics v_inserida = row_count;
  return v_inserida = 1;
end $$;

drop function if exists public.registrar_resposta(uuid,text,text,text);
create function public.registrar_resposta(p_ocorrencia_id uuid, p_vinculo text, p_contato text, p_texto text, p_origem_hash bytea)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_inserida integer;
begin
  if p_origem_hash is null or octet_length(p_origem_hash) <> 32 then
    raise exception 'origem inválida' using errcode = '22023';
  end if;
  if not exists (select 1 from public.ocorrencias o where o.id = p_ocorrencia_id and o.moderacao = 'publicado') then
    return false;
  end if;
  insert into public.respostas (ocorrencia_id, autor_vinculo, contato, texto, origem_hash)
    values (p_ocorrencia_id, btrim(p_vinculo), btrim(p_contato), btrim(p_texto), p_origem_hash)
    on conflict do nothing;
  get diagnostics v_inserida = row_count;
  return v_inserida = 1;
end $$;

revoke all on function public.registrar_denuncia(uuid,text,text,bytea), public.registrar_resposta(uuid,text,text,text,bytea)
  from public, anon, authenticated, service_role;
grant execute on function public.registrar_denuncia(uuid,text,text,bytea), public.registrar_resposta(uuid,text,text,text,bytea)
  to service_role;
