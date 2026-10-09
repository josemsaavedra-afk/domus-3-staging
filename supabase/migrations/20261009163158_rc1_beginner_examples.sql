create table public.domus_ui_setup (
 household_id uuid primary key references public.households(id) on delete cascade,
 examples_version integer not null default 1,
 created_at timestamptz not null default now()
);
alter table public.domus_ui_setup enable row level security;
create policy ui_setup_read on public.domus_ui_setup for select to authenticated using (exists(select 1 from public.household_members m where m.household_id=domus_ui_setup.household_id and m.user_id=(select auth.uid())));
create policy ui_setup_insert on public.domus_ui_setup for insert to authenticated with check (exists(select 1 from public.household_members m where m.household_id=domus_ui_setup.household_id and m.user_id=(select auth.uid())));
grant select,insert on public.domus_ui_setup to authenticated;
create function public.domus_rc1_seed_examples(p_household_id uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare tbl text; nm text; chosen uuid; merchant uuid; cat uuid; activity uuid; prop jsonb; cond jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.household_members where household_id=p_household_id and user_id=auth.uid()) then raise exception 'Household unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended('domus-ui-examples:'||p_household_id::text,0));
 if exists(select 1 from public.domus_ui_setup where household_id=p_household_id) then return false;end if;
 foreach tbl in array array['categories','counterparties','activity_projects','tags'] loop
  for nm in select value from jsonb_array_elements_text(case tbl
   when 'categories' then '["Vivienda","Transporte","Alimentación","Suministros","Impuestos","Ocio"]'::jsonb
   when 'counterparties' then '["Mercadona","Vodafone","AEAT","Lyreco","ONLOGIST"]'::jsonb
   when 'activity_projects' then '["Lyreco 722","Traslado vehículos 849"]'::jsonb
   else '["Extraordinario","Cumpleaños","Viaje"]'::jsonb end) loop
   execute format('select id from public.%I where household_id=$1 and lower(translate(btrim(name),''áéíóúÁÉÍÓÚ'',''aeiouAEIOU''))=lower(translate($2,''áéíóúÁÉÍÓÚ'',''aeiouAEIOU'')) order by id limit 1',tbl) into chosen using p_household_id,nm;
   if chosen is null then execute format('insert into public.%I(household_id,name) values($1,$2)',tbl) using p_household_id,nm;end if;
  end loop;
 end loop;
 foreach nm in array array['Mercadona','Vodafone','AEAT','Lyreco','ONLOGIST'] loop
  select id into merchant from public.counterparties where household_id=p_household_id and lower(btrim(name))=lower(nm) order by id limit 1;
  cond=jsonb_build_object('counterparty_id',merchant);prop='{}'::jsonb;
  if nm in ('Mercadona','Vodafone','AEAT') then
   select id into cat from public.categories where household_id=p_household_id and lower(translate(btrim(name),'áéíóúÁÉÍÓÚ','aeiouAEIOU'))=lower(translate(case nm when 'Mercadona' then 'Alimentación' when 'Vodafone' then 'Suministros' else 'Impuestos' end,'áéíóúÁÉÍÓÚ','aeiouAEIOU')) order by id limit 1;
   prop=jsonb_build_object('category_id',cat);
   if nm='Mercadona' then prop=prop||'{"expense_scope":"domestic"}'::jsonb;end if;
  else
   select id into activity from public.activity_projects where household_id=p_household_id and lower(btrim(name))=lower(case nm when 'Lyreco' then 'Lyreco 722' else 'Traslado vehículos 849' end) order by id limit 1;
   prop=jsonb_build_object('expense_scope','business','activity_project_id',activity);
   if nm='Lyreco' then cond=cond||'{"type":"income"}'::jsonb;end if;
  end if;
  if not exists(select 1 from public.classification_rules where household_id=p_household_id and name='Ejemplo: '||nm) then
   insert into public.classification_rules(household_id,name,conditions,proposals,priority) values(p_household_id,'Ejemplo: '||nm,cond,prop,100);
  end if;
 end loop;
 insert into public.domus_ui_setup(household_id) values(p_household_id);
 return true;
end $$;
revoke all on function public.domus_rc1_seed_examples(uuid) from public,anon;
grant execute on function public.domus_rc1_seed_examples(uuid) to authenticated;
