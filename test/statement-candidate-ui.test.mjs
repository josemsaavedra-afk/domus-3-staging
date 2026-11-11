import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const html=readFileSync('domus-3/index.html','utf8');
const modal=html.split('\n').find(line=>line.startsWith('<div class="modal" id="movementDetailModal"'));
const inspector=html.slice(html.indexOf('let statementCandidateReturn = null;'),html.indexOf('function treasury3Snapshot()'));
const details=html.split('\n').filter(line=>/^function (openMovementDetail|closeMovementDetail)\(/.test(line)).join('\n');

test('open actual movement from statement, return, confirm/reject and preserve other decisions',async()=>{
 const dom=new JSDOM('<section id="movementsView" class="hidden"></section><div id="treasury3Root"></div>'+modal,{url:'https://example.test/',runScripts:'outside-only'});
 const before={window:globalThis.window,document:globalThis.document,Event:globalThis.Event,CustomEvent:globalThis.CustomEvent};
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,Event:dom.window.Event,CustomEvent:dom.window.CustomEvent});
 const w=dom.window,q=s=>w.document.querySelector(s);let created;
 const originals=[{id:'coffee',household_id:'h',account_id:'a',type:'expense',amount:3,concept:'Café',notes:'Nota café',start_date:'2026-10-01',occurrence_date:'2026-10-01',status:'done',actual_date:'2026-10-01'},
 {id:'petro',household_id:'h',account_id:'a',type:'expense',amount:45,concept:'petroleo',notes:'Tique de combustible 123',invoice_number:'ticket-123',payer_person_id:'jeni',category_id:'fuel',start_date:'2026-10-05',occurrence_date:'2026-10-05',status:'done',actual_date:'2026-10-05'}];
 Object.assign(w,{user:{id:'u'},household:{id:'h'},series:originals,movementDetailReturn:null,DOMUSClassification:{labelName:()=>'',counterpartyLabel:()=>''},
  findOccurrence:(id,date)=>{const m=originals.find(x=>x.id===id&&x.occurrence_date===date);return m&&{...m,occurrenceDate:new Date(date+'T12:00:00'),state:{actual_date:date},recurrence:'none'};},
  fmt:value=>value instanceof Date||Object.prototype.toString.call(value)==='[object Date]'?value.toISOString().slice(0,10):String(value),parseDate:s=>new Date(s+'T12:00:00'),
  euro:v=>Number(v).toFixed(2)+' €',escapeHtml:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  isPendingSettlement:()=>false,personName:()=>'Jeni',accountName:()=>'ING Jeni',categoryName:()=>'Combustible',relatedIncomeForExpense:()=>[],relatedForIncome:()=>[],movementDocuments:()=>[],originalDateOf:x=>x.occurrence_date,
  scrollTo:(x,y)=>{Object.defineProperty(w,'scrollX',{value:x,configurable:true});Object.defineProperty(w,'scrollY',{value:y,configurable:true});}});
 vm.runInContext(inspector+'\n'+details,dom.getInternalVMContext());
 try {
  const ui=await import('../domus-3/src/treasury/ui.js');
  let snapshot={userId:'u',householdId:'h',asOf:'2026-11-11',accounts:[{id:'a',household_id:'h',name:'ING Jeni',active:true}],rows:originals.map(m=>({...m,id:m.id+'|'+m.occurrence_date,series_id:m.id}))};
  ui.renderTreasury3(snapshot);w.DOMUSTreasury3.configureStatementInspection(w.openStatementCandidate);w.DOMUSTreasury3.configureStatementCreation(draft=>{created=draft;});
  const load=async()=>{
    q('#treasuryCsvAccount').value='a';q('#treasuryCsvAccount').onchange();
    await q('#treasuryCsv').onchange({target:{files:[{name:'octubre.csv',size:100,text:async()=>'Fecha;Concepto;Importe\n01/10/2026;Café;-3,00\n02/10/2026;PETROPRIX;-45,00\n03/10/2026;Otro pago;-7,00'}],value:''}});
    assert.match(q('#treasuryCsvResult').textContent,/Muestra de 3 de 3/);
    await q('[data-csv-review]').onclick();
  };
  const row=id=>q(`[data-review-row="${id}"]`);
  await load();const [first,petro]=[...document.querySelectorAll('[data-review-row]')].map(el=>el.dataset.reviewRow);
  row(first).querySelector('[data-review-confirm]').click();
  assert.match(q('.treasury-review-summary').textContent,/1 conciliadas/);
  w.scrollTo(0,480);
  await row(petro).querySelector('[data-review-open]').onclick();
  assert.ok(q('#movementDetailModal').classList.contains('show'));
  assert.match(q('#statementCandidateReview').textContent,/PETROPRIX/);
  assert.match(q('#movementDetailBody').textContent,/Tique de combustible 123/);
  assert.match(q('#movementDetailBody').textContent,/Combustible/);
  assert.match(q('#movementDetailBody').textContent,/2026-10-05/);
  assert.match(q('#movementDetailBody').textContent,/ticket-123/);
  q('[data-statement-candidate-back]').click();assert.equal(w.scrollY,480);
  assert.match(q('.treasury-review-summary').textContent,/1 conciliadas/);
  await row(petro).querySelector('[data-review-open]').onclick();
  ui.renderTreasury3({...snapshot});
  q('[data-statement-candidate-confirm]').click();
  assert.ok(!q('#movementDetailModal').classList.contains('show'));
  assert.match(q('.treasury-review-summary').textContent,/2 conciliadas/);
  assert.equal(w.scrollY,480);
  // New review: rejecting a match keeps the bank line and makes creation possible.
  ui.resetTreasury3();ui.renderTreasury3(snapshot);await load();row(first).querySelector('[data-review-confirm]').click();
  await row(petro).querySelector('[data-review-open]').onclick();q('[data-statement-candidate-reject]').click();
  assert.ok(row(petro).querySelector('[data-review-create]'));
  assert.match(q('.treasury-review-summary').textContent,/1 conciliadas/);
  row(petro).querySelector('[data-review-restore]').click();assert.ok(row(petro).querySelector('[data-review-open]'));
  await row(petro).querySelector('[data-review-open]').onclick();q('[data-statement-candidate-reject]').click();
  await row(petro).querySelector('[data-review-create]').onclick();assert.equal(created.amount,45);assert.equal(created.concept,'PETROPRIX');assert.equal(originals.length,2);
  assert.match(q('.treasury-review-summary').textContent,/1 conciliadas/);
  row(petro).querySelector('[data-review-restore]').click();await row(petro).querySelector('[data-review-open]').onclick();
  snapshot={...snapshot,userId:'other'};w.user={id:'other'};ui.renderTreasury3(snapshot);q('[data-statement-candidate-confirm]').click();
  assert.match(q('[data-statement-candidate-message]').textContent,/sesión ha cambiado/);
  assert.equal(q('[data-review-row]'),null);
  w.closeMovementDetail();ui.resetTreasury3();
 } finally {await Promise.resolve();Object.assign(globalThis,before);dom.window.close();}
});
