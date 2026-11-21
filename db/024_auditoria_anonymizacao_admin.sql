-- Auth user deletion anonymizes actor references through FK ON DELETE SET NULL.
-- Keep append-only content immutable while permitting that exact nested FK update.
create or replace function interno.bloqueia_alteracao() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE'
     and pg_trigger_depth() > 1
     and tg_table_name in ('atualizacoes', 'historico_moderacao')
     and old.admin_id is not null
     and new.admin_id is null
     and (to_jsonb(new) - 'admin_id') = (to_jsonb(old) - 'admin_id') then
    return new;
  end if;
  raise exception 'a tabela % é somente inserção', tg_table_name using errcode = '42501';
end $$;
