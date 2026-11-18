-- Apply only on a clean, dedicated Families project after the DOMUS base schema.
begin;
do $$
begin
  if exists (select 1 from public.households)
     or exists (select 1 from auth.users)
     or exists (select 1 from storage.objects) then
    raise exception 'La revisión familiar requiere un proyecto sin datos existentes';
  end if;
end;
$$;

revoke execute on function public.create_household(text, text) from public, anon, authenticated;
revoke execute on function public.join_household_by_code(text, text) from public, anon, authenticated;

create function public.domus_family_environment()
returns text language sql stable set search_path = ''
as $$ select 'domus-families-beta-v1'::text $$;
revoke all on function public.domus_family_environment() from public;
grant execute on function public.domus_family_environment() to anon, authenticated;

create function public.domus_family_create_home(p_name text, p_display_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  home_id uuid;
begin
  if actor is null then
    raise exception 'Inicia sesión para crear tu hogar' using errcode = '42501';
  end if;
  if coalesce(length(btrim(p_name)), 0) not between 1 and 120
     or coalesce(length(btrim(p_display_name)), 0) not between 1 and 120 then
    raise exception 'Escribe nombres de entre 1 y 120 caracteres' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));
  select household_id into home_id
  from public.household_members where user_id = actor order by household_id limit 1;
  if found then return home_id; end if;

  home_id := public.create_household(btrim(p_name), btrim(p_display_name));
  insert into public.categories (household_id, name, kind)
  select home_id, category.name, category.kind
  from (values
    ('Nómina', 'income'), ('Pensión', 'income'), ('Prestaciones', 'income'),
    ('Alquileres', 'income'), ('Ingresos de actividad económica', 'income'),
    ('Otros ingresos', 'income'), ('Vivienda', 'expense'), ('Alimentación', 'expense'),
    ('Suministros', 'expense'), ('Transporte', 'expense'), ('Salud', 'expense'),
    ('Educación', 'expense'), ('Seguros', 'expense'), ('Comunicaciones', 'expense'),
    ('Ocio', 'expense'), ('Otros gastos', 'expense')
  ) as category(name, kind);
  return home_id;
end;
$$;
revoke all on function public.domus_family_create_home(text, text) from public, anon;
grant execute on function public.domus_family_create_home(text, text) to authenticated;
commit;
