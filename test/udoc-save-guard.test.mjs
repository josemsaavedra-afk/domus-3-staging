import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html=readFileSync(new URL('../domus-3/index.html',import.meta.url),'utf8');
const handler=html.slice(html.indexOf('const udocReviewButton='),html.indexOf('const udocReviewUrl='));
const oldVersion='2026-11-10T10:00:00Z';
const newVersion='2026-11-10T10:01:00Z';

async function setup(mode){
 const file=new Blob(['protocol fixture only'],{type:'text/plain'});
 const digest=Buffer.from(await webcrypto.subtle.digest('SHA-256',await file.arrayBuffer())).toString('hex');
 const ids=new Map(),writes=[],reads=[],events=[];
 const get=id=>{
  if(!ids.has(id))ids.set(id,{textContent:'',disabled:false,replaceChildren(){},close(){events.push('closed')}});
  return ids.get(id);
 };
 const values={'document.kind':'invoice','party.issuer.name':'Fixture','reference.document':'T-1',
  'date.issue':'2026-11-10','total.payable':'7.00'};
 const row={id:'doc-a',household_id:'home-a',storage_path:'fixture.txt',file_retained:true,
  updated_at:oldVersion,extracted_data:{source_sha256:digest}};
 const attempts=[{status:mode==='invalid'?'INVALID_PROPOSAL':'NEEDS_REVIEW',interpretation:{document_type:'invoice',fields:Object.keys(values).map(path=>({path}))}}];
 const context=vm.createContext({
  document:{getElementById:get,querySelectorAll:()=>Object.entries(values).map(([path,value])=>({dataset:{udocPath:path},value}))},
  crypto:webcrypto,structuredClone,file,digest,attempts,selectedDocumentFiles:[file],
  user:{id:'actor-a'},household:{id:'home-a'},documents:[],
  updateRowSafely(){events.push('unexpected queue');throw new Error('Offline queue invoked')},
  renderDocDrafts(){events.push('draft displayed')},
  refreshAll:async()=>{if(mode==='refresh')throw new Error('refresh unavailable')},
  sb:{auth:{getSession:async()=>({data:{session:{user:{id:'actor-a'},access_token:'fixture'}}})},
   from(table){
    assert.equal(table,'documents');
    return {select(){
     const q={eq:(k,v)=>{reads.push([k,v]);return q},or:()=>q,limit:async()=>{
      if(mode==='scope')context.household={id:'home-b'};
      return {data:[mode==='other'?{...row,household_id:'home-b'}:row]};
     }};return q;
    },update(payload){
     const filters=[],q={eq:(k,v)=>{filters.push([k,v]);return q},select:async columns=>{
      writes.push({payload,filters,columns});
      if(mode==='network')throw new TypeError('Failed to fetch');
      if(mode==='stale')return {data:[]};
      if(mode==='wrong-ack')return {data:[{id:'other',updated_at:newVersion}]};
      return {data:[{id:'doc-a',updated_at:newVersion}]};
     }};return q;
    }};
   }},
 });
 vm.runInContext(handler+';udocReviewSession={file,owner:"actor-a",home:"home-a",digest,result:{status:"NEEDS_REVIEW"},interpretations:attempts,interpretationHash:"raw"};',context);
 return {run:()=>vm.runInContext('saveUdocReview()',context),get,reads,writes,events};
}

test('a confirmed row alone permits success and the prepared draft',async()=>{
 const x=await setup('ack');await x.run();
 assert.match(x.get('udocReviewStatus').textContent,/^Revisión guardada\./);
 assert.deepEqual(x.writes[0].filters,[['id','doc-a'],['household_id','home-a'],['updated_at',oldVersion]]);
 assert.equal(x.writes[0].columns,'id,updated_at');
 assert.equal(x.writes[0].payload.extracted_data.drafts[0].amount,7);
 assert.equal(x.writes[0].payload.extracted_data.drafts[0].review_required,false,'a reviewed valid invoice must allow explicit creation');
 assert.deepEqual(x.events,['closed','draft displayed']);
});

for(const mode of ['stale','network','wrong-ack']){
 test(mode+' leaves edits open, suppresses success and blocks resubmission',async()=>{
  const x=await setup(mode);await x.run();await x.run();
  assert.match(x.get('udocReviewStatus').textContent,/Guardado sin confirmar/);
  assert.equal(x.get('udocReviewSaveBtn').disabled,true);
  assert.equal(x.writes.length,1);assert.deepEqual(x.events,[]);
 });
}
for(const mode of ['scope','other']){
 test(mode+' cannot send a write under another household',async()=>{
  const x=await setup(mode);await x.run();
  assert.deepEqual(x.reads[0],['household_id','home-a']);
  assert.equal(x.writes.length,0);assert.deepEqual(x.events,mode==='scope'?['closed']:[]);
 });
}
test('refresh failure does not turn an acknowledged save into failure',async()=>{
 const x=await setup('refresh');await x.run();
 assert.match(x.get('udocReviewStatus').textContent,/^Revisión guardada\. No se pudo actualizar/);
 assert.equal(x.writes.length,1);assert.deepEqual(x.events,['closed']);
});
test('two clicks only send one mutation',async()=>{
 const x=await setup('ack');await Promise.all([x.run(),x.run()]);
 assert.equal(x.writes.length,1);
});

test('an invalid interpretation remains archived without an economic draft even after correcting its fields',async()=>{
 const x=await setup('invalid');await x.run();assert.equal(x.writes[0].payload.extracted_data.drafts.length,0);assert.deepEqual(x.events,['closed']);assert.match(x.get('udocReviewStatus').textContent,/no puede crear un movimiento/);
});
