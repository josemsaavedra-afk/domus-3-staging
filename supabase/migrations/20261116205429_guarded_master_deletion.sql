-- Browser roles retain their existing DELETE restrictions. Only this narrow
-- non-login/non-bypass executor can perform the checked deletion, under RLS.
create schema if not exists private;
do $role$
begin
  if exists(select 1 from pg_roles where rolname='domus_master_delete_executor') then
    raise exception 'The dedicated master executor already exists; inspect before adoption.';
  end if;
  create role domus_master_delete_executor nologin nosuperuser nobypassrls inherit;
end;
$role$;
grant authenticated to domus_master_delete_executor;
grant usage on schema public,private to domus_master_delete_executor;
grant usage on schema private to authenticated;
grant select,update,delete on public.people,public.accounts,public.categories,
  public.counterparties,public.activity_projects,public.tags,public.payment_methods
  to domus_master_delete_executor;
-- In particular, do not expose payment_methods' legacy SET NULL deletion to
-- browser clients. All seven catalogs must use the guarded operation.
revoke delete on public.people,public.accounts,public.categories,
  public.counterparties,public.activity_projects,public.tags,public.payment_methods
  from authenticated;
-- SHARE locking needs UPDATE permission. Grant it only to the isolated function
-- owner, never to browsers; the body has no UPDATE path into these tables.
do $locks$
declare r record;
begin
  for r in select distinct n.nspname,c.relname from pg_attribute a
    join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and not a.attisdropped
      and a.atttypid in ('json'::regtype,'jsonb'::regtype)
      and exists(select 1 from pg_attribute h where h.attrelid=c.oid and h.attname='household_id' and not h.attisdropped)
  loop
    execute format('grant update on %I.%I to domus_master_delete_executor',r.nspname,r.relname);
  end loop;
end;
$locks$;
create or replace function private.guarded_master_delete(
  p_household_id uuid, p_table text, p_id uuid, p_expected_version text default null
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
set lock_timeout = '2s'
set statement_timeout = '5s'
as $function$
declare
  v_row jsonb;
  v_version text;
  v_ref record;
  v_condition text;
  v_used boolean;
  v_dependencies jsonb := '[]'::jsonb;
  v_deleted uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.household_members m
    where m.household_id=p_household_id and m.user_id=auth.uid()
  ) then
    raise exception 'No hay acceso al hogar seleccionado.' using errcode='42501';
  end if;
  if p_table is null or p_table not in
    ('people','accounts','categories','counterparties','activity_projects','tags','payment_methods')
    or p_id is null then
    raise exception 'Maestro no admitido.' using errcode='22023';
  end if;
  -- JSON references have no FK locks. Hold their operational household tables
  -- stable during this short transaction, in a consistent catalog order.
  for v_ref in
    select distinct n.nspname,c.relname from pg_attribute a
    join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and not a.attisdropped
      and a.atttypid in ('json'::regtype,'jsonb'::regtype)
      and exists(select 1 from pg_attribute h where h.attrelid=c.oid and h.attname='household_id' and not h.attisdropped)
    order by n.nspname,c.relname
  loop
    execute format('lock table %I.%I in share mode',v_ref.nspname,v_ref.relname);
  end loop;
  execute format('select to_jsonb(t) from public.%I t where id=$1 and household_id=$2 for update',p_table)
    into v_row using p_id,p_household_id;
  if v_row is null then
    raise exception 'El maestro ya no está disponible para esta sesión.' using errcode='P0002';
  end if;
  v_version := md5(v_row::text);
  if p_expected_version is not null and p_expected_version<>v_version then
    raise exception 'El maestro ha cambiado. Recarga y revisa antes de eliminar.' using errcode='40001';
  end if;
  -- Consult every inbound FK, including SET NULL/CASCADE, before deletion.
  -- Parent FOR UPDATE also prevents concurrent FK insertions from slipping in.
  for v_ref in
    select f.oid,f.conrelid,n.nspname,c.relname,f.conkey,f.confkey
    from pg_constraint f join pg_class c on c.oid=f.conrelid
    join pg_namespace n on n.oid=c.relnamespace
    where f.contype='f' and f.confrelid=to_regclass(format('public.%I',p_table))
    order by n.nspname,c.relname,f.oid
  loop
    select string_agg(format('x.%I = ($1->>%L)::%s',a.attname,b.attname,
                           format_type(a.atttypid,a.atttypmod)),' and ' order by i)
      into v_condition
      from generate_subscripts(v_ref.conkey,1) as positions(i)
      join pg_attribute a on a.attrelid=v_ref.conrelid and a.attnum=v_ref.conkey[i]
      join pg_attribute b on b.attrelid=to_regclass(format('public.%I',p_table)) and b.attnum=v_ref.confkey[i];
    execute format('select exists(select 1 from %I.%I x where %s)',v_ref.nspname,v_ref.relname,v_condition)
      into v_used using v_row;
    if v_used then
      v_dependencies := v_dependencies || jsonb_build_array(jsonb_build_object('table',v_ref.relname,'kind','foreign_key'));
    end if;
  end loop;
  for v_ref in
    select n.nspname,c.relname,a.attname from pg_attribute a
    join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and not a.attisdropped
      and a.atttypid in ('json'::regtype,'jsonb'::regtype)
      and exists(select 1 from pg_attribute h where h.attrelid=c.oid and h.attname='household_id' and not h.attisdropped)
    order by n.nspname,c.relname,a.attname
  loop
    execute format('select exists(select 1 from %I.%I x where household_id=$1 and strpos(lower(x.%I::text),$2)>0)',
                   v_ref.nspname,v_ref.relname,v_ref.attname)
      into v_used using p_household_id,'"'||p_id::text||'"';
    if v_used then
      v_dependencies := v_dependencies || jsonb_build_array(jsonb_build_object('table',v_ref.relname,'kind','json_reference'));
    end if;
  end loop;
  if v_dependencies<>'[]'::jsonb then
    return jsonb_build_object('status','blocked','id',p_id,'version',v_version,'dependencies',v_dependencies);
  end if;
  if p_expected_version is null then
    return jsonb_build_object('status','review','id',p_id,'version',v_version,
                             'name',v_row->>'name','active',v_row->'active','dependencies','[]'::jsonb);
  end if;
  execute format('delete from public.%I where id=$1 and household_id=$2 returning id',p_table)
    into v_deleted using p_id,p_household_id;
  if v_deleted is distinct from p_id then
    raise exception 'No se ha confirmado la eliminación.' using errcode='42501';
  end if;
  return jsonb_build_object('status','deleted','id',p_id);
end;
$function$;
alter function private.guarded_master_delete(uuid,text,uuid,text) owner to domus_master_delete_executor;
revoke all on function private.guarded_master_delete(uuid,text,uuid,text) from public,anon;
grant execute on function private.guarded_master_delete(uuid,text,uuid,text) to authenticated;

create or replace function public.domus3_delete_master(
  p_household_id uuid,p_table text,p_id uuid,p_expected_version text default null
) returns jsonb language sql security invoker
set search_path=pg_catalog,public
as $wrapper$
  select private.guarded_master_delete(p_household_id,p_table,p_id,p_expected_version);
$wrapper$;
revoke all on function public.domus3_delete_master(uuid,text,uuid,text) from public,anon;
grant execute on function public.domus3_delete_master(uuid,text,uuid,text) to authenticated;
