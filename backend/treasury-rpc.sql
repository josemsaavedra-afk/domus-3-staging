grant domus_treasury_executor to postgres with set true;
-- RC1 Staging only. Non-bypass executor retains authenticated RLS.
create or replace function private.domus_treasury_execute(h uuid, op jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid := auth.uid(); t text := op->>'type'; p jsonb := op->'payload';
 k uuid; req jsonb; receipt record; r jsonb; imported public.bank_statement_imports; cp public.account_balance_checkpoints;
 rec public.treasury_reconciliations; line record; src record; item jsonb; acct uuid; count_lines integer;
begin
 if actor is null then raise exception 'UNAUTHORIZED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(h::text,18));
 if not private.is_household_member(h) then raise exception 'HOUSEHOLD_MISMATCH'; end if;
 if t='read' then
 return jsonb_build_object('householdId',h,
 'imports',coalesce((select jsonb_agg(to_jsonb(i) order by i.imported_at,i.id) from public.bank_statement_imports i where i.household_id=h),'[]'::jsonb),
 'lines',coalesce((select jsonb_agg(to_jsonb(l) order by l.import_id,l.line_ordinal) from public.bank_statement_lines l join public.bank_statement_imports i on i.id=l.import_id where i.household_id=h),'[]'::jsonb),
 'checkpoints',coalesce((select jsonb_agg(to_jsonb(c) order by c.balance_date,c.id) from public.account_balance_checkpoints c where c.household_id=h),'[]'::jsonb),
 'reconciliations',coalesce((select jsonb_agg(to_jsonb(c) order by c.confirmed_at,c.id) from public.treasury_reconciliations c where c.household_id=h),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(jsonb_build_object('series_id',s.id,'account_id',s.account_id,'series',s.treasury_revision,'occurrence_date',o.occurrence_date,'occurrence',o.treasury_revision)) from public.movement_series s join public.movement_occurrence_states o on o.series_id=s.id where s.household_id=h),'[]'::jsonb));
 end if;
 if t not in ('checkpoint','import','confirm','revoke') or p is null then raise exception 'INVALID_PAYLOAD'; end if;
 k := (op->>'id')::uuid;
 if k is null or k is distinct from (op->>'idempotencyKey')::uuid then raise exception 'DUPLICATE_OPERATION'; end if;
 req:=jsonb_build_object('type',t,'payload',p,'baseRevision',op->'baseRevision');
 select request,response into receipt from private.treasury_operation_receipts where actor_id=actor and household_id=h and operation_id=k;
 if found then
 if receipt.request<>req then raise exception 'DUPLICATE_OPERATION'; end if;
 return receipt.response;
 end if;
 if t<>'revoke' then
 acct:=(p->>'accountId')::uuid;
 if not exists(select 1 from public.accounts where id=acct and household_id=h) then raise exception 'ACCOUNT_MISMATCH'; end if;
 end if;
 if t='checkpoint' then
 if p->>'amount' !~ '^-?[0-9]{1,12}(\.[0-9]{1,2})?$' or (p->>'date')::date>current_date or length(coalesce(p->>'note',''))>2000 then raise exception 'INVALID_PAYLOAD'; end if;
 select * into cp from public.account_balance_checkpoints where account_id=acct and balance_date=(p->>'date')::date and source='manual';
 if found then
 if cp.balance<>(p->>'amount')::numeric or cp.note is distinct from nullif(trim(p->>'note'),'') then raise exception 'STALE_VERSION'; end if;
 else
 insert into public.account_balance_checkpoints(household_id,account_id,balance_date,balance,source,note) values(h,acct,(p->>'date')::date,(p->>'amount')::numeric,'manual',nullif(trim(p->>'note'),'')) returning * into cp;
 end if;
 r:=to_jsonb(cp);
 elsif t='import' then
 if jsonb_typeof(p->'lines')<>'array' or jsonb_array_length(p->'lines')=0 or jsonb_array_length(p->'lines')>20000 or p->>'contentSha256' !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_PAYLOAD'; end if;
 count_lines:=jsonb_array_length(p->'lines');
 select * into imported from public.bank_statement_imports where household_id=h and account_id=acct and content_sha256=p->>'contentSha256';
 if not found then
 insert into public.bank_statement_imports(household_id,account_id,file_name,content_sha256,line_count) values(h,acct,left(coalesce(p->>'fileName','extracto.csv'),255),p->>'contentSha256',count_lines) returning * into imported;
 for item in select value from jsonb_array_elements(p->'lines') loop
 insert into public.bank_statement_lines(import_id,line_ordinal,transaction_date,concept,reference,signed_amount,content_sha256) values(imported.id,(item->>'ordinal')::integer,(item->>'date')::date,item->>'concept',item->>'reference',(item->>'amount')::numeric,item->>'hash');
 end loop;
 end if;
 if imported.line_count<>count_lines or (select count(*) from public.bank_statement_lines where import_id=imported.id)<>count_lines or exists(select 1 from jsonb_array_elements(p->'lines') q(value) left join public.bank_statement_lines l on l.import_id=imported.id and l.line_ordinal=(q.value->>'ordinal')::integer where l.id is null or l.content_sha256<>q.value->>'hash' or l.transaction_date<>(q.value->>'date')::date or l.concept<>q.value->>'concept' or l.signed_amount<>(q.value->>'amount')::numeric or l.reference is distinct from q.value->>'reference') then raise exception 'SOURCE_CHANGED'; end if;
 r:=jsonb_build_object('import',to_jsonb(imported),'lines',(select jsonb_agg(to_jsonb(l) order by l.line_ordinal) from public.bank_statement_lines l where l.import_id=imported.id));
 elsif t='confirm' then
 select l.*,i.account_id into line from public.bank_statement_lines l join public.bank_statement_imports i on i.id=l.import_id where l.id=(p->>'statementLineId')::uuid and i.household_id=h;
 if not found or line.account_id<>acct then raise exception 'ACCOUNT_MISMATCH'; end if;
 if line.content_sha256 is distinct from op->'baseRevision'->>'lineHash' then raise exception 'SOURCE_CHANGED'; end if;
 select s.account_id,s.treasury_revision as series,o.treasury_revision as occurrence into src from public.movement_series s join public.movement_occurrence_states o on o.series_id=s.id where s.id=(p->>'seriesId')::uuid and s.household_id=h and o.occurrence_date=(p->>'occurrenceDate')::date;
 if not found then raise exception 'OCCURRENCE_CONFLICT'; end if;
 if src.account_id<>acct then raise exception 'ACCOUNT_MISMATCH'; end if;
 if src.series is distinct from (op->'baseRevision'->>'series')::integer or src.occurrence is distinct from (op->'baseRevision'->>'occurrence')::integer then raise exception 'STALE_VERSION'; end if;
 select * into rec from public.treasury_reconciliations where id=(p->>'id')::uuid;
 if found then raise exception 'ALREADY_CONFIRMED'; end if;
 if exists(select 1 from public.treasury_reconciliations where status='confirmed' and statement_line_id=line.id) then raise exception 'ALREADY_CONFIRMED'; end if;
 if exists(select 1 from public.treasury_reconciliations where status='confirmed' and movement_series_id=(p->>'seriesId')::uuid and occurrence_date=(p->>'occurrenceDate')::date) then raise exception 'OCCURRENCE_CONFLICT'; end if;
 insert into public.treasury_reconciliations(id,household_id,statement_line_id,movement_series_id,occurrence_date) values((p->>'id')::uuid,h,line.id,(p->>'seriesId')::uuid,(p->>'occurrenceDate')::date) returning * into rec;
 r:=to_jsonb(rec);
 else
 if nullif(trim(p->>'reason'),'') is null or length(p->>'reason')>2000 then raise exception 'INVALID_PAYLOAD'; end if;
 select * into rec from public.treasury_reconciliations where id=(p->>'id')::uuid and household_id=h;
 if not found then raise exception 'OCCURRENCE_CONFLICT'; end if;
 if rec.status='revoked' then raise exception 'ALREADY_REVOKED'; end if;
 if rec.treasury_revision is distinct from (op->>'baseRevision')::integer then raise exception 'STALE_VERSION'; end if;
 update public.treasury_reconciliations set status='revoked',revoked_by=actor,revocation_reason=trim(p->>'reason') where id=rec.id returning * into rec;
 r:=to_jsonb(rec);
 end if;
 insert into private.treasury_operation_receipts(actor_id,household_id,operation_id,request,response) values(actor,h,k,req,r);
 return r;
end;
$$;
-- Function owner has NOLOGIN, NOSUPERUSER and NOBYPASSRLS; never postgres/service_role.
grant usage,create on schema private to domus_treasury_executor;
alter function private.domus_treasury_execute(uuid,jsonb) owner to domus_treasury_executor;
revoke create on schema private from domus_treasury_executor;
revoke all on function private.domus_treasury_execute(uuid,jsonb) from public,anon;
grant execute on function private.domus_treasury_execute(uuid,jsonb) to authenticated;
create or replace function public.domus_treasury_execute(household_id uuid, operation jsonb) returns jsonb
language sql security invoker set search_path='' as $$select private.domus_treasury_execute(household_id,operation);$$;
revoke all on function public.domus_treasury_execute(uuid,jsonb) from public,anon;
grant execute on function public.domus_treasury_execute(uuid,jsonb) to authenticated;

grant domus_treasury_executor to postgres with set false;
