import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
const migration=readFileSync('supabase/migrations/20261009163158_rc1_beginner_examples.sql','utf8');
test('Examples are household-scoped, seeded once, and preserve edits/deactivation',async()=>{const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table households(id uuid primary key);create table household_members(household_id uuid,user_id uuid);insert into households values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');insert into household_members values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000010');`);
 for(const table of ['categories','counterparties','activity_projects','tags'])await db.exec(`create table public.${table}(id uuid default gen_random_uuid(),household_id uuid,name text,active boolean default true);`);
 await db.exec(`create table classification_rules(id uuid default gen_random_uuid(),household_id uuid,name text,conditions jsonb,proposals jsonb,priority int,active boolean default true);grant usage on schema public,auth to authenticated;grant select,insert,update on all tables in schema public to authenticated;`);
 await db.exec(migration);await db.exec("set role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000010',false)");
 const call=async(h='00000000-0000-4000-8000-000000000001')=>(await db.query('select public.domus_rc1_seed_examples($1) created',[h])).rows[0].created;
 assert.equal(await call(),true);assert.equal((await db.query('select count(*)::int n from categories')).rows[0].n,6);assert.equal((await db.query('select count(*)::int n from classification_rules')).rows[0].n,5);
 await db.exec("update classification_rules set name='Mi regla editada',active=false where name='Ejemplo: Mercadona';update tags set name='Viaje editado',active=false where name='Viaje'");
 assert.equal(await call(),false);assert.equal((await db.query('select count(*)::int n from classification_rules')).rows[0].n,5);assert.equal((await db.query("select active from classification_rules where name='Mi regla editada'")).rows[0].active,false);
 await assert.rejects(()=>call('00000000-0000-4000-8000-000000000002'),/Household unavailable/);
 await db.exec('set role anon');await assert.rejects(()=>call(),/permission denied/);
 }finally{await db.close();}});
