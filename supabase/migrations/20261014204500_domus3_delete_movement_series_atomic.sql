create or replace function public.domus3_delete_movement_series(p_series_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_household_id uuid;
  v_deleted integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para eliminar movimientos.';
  end if;

  select ms.household_id into v_household_id
  from public.movement_series ms
  where ms.id = p_series_id
    and private.is_household_member(ms.household_id);

  if v_household_id is null then
    raise exception 'Movimiento no encontrado o sin permiso para eliminarlo.';
  end if;

  if exists (select 1 from public.budget_item_movements bim where bim.movement_series_id = p_series_id) then
    raise exception 'Este movimiento está incluido en un presupuesto. Quítalo primero del presupuesto; no se ha borrado nada.';
  end if;

  if exists (select 1 from public.treasury_reconciliations tr where tr.movement_series_id = p_series_id) then
    raise exception 'Este movimiento tiene una conciliación bancaria asociada. Revócala antes de eliminarlo; no se ha borrado nada.';
  end if;

  update public.documents
     set series_id = null, analysis_status = 'review'
   where series_id = p_series_id and household_id = v_household_id;

  delete from public.document_movements where series_id = p_series_id;
  delete from public.movement_links
   where household_id = v_household_id
     and (from_series_id = p_series_id or to_series_id = p_series_id);
  delete from public.movement_occurrence_states where series_id = p_series_id;
  delete from public.movement_tags where household_id = v_household_id and series_id = p_series_id;
  delete from public.movement_series where id = p_series_id and household_id = v_household_id;

  get diagnostics v_deleted = row_count;
  if v_deleted <> 1 then
    raise exception 'No se pudo eliminar el movimiento. No se ha aplicado ningún cambio.';
  end if;

  return jsonb_build_object('deleted', true, 'series_id', p_series_id);
end;
$$;

revoke all on function public.domus3_delete_movement_series(uuid) from public;
revoke all on function public.domus3_delete_movement_series(uuid) from anon;
grant execute on function public.domus3_delete_movement_series(uuid) to authenticated;
