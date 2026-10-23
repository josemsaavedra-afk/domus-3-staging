-- Additive metadata only: existing economic states and dates are unchanged.
alter table public.movement_occurrence_states add column if not exists follow_up_status text;
alter table public.movement_occurrence_states add constraint movement_follow_up_status_valid check (follow_up_status is null or follow_up_status='pending_settlement');
comment on column public.movement_occurrence_states.follow_up_status is 'Optional follow-up; pending_settlement does not settle, pay, cancel or reschedule an obligation.';
create or replace function public.domus3_set_settlement_follow_up(p_series_id uuid,p_occurrence_date date,p_pending boolean,p_expected_revision bigint)
returns boolean language plpgsql security invoker set search_path='' as $$
declare m public.movement_series%rowtype;s public.movement_occurrence_states%rowtype;step integer;months integer;scheduled date;
begin
 if auth.uid() is null then raise exception 'Sesión requerida' using errcode='42501'; end if;
 select * into m from public.movement_series where id=p_series_id for update;
 if not found or not exists(select 1 from public.household_members where household_id=m.household_id and user_id=auth.uid()) then raise exception 'Movimiento no disponible' using errcode='42501'; end if;
 if m.type<>'expense' or p_pending is null or p_occurrence_date is null then raise exception 'Selecciona un gasto concreto'; end if;
 if m.recurrence='none' then
  if p_occurrence_date<>m.start_date then raise exception 'La fecha no pertenece al movimiento'; end if;
 else
  step=case m.recurrence when 'monthly' then 1 when 'quarterly' then 3 when 'semiannual' then 6 when 'annual' then 12 else null end;
  months=(extract(year from p_occurrence_date)::int-extract(year from m.start_date)::int)*12+extract(month from p_occurrence_date)::int-extract(month from m.start_date)::int;
  scheduled=date_trunc('month',p_occurrence_date)::date+(least(extract(day from m.start_date)::int,extract(day from (date_trunc('month',p_occurrence_date)+interval '1 month - 1 day'))::int)-1);
  if step is null or p_occurrence_date<m.start_date or (m.recurrence_end is not null and p_occurrence_date>m.recurrence_end) or months%step<>0 or scheduled<>p_occurrence_date then raise exception 'La fecha no pertenece a la recurrencia'; end if;
 end if;
 select * into s from public.movement_occurrence_states where series_id=p_series_id and occurrence_date=p_occurrence_date for update;
 if p_expected_revision is null or coalesce(s.treasury_revision,0)<>p_expected_revision then raise exception 'El movimiento ha cambiado. Sincroniza antes de continuar.' using errcode='40001'; end if;
 if p_pending and (coalesce(s.status,'pending')<>'pending' or s.actual_date is not null or coalesce(s.prefinanced,false)) then raise exception 'El gasto debe seguir pendiente'; end if;
 if not p_pending and s.series_id is null then return true; end if;
 insert into public.movement_occurrence_states(series_id,occurrence_date,status,follow_up_status,created_by,updated_by)
 values(p_series_id,p_occurrence_date,'pending',case when p_pending then 'pending_settlement' else null end,auth.uid(),auth.uid())
 on conflict(series_id,occurrence_date) do update set follow_up_status=excluded.follow_up_status,updated_by=auth.uid();
 return true;
end $$;
revoke all on function public.domus3_set_settlement_follow_up(uuid,date,boolean,bigint) from public,anon;
grant execute on function public.domus3_set_settlement_follow_up(uuid,date,boolean,bigint) to authenticated;

create or replace function public.domus3_save_single_movement(
 p_source_id uuid,p_original_date date,p_target_id uuid,p_patch jsonb,p_tag_ids uuid[],
 p_state jsonb,p_expected_revision bigint,p_expected_state jsonb
) returns uuid language plpgsql security invoker set search_path='' as $$
declare
 src public.movement_series%rowtype;st public.movement_occurrence_states%rowtype;
 hid uuid;current_state jsonb;target_start date;replacing boolean;
