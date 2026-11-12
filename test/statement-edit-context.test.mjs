import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';
const html=readFileSync('domus-3/index.html','utf8'),line=name=>html.split('\n').find(s=>s.startsWith('function '+name+'('));
const modals=html.split('\n').filter(s=>/^<div class="modal" id="(movementModal|movementDetailModal)"/.test(s)).join('');
const inspection=html.slice(html.indexOf('let statementCandidateReturn = null;'),html.indexOf('function treasury3Snapshot()'));
const atomic=html.slice(html.indexOf('async function saveSingleMovementAtomic('),html.indexOf('async function saveFutureRecurrence('));
const submit=html.slice(html.indexOf("document.getElementById('movementForm').onsubmit="),html.indexOf("\ndocument.getElementById('deleteSeriesBtn').onclick"));
test('edit the actual proposed movement, fill missing payer from statement, save the same identity and retain other decisions',async()=>{
 const dom=new JSDOM('<section id="movementsView" class="hidden"></section><div id="treasury3Root"></div>'+modals,{url:'https://example.test/',runScripts:'outside-only'}),w=dom.window;
 const before={window:globalThis.window,document:globalThis.document,Event:globalThis.Event,CustomEvent:globalThis.CustomEvent};Object.assign(globalThis,{window:w,document:w.document,Event:w.Event,CustomEvent:w.CustomEvent});
 let calls=0,snapshot,ui;const q=id=>w.document.getElementById(id),series=[{id:'fuel',household_id:'h',account_id:'a',concept:'PETROPRIX combustible',amount:45,type:'expense',recurrence:'none',start_date:'2026-10-02',category_id:'fuel',expense_scope:'business'},{id:'coffee',household_id:'h',account_id:'a',concept:'Café',amount:3,type:'expense',recurrence:'none',start_date:'2026-10-01'}];
 const states=new Map(series.map(m=>[m.id+'|'+m.start_date,{series_id:m.id,occurrence_date:m.start_date,status:'done',actual_date:m.start_date,document_date:m.start_date}]));
 const people=[{id:'jeni',name:'Jeni',household_id:'h',active:true}],accounts=[{id:'a',name:'ING Jeni',household_id:'h',active:true}],paymentMethods=[{id:'card',name:'Tarjeta',household_id:'h',active:true}];
 const syncSnapshot=()=>({...snapshot,rows:series.map(m=>({...m,...states.get(m.id+'|'+m.start_date),id:m.id+'|'+m.start_date,series_id:m.id}))});
 const opts=(id,rows)=>{q(id).innerHTML='<option value=""></option>'+rows.map(row=>`<option value="${row.id}">${row.name}</option>`).join('')};
 Object.assign(w,{series,user:{id:'u'},household:{id:'h'},people,accounts,paymentMethods,categories:[{id:'fuel',name:'Combustible'}],movementDetailReturn:null,movementReturnFocus:null,movementFormSnapshot:'',savingMovement:false,
  populateSelects:()=>{opts('fPerson',people);opts('fPayer',people);opts('fBank',accounts);opts('fPaymentMethod',paymentMethods);opts('fCategory',[{id:'fuel',name:'Combustible'}]);},
  stateMap:()=>states,findOccurrence:(id,date)=>{const m=series.find(row=>row.id===id);return m&&{...m,occurrenceDate:new Date(date+'T12:00:00'),state:states.get(id+'|'+date),status:'done'};},
  dateKey:date=>date.toISOString().slice(0,10),fmt:date=>new Date(date).toISOString().slice(0,10),parseDate:s=>new Date(s+'T12:00:00'),euro:v=>String(v)+' €',escapeHtml:String,
  isPendingSettlement:()=>false,personName:()=>'',accountName:()=>'ING Jeni',categoryName:()=>'Combustible',relatedIncomeForExpense:()=>[],movementDocuments:()=>[],originalDateOf:row=>row.start_date,
  closeDayModal:()=>{},setSimpleMovementMode:()=>{},setMovementAdvanced:()=>{},refreshMovementIncomeChoices:()=>{},syncPrefFields:()=>{},captureMovementForm:()=>{},movementFormChanged:()=>false,
  msg:(id,text)=>{q(id).textContent=text;},setBusy:()=>{},duplicateCandidates:()=>[],duplicateWarning:()=>true,validateMovementDates:()=>{},requireClassificationSchema:async()=>{},requireLabelsSchema:async()=>{},sameNullable:(a,b)=>a===b,syncExpenseLinks:async()=>{},friendlyCloudError:e=>e.message,
  DOMUSClassification:{labelName:()=>'',counterpartyLabel:()=>'',counterpartyFields:()=>({}),labelFields:()=>({}),validateMovement:()=>{}},
  sb:{rpc:async(name,args)=>{assert.equal(name,'domus3_save_single_movement');assert.equal(args.p_source_id,'fuel');assert.equal(args.p_target_id,'fuel');calls++;Object.assign(series[0],args.p_patch);states.set('fuel|'+args.p_state.occurrence_date,args.p_state);return{data:'fuel'};}},
  refreshAll:async()=>{snapshot=syncSnapshot();ui.renderTreasury3(snapshot);},scrollTo:()=>{}});
 w.HTMLElement.prototype.scrollIntoView=function(){};
 try{
  vm.runInContext(inspection+'\n'+['clearStatementFormIdentity','closeForm','editMovement','openMovementDetail','closeMovementDetail'].map(line).join('\n')+'\n'+atomic+'\n'+submit,dom.getInternalVMContext());
  ui=await import('../domus-3/src/treasury/ui.js');snapshot=syncSnapshot.call(null);Object.assign(snapshot,{userId:'u',householdId:'h',asOf:'2026-11-11',people,accounts,paymentMethods});ui.renderTreasury3(snapshot);w.DOMUSTreasury3.configureStatementInspection(w.openStatementCandidate);
  const csv='Fecha;Concepto;Importe\n01/10/2026;Café;-3,00\n02/10/2026;Pago PETROPRIX;-45,00';q('treasuryCsvAccount').value='a';q('treasuryCsvAccount').onchange();await q('treasuryCsv').onchange({target:{files:[{name:'ING_Jeni_solo_tarjeta.csv',size:100,text:async()=>csv}],value:''}});await w.document.querySelector('[data-csv-review]').onclick();w.document.querySelector('[data-review-confirm]').click();
  const petro=()=>[...w.document.querySelectorAll('[data-review-row]')].find(row=>row.textContent.includes('PETROPRIX'));
  await petro().querySelector('[data-review-open]').onclick();w.document.querySelector('[data-statement-candidate-edit]').click();
  assert.equal(q('editSeriesId').value,'fuel');assert.equal(q('fPayer').value,'jeni');assert.equal(q('fPerson').value,'jeni');assert.equal(q('fPaymentMethod').value,'card');
  w.closeForm(true);assert.equal(calls,0);assert.match(w.document.querySelector('.treasury-review-summary').textContent,/1 conciliadas/);
  await petro().querySelector('[data-review-open]').onclick();w.document.querySelector('[data-statement-candidate-edit]').click();
  await q('movementForm').onsubmit({preventDefault(){},submitter:q('movementForm').querySelector('[type=submit]')});
  assert.equal(calls,1);assert.equal(series.length,2);assert.equal(series[0].payer_person_id,'jeni');assert.equal(q('movementModal').classList.contains('show'),false);
  assert.match(w.document.querySelector('.treasury-review-summary').textContent,/1 conciliadas/);assert.ok(petro().querySelector('[data-review-open]'));ui.resetTreasury3();
 }finally{await Promise.resolve();Object.assign(globalThis,before);dom.window.close();}
});
