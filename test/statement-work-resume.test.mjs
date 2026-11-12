import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {saveStatementWork,readStatementWork} from '../domus-3/src/treasury/statement-work-store.js';
test('108-line review resumes only its 106 remaining lines after resetting the app, with session isolation',async()=>{
 const dom=new JSDOM('<div id="treasury3Root"></div>',{url:'https://example.test/'}),before={window:globalThis.window,document:globalThis.document,Event:globalThis.Event,CustomEvent:globalThis.CustomEvent};
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,Event:dom.window.Event,CustomEvent:dom.window.CustomEvent});
 dom.window.HTMLElement.prototype.scrollIntoView=function(){};
 try{
  const ui=await import('../domus-3/src/treasury/ui.js');
  let snapshot={userId:'u',householdId:'h',asOf:'2026-11-11',accounts:[{id:'a',household_id:'h',name:'ING Jeni',active:true}],people:[{id:'jeni',name:'Jeni',household_id:'h',active:true}],paymentMethods:[{id:'card',name:'Tarjeta',household_id:'h',active:true}],rows:[{id:'existing|2026-10-01',series_id:'existing',type:'expense',concept:'Tienda 0',amount:1,status:'done',occurrence_date:'2026-10-01',start_date:'2026-10-01',actual_date:'2026-10-01',account_id:'a'}]};
  const q=selector=>document.querySelector(selector),csv='Fecha;Concepto;Importe\n'+Array.from({length:108},(_,i)=>`01/10/2026;Tienda ${i};-${i+1},00`).join('\n');
  ui.renderTreasury3(snapshot);q('#treasuryCsvAccount').value='a';q('#treasuryCsvAccount').onchange();
  await q('#treasuryCsv').onchange({target:{files:[{name:'ING_Jeni_solo_tarjeta.csv',size:csv.length,text:async()=>csv}],value:''}});
  assert.equal(q('[data-statement-default="personId"]').value,'jeni');assert.equal(q('[data-statement-default="payerPersonId"]').value,'jeni');assert.equal(q('[data-statement-default="paymentMethodId"]').value,'card');
  await q('[data-csv-review]').onclick();q('[data-review-confirm]').click();document.querySelectorAll('[data-review-discard]')[1].click();
  q('[data-statement-pause]').click();assert.equal(q('[data-statement-panel]').open,false);assert.match(q('[data-statement-resume]').parentElement.textContent,/106 movimientos/);
  ui.resetTreasury3();ui.renderTreasury3(snapshot);assert.ok(q('[data-statement-resume]'));q('[data-statement-resume]').click();
  assert.equal(document.querySelectorAll('[data-review-row]').length,106);assert.match(q('.treasury-review-summary').textContent,/108 líneas.*1 conciliadas.*1 descartadas.*106 pendientes/);
  const work=readStatementWork(dom.window.localStorage,snapshot);assert.ok(work.reviews.length);assert.equal(work.reviews[0].metadata.defaults.payerPersonId,'jeni');
  // A saved coincidence is reopened if its economic evidence changes.
  ui.resetTreasury3();ui.renderTreasury3({...snapshot,rows:snapshot.rows.map(row=>({...row,amount:99}))});q('[data-statement-resume]').click();assert.match(q('.treasury-review-summary').textContent,/0 conciliadas/);
  ui.resetTreasury3();ui.renderTreasury3({...snapshot,userId:'other'});assert.equal(q('[data-statement-resume]'),null);
  ui.resetTreasury3();ui.renderTreasury3({...snapshot,householdId:'another'});assert.equal(q('[data-statement-resume]'),null);
  ui.resetTreasury3();
 }finally{await Promise.resolve();Object.assign(globalThis,before);dom.window.close();}
});
test('storage failure is reported instead of pretending progress was saved',()=>{
 const storage={getItem:()=>null,setItem:()=>{throw Error('Quota exceeded')}};
 assert.throws(()=>saveStatementWork(storage,{userId:'u',householdId:'h'},{reviews:new Map(),activeReviewKey:null,draft:null,accountId:'a'}),/Quota/);
 assert.equal(readStatementWork(storage,{userId:'other',householdId:'h'}),null);
});
