import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';

const html=readFileSync('domus-3/index.html','utf8');
const source=html.slice(html.indexOf('const udocReviewButton='),html.indexOf('async function getDocumentBlob'));

async function fixture(mode){
 const file=new Blob(['private protocol original'],{type:'text/plain'});file.name='original.txt';
 const digest=Buffer.from(await webcrypto.subtle.digest('SHA-256',await file.arrayBuffer())).toString('hex');
 const ids=new Map(),writes=[],requests=[];let changed=false,context;
 const element=()=>({children:[],handlers:{},disabled:false,open:true,textContent:'',dataset:{},
  addEventListener(name,fn){this.handlers[name]=fn},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},
  showModal(){this.open=true},close(){this.open=false;this.handlers.close?.()}});
 const get=id=>{if(!ids.has(id))ids.set(id,element());return ids.get(id)};
 const result={schema_version:'1.0',source_sha256:digest,automatic_economic_action:false,status:'NEEDS_REVIEW',
  attempts:[{status:'NEEDS_REVIEW',interpretation:{document_type:'invoice',fields:[{path:'reference.document',value:'PRIVATE-1',evidence:[]}],warnings:[],relationships:[]}}]};
 const row={id:'doc',household_id:'home',file_retained:true,storage_path:'retained',updated_at:'2026-11-18T08:00:00Z',
  extracted_data:{source_sha256:digest,udoc_raw_result:result}};
 if(mode==='recover-json')row.extracted_data={source_sha256:digest,udoc_pending_attempt:{id:'synthetic-pending'}};
 const crypto={subtle:{digest:async(algorithm,data)=>{
  if(!changed&&new TextDecoder().decode(data).startsWith('[')){
   changed=true;
   if(mode==='home')context.household={id:'other'};
   if(mode==='actor')context.user={id:'other'};
   if(mode==='file')context.selectedDocumentFiles=[new Blob(['other'])];
   if(mode==='close')get('udocReviewDialog').close();
   if(mode==='replacement')vm.runInContext('udocReviewSession={marker:"new-session"};document.getElementById("udocReviewFields").children=["new-context"];',context);
  }
  return webcrypto.subtle.digest(algorithm,data);
 }}};
 context=vm.createContext({document:{getElementById:get,createElement:element},crypto,URL,TextEncoder,
  window:{DOMUS_CONFIG:{udocReview:true,udocReviewOrigin:'https://udoc.example'}},
  user:{id:'actor'},household:{id:'home'},selectedDocumentFiles:[file],
  sb:{auth:{getSession:async()=>({data:{session:{user:{id:'actor'},access_token:'synthetic-only'}}})},
   from(){const q={select:()=>q,eq:()=>q,or:()=>q,limit:async()=>({data:[row]}),update(){writes.push(true);throw Error('No writes expected')}};return q}},
  fetch:async url=>{
   requests.push(url);
   if(mode==='recover-json'&&String(url).endsWith('/recover'))return{ok:true,status:200,json:async()=>{context.household={id:'other'};return result;}};
   throw Error('No provider request permitted');
  },location:{href:'https://example.test/'},AbortSignal,
 });
 vm.runInContext(source+';globalThis.state=()=>({session:udocReviewSession,open:document.getElementById("udocReviewDialog").open,fields:document.getElementById("udocReviewFields").children.length,saveDisabled:document.getElementById("udocReviewSaveBtn").disabled});',context);
 await context.readUdocSelection({allowProvider:false});
 return {state:context.state(),ids,writes,requests};
}

for(const mode of ['home','actor','file'])test(mode+' change during final hashing closes and clears old review',async()=>{
 const x=await fixture(mode);
 assert.equal(x.state.fields,0);assert.equal(x.state.open,false);assert.equal(x.state.session,null);
 assert.equal(x.state.saveDisabled,true);assert.deepEqual(x.writes,[]);assert.deepEqual(x.requests,[]);
});
test('closing during final hashing cannot resurrect the review',async()=>{
 const x=await fixture('close');assert.equal(x.state.open,false);assert.equal(x.state.fields,0);assert.equal(x.state.session,null);
 assert.equal(x.state.saveDisabled,true);assert.deepEqual(x.requests,[]);
});
test('old completion cannot replace a newer review session',async()=>{
 const x=await fixture('replacement');assert.equal(x.state.session.marker,'new-session');
 assert.deepEqual(Array.from(x.ids.get('udocReviewFields').children),['new-context']);assert.deepEqual(x.requests,[]);
});
test('current retained proposal still opens without any provider or write',async()=>{
 const x=await fixture('valid');assert.equal(x.state.open,true);assert.equal(x.state.fields,1);
 assert.equal(x.state.saveDisabled,false);assert.deepEqual(x.requests,[]);assert.deepEqual(x.writes,[]);
});
test('household change during recovery JSON cannot retain or expose old result',async()=>{
 const x=await fixture('recover-json');assert.equal(x.state.open,false);assert.equal(x.state.fields,0);
 assert.equal(x.state.session,null);assert.equal(x.state.saveDisabled,true);assert.deepEqual(x.writes,[]);
 assert.equal(x.requests.length,1);assert.match(String(x.requests[0]),/\/recover$/);
});
