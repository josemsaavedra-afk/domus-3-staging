import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { buildStatementDraft, statementCreationEligibility } from '../domus-3/src/treasury/statement-draft.js';
import { parseStatementCsv } from '../domus-3/src/treasury/statement-csv.js';
import { reconcileStatement } from '../domus-3/src/treasury/reconciliation.js';
import { createReviewSession } from '../domus-3/src/treasury/reconciliation-review.js';
const rows = createReviewSession(reconcileStatement(parseStatementCsv('Fecha;Concepto;Importe\n01/10/2026;Pago tienda;-3,50\n02/10/2026;Bizum recibido;10,00\n01/10/2026;Pago tienda;-3,50'), [])).rows;
const input = {householdId:'house',userId:'user',account:{id:'bank',household_id:'house'},rows,row:rows[0],fileName:'octubre.csv'};
const build = value => buildStatementDraft({...input,...value},webcrypto);
test('bank debit and credit prepare explicit reviewed drafts without guessing people or category',async()=>{
 const debit=await build(),credit=await build({row:rows[1]});
 assert.equal(debit.type,'expense');assert.equal(debit.amount,3.5);assert.equal(credit.type,'income');assert.equal(credit.amount,10);
 assert.equal(debit.person_id,undefined);assert.equal(debit.category_id,undefined);assert.match(debit.notes,/Línea 1/);
});
test('retry, renamed file and filtered statement keep the operation ID; repeated equal purchases stay separate',async()=>{
 const a=await build(),again=await build({fileName:'otro.csv'}),filtered=await build({rows:[rows[0]],row:{...rows[0],statement:{...rows[0].statement,id:'csv-9',ordinal:9}}}).catch(e=>e);
 assert.equal(a.id,again.id);assert.ok(filtered instanceof Error);
 const subset=await build({rows:[rows[0]],fileName:'tarjetas.csv'});assert.equal(a.id,subset.id);
 assert.notEqual(a.id,(await build({row:rows[2]})).id);
 assert.notEqual(a.id,(await build({account:{id:'bank2',household_id:'house'}})).id);
 assert.match(a.id,/^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});
test('blocks known matches, closed decisions, own transfers, invalid amounts and cross-household accounts',async()=>{
 for(const row of [{...rows[0],candidates:[{id:'existing'}]},{...rows[0],decision:'descartada'},{...rows[0],statement:{...rows[0].statement,concept:'Traspaso entre mis cuentas'}}]){
  assert.ok(statementCreationEligibility(row));await assert.rejects(()=>build({row}));
 }
 await assert.rejects(()=>build({account:{id:'bank',household_id:'other'}}));
 await assert.rejects(()=>build({row:{...rows[0],statement:{...rows[0].statement,signedAmount:NaN}}}));
});
const html=readFileSync('domus-3/index.html','utf8');
const openSource=html.slice(html.indexOf('async function openStatementMovement('),html.indexOf('function treasury3Snapshot('));
function formRuntime(){
 const fields=new Map();const field=id=>{if(!fields.has(id))fields.set(id,{value:'',dataset:{}});return fields.get(id)};
 const messages=[];const context={user:{id:'user'},household:{id:'house'},accounts:[input.account],series:[],document:{getElementById:field},openForm:()=>{},syncMovementModel:()=>{},syncPrefFields:()=>{},captureMovementForm:()=>{},msg:(...args)=>messages.push(args)};
 vm.createContext(context);vm.runInContext(openSource,context);return {context,field,messages};
}
test('host opens the real movement form with stable identity, paid date and blank classification, never writes on open',async()=>{
 const draft=await build(),r=formRuntime();await r.context.openStatementMovement(draft);
 assert.equal(r.field('movementForm').dataset.pendingCreateId,draft.id);
 assert.equal(r.field('fAmount').value,3.5);assert.equal(r.field('fActualDate').value,'2026-10-01');
 for(const key of ['fPerson','fPayer','fCategory','fExpenseScope'])assert.equal(r.field(key).value,'');
 assert.equal(r.field('fBank').value,'bank');assert.equal(r.field('fStatus').value,'done');
 r.context.series.push({id:draft.id});await assert.rejects(()=>r.context.openStatementMovement(draft),/ya está guardada/);
 r.context.user={id:'another'};await assert.rejects(()=>r.context.openStatementMovement(draft),/sesión/);
});

test('extract review → actual form submit handler → one atomic save → refreshed state; missing classification blocks saving',async()=>{
 const draft=await build(),r=formRuntime(),stored=new Map();let refreshed=0,savedNotice=0;
 Object.assign(r.context,{savingMovement:false,navigator:{onLine:true},setBusy:()=>{},duplicateCandidates:()=>[],duplicateWarning:()=>true,requireClassificationSchema:async()=>{},requireLabelsSchema:async()=>{},people:[],categories:[],sameNullable:(a,b)=>a===b,syncExpenseLinks:async()=>{},friendlyCloudError:e=>e.message,stateMap:()=>new Map(),validateMovementDates:()=>{assert.ok(r.field('fExpenseScope').value)},closeForm:()=>{},refreshAll:async()=>{r.context.series=[...stored.values()].map(x=>({id:x.p_target_id,...x.p_patch}));refreshed++},sb:{rpc:async(name,args)=>{assert.equal(name,'domus3_save_single_movement');assert.ok(!stored.has(args.p_target_id));stored.set(args.p_target_id,args);return {data:args.p_target_id}}},window:{DOMUSClassification:{counterpartyFields:()=>({}),labelFields:()=>({}),validateMovement:()=>{}},DOMUSTreasury3:{statementSaved:()=>savedNotice++}}});
 const atomic=html.slice(html.indexOf('async function saveSingleMovementAtomic('),html.indexOf('async function saveFutureRecurrence('));
 const start=html.indexOf("document.getElementById('movementForm').onsubmit="),end=html.indexOf("\ndocument.getElementById('deleteSeriesBtn').onclick",start);
 vm.runInContext(atomic+'\n'+html.slice(start,end),r.context);
 await r.context.openStatementMovement(draft);
 r.field('fDate').value=draft.date;r.field('fTags').selectedOptions=[];r.field('movementFormMsg').scrollIntoView=()=>{};
 const submit=()=>r.field('movementForm').onsubmit({preventDefault(){},submitter:{}});
 await submit();assert.equal(stored.size,0);assert.match(r.messages.at(-1)[1],/quién paga/);
 r.field('fCategory').value='food';r.field('fPayer').value='person';r.field('fExpenseScope').value='domestic';
 await submit();assert.equal(stored.size,1);assert.equal(refreshed,1);assert.equal(savedNotice,1);
 const saved=stored.get(draft.id);assert.equal(saved.p_patch.amount,3.5);assert.equal(saved.p_patch.account_id,'bank');assert.equal(saved.p_state.status,'done');assert.equal(saved.p_state.actual_date,draft.date);
 await assert.rejects(()=>r.context.openStatementMovement(draft),/ya está guardada/);
});
