import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('RC1 RPC: writes, receipts, read, household isolation, conflict and revocation',async()=>{
 const db=new PGlite();
 try{
 for(const path of ['treasury_fixture.sql','alpha16_prerc_up.sql','alpha18_runtime_up.sql'])await db.exec(readFileSync('test/fixtures/'+path,'utf8'));
 await db.exec(readFileSync('backend/treasury-rpc.sql','utf8'));
 await db.exec('set role authenticated');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
 const call=async(op,h=id(11))=>(await db.query('select public.domus_treasury_execute($1,$2) value',[h,op])).rows[0].value;
 let next=900; const op=(type,payload,baseRevision=null)=>{const k=id(next++);return {id:k,idempotencyKey:k,type,payload,baseRevision};};
 const cp=op('checkpoint',{accountId:id(101),amount:'100.00',date:'2026-09-18'});
 const c=await call(cp);assert.equal(Number(c.balance),100);assert.deepEqual(await call(cp),c);
 await assert.rejects(()=>call({...cp,payload:{...cp.payload,amount:'99'}}),/DUPLICATE_OPERATION/);
 const batch=op('import',{accountId:id(101),fileName:'test.csv',contentSha256:'a'.repeat(64),lines:[{ordinal:1,date:'2026-09-19',concept:'Compra',reference:null,amount:'-10.00',hash:'b'.repeat(64)}]});
 const imported=await call(batch);assert.deepEqual(await call(batch),imported);
 const loaded=await call({type:'read'});assert.equal(loaded.checkpoints.length,1);assert.equal(loaded.lines.length,1);
 const source=loaded.sources.find(s=>s.series_id===id(201));
 const confirmedOp=op('confirm',{id:id(990),accountId:id(101),statementLineId:imported.lines[0].id,seriesId:id(201),occurrenceDate:'2026-09-19'},{series:source.series,occurrence:source.occurrence,lineHash:'b'.repeat(64)});
 await assert.rejects(()=>call({...confirmedOp,baseRevision:{...confirmedOp.baseRevision,series:999}}),/STALE_VERSION/);
 const confirmed=await call(confirmedOp);assert.deepEqual(await call(confirmedOp),confirmed);
 await assert.rejects(()=>call({type:'read'},id(12)),/HOUSEHOLD_MISMATCH/);
 await assert.rejects(()=>db.query('select * from private.treasury_operation_receipts'),/permission denied/);
 const invalid=op('import',{accountId:id(101),fileName:'bad.csv',contentSha256:'c'.repeat(64),lines:[{ordinal:1,date:'2026-09-19',concept:'Valid',amount:'-1.00',hash:'d'.repeat(64)},{ordinal:2,date:'2026-09-19',concept:'Invalid',amount:'0.00',hash:'e'.repeat(64)}]});
 await assert.rejects(()=>call(invalid));assert.equal((await call({type:'read'})).imports.length,1,'failed import fully rolls back');
 const revokedOp=op('revoke',{id:confirmed.id,reason:'Corrección de prueba'},confirmed.treasury_revision);
 const revoked=await call(revokedOp);assert.equal(revoked.status,'revoked');assert.equal(revoked.revoked_by,id(1));assert.equal(revoked.confirmed_at,confirmed.confirmed_at);assert.deepEqual(await call(revokedOp),revoked);
 assert.equal((await call({type:'read'})).reconciliations[0].status,'revoked');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);
 await assert.rejects(()=>call({type:'read'}),/HOUSEHOLD_MISMATCH/);
 await db.exec('set role anon');await assert.rejects(()=>call({type:'read'}),/permission denied/);
 }finally{await db.close();}
});
