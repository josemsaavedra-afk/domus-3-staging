// Run with Playwright installed: node scripts/test-statement-preview.mjs
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium} = await import(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright/index.mjs` : 'playwright');
const base = resolve('domus-3');
const server = createServer(async (req,res) => {
  if (req.url === '/') { res.setHeader('Content-Type','text/html'); res.end('<div id="treasury3Root"></div>'); return; }
  try { const path=resolve(base,'.'+req.url); if (!path.startsWith(base+'/')) throw Error(); res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':'text/plain');res.end(await readFile(path)); } catch {res.statusCode=404;res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let browser;
try {
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async()=>{
    const ui=await import('/src/treasury/ui.js');window.ui=ui;
    window.snapshot={userId:'u',householdId:'h',asOf:'2026-11-11',rows:[],accounts:[{id:'a',household_id:'h',name:'ING Jeni',active:true},{id:'b',household_id:'h',name:'Otra',active:true}]};
    ui.renderTreasury3(snapshot);
  });
  const refresh=()=>page.evaluate(()=>ui.renderTreasury3({...snapshot}));
  await page.locator('[data-statement-panel]').evaluate(el=>el.open=true);
  await page.selectOption('#treasuryCsvAccount','a');
  await refresh();
  assert.equal(await page.inputValue('#treasuryCsvAccount'),'a','account survives refresh before loading');
  const csv='Fecha;Concepto;Importe\n01/10/2026;Cargo prueba;-1,00';
  await page.setInputFiles('#treasuryCsv',{name:'extracto.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.locator('[data-csv-review]').waitFor();
  await page.selectOption('[data-csv-map="reference"]','1');
  await page.locator('[data-csv-header]').fill('2');
  await refresh();await refresh();
  assert.equal(await page.locator('[data-statement-panel]').evaluate(el=>el.open),true);
  assert.match(await page.locator('#treasuryCsvResult').textContent(),/extracto.csv/);
  assert.equal(await page.inputValue('[data-csv-map="reference"]'),'1');
  assert.equal(await page.inputValue('[data-csv-header]'),'2');
  await page.locator('[data-csv-header]').fill('1');
  await page.selectOption('[data-csv-map="reference"]','-1');
  await page.click('[data-csv-review]');
  await page.waitForFunction(()=>!document.querySelector('[data-csv-review]'));
  assert.match(await page.locator('#treasuryCsvResult').textContent(),/Cargo prueba/);
  await refresh();
  assert.match(await page.locator('#treasuryCsvResult').textContent(),/Cargo prueba/);
  // Same-session render during file.text() must not discard the selected file.
  await page.evaluate(async()=>{
    let release; const text=new Promise(done=>release=done);
    const input=document.querySelector('#treasuryCsv');
    const pending=input.onchange({target:{files:[{name:'lento.csv',size:10,text:()=>text}],value:'x'}});
    ui.renderTreasury3({...snapshot});release('Fecha;Concepto;Importe\n02/10/2026;Lectura lenta;-2,00');await pending;
  });
  assert.match(await page.locator('#treasuryCsvResult').textContent(),/lento.csv/);
  // Account changes invalidate pending reads and clear the old draft.
  await page.selectOption('#treasuryCsvAccount','b');await refresh();
  assert.equal(await page.locator('[data-csv-review]').count(),0);
  await page.evaluate(async()=>{
    let release; const text=new Promise(done=>release=done);
    const pending=document.querySelector('#treasuryCsv').onchange({target:{files:[{name:'ajeno.csv',size:10,text:()=>text}],value:'x'}});
    snapshot={...snapshot,userId:'different'};ui.renderTreasury3(snapshot);
    release('Fecha;Concepto;Importe\n02/10/2026;Ajeno;-2,00');await pending;
  });
  assert.equal(await page.locator('[data-csv-review]').count(),0);
  assert.equal(await page.inputValue('#treasuryCsvAccount'),'');
  assert.equal(await page.locator('[data-statement-panel]').evaluate(el=>el.open),false);
  assert.deepEqual(errors,[]);
  console.log('PASS: preview, columns, account, review, refresh during read, account/session isolation');
} finally {await browser?.close();await new Promise(done=>server.close(done));}
