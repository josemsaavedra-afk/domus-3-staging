-- Disposable fixtures only; complete rollback, never touch real financial records.
begin;
select set_config('request.jwt.claim.sub','9bd54ea5-5f53-4a90-bb82-470a24ba0101',true);
insert into auth.users(id) values('9bd54ea5-5f53-4a90-bb82-470a24ba0101');
insert into public.households(id,name,created_by,updated_by) values('9bd54ea5-5f53-4a90-bb82-470a24ba0111','RC1 disposable verification','9bd54ea5-5f53-4a90-bb82-470a24ba0101','9bd54ea5-5f53-4a90-bb82-470a24ba0101');
insert into public.household_members(household_id,user_id,role,display_name) values('9bd54ea5-5f53-4a90-bb82-470a24ba0111','9bd54ea5-5f53-4a90-bb82-470a24ba0101','owner','RC1 test');
insert into public.accounts(id,household_id,name) values('9bd54ea5-5f53-4a90-bb82-470a24ba0121','9bd54ea5-5f53-4a90-bb82-470a24ba0111','RC1 test bank');
insert into public.movement_series(id,household_id,account_id,type,concept,amount,start_date) values('9bd54ea5-5f53-4a90-bb82-470a24ba0131','9bd54ea5-5f53-4a90-bb82-470a24ba0111','9bd54ea5-5f53-4a90-bb82-470a24ba0121','expense','RC1 test',10,'2026-09-19');
insert into public.movement_occurrence_states(series_id,occurrence_date) values('9bd54ea5-5f53-4a90-bb82-470a24ba0131','2026-09-19');
set local role authenticated;
do $$
declare h uuid:='9bd54ea5-5f53-4a90-bb82-470a24ba0111';a uuid:='9bd54ea5-5f53-4a90-bb82-470a24ba0121'; s uuid:='9bd54ea5-5f53-4a90-bb82-470a24ba0131';
 k uuid;op jsonb;r jsonb;state jsonb;batch jsonb;src jsonb;confirmed jsonb;
begin
 k:=gen_random_uuid();op:=jsonb_build_object('id',k,'idempotencyKey',k,'type','checkpoint','baseRevision',null,'payload',jsonb_build_object('accountId',a,'amount','100.00','date','2026-09-18'));
 r:=public.domus_treasury_execute(h,op);
 if r is distinct from public.domus_treasury_execute(h,op) then raise exception 'FAILED duplicate checkpoint'; end if;
 begin perform public.domus_treasury_execute(h,jsonb_set(op,'{payload,amount}','"99.00"'));raise exception 'FAILED reused key';exception when others then if sqlerrm<>'DUPLICATE_OPERATION' then raise;end if;end;
 k:=gen_random_uuid();op:=jsonb_build_object('id',k,'idempotencyKey',k,'type','import','baseRevision',null,'payload',jsonb_build_object('accountId',a,'fileName','rc1-test.csv','contentSha256',repeat('a',64),'lines',jsonb_build_array(jsonb_build_object('ordinal',1,'date','2026-09-19','concept','RC1 test','reference',null,'amount','-10.00','hash',repeat('b',64)))));
 batch:=public.domus_treasury_execute(h,op);
 if batch is distinct from public.domus_treasury_execute(h,op) then raise exception 'FAILED duplicate import';end if;
 state:=public.domus_treasury_execute(h,'{"type":"read"}');
 if jsonb_array_length(state->'checkpoints')<>1 or jsonb_array_length(state->'lines')<>1 then raise exception 'FAILED persisted read';end if;
 src:=state->'sources'->0;k:=gen_random_uuid();op:=jsonb_build_object('id',k,'idempotencyKey',k,'type','confirm','payload',jsonb_build_object('id',gen_random_uuid(),'accountId',a,'statementLineId',batch->'lines'->0->>'id','seriesId',s,'occurrenceDate','2026-09-19'),'baseRevision',jsonb_build_object('series',src->'series','occurrence',src->'occurrence','lineHash',repeat('b',64)));
 confirmed:=public.domus_treasury_execute(h,op);
 if confirmed is distinct from public.domus_treasury_execute(h,op) then raise exception 'FAILED duplicate confirmation';end if;
 k:=gen_random_uuid();op:=jsonb_build_object('id',k,'idempotencyKey',k,'type','revoke','payload',jsonb_build_object('id',confirmed->>'id','reason','Disposable verification'),'baseRevision',confirmed->'treasury_revision');
 r:=public.domus_treasury_execute(h,op);
 if r->>'status'<>'revoked' or r->>'confirmed_at'<>confirmed->>'confirmed_at' or r is distinct from public.domus_treasury_execute(h,op) then raise exception 'FAILED auditable revocation';end if;
 begin perform public.domus_treasury_execute('9bd54ea5-5f53-4a90-bb82-470a24ba0999','{"type":"read"}');raise exception 'FAILED household isolation';exception when others then if sqlerrm<>'HOUSEHOLD_MISMATCH' then raise;end if;end;
end $$;
rollback;
