// DOM preflight of the browser fixture, executing real review and creation handlers.
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{webcrypto}from'node:crypto';import{JSDOM}from'jsdom';import vm from'node:vm';
const html=readFileSync('domus-3/index.html','utf8'),fixture=readFileSync('scripts/test-udoc-review.mjs','utf8');
const a=fixture.indexOf('    const persisted='),b=fixture.indexOf('\n   });',a),bootstrap=fixture.slice(a,b);
const handler=html.slice(html.indexOf('const udocReviewButton='),html.indexOf('async function getDocumentBlob('));
const confirmation=html.slice(html.indexOf('function documentConfirmationState('),html.indexOf('function movementDocuments('));
const simplify=html.slice(html.indexOf('function simplifyDocumentReview('),html.indexOf('function optsFor('));
const select=html.split('\n').find(s=>s.startsWith('let selectedDocumentFiles=[];'));
test('browser fixture executes actual reviewed invoice creation and preserves history on confirmation',async()=>{
 const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only'}),w=dom.window;
 try{
  Object.defineProperty(w,'crypto',{value:webcrypto});w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.AbortSignal=AbortSignal;w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
  const f=new File(['protocol document only'],'original.txt',{type:'text/plain'});w.protocolFile=f;
  const sha=Buffer.from(await webcrypto.subtle.digest('SHA-256',await f.arrayBuffer())).toString('hex');
  w.fetch=async()=>({ok:true,json:async()=>({schema_version:'1.0',automatic_economic_action:false,source_sha256:sha,status:'NEEDS_REVIEW',attempts:[{status:'NEEDS_REVIEW',interpretation:{document_type:'invoice',fields:Object.entries({'document.kind':'invoice','party.issuer.name':'Proveedor de protocolo','reference.document':'F-PROTO-1','date.issue':'2026-11-13','total.payable':'12.50'}).map(([path,value])=>({path,value}))}}]})});
  vm.runInContext(bootstrap+'\n'+readFileSync('domus-3/src/classification/master.js','utf8')+'\n'+select+'\n'+simplify+'\n'+confirmation+'\n'+handler+'\nselectedDocumentFiles=[protocolFile];documents=[{id:"document-a",household_id:"home-a",file_name:protocolFile.name,file_size:protocolFile.size,file_retained:true,storage_path:"fixture",updated_at:"2026-11-13T08:00:00Z",extracted_data:{source_sha256:"'+sha+'"}}];',dom.getInternalVMContext());
  assert.equal(w.document.getElementById('appScreen').classList.contains('hidden'),false);w.document.getElementById('udocReviewBtn').click();for(let n=0;n<20&&!w.document.getElementById('udocReviewDialog').open;n++)await new Promise(r=>setTimeout(r,10));assert.equal(w.document.getElementById('udocReviewDialog').open,true,w.document.getElementById('udocReviewStatus').textContent);
  w.document.querySelector('[data-udoc-path="total.payable"]').value='13,75';await w.saveUdocReview();assert.equal(w.fixtureWrites,1);assert.ok(w.document.querySelector('[data-create-draft]'),w.document.getElementById('udocReviewStatus').textContent);assert.equal(w.document.querySelector('[data-create-draft]').disabled,false);
  const q=id=>w.document.getElementById(id);assert.equal(q('ddType0').value,'');q('ddType0').value='expense';q('ddPerson0').value='person-a';q('ddPayer0').value='person-a';q('ddAccount0').value='account-a';q('ddCategory0').value='category-a';q('ddScope0').value='business';await w.createMovementFromDocument(0,q('docDrafts').querySelector('[data-create-draft]'));assert.deepEqual(Array.from(w.fixtureAlerts),[]);assert.equal(w.series.length,1);assert.equal(w.documents[0].analysis_status,'confirmed');assert.equal(w.documents[0].extracted_data.udoc_review_history.length,1);assert.equal(w.documents[0].extracted_data.drafts[0].amount,13.75);await w.createMovementFromDocument(0);assert.equal(w.series.length,1);
 }finally{w.close();}
});
