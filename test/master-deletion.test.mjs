import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const H='10000000-0000-4000-8000-000000000001', OTHER='10000000-0000-4000-8000-000000000002';
const U='20000000-0000-4000-8000-000000000001', ID='30000000-0000-4000-8000-000000000001';
const kinds=['people','accounts','categories','counterparties','activity_projects','tags','payment_methods'];
let db;
beforeEach(async()=>{
 db=new PGlite();
 await db.exec(`create role authenticated;create role anon;
 create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
 create table household_members(household_id uuid,user_id uuid); insert into household_members values('${H}','${U}');
 grant select on household_members to authenticated;
 ${kinds.map(k=>`create table ${k}(id uuid primary key,household_id uuid not null,name text not null,active boolean not null,unique(id,household_id));
 alter table ${k} enable row level security;
 create policy own on ${k} to authenticated using(household_id in(select household_id from household_members where user_id=auth.uid())) with check(household_id in(select household_id from household_members where user_id=auth.uid()));
 grant select,insert,update,delete on ${k} to authenticated;
 insert into ${k} values('${ID}','${H}','Synthetic ${k}',false);`).join('\n')}
 create table movement_series(id uuid primary key,household_id uuid,payment_method_id uuid references payment_methods(id) on delete set null,person_id uuid,foreign key(person_id,household_id) references people(id,household_id));
 create table classification_rules(id int primary key,household_id uuid,proposals jsonb);
 grant select,insert,update,delete on movement_series,classification_rules to authenticated;
 alter table movement_series enable row level security;alter table classification_rules enable row level security;
 create policy own on movement_series to authenticated using(household_id='${H}') with check(household_id='${H}');
 create policy own on classification_rules to authenticated using(household_id='${H}') with check(household_id='${H}');`);
 // Match deployed grants: browser deletion is withheld on six master tables.
 await db.exec('revoke delete on people,accounts,categories,counterparties,activity_projects,tags from authenticated;revoke update,delete on classification_rules from authenticated;');
 await db.exec(await readFile(new URL('../supabase/migrations/20261116205429_guarded_master_deletion.sql',import.meta.url),'utf8'));
 await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${U}',false);`);
});
afterEach(async()=>{await db?.close();});
async function call(kind='people',version=null,hid=H,id=ID){return (await db.query('select public.domus3_delete_master($1,$2,$3,$4) as result',[hid,kind,id,version])).rows[0].result;}

test('all seven inactive masters require preview then explicit matching confirmation',async()=>{
 for(const kind of kinds){const preview=await call(kind);assert.equal(preview.status,'review');assert.equal(preview.active,false);assert.match(preview.version,/^[a-f0-9]{32}$/);assert.equal((await db.query(`select count(*)::int n from ${kind}`)).rows[0].n,1);
 assert.deepEqual(await call(kind,preview.version),{status:'deleted',id:ID});assert.equal((await db.query(`select count(*)::int n from ${kind}`)).rows[0].n,0);}
});
test('active unreferenced master can also be deleted',async()=>{
 await db.query('update people set active=true where id=$1',[ID]);const p=await call();assert.equal(p.active,true);assert.equal((await call('people',p.version)).status,'deleted');
});
test('SET NULL foreign key is blocked without losing payment identity',async()=>{
 await db.exec(`insert into movement_series(id,household_id,payment_method_id) values('40000000-0000-4000-8000-000000000001','${H}','${ID}');`);
 const p=await call('payment_methods');assert.equal(p.status,'blocked');assert.equal((await call('payment_methods',p.version)).status,'blocked');assert.equal((await db.query('select payment_method_id from movement_series')).rows[0].payment_method_id,ID);
});
test('composite foreign key blocks deletion preserving historical references',async()=>{
 await db.exec(`insert into movement_series(id,household_id,person_id) values('40000000-0000-4000-8000-000000000001','${H}','${ID}');`);
 const p=await call();assert.equal(p.status,'blocked');assert.equal(p.dependencies[0].kind,'foreign_key');assert.equal((await db.query('select person_id from movement_series')).rows[0].person_id,ID);
});
test('JSON rule references block deletion even without a foreign key',async()=>{
 await db.query('insert into classification_rules values(1,$1,$2)',[H,JSON.stringify({payer_person_id:ID})]);const p=await call();assert.equal(p.status,'blocked');assert.equal(p.dependencies[0].kind,'json_reference');
});
test('new references inserted between preview and confirm are checked again',async()=>{
 const p=await call();await db.query('insert into classification_rules values(1,$1,$2)',[H,JSON.stringify({person_id:ID})]);assert.equal((await call('people',p.version)).status,'blocked');assert.equal((await db.query('select count(*)::int n from people')).rows[0].n,1);
});
test('concurrent rename requires a fresh preview',async()=>{
 const p=await call();await db.query('update people set name=$1 where id=$2',['Changed',ID]);await assert.rejects(call('people',p.version),e=>e.code==='40001');assert.equal((await db.query('select name from people')).rows[0].name,'Changed');
});
test('foreign household, missing identity and arbitrary tables cannot delete',async()=>{
 await assert.rejects(call('people',null,OTHER),e=>e.code==='42501');await assert.rejects(call('household_members'),e=>e.code==='22023');await db.exec("select set_config('request.jwt.claim.sub','',false)");await assert.rejects(call(),e=>e.code==='42501');
});
test('anonymous execution is denied and function does not bypass RLS',async()=>{
 const fn=(await db.query("select prosecdef from pg_proc where proname='domus3_delete_master'")).rows[0];assert.equal(fn.prosecdef,false);await db.exec('reset role;set role anon;');await assert.rejects(call(),e=>e.code==='42501');
});
test('guarded executor never grants direct browser deletion or bypass membership',async()=>{
 await assert.rejects(db.query('delete from people where id=$1',[ID]),e=>e.code==='42501');
 await assert.rejects(db.query('delete from payment_methods where id=$1',[ID]),e=>e.code==='42501');
 const role=(await db.query("select rolcanlogin,rolsuper,rolbypassrls from pg_roles where rolname='domus_master_delete_executor'")).rows[0];
 assert.deepEqual(role,{rolcanlogin:false,rolsuper:false,rolbypassrls:false});
 assert.equal((await db.query("select pg_has_role('authenticated','domus_master_delete_executor','MEMBER') as member")).rows[0].member,false);
 const p=await call();assert.equal((await call('people',p.version)).status,'deleted');
});
test('revoked household membership after preview denies confirmation and keeps record',async()=>{
 const p=await call();await db.exec('reset role;delete from household_members;set role authenticated;');
 await assert.rejects(call('people',p.version),e=>e.code==='42501');
 await db.exec('reset role;');assert.equal((await db.query('select count(*)::int n from people')).rows[0].n,1);
});