begin
 if auth.uid() is null then raise exception 'Sesión requerida' using errcode='42501'; end if;
 if p_target_id is null or jsonb_typeof(p_patch) is distinct from 'object' or jsonb_typeof(p_state) is distinct from 'object'
 then raise exception 'Movimiento incompleto'; end if;
 replacing=p_source_id is not null and p_target_id<>p_source_id;
 if p_source_id is not null then
  select * into src from public.movement_series where id=p_source_id for update;
  if not found then raise exception 'Movimiento no disponible' using errcode='42501'; end if;
  hid=src.household_id;
  if src.treasury_revision is distinct from p_expected_revision then raise exception 'El movimiento ha cambiado. Sincroniza antes de editar.' using errcode='40001'; end if;
  select to_jsonb(s) into current_state from public.movement_occurrence_states s where series_id=p_source_id and occurrence_date=p_original_date;
  if current_state is distinct from p_expected_state then raise exception 'La ocurrencia ha cambiado. Sincroniza antes de editar.' using errcode='40001'; end if;
  if p_original_date is null or (src.recurrence='none' and p_original_date<>src.start_date) then raise exception 'Identidad de ocurrencia incorrecta'; end if;
  if src.recurrence<>'none' and not replacing then raise exception 'Conserva el estado individual de la recurrencia'; end if;
  if exists(select 1 from public.treasury_reconciliations where movement_series_id=p_source_id and occurrence_date=p_original_date)
  then raise exception 'Este movimiento está conciliado. Revisa la conciliación antes de modificarlo.'; end if;
 else
  hid=(p_patch->>'household_id')::uuid;
  if p_expected_revision is not null or p_expected_state is not null then raise exception 'Alta con identidad previa'; end if;
 end if;
 if hid is null or not exists(select 1 from public.household_members where household_id=hid and user_id=auth.uid())
 or (p_patch->>'household_id')::uuid is distinct from hid then raise exception 'Hogar no disponible' using errcode='42501'; end if;
 if replacing and p_patch->>'recurrence' is distinct from 'none' then raise exception 'Usa la edición del tramo recurrente'; end if;
 target_start=(p_patch->>'start_date')::date;
 st=jsonb_populate_record(null::public.movement_occurrence_states,p_state);
 if st.series_id is distinct from p_target_id or st.occurrence_date is distinct from target_start then raise exception 'Estado de otra operación'; end if;
 perform public.domus3_save_labeled_movement(p_target_id,p_patch-'id'-'tag_ids',p_tag_ids,p_source_id is null or replacing);
 if not replacing and p_source_id is not null and p_original_date<>target_start then
  delete from public.movement_occurrence_states where series_id=p_source_id and occurrence_date=p_original_date;
 end if;
 insert into public.movement_occurrence_states(series_id,occurrence_date,status,actual_date,document_date,rescheduled_date,amount_override,prefinanced,prefinanced_at,prefinanced_fee,prefinanced_net,follow_up_status,created_by,updated_by)
 values(p_target_id,st.occurrence_date,coalesce(st.status,'pending'),st.actual_date,st.document_date,st.rescheduled_date,st.amount_override,coalesce(st.prefinanced,false),st.prefinanced_at,st.prefinanced_fee,st.prefinanced_net,st.follow_up_status,auth.uid(),auth.uid())
 on conflict(series_id,occurrence_date) do update set status=excluded.status,actual_date=excluded.actual_date,document_date=excluded.document_date,rescheduled_date=excluded.rescheduled_date,
 amount_override=excluded.amount_override,prefinanced=excluded.prefinanced,prefinanced_at=excluded.prefinanced_at,prefinanced_fee=excluded.prefinanced_fee,prefinanced_net=excluded.prefinanced_net,follow_up_status=excluded.follow_up_status,updated_by=auth.uid();
 if replacing then
  insert into public.movement_occurrence_states(series_id,occurrence_date,status,created_by,updated_by)
  values(p_source_id,p_original_date,'cancelled',auth.uid(),auth.uid())
  on conflict(series_id,occurrence_date) do update set status='cancelled',actual_date=null,rescheduled_date=null,updated_by=auth.uid();
 end if;
 return p_target_id;
end $$;
revoke all on function public.domus3_save_single_movement(uuid,date,uuid,jsonb,uuid[],jsonb,bigint,jsonb) from public,anon;
grant execute on function public.domus3_save_single_movement(uuid,date,uuid,jsonb,uuid[],jsonb,bigint,jsonb) to authenticated;

