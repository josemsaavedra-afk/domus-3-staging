// Real browser reload, 108 rows, contextual defaults and direct import navigation.
import assert from 'node:assert/strict';import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';
const {chromium}=await import(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright/index.mjs`:'playwright');
const base=resolve('domus-3'),html=await readFile(base+'/index.html','utf8'),styles=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(x=>x[1]).join('\n');
const navigate=html.split('\n').find(line=>line.startsWith('function openBankImport()'));
const server=createServer(async(req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(`<style>${styles}</style><button id="fromDocuments">Importar CSV del banco</button><div style="height:600px"></div><div id="treasury3Root"></div>`);return;}try{const path=resolve(base,'.'+req.url);if(!path.startsWith(base+'/'))throw Error();res.setHeader('Content-Type','text/javascript');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const setup=async()=>{
   await page.evaluate(async()=>{
    window.ui=await import('/src/treasury/ui.js');window.created=null;
    window.snapshot={userId:'u',householdId:'h',asOf:'2026-11-11',accounts:[{id:'a',household_id:'h',name:'ING Jeni',active:true}],people:[{id:'jeni',name:'Jeni',household_id:'h',active:true}],paymentMethods:[{id:'card',name:'Tarjeta',household_id:'h',active:true}],rows:[
     {id:'coffee|2026-10-01',series_id:'coffee',type:'expense',concept:'Café',amount:3,status:'done',start_date:'2026-10-01',occurrence_date:'2026-10-01',actual_date:'2026-10-01',account_id:'a'},
     {id:'fuel|2026-10-05',series_id:'fuel',type:'expense',concept:'MORGANE OIL',amount:20,status:'done',start_date:'2026-10-05',occurrence_date:'2026-10-05',actual_date:'2026-10-05',account_id:'a'},
     {id:'fee|2026-10-03',series_id:'fee',type:'expense',concept:'Comisión ONLOGIST',amount:18,status:'done',start_date:'2026-10-03',occurrence_date:'2026-10-03',actual_date:'2026-10-03',account_id:'a'}]};
    DOMUSTreasury3.configureStatementCreation(draft=>{created=draft;});ui.renderTreasury3(snapshot);
   });
   await page.addScriptTag({content:"function showView(){requestAnimationFrame(()=>window.scrollTo(0,0))}\n"+navigate+"\ndocument.getElementById('fromDocuments').onclick=openBankImport;"});
  };
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await setup();await page.click('#fromDocuments');
  await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
  assert.equal(await page.locator('[data-statement-panel]').evaluate(el=>el.open),true);assert.ok((await page.locator('[data-statement-panel]').boundingBox()).y<100);
  await page.selectOption('#treasuryCsvAccount','a');
  const lines=['01/10/2026;Café;-3,00','02/10/2026;Pago MORGANE OIL;-20,00','03/10/2026;Pago KIABI;-18,00',...Array.from({length:105},(_,i)=>`04/10/2026;Comercio ${i};-${i+100},00`)];
  await page.setInputFiles('#treasuryCsv',{name:'ING_Jeni_solo_pagos_tarjeta.csv',mimeType:'text/csv',buffer:Buffer.from('Fecha;Concepto;Importe\n'+lines.join('\n'))});
  await page.locator('[data-csv-review]').waitFor();
  assert.equal(await page.inputValue('[data-statement-default="personId"]'),'jeni');assert.equal(await page.inputValue('[data-statement-default="payerPersonId"]'),'jeni');assert.equal(await page.inputValue('[data-statement-default="paymentMethodId"]'),'card');
  await page.click('[data-csv-review]');const row=text=>page.locator('[data-review-row]').filter({hasText:text});
  assert.equal(await row('MORGANE OIL').locator('[data-review-open]').count(),0);assert.equal(await row('KIABI').locator('[data-review-open]').count(),0);
  const bridgeReport=await page.evaluate(()=>{
   const saved=JSON.parse(localStorage.getItem('domus3:statement-work:v1:u:h')).reviews[0];
   return{format:'domus-treasury-reconciliation',version:1,account:{id:'a'},statement:{contentSha256:saved.metadata.fingerprint.contentSha256},rows:saved.session.rows.slice(0,2).map((row,i)=>({statementId:row.statement.id,date:row.statement.date,signedAmount:row.statement.signedAmount,decision:'confirmada',movementId:i===0?'coffee|2026-10-01':'fuel|2026-10-05'}))};
  });
  await page.setInputFiles('[data-review-import-report]',{name:'avance-anterior.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bridgeReport))});await page.waitForFunction(()=>document.querySelector('.treasury-review-summary').textContent.includes('1 conciliadas'));
  assert.match(await page.locator('#treasuryCsvResult').textContent(),/1 coincidencias necesitan comprobarse/);
  await row('MORGANE OIL').locator('[data-review-discard]').click();
  await row('KIABI').locator('[data-review-create]').click();assert.deepEqual(await page.evaluate(()=>[created.personId,created.payerPersonId,created.paymentMethodId]),['jeni','jeni','card']);
  await page.click('[data-statement-pause]');assert.match(await page.locator('[data-statement-resume]').locator('..').textContent(),/106 movimientos/);
  await page.reload();await setup();await page.click('[data-statement-resume]');assert.equal(await page.locator('[data-review-row]').count(),106);
  assert.match(await page.locator('.treasury-review-summary').textContent(),/108 líneas.*1 conciliadas.*1 descartadas.*106 pendientes/);
  await row('KIABI').locator('[data-review-discard]').click();await page.reload();await setup();await page.click('[data-statement-resume]');assert.equal(await page.locator('[data-review-row]').count(),105);
  await page.evaluate(()=>{ui.resetTreasury3();ui.renderTreasury3({...snapshot,userId:'other'});});assert.equal(await page.locator('[data-statement-resume]').count(),0);
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: exact-date/evidence matches, card/person defaults, direct navigation, pause/reload/resume 108 rows, automatic progress, user isolation`);await page.close();
 }
}finally{await browser?.close();await new Promise(done=>server.close(done));}
