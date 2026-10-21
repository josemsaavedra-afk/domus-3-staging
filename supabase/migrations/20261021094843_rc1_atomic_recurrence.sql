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
  insert into public.movement_occurrence_states(series_id,occurrence_date,status,actual_date,document_date,rescheduled_date,amount_override,prefinanced,prefinanced_at,prefinanced_fee,prefinanced_net,created_by,updated_by)
  values(p_target_id,row_state.occurrence_date,coalesce(row_state.status,'pending'),row_state.actual_date,row_state.document_date,row_state.rescheduled_date,row_state.amount_override,coalesce(row_state.prefinanced,false),row_state.prefinanced_at,row_state.prefinanced_fee,row_state.prefinanced_net,auth.uid(),auth.uid())
  on conflict(series_id,occurrence_date) do update set status=excluded.status,actual_date=excluded.actual_date,document_date=excluded.document_date,
  rescheduled_date=excluded.rescheduled_date,amount_override=excluded.amount_override,prefinanced=excluded.prefinanced,prefinanced_at=excluded.prefinanced_at,
  prefinanced_fee=excluded.prefinanced_fee,prefinanced_net=excluded.prefinanced_net,updated_by=auth.uid();
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
