import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

test('CSV preview survives financial refreshes with editable fields and session isolation',async()=>{
 const dom=new JSDOM('<div id="treasury3Root"></div>',{url:'https://example.test/'});
 const previous={window:globalThis.window,document:globalThis.document,Event:globalThis.Event,CustomEvent:globalThis.CustomEvent};
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.Event=dom.window.Event;globalThis.CustomEvent=dom.window.CustomEvent;
 try {
  const {renderTreasury3,resetTreasury3}=await import('../domus-3/src/treasury/ui.js');
  let snapshot={userId:'u',householdId:'h',asOf:'2026-11-11',rows:[],accounts:[{id:'a',household_id:'h',name:'ING Jeni',active:true},{id:'b',household_id:'h',name:'Otra',active:true}]};
  const q=selector=>document.querySelector(selector);
  const refresh=()=>renderTreasury3({...snapshot});
  const choose=id=>{q('#treasuryCsvAccount').value=id;q('#treasuryCsvAccount').onchange();};
  const csv='Fecha;Concepto;Importe\n01/10/2026;Cargo prueba;-1,00';
  const upload=(name,text=()=>Promise.resolve(csv))=>q('#treasuryCsv').onchange({target:{files:[{name,size:10,text}],value:'x'}});
  refresh();q('[data-statement-panel]').open=true;choose('a');refresh();
  assert.equal(q('#treasuryCsvAccount').value,'a');
  assert.equal(q('[data-statement-panel]').open,true);
  await upload('extracto.csv');
  q('[data-csv-map="reference"]').value='1';q('[data-csv-header]').value='2';q('[data-csv-delimiter]').value=',';
  refresh();refresh();
  assert.equal(q('[data-statement-panel]').open,true);
  assert.match(q('#treasuryCsvResult').textContent,/extracto.csv/);
  assert.equal(q('[data-csv-map="reference"]').value,'1');
  assert.equal(q('[data-csv-header]').value,'2');
  assert.equal(q('[data-csv-delimiter]').value,',');
  // Replacing a file must not copy the previous file's column choices.
  await upload('nuevo.csv');assert.equal(q('[data-csv-header]').value,'1');
  assert.equal(q('[data-csv-map="reference"]').value,'-1');
  await q('[data-csv-review]').onclick();
  assert.equal(q('[data-csv-review]'),null);assert.match(q('#treasuryCsvResult').textContent,/Cargo prueba/);
  refresh();assert.match(q('#treasuryCsvResult').textContent,/Cargo prueba/);
  let release;const slow=new Promise(done=>release=done);
  const pending=upload('lento.csv',()=>slow);refresh();release(csv);await pending;
  assert.match(q('#treasuryCsvResult').textContent,/lento.csv/);
  choose('b');refresh();assert.equal(q('[data-csv-review]'),null);
  let releaseAccount;const otherAccount=new Promise(done=>releaseAccount=done);
  const staleAccount=upload('cuenta-anterior.csv',()=>otherAccount);choose('a');releaseAccount(csv);await staleAccount;
  assert.equal(q('[data-csv-review]'),null);
  let releaseSession;const otherSession=new Promise(done=>releaseSession=done);
  const staleSession=upload('ajeno.csv',()=>otherSession);
  snapshot={...snapshot,userId:'different'};refresh();releaseSession(csv);await staleSession;
  assert.equal(q('[data-csv-review]'),null);assert.equal(q('#treasuryCsvAccount').value,'');assert.equal(q('[data-statement-panel]').open,false);
  resetTreasury3();
 } finally {globalThis.window=previous.window;globalThis.document=previous.document;globalThis.Event=previous.Event;globalThis.CustomEvent=previous.CustomEvent;dom.window.close();}
});
