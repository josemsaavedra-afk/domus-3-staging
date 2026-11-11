// Browser acceptance of the real statement UI and actual movement detail handler.
// Synthetic data only; no backend, originals or economic writes.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=await import(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright/index.mjs`:'playwright');
const base=resolve('domus-3'),html=await readFile(base+'/index.html','utf8');
const modal=html.split('\n').find(line=>line.startsWith('<div class="modal" id="movementDetailModal"'));
const inspector=html.slice(html.indexOf('let statementCandidateReturn = null;'),html.indexOf('function treasury3Snapshot()'));
const details=html.split('\n').filter(line=>/^function (openMovementDetail|closeMovementDetail)\(/.test(line)).join('\n');
const styles=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(x=>x[1]).join('\n');
const server=createServer(async(req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(`<style>${styles}</style><section id="movementsView" class="hidden"></section><div style="height:350px"></div><div id="treasury3Root"></div>${modal}`);return;}
 try{const path=resolve(base,'.'+req.url);if(!path.startsWith(base+'/'))throw Error();res.setHeader('Content-Type','text/javascript');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(()=>{
   window.user={id:'u'};window.household={id:'h'};window.movementDetailReturn=null;
   window.series=[{id:'coffee',household_id:'h',account_id:'a',type:'expense',amount:3,concept:'Café',notes:'Nota café',start_date:'2026-10-01',occurrence_date:'2026-10-01',status:'done',actual_date:'2026-10-01'},
    {id:'petro',household_id:'h',account_id:'a',type:'expense',amount:45,concept:'petroleo',notes:'Tique de combustible 123',invoice_number:'ticket-123',payer_person_id:'jeni',category_id:'fuel',start_date:'2026-10-05',occurrence_date:'2026-10-05',status:'done',actual_date:'2026-10-05'}];
   Object.assign(window,{DOMUSClassification:{labelName:()=>'',counterpartyLabel:()=>''},
    findOccurrence:(id,date)=>{const m=series.find(x=>x.id===id&&x.occurrence_date===date);return m&&{...m,occurrenceDate:new Date(date+'T12:00:00'),state:{actual_date:date},recurrence:'none'};},
    fmt:d=>new Date(d).toISOString().slice(0,10),parseDate:d=>new Date(d+'T12:00:00'),euro:v=>Number(v).toFixed(2)+' €',
    escapeHtml:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    isPendingSettlement:()=>false,personName:()=>'Jeni',accountName:()=>'ING Jeni',categoryName:()=>'Combustible',relatedIncomeForExpense:()=>[],relatedForIncome:()=>[],movementDocuments:()=>[],originalDateOf:x=>x.occurrence_date});
  });
  await page.addScriptTag({content:inspector+'\n'+details});
  await page.evaluate(async()=>{
   window.ui=await import('/src/treasury/ui.js');window.created=null;
   window.snapshot={userId:'u',householdId:'h',asOf:'2026-11-11',accounts:[{id:'a',household_id:'h',name:'ING Jeni',active:true}],rows:series.map(m=>({...m,id:m.id+'|'+m.occurrence_date,series_id:m.id}))};
   DOMUSTreasury3.configureStatementInspection(openStatementCandidate);DOMUSTreasury3.configureStatementCreation(d=>{created=d;});ui.renderTreasury3(snapshot);
  });
  await page.locator('[data-statement-panel]').evaluate(el=>el.open=true);await page.selectOption('#treasuryCsvAccount','a');
  const csv='Fecha;Concepto;Importe\n01/10/2026;Café;-3,00\n02/10/2026;PETROPRIX;-45,00\n03/10/2026;Otro pago;-7,00';
  await page.setInputFiles('#treasuryCsv',{name:'octubre.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await page.click('[data-csv-review]');
  await page.locator('[data-review-confirm]').first().click();
  const petro=page.locator('[data-review-row]').filter({hasText:'PETROPRIX'});
  await petro.locator('[data-review-open]').click();
  assert.match(await page.locator('#movementDetailBody').textContent(),/Tique de combustible 123/);
  assert.match(await page.locator('#movementDetailBody').textContent(),/ticket-123/);
  assert.match(await page.locator('#statementCandidateReview').textContent(),/PETROPRIX/);
  const scroll=await page.evaluate(()=>window.scrollY);
  await page.click('[data-statement-candidate-back]');assert.equal(await page.evaluate(()=>scrollY),scroll);
  assert.match(await page.locator('.treasury-review-summary').textContent(),/1 conciliadas/);
  await petro.locator('[data-review-open]').click();
  await page.evaluate(()=>ui.renderTreasury3({...snapshot}));
  await page.click('[data-statement-candidate-reject]');
  await petro.locator('[data-review-create]').waitFor();assert.match(await page.locator('.treasury-review-summary').textContent(),/1 conciliadas/);
  await petro.locator('[data-review-create]').click();assert.equal(await page.evaluate(()=>created.amount),45);assert.equal(await page.evaluate(()=>series.length),2);
  await petro.locator('[data-review-restore]').click();await petro.locator('[data-review-open]').click();
  await page.click('[data-statement-candidate-confirm]');assert.match(await page.locator('.treasury-review-summary').textContent(),/2 conciliadas/);
  assert.equal(await page.locator('#movementDetailModal').evaluate(el=>el.classList.contains('show')),false);
  assert.equal(await page.locator('[data-review-row]').count(),3);assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: actual detail, close, refresh, reject, create draft, restore, confirm, other lines retained`);
  await page.close();
 }
}finally{await browser?.close();await new Promise(done=>server.close(done));}
