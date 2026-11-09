import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html=readFileSync(new URL('../domus-3/index.html', import.meta.url),'utf8');
const handler=html.slice(html.indexOf('const udocReviewButton='),html.indexOf('async function getDocumentBlob'));
const key='a'.repeat(64);
const fields=[{path:'reference.document',value:'REF-1',evidence:[{source_id:'page:1',quote:'<nota>REF-1</nota>'}]}];
const interpretation={fields,document_type:'invoice',warnings:['Comprobar original'],relationships:[{reference_path:'reference.document',kind:'document_reference'}]};

async function setup({enabled=true,available=true}={}){
 const file=new Blob(['protocol only'],{type:'text/plain'});
 const digest=Buffer.from(await webcrypto.subtle.digest('SHA-256',await file.arrayBuffer())).toString('hex');
 const ids=new Map();
 const element=()=>({
  children:[],dataset:{},handlers:{},value:'',
  append(child){this.children.push(child);},
  replaceChildren(){this.children=[];},
  addEventListener(name,fn){this.handlers[name]=fn;},
  showModal(){this.open=true;},
  close(){this.open=false;this.handlers.close?.();}
 });
 const get=id=>{if(!ids.has(id))ids.set(id,element());return ids.get(id);};
 const requests=[];
 const result={schema_version:'1.0',automatic_economic_action:false,source_sha256:digest,
  status:'NEEDS_REVIEW',archive_available:available,attempts:[{run_key:key,interpretation}]};
 const saved=(revision=1,value='CORREGIDO')=>({...result,review:{revision,
  interpretation:{...interpretation,fields:[{...fields[0],value}]}}});
 let reply=async()=>({ok:true,json:async()=>result});
 const context=vm.createContext({document:{getElementById:get,createElement:element},
  window:{DOMUS_CONFIG:{udocReview:true,udocReviewOrigin:'https://udoc.example',udocReviewArchive:enabled}},
  crypto:webcrypto,URL,AbortSignal,selectedDocumentFiles:[file],user:{id:'owner'},household:{id:'home'},
  sb:{auth:{getSession:async()=>({data:{session:{user:{id:'owner'},access_token:'fixture'}}})}},
  fetch:async(url,options)=>{requests.push({url,options});return reply();}
 });
 vm.runInContext(handler,context);
 const click=id=>get(id).handlers.click();
 const input=()=>get('udocReviewFields').children[0].children[1].children[0];
 const edit=()=>{input().value='CORREGIDO';get('udocDraftReason').value='Contraste con el original';};
 const setReply=fn=>{reply=fn;};
 return {get,click,input,edit,setReply,saved,result,context,requests};
}

test('shows literal evidence, doubt and proposed relation without interpreting markup',async()=>{
 const x=await setup();
 await x.click('udocReviewBtn');
 const group=x.get('udocReviewFields').children[0];
 assert.match(group.children[1].children[1].textContent,/page:1.*<nota>REF-1<\/nota>/);
 assert.match(group.children[2].textContent,/por revisar: REF-1/);
 assert.match(group.children[3].textContent,/Comprobar original/);
});

test('does not offer persistence without both client opt-in and confirmed archive',async()=>{
 for(const opts of [{enabled:false},{available:false}]){
  const x=await setup(opts);await x.click('udocReviewBtn');
  assert.equal(x.get('udocSavePanel').hidden,true);
  assert.match(x.get('udocDraftStatus').textContent,/no se guardan/);
  await x.click('udocSaveBtn');
  assert.equal(x.requests.length,1);
 }
});

test('save sends only explicit corrections and displays acknowledged revision',async()=>{
 const x=await setup();await x.click('udocReviewBtn');x.edit();
 x.setReply(async()=>({ok:true,json:async()=>x.saved()}));
 await x.click('udocSaveBtn');
 const req=x.requests[1];
 assert.equal(req.url,'https://udoc.example/v1/documents/review-draft');
 assert.deepEqual(JSON.parse(req.options.body),{run_key:key,expected_revision:0,
  changes:{'reference.document':'CORREGIDO'},reason:'Contraste con el original'});
 assert.match(x.get('udocDraftStatus').textContent,/Revisión 1 guardada/);
 assert.match(x.get('udocReviewFields').children[0].children[1].children[1].textContent,/lectura original/);
});

test('a conflict keeps edits visible and does not report a save',async()=>{
 const x=await setup();await x.click('udocReviewBtn');x.edit();
 x.setReply(async()=>({ok:false,status:409}));
 await x.click('udocSaveBtn');
 assert.equal(x.input().value,'CORREGIDO');
 assert.match(x.get('udocDraftStatus').textContent,/Reábrela/);
 assert.equal(x.requests.length,2);
});

test('reopen sends only the run reference, no original and no model request',async()=>{
 const x=await setup();x.context.selectedDocumentFiles=[];
 x.get('udocReopenKey').value=key;
 x.setReply(async()=>({ok:true,json:async()=>x.saved(3)}));
 await x.click('udocReopenBtn');
 assert.equal(x.requests.length,1);
 assert.equal(x.requests[0].url,'https://udoc.example/v1/documents/reopen');
 assert.deepEqual(JSON.parse(x.requests[0].options.body),{run_key:key});
 assert.match(x.get('udocDraftStatus').textContent,/Revisión 3 disponible/);
 assert.equal(x.input().value,'CORREGIDO');
});

test('rejects a stale scope response when reopening',async()=>{
 const x=await setup();x.get('udocReopenKey').value=key;
 x.setReply(async()=>{x.context.household={id:'another'};return {ok:true,json:async()=>x.saved()};});
 await x.click('udocReopenBtn');
 assert.equal(x.get('udocReviewDialog').open,undefined);
 assert.match(x.get('udocReviewStatus').textContent,/sesión ha cambiado/);
});

test('an unconfirmed or mismatching save never shows success or retries',async()=>{
 for(const reply of [()=>({ok:false,status:503}),x=>({ok:true,json:async()=>x.saved(0)})]){
  const x=await setup();await x.click('udocReviewBtn');x.edit();
  x.setReply(async()=>reply(x));await x.click('udocSaveBtn');
  assert.doesNotMatch(x.get('udocDraftStatus').textContent,/guardada\./);
  assert.equal(x.input().value,'CORREGIDO');
  assert.equal(x.requests.length,2);
 }
});

test('closing clears private review and ignores a late save response',async()=>{
 const x=await setup();await x.click('udocReviewBtn');x.edit();
 x.setReply(async()=>{x.get('udocReviewDialog').close();return {ok:true,json:async()=>x.saved()};});
 await x.click('udocSaveBtn');
 assert.equal(x.get('udocReviewFields').children.length,0);
 assert.equal(x.get('udocReviewReference').textContent,'');
 assert.equal(x.get('udocReviewDialog').open,false);
});
