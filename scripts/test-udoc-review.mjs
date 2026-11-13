// Browser protocol acceptance only: real DOMUS controls/handlers, synthetic backend,
// no OpenAI, user session, original document or real economic write.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=await import(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright/index.mjs`:'playwright');
const base=resolve('domus-3'),html=await readFile(base+'/index.html','utf8');
const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const handler=html.slice(html.indexOf('const udocReviewButton='),html.indexOf('async function getDocumentBlob('));
const confirmation=html.slice(html.indexOf('function documentConfirmationState('),html.indexOf('function movementDocuments('));
const simplify=html.slice(html.indexOf('function simplifyDocumentReview('),html.indexOf('function optsFor('));
const archive=html.slice(html.indexOf('function documentSourceText('),html.indexOf('let selectedDocumentFiles=[];'));
const select=html.split('\n').find(line=>line.startsWith('let selectedDocumentFiles=[];'));
let reviewRequests=0;
const server=createServer(async(req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(markup);return;}
 if(req.url==='/v1/documents/review'){
  reviewRequests++;const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks),invalid=body.toString().includes('INVALID'),packet=body.toString().includes('PACKET');
  const fields=packet?{'party.issuer.name':'Proveedor de protocolo','document.1.kind':'invoice','document.1.reference':'PACKET-1','document.1.date.issue':'2026-11-13','document.1.total.payable':'100','document.2.kind':'invoice','document.2.reference':'PACKET-2','document.2.date.issue':'2026-11-13','document.2.total.payable':'20','document.3.kind':'invoice','document.3.reference':'EMPTY','document.3.date.issue':'2026-11-13','document.3.total.payable':null}:{'document.kind':'invoice','party.issuer.name':'Proveedor de protocolo','reference.document':'F-PROTO-1','date.issue':'2026-11-13','total.payable':'12.50'};
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({schema_version:'1.0',automatic_economic_action:false,source_sha256:createHash('sha256').update(body).digest('hex'),status:'NEEDS_REVIEW',attempts:[{status:invalid?'INVALID_PROPOSAL':'NEEDS_REVIEW',issues:invalid?['contract:invalid_field_format']:[],interpretation:{document_type:packet?'packet':'invoice',fields:Object.entries(fields).map(([path,value])=>({path,value,evidence:[{source_id:'fixture:1',quote:'Texto de protocolo, sin documento real'}]})),warnings:[],relationships:[]}}]}));return;
 }
 try{const path=resolve(base,'.'+req.url);if(!path.startsWith(base+'/'))throw Error();res.setHeader('Content-Type','text/javascript');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{const url=route.request().url();if(url.endsWith('/v1/documents/review'))assert.equal(await page.evaluate(()=>documents.some(d=>d.file_retained&&d.storage_path)),true,'provider called before source retention');return url.startsWith(`http://127.0.0.1:${server.address().port}/`)?route.continue():route.abort();});
  async function boot(){
   await page.goto(`http://127.0.0.1:${server.address().port}/`);
   await page.evaluate(()=>{
    const persisted=JSON.parse(localStorage.getItem('udoc-protocol')||'null');
    Object.assign(window,{DOMUS_CONFIG:{udocReview:true},user:{id:'actor-a'},household:{id:'home-a'},series:persisted?.series||[],documents:persisted?.documents||[],currentDocDrafts:[],currentDocumentId:null,documentLoadState:'ready',pendingDocumentDraftBatches:[],savingDocumentDraft:false,fixtureMode:'normal',fixtureNoArchiveSeed:false,fixtureStoredBodies:persisted?.storedBodies||{},fixtureBlobs:{},fixtureUploads:[],fixtureWrites:0,fixtureReads:[],fixtureAlerts:[],
     people:[{id:'person-a',household_id:'home-a',name:'Persona de prueba',active:true}],accounts:[{id:'account-a',household_id:'home-a',name:'Cuenta de prueba',active:true}],paymentMethods:[],categories:[{id:'category-a',household_id:'home-a',name:'Gasto de prueba',kind:'expense',active:true},{id:'income-category',household_id:'home-a',name:'Ingreso de prueba',kind:'income',active:true}],
     escapeHtml:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),euro:n=>Number(n).toFixed(2)+' €',
     unresolvedIncomeReferences:()=>[],draftLinkedIncomeIds:()=>[],documentIncomeOptions:()=>[],bestPendingMatch:()=>null,settlementIncomeDate:()=>null,draftTransportReference:()=>null,
     duplicateCandidates:()=>[],duplicateWarning:()=>true,autoLinkDocumentRelations:async()=>{},insertDocumentLinkSafely:async()=>{},friendlyCloudError:e=>e.message||String(e),domusActionFeedback:()=>{},alert:m=>fixtureAlerts.push(m),
     openNextDocumentDraftBatch:()=>document.getElementById('docAnalysisModal').classList.remove('show'),
     persistFixture:()=>localStorage.setItem('udoc-protocol',JSON.stringify({series,documents,storedBodies:fixtureStoredBodies})),refreshAll:async()=>{persistFixture();},
     insertSeriesSafely:async row=>{const saved={...row,id:'movement-'+(series.length+1)};series.push(saved);persistFixture();return saved;},
     upsertState:async state=>{const row=series.find(s=>s.id===state.series_id);row.fixtureState=state;persistFixture();},
     updateRowSafely:async(table,id,patch)=>{if(table!=='documents')throw Error('Unexpected mutation');Object.assign(documents.find(d=>d.id===id),structuredClone(patch));persistFixture();},
     getDocumentBlob:async doc=>{if(fixtureBlobs[doc.storage_path])return fixtureBlobs[doc.storage_path];const stored=fixtureStoredBodies[doc.storage_path];if(!stored)throw Error('Synthetic archive unconfirmed');return new Blob([stored.text],{type:stored.type});},
     sb:{storage:{from:bucket=>({upload:async(path,file)=>{if(bucket!=='household-documents')throw Error('Wrong bucket');fixtureUploads.push(path);if(fixtureMode==='archive-fail')return{error:{message:'Synthetic archive failure'}};fixtureBlobs[path]=file;fixtureStoredBodies[path]={text:await file.text(),type:file.type};persistFixture();return{data:{path}};}})},auth:{getSession:async()=>({data:{session:{user:{id:user.id},access_token:'synthetic-session'}}})},from:table=>{
      if(table!=='documents')throw Error('Unexpected table');const filters=[];let patch=null,insertion=null,hashQuery=false;
      const q={insert:row=>{insertion=row;return q;},single:async()=>{const row={...insertion,updated_at:'2026-11-13T08:00:00Z'};if(documents.some(d=>d.id===row.id))return{error:{code:'23505'}};documents.push(row);persistFixture();return{data:row};},select:()=>patch?write():q,eq:(k,v)=>{filters.push([k,v]);return q;},or:()=>{hashQuery=true;return q;},limit:async()=>{
       fixtureReads.push({filters,hashQuery});if(fixtureMode==='switch-home'){household={id:'home-b'};return{data:documents};}
       const matches=documents.filter(row=>filters.every(([k,v])=>row[k]===v));return{data:fixtureMode==='ambiguous'&&hashQuery?[...matches,...matches.map(row=>({...row,id:'ambiguous'}))]:matches};
      },update:payload=>{patch=payload;return q;}};
      async function write(){fixtureWrites++;if(fixtureMode==='raw-unconfirmed'&&patch.extracted_data?.udoc_raw_result)return{data:[]};if(fixtureMode==='conflict')return{data:[]};if(fixtureMode==='network')throw Error('Synthetic network failure');const row=documents.find(row=>filters.every(([k,v])=>row[k]===v));if(!row)return{data:[]};Object.assign(row,structuredClone(patch),{updated_at:'2026-11-13T08:01:00Z'});persistFixture();return{data:[{id:row.id,updated_at:row.updated_at}]};}
      return q;
     }}});
    document.querySelectorAll('section[id$="View"]').forEach(node=>node.classList.add('hidden'));document.getElementById('documentsView').classList.remove('hidden');
    for(const node of document.querySelectorAll('.app,.app-shell,#app,#appScreen'))node.classList.remove('hidden');document.querySelector('.auth-wrap')?.remove();
   });
   await page.addScriptTag({url:'/src/classification/master.js'});await page.addScriptTag({content:select+'\n'+archive+'\n'+simplify+'\n'+confirmation+'\n'+handler});
   await page.evaluate(()=>{document.getElementById('docFile').onchange=e=>selectDocumentFiles(e.target);});
  }
  async function selectOriginal(name='original-protocol.txt',invalid=false){
   const buffer=Buffer.from(invalid==='packet'?'PACKET protocol document':invalid?'INVALID protocol document':'protocol document only');
   await page.setInputFiles('#docFile',{name,mimeType:'text/plain',buffer});
   await page.evaluate(async()=>{if(!documents.length&&!window.fixtureNoArchiveSeed){const f=selectedDocumentFiles[0],sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await f.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');fixtureStoredBodies['fixture-retained']={text:await f.text(),type:f.type};documents.push({id:'document-a',household_id:'home-a',file_name:f.name,file_size:f.size,file_retained:true,storage_path:'fixture-retained',updated_at:'2026-11-13T08:00:00Z',analysis_status:'review',extracted_data:{source_sha256:sha}});persistFixture();}});
   await page.click('#udocReviewBtn');await page.locator('#udocReviewDialog[open]').waitFor();
  }
  await boot();await selectOriginal();
  assert.match(await page.locator('#udocReviewFields').textContent(),/Evidencia original/);
  await page.locator('[data-udoc-path="total.payable"]').fill('13,75');
  await page.click('#udocReviewSaveBtn');await page.locator('#docAnalysisModal.show').waitFor();
  assert.equal(await page.inputValue('#ddAmount0'),'13.75');assert.equal(await page.locator('[data-create-draft]').isEnabled(),true);assert.equal(await page.evaluate(()=>series.length),0);
  await page.selectOption('#ddType0','expense');await page.selectOption('#ddPerson0','person-a');await page.selectOption('#ddPayer0','person-a');await page.selectOption('#ddAccount0','account-a');await page.selectOption('#ddCategory0','category-a');
  await page.locator('details').filter({has:page.locator('#ddScope0')}).evaluate(node=>node.open=true);await page.selectOption('#ddScope0','business');
  await page.click('[data-create-draft]');await page.waitForFunction(()=>series.length===1&&documents[0].analysis_status==='confirmed'&&!savingDocumentDraft);
  assert.deepEqual(await page.evaluate(()=>fixtureAlerts),[]);assert.equal(await page.evaluate(()=>documents[0].extracted_data.udoc_review_history.length),1);
  const beforeReopen=reviewRequests;await boot();
  await page.evaluate(()=>renderDocuments());await page.click('#documentsList button[onclick^="openStoredDocumentDraft"]');assert.match(await page.locator('#docDrafts').textContent(),/Propuesta confirmada/);assert.equal(reviewRequests,beforeReopen);assert.equal(await page.evaluate(()=>series.length),1);
  // A renamed identical original resolves by hash; another saved review cannot create a second draft.
  await page.evaluate(()=>document.getElementById('docAnalysisModal').classList.remove('show'));await selectOriginal('renamed-protocol.txt');await page.click('#udocReviewSaveBtn');await page.waitForFunction(()=>!document.getElementById('udocReviewDialog').open);assert.equal(await page.evaluate(()=>documents[0].extracted_data.drafts.length),1);assert.equal(await page.evaluate(()=>series.length),1);assert.equal(reviewRequests,beforeReopen);assert.equal(await page.evaluate(()=>fixtureReads.every(read=>read.filters.some(([k,v])=>k==='household_id'&&v==='home-a'))),true);
  // Concurrent revision: keep edits open, never claim success or retry the mutation.
  await selectOriginal('renamed-again.txt');await page.evaluate(()=>fixtureMode='conflict');await page.click('#udocReviewSaveBtn');await page.waitForFunction(()=>document.getElementById('udocReviewStatus').textContent.includes('Guardado sin confirmar'));assert.match(await page.locator('#udocReviewStatus').textContent(),/Guardado sin confirmar/);const writes=await page.evaluate(()=>fixtureWrites);await page.evaluate(()=>saveUdocReview());assert.equal(await page.evaluate(()=>fixtureWrites),writes);assert.equal(await page.locator('#udocReviewDialog').evaluate(node=>node.open),true);
  await page.evaluate(()=>document.getElementById('udocReviewDialog').close());await selectOriginal('scope-switch.txt');await page.evaluate(()=>fixtureMode='switch-home');const scopedWrites=await page.evaluate(()=>fixtureWrites);await page.click('#udocReviewSaveBtn');await page.waitForFunction(()=>document.getElementById('udocReviewStatus').textContent.includes('han cambiado'));assert.equal(await page.evaluate(()=>fixtureWrites),scopedWrites);assert.equal(await page.locator('#udocReviewDialog').evaluate(node=>node.open),false);assert.equal(await page.locator('[data-udoc-path]').count(),0);
  // A file with two invoices and an empty section must expose exactly two independent drafts.
  await page.evaluate(()=>localStorage.removeItem('udoc-protocol'));await boot();await selectOriginal('packet-protocol.txt','packet');assert.match(await page.locator('#udocReviewFields').textContent(),/Documento 1/);await page.click('#udocReviewSaveBtn');await page.locator('#docAnalysisModal.show').waitFor();assert.equal(await page.locator('[data-create-draft]').count(),2);
  for(const i of [0,1]){await page.selectOption('#ddType'+i,'income');await page.selectOption('#ddPerson'+i,'person-a');await page.selectOption('#ddPayer'+i,'person-a');await page.selectOption('#ddAccount'+i,'account-a');await page.selectOption('#ddCategory'+i,'income-category');await page.locator('details').filter({has:page.locator('#ddScope'+i)}).evaluate(node=>node.open=true);await page.selectOption('#ddScope'+i,'business');}
  await page.click('[data-create-draft="0"]');await page.waitForFunction(()=>series.length===1&&!savingDocumentDraft);await page.click('[data-create-draft="1"]');await page.waitForFunction(()=>series.length===2&&documents[0].analysis_status==='confirmed'&&!savingDocumentDraft);assert.deepEqual(await page.evaluate(()=>series.map(s=>s.amount)),[100,20]);assert.equal(await page.evaluate(()=>series.every(s=>s.type==='income')),true);assert.deepEqual(await page.evaluate(()=>fixtureAlerts),[]);
  // An invalid model interpretation can be archived but never creates an economic draft.
  await page.evaluate(()=>localStorage.removeItem('udoc-protocol'));await boot();await selectOriginal('invalid-protocol.txt',true);await page.click('#udocReviewSaveBtn');await page.waitForFunction(()=>!document.getElementById('udocReviewDialog').open);assert.equal(await page.evaluate(()=>documents[0].extracted_data.drafts.length),0);assert.equal(await page.evaluate(()=>series.length),0);
  // A new original is archived before IA. Failed storage never spends a provider request and resumes the same row.
  await page.evaluate(()=>localStorage.clear());await boot();await page.evaluate(()=>{fixtureNoArchiveSeed=true;fixtureMode='archive-fail';});
  await page.setInputFiles('#docFile',{name:'new-original.txt',mimeType:'text/plain',buffer:Buffer.from('new protocol original')});const beforeArchiveFailure=reviewRequests;await page.click('#udocReviewBtn');await page.waitForFunction(()=>!document.getElementById('udocReviewBtn').disabled);assert.equal(reviewRequests,beforeArchiveFailure);assert.equal(await page.evaluate(()=>documents.length),1);assert.equal(await page.evaluate(()=>documents[0].file_retained),false);
  await page.evaluate(()=>fixtureMode='normal');await page.click('#udocReviewBtn');await page.locator('#udocReviewDialog[open]').waitFor();assert.equal(await page.evaluate(()=>documents.length),1);assert.equal(await page.evaluate(()=>documents[0].file_retained),true);assert.equal(reviewRequests,beforeArchiveFailure+1);assert.equal(await page.evaluate(()=>Boolean(documents[0].extracted_data.udoc_raw_result)),true);const beforeStoredRawOpen=reviewRequests;await boot();await page.evaluate(()=>renderDocuments());await page.click('#documentsList button[onclick^="openStoredUdocReview"]');await page.locator('#udocReviewDialog[open]').waitFor();assert.equal(reviewRequests,beforeStoredRawOpen);assert.equal(await page.locator('#documentsList [id^="reanalyze-"]').count(),0);
  // A cloud acknowledgement failure keeps a scope-bound local copy recoverable after reload without another provider call.
  await page.evaluate(()=>localStorage.clear());await boot();await page.evaluate(()=>fixtureMode='raw-unconfirmed');await selectOriginal('pending-copy.txt');assert.match(await page.locator('#udocReviewStatus').textContent(),/pendiente en este navegador/);const beforePendingReopen=reviewRequests;await boot();await selectOriginal('pending-renamed.txt');assert.equal(reviewRequests,beforePendingReopen);await page.evaluate(()=>fixtureMode='normal');await page.click('#udocReviewSaveBtn');await page.waitForFunction(()=>!document.getElementById('udocReviewDialog').open);assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('domus-udoc-pending:')).length),0);
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: real UDOC edit/save/create/confirm/reload/reopen, fingerprint rename, no duplicate, stale revision and household switch`);await page.close();
 }
}finally{await browser?.close();await new Promise(done=>server.close(done));}
