CREATE OR REPLACE FUNCTION public.domus3_validate_classification_rule()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  part text; body jsonb; k text; v jsonb; ref jsonb; tbl text; allowed text[]; found_ref boolean;
  dayv jsonb;
begin
  if TG_OP='UPDATE' and (new.id is distinct from old.id or new.household_id is distinct from old.household_id) then
    raise exception 'Stable rule identity required' using errcode='23514';
  end if;

  foreach part in array array['conditions','proposals'] loop
    body=case when part='conditions' then new.conditions else new.proposals end;
    if jsonb_typeof(body) is distinct from 'object' or body='{}'::jsonb then
      raise exception 'Nonempty rule object required' using errcode='23514';
    end if;

    allowed=case
      when part='conditions' then array['counterparty_id','concept','account_id','type','person_id','payer_person_id','amount']
      else array['category_id','person_id','payer_person_id','account_id','counterparty_id','activity_project_id','tag_ids','expense_scope','due_policy']
    end;

    for k,v in select * from jsonb_each(body) loop
      if not(k=any(allowed)) then
        raise exception 'Unsupported rule field: %',k using errcode='23514';
      end if;

      tbl=case k
        when 'person_id' then 'people'
        when 'payer_person_id' then 'people'
        when 'account_id' then 'accounts'
        when 'category_id' then 'categories'
        when 'counterparty_id' then 'counterparties'
        when 'activity_project_id' then 'activity_projects'
        when 'tag_ids' then 'tags'
      end;

      if tbl is not null then
        if k='tag_ids' and (jsonb_typeof(v) is distinct from 'array' or v='[]'::jsonb) then
          raise exception 'Nonempty tags required' using errcode='23514';
        end if;
        for ref in select value from jsonb_array_elements(case when k='tag_ids' then v else jsonb_build_array(v) end) loop
          if jsonb_typeof(ref) is distinct from 'string' then
            raise exception 'Reference required' using errcode='23514';
          end if;
          execute format('select exists(select 1 from public.%I where id=$1::uuid and household_id=$2)',tbl)
            into found_ref using ref#>>'{}',new.household_id;
          if not found_ref then
            raise exception 'Reference outside household or missing' using errcode='23514';
          end if;
        end loop;
      elsif k='type' then
        if v not in ('"income"'::jsonb,'"expense"'::jsonb) then raise exception 'Invalid type' using errcode='23514'; end if;
      elsif k='expense_scope' then
        if v not in ('"domestic"'::jsonb,'"business"'::jsonb,'"mixed"'::jsonb) then raise exception 'Invalid scope' using errcode='23514'; end if;
      elsif k='concept' then
        if jsonb_typeof(v) is distinct from 'object' then raise exception 'Invalid concept' using errcode='23514'; end if;
        if coalesce(v->>'mode','') not in ('contains','equals')
           or jsonb_typeof(v->'value') is distinct from 'string'
           or length(btrim(v->>'value'))=0
           or (v-'mode'-'value')<>'{}'::jsonb then
          raise exception 'Invalid concept' using errcode='23514';
        end if;
      elsif k='amount' then
        if jsonb_typeof(v) is distinct from 'object' or v='{}'::jsonb then raise exception 'Invalid amount' using errcode='23514'; end if;
        if (v-'min'-'max')<>'{}'::jsonb then raise exception 'Invalid amount' using errcode='23514'; end if;
        for ref in select value from jsonb_each(v) loop
          if jsonb_typeof(ref) is distinct from 'number' then raise exception 'Invalid amount' using errcode='23514'; end if;
          if (ref#>>'{}')::numeric<0 then raise exception 'Negative amount' using errcode='23514'; end if;
        end loop;
        if (v->>'min') is not null and (v->>'max') is not null and (v->>'min')::numeric>(v->>'max')::numeric then
          raise exception 'Invalid amount range' using errcode='23514';
        end if;
      elsif k='due_policy' then
        if part<>'proposals' or jsonb_typeof(v) is distinct from 'object' then
          raise exception 'Invalid due policy' using errcode='23514';
        end if;
        if coalesce(v->>'mode','')='days_after' then
          if (v-'mode'-'days')<>'{}'::jsonb
             or jsonb_typeof(v->'days') is distinct from 'number'
             or (v->>'days')::int<0 or (v->>'days')::int>365 then
            raise exception 'Invalid due policy' using errcode='23514';
          end if;
        elsif coalesce(v->>'mode','')='monthly_days' then
          if (v-'mode'-'days'-'weekend_policy')<>'{}'::jsonb
             or jsonb_typeof(v->'days') is distinct from 'array'
             or v->'days'='[]'::jsonb
             or coalesce(v->>'weekend_policy','none') not in ('none','sat_prev_sun_next') then
            raise exception 'Invalid due policy' using errcode='23514';
          end if;
          for dayv in select value from jsonb_array_elements(v->'days') loop
            if jsonb_typeof(dayv) is distinct from 'number'
               or (dayv#>>'{}')::int<1
               or (dayv#>>'{}')::int>31 then
              raise exception 'Invalid due policy' using errcode='23514';
            end if;
          end loop;
        else
          raise exception 'Invalid due policy' using errcode='23514';
        end if;
      end if;
    end loop;
  end loop;

  new.revision=case when TG_OP='INSERT' then 1 else old.revision+1 end;
  new.updated_at=clock_timestamp();
  new.updated_by=auth.uid();
  return new;
end
$function$

