// Synthetic browser acceptance: real rule editor, save/reopen and draft application.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=await import(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright/index.mjs`:'playwright');
const base=resolve('domus-3'),html=await readFile(base+'/index.html','utf8');
const styles=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(x=>x[1]).join('\n');
const category='00000000-0000-4000-8000-000000000003',household='00000000-0000-4000-8000-000000000001';
const server=createServer(async(req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(`<style>${styles}</style><div id="classificationRuleList"></div><form id="movementForm"><input id="editSeriesId"><select id="fType"><option value="expense">Gasto</option></select><select id="fBank"><option value=""></option><option value="ing">ING Jeni</option></select><select id="fPayer"><option value=""></option><option value="jeni">Jeni</option></select><select id="fPaymentMethod"><option value=""></option><option value="card">Tarjeta</option></select><input id="fDocumentDate" type="date"><input id="fConcept"><input id="fAmount"><select id="fCategory"><option value=""></option><option value="${category}" selected>Gastos de actividad económica</option></select><select id="fExpenseScope"><option value=""></option><option value="business">Actividad económica</option></select></form>`);return;}
 try{const path=resolve(base,'.'+req.url);if(!path.startsWith(base+'/'))throw Error();res.setHeader('Content-Type','text/javascript');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(({category,household})=>{
   Object.assign(window,{people:[{id:'jeni',household_id:household,name:'Jeni',active:true}],accounts:[{id:'ing',household_id:household,name:'ING Jeni',active:true}],paymentMethods:[{id:'card',household_id:household,name:'Tarjeta',active:true}],categories:[{id:category,household_id:household,name:'Gastos de actividad económica',kind:'expense',active:true}],household:{id:household},domusRules:[],domusRulesReady:true,stored:[],escapeHtml:s=>String(s).replace(/</g,'&lt;'),syncPrefFields:()=>{},
    sb:{rpc:async()=>({data:34}),from:()=>({insert:row=>({select:()=>({single:async()=>{stored.push({...row,id:'r'+(stored.length||'')});return{data:{id:'r'}};}})})})},refreshAll:async()=>{window.domusRules=stored;}});
  },{category,household});
  await page.addScriptTag({url:'/src/classification/master.js'});await page.addScriptTag({url:'/src/classification/rules-ui.js'});
  await page.evaluate(()=>DOMUSRuleUI.edit());
  await page.fill('#ruleName','Categoría profesional → actividad');await page.selectOption('#rc_category_id',category);await page.selectOption('#rp_expense_scope','business');
  await page.click('#ruleEditorForm button[type=submit]');await page.waitForFunction(()=>stored.length===1);
  const saved=await page.evaluate(()=>stored[0]);assert.deepEqual(saved.conditions,{category_id:category});assert.deepEqual(saved.proposals,{expense_scope:'business'});
  await page.evaluate(()=>DOMUSRuleUI.edit('r'));assert.equal(await page.inputValue('#rc_category_id'),category);assert.equal(await page.inputValue('#rp_expense_scope'),'business');
  await page.click('#ruleClose');await page.evaluate(()=>DOMUSRuleUI.manual());await page.click('#rulePreview_manual button');assert.equal(await page.inputValue('#fExpenseScope'),'business');
  await page.fill('#fConcept','Comercio repetido');await page.evaluate(()=>DOMUSRuleUI.manual());await page.click('#rulePreview_manual [data-create-rule]');
  assert.equal(await page.inputValue('#rc_text'),'Comercio repetido');await page.click('#ruleEditorForm button[type=submit]');await page.waitForFunction(()=>stored.length===2);
  assert.equal(await page.inputValue('#fConcept'),'Comercio repetido');await page.selectOption('#fCategory','');await page.selectOption('#fExpenseScope','');await page.evaluate(()=>DOMUSRuleUI.manual());await page.click('#rulePreview_manual [data-apply-rule]');assert.equal(await page.inputValue('#fCategory'),category);
  await page.evaluate(()=>DOMUSRuleUI.edit());await page.fill('#ruleName','ING Jeni → paga/cobra Jeni');await page.selectOption('#rc_account_id','ing');await page.selectOption('#rp_payer_person_id','jeni');await page.selectOption('#ruleAddProposal','payment_method_id');await page.selectOption('#rp_payment_method_id','card');await page.selectOption('#ruleAddProposal','document_date');await page.fill('#rp_document_date','2026-11-12');await page.selectOption('#ruleAddProposal','amount');await page.fill('#rp_amount','23.75');await page.click('#ruleEditorForm button[type=submit]');await page.waitForFunction(()=>stored.length===3);
  await page.evaluate(()=>DOMUSRuleUI.edit(stored[2].id));assert.equal(await page.inputValue('#rp_payer_person_id'),'jeni');await page.click('#ruleClose');await page.selectOption('#fBank','ing');await page.evaluate(()=>DOMUSRuleUI.manual());await page.click('#rulePreview_manual [data-apply-rule]');assert.equal(await page.inputValue('#fPayer'),'jeni');assert.equal(await page.inputValue('#fPaymentMethod'),'card');assert.equal(await page.inputValue('#fDocumentDate'),'2026-11-12');assert.equal(await page.inputValue('#fAmount'),'23.75');
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: category-only rule, create from current movement, retain draft, apply to next matching movement`);await page.close();
 }
}finally{await browser?.close();await new Promise(done=>server.close(done));}