-- One authenticated transaction owns the whole recurrence cutover.
-- Existing RLS, validation and audit triggers remain in force.
create or replace function public.domus3_save_recurrence_segment(
 p_source_id uuid, p_cutoff date, p_target_id uuid, p_patch jsonb,
 p_tag_ids uuid[], p_states jsonb, p_expected_states jsonb,
 p_expected_revision bigint
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
 src public.movement_series%rowtype;
 current_states jsonb; expected_states jsonb; item jsonb;
 row_state public.movement_occurrence_states%rowtype;
 first_segment boolean; target_start date; step integer; months integer;
 scheduled date;
begin
 if auth.uid() is null then raise exception 'Sesión requerida' using errcode='42501'; end if;
 select * into src from public.movement_series where id=p_source_id for update;
 if not found or not exists(select 1 from public.household_members where household_id=src.household_id and user_id=auth.uid()) then
  raise exception 'Movimiento no disponible' using errcode='42501';
 end if;
 if p_expected_revision is null or src.treasury_revision is distinct from p_expected_revision then
  raise exception 'El movimiento ha cambiado. Sincroniza antes de editar.' using errcode='40001';
 end if;
 if p_cutoff is null or p_target_id is null or jsonb_typeof(p_patch) is distinct from 'object'
 or jsonb_typeof(p_states) is distinct from 'array' or jsonb_typeof(p_expected_states) is distinct from 'array'
 or jsonb_array_length(p_states)=0 then raise exception 'Tramo incompleto'; end if;
 if (p_patch->>'household_id')::uuid is distinct from src.household_id then raise exception 'El hogar no puede cambiar' using errcode='42501'; end if;
 step=case src.recurrence when 'monthly' then 1 when 'quarterly' then 3 when 'semiannual' then 6 when 'annual' then 12 else null end;
 months=(extract(year from p_cutoff)::int-extract(year from src.start_date)::int)*12+extract(month from p_cutoff)::int-extract(month from src.start_date)::int;
 scheduled=(date_trunc('month',p_cutoff)::date + (least(extract(day from src.start_date)::int,extract(day from (date_trunc('month',p_cutoff)+interval '1 month - 1 day'))::int)-1));
 if step is null or p_cutoff<src.start_date or (src.recurrence_end is not null and p_cutoff>src.recurrence_end)
 or months % step<>0 or scheduled<>p_cutoff then raise exception 'La ocurrencia no pertenece al tramo activo'; end if;
 first_segment=p_cutoff=src.start_date;
 if first_segment is distinct from (p_target_id=p_source_id) then raise exception 'Identidad de tramo incorrecta'; end if;
 target_start=(p_patch->>'start_date')::date;
 if target_start is null or ((p_patch->>'recurrence_end') is not null and (p_patch->>'recurrence_end')::date<target_start) then raise exception 'Fechas de tramo incorrectas'; end if;
 -- State writers lock the parent through lock_occurrence_basis, so this
 -- comparison also protects against simultaneous status/date edits.
 select coalesce(jsonb_agg(to_jsonb(s) order by occurrence_date),'[]'::jsonb) into current_states
 from public.movement_occurrence_states s where series_id=p_source_id and occurrence_date>=p_cutoff;
 select coalesce(jsonb_agg(x order by x->>'occurrence_date'),'[]'::jsonb) into expected_states from jsonb_array_elements(p_expected_states) x;
 if current_states is distinct from expected_states then raise exception 'Las ocurrencias han cambiado. Sincroniza antes de editar.' using errcode='40001'; end if;
 if exists(select 1 from public.treasury_reconciliations where movement_series_id=p_source_id and occurrence_date>=p_cutoff)
 then raise exception 'Este tramo contiene conciliaciones. Revísalas antes de cambiar su identidad.'; end if;
 if exists(select 1 from jsonb_array_elements(p_states) x where (x->>'series_id')::uuid is distinct from p_target_id)
 or (select count(*) from jsonb_array_elements(p_states))<>(select count(distinct x->>'occurrence_date') from jsonb_array_elements(p_states) x)
 then raise exception 'Identidades de ocurrencia incorrectas'; end if;
 -- The existing invoker helper validates household membership, labels and
 -- editable columns. Any exception below rolls this write back too.
 perform public.domus3_save_labeled_movement(p_target_id,p_patch-'id'-'tag_ids',p_tag_ids,not first_segment);
 if first_segment then
  delete from public.movement_occurrence_states s where series_id=p_source_id and occurrence_date>=p_cutoff
  and not exists(select 1 from jsonb_array_elements(p_states) x where (x->>'occurrence_date')::date=s.occurrence_date);
 end if;
 for item in select * from jsonb_array_elements(p_states) loop
  row_state=jsonb_populate_record(null::public.movement_occurrence_states,item);
  if row_state.occurrence_date is null or row_state.occurrence_date<target_start then raise exception 'Fecha de ocurrencia incorrecta'; end if;
  insert into public.movement_occurrence_states(series_id,occurrence_date,status,actual_date,document_date,rescheduled_date,amount_override,prefinanced,prefinanced_at,prefinanced_fee,prefinanced_net,follow_up_status,created_by,updated_by)
  values(p_target_id,row_state.occurrence_date,coalesce(row_state.status,'pending'),row_state.actual_date,row_state.document_date,row_state.rescheduled_date,row_state.amount_override,coalesce(row_state.prefinanced,false),row_state.prefinanced_at,row_state.prefinanced_fee,row_state.prefinanced_net,row_state.follow_up_status,auth.uid(),auth.uid())
  on conflict(series_id,occurrence_date) do update set status=excluded.status,actual_date=excluded.actual_date,document_date=excluded.document_date,
  rescheduled_date=excluded.rescheduled_date,amount_override=excluded.amount_override,prefinanced=excluded.prefinanced,prefinanced_at=excluded.prefinanced_at,
  prefinanced_fee=excluded.prefinanced_fee,prefinanced_net=excluded.prefinanced_net,follow_up_status=excluded.follow_up_status,updated_by=auth.uid();
 end loop;
 if not first_segment then
  update public.movement_series set recurrence_end=p_cutoff-1,updated_by=auth.uid() where id=p_source_id;
  update public.movement_occurrence_states set status='cancelled',actual_date=null,rescheduled_date=null,updated_by=auth.uid()
  where series_id=p_source_id and occurrence_date>=p_cutoff;
 end if;
 return p_target_id;
end $$;
revoke all on function public.domus3_save_recurrence_segment(uuid,date,uuid,jsonb,uuid[],jsonb,jsonb,bigint) from public,anon;
grant execute on function public.domus3_save_recurrence_segment(uuid,date,uuid,jsonb,uuid[],jsonb,jsonb,bigint) to authenticated;
