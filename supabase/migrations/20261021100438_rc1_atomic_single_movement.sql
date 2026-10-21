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
 insert into public.movement_occurrence_states(series_id,occurrence_date,status,actual_date,document_date,rescheduled_date,amount_override,prefinanced,prefinanced_at,prefinanced_fee,prefinanced_net,created_by,updated_by)
 values(p_target_id,st.occurrence_date,coalesce(st.status,'pending'),st.actual_date,st.document_date,st.rescheduled_date,st.amount_override,coalesce(st.prefinanced,false),st.prefinanced_at,st.prefinanced_fee,st.prefinanced_net,auth.uid(),auth.uid())
 on conflict(series_id,occurrence_date) do update set status=excluded.status,actual_date=excluded.actual_date,document_date=excluded.document_date,rescheduled_date=excluded.rescheduled_date,
 amount_override=excluded.amount_override,prefinanced=excluded.prefinanced,prefinanced_at=excluded.prefinanced_at,prefinanced_fee=excluded.prefinanced_fee,prefinanced_net=excluded.prefinanced_net,updated_by=auth.uid();
 if replacing then
  insert into public.movement_occurrence_states(series_id,occurrence_date,status,created_by,updated_by)
  values(p_source_id,p_original_date,'cancelled',auth.uid(),auth.uid())
  on conflict(series_id,occurrence_date) do update set status='cancelled',actual_date=null,rescheduled_date=null,updated_by=auth.uid();
 end if;
 return p_target_id;
end $$;
revoke all on function public.domus3_save_single_movement(uuid,date,uuid,jsonb,uuid[],jsonb,bigint,jsonb) from public,anon;
grant execute on function public.domus3_save_single_movement(uuid,date,uuid,jsonb,uuid[],jsonb,bigint,jsonb) to authenticated;
