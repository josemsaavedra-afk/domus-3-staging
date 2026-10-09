import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {PGlite} from '@electric-sql/pglite';

const load=p=>{const window={};vm.runInNewContext(readFileSync(p,'utf8'),{window});return window;};
const C=load('domus-3/src/classification/master.js').DOMUSClassification;
const R=load('domus-3/src/classification/report.js').DOMUSReport;
test('Professional invoice cannot be domestic; personal income is still possible',()=>{
 assert.throws(()=>C.validateMovement({type:'income',invoice_number:'F1',expense_scope:'domestic'},null,{categories:[]}),/actividad económica/);
 assert.throws(()=>C.validateMovement({type:'income',activity_project_id:'a',expense_scope:'mixed'},null,{categories:[]}),/actividad económica/);
 assert.equal(C.validateMovement({type:'income',expense_scope:'domestic'},null,{categories:[]}).type,'income');
});
test('Incompatible category rejected on both create and edit',()=>{
 for(const previous of [null,{category_id:'c'}])assert.throws(()=>C.validateMovement({type:'income',category_id:'c'},previous,{categories:[{id:'c',kind:'expense'}]}),/categoría/);
});
test('Documentary report month is independent of bank payment month',()=>{
 const row={type:'expense',amount:10,occurrenceDate:'2026-10-05',documentDate:'2026-09-30'};
 assert.equal(R.filter([row],{from:'2026-09-01',to:'2026-09-30'}).length,1);
 assert.equal(R.filter([row],{from:'2026-10-01',to:'2026-10-31'}).length,0);
});
test('Income rules cannot suggest domestic, but can suggest business',()=>{
 const base={id:'r',household_id:'h',priority:1,name:'Test',conditions:{type:'income'}};
 for(const scope of ['domestic','business']){
  const r=C.proposeRules({household_id:'h',type:'income'},[{...base,proposals:{expense_scope:scope}}],{});
  assert.equal(r.proposals.expense_scope,scope==='business'?'business':undefined);
 }
});
test('Additive schema preserves legacy data and independently stores the two dates',async()=>{
 const db=new PGlite();try{
 await db.exec(`create table public.movement_series(id int primary key,type text,activity_project_id uuid,invoice_number text,counterparty text,expense_scope text);create table public.movement_occurrence_states(series_id int,occurrence_date date,actual_date date);insert into movement_series values(1,'income',null,'OLD','Lyreco',null);insert into movement_occurrence_states values(1,'2026-09-30','2026-10-05');`);
 await db.exec(readFileSync('supabase/migrations/20261009161717_rc1_movement_model.sql','utf8'));
 const old=(await db.query('select * from movement_occurrence_states')).rows[0];assert.equal(old.document_date,null);
 await db.exec("update movement_occurrence_states set document_date='2026-09-28'");
 const row=(await db.query('select document_date::text,actual_date::text,occurrence_date::text from movement_occurrence_states')).rows[0];assert.deepEqual(row,{document_date:'2026-09-28',actual_date:'2026-10-05',occurrence_date:'2026-09-30'});
 await assert.rejects(()=>db.exec("insert into movement_series values(2,'income',null,'NEW','Lyreco','domestic')"),/rc1_professional_income_scope/);
 await db.exec("insert into movement_series values(2,'income',null,'NEW','Lyreco','business')");
 }finally{await db.close();}
});
