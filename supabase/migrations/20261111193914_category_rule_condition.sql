-- Extend the existing validator; keep its reference checks, revision handling,
-- owner, privileges, SECURITY INVOKER and empty search_path unchanged.
-- Abort if the deployed contract differs rather than overwrite unrelated work.
do $migration$
declare
 definition text;
 old_fields text := $fields$array['counterparty_id','concept','account_id','type','person_id','payer_person_id','amount']$fields$;
 new_fields text := $fields$array['counterparty_id','concept','account_id','type','category_id','person_id','payer_person_id','amount']$fields$;
begin
 select pg_get_functiondef('public.domus3_validate_classification_rule()'::regprocedure) into definition;
 if strpos(definition,old_fields)>0 then
  execute replace(definition,old_fields,new_fields);
 elsif strpos(definition,new_fields)=0 then
  raise exception 'Unexpected classification rule validator; inspect before applying category condition';
 end if;
end;
$migration$;
