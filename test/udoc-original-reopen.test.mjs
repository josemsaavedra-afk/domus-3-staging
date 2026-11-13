import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';

const html=readFileSync('domus-3/index.html','utf8');
const block=html.slice(html.indexOf('const udocMoney='),html.indexOf('async function saveUdocReview'));
async function fixture(mode='hash'){
 const file=new Blob(['protocol only'],{type:'text/plain'});file.name='renamed-file.txt';
 const digest=Buffer.from(await webcrypto.subtle.digest('SHA-256',await file.arrayBuffer())).toString('hex');
 const calls=[],row={id:'stored',household_id:'home',file_name:'old-name.txt',
  storage_path:'retained',file_retained:true,extracted_data:{source_sha256:digest}};
 const session={file,owner:'actor',home:'home'};
 const context=vm.createContext({crypto:webcrypto,file,session,udocReviewSession:session,
  user:{id:'actor'},household:{id:'home'},selectedDocumentFiles:[file],
  getDocumentBlob:async()=>{calls.push('read original');return file;},
  sb:{from(table){
   assert.equal(table,'documents');let hashLookup=false;const filters=[];
   const q={select:()=>q,eq:(k,v)=>{filters.push([k,v]);return q},
    or:expr=>{hashLookup=true;assert.ok(expr.includes(digest));return q},
    limit:async n=>{
     calls.push({hashLookup,filters,n});
     if(mode==='scope')context.household={id:'other'};
     if(hashLookup){
      if(mode==='legacy')return {data:[]};
      return {data:mode==='ambiguous'?[row,{...row,id:'second'}]:[row]};
     }
     return {data:[{...row,extracted_data:{}}]};
    }};return q;
  }}
 });
 vm.runInContext(block+';globalThis.testDate=udocDate;',context);
 return {context,session,file,calls,digest};
}
test('renamed original resolves by exact fingerprint without another upload or name lookup',async()=>{
 const f=await fixture();
 const doc=await f.context.udocArchivedDocument(f.file,f.session);
 assert.equal(doc.file_name,'old-name.txt');
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].hashLookup,true);
 assert.deepEqual(f.calls[0].filters,[['household_id','home']]);
});
test('several originals with one fingerprint remain ambiguous',async()=>{
 const f=await fixture('ambiguous');
 await assert.rejects(f.context.udocArchivedDocument(f.file,f.session),/varios originales/);
 assert.equal(f.calls.length,1);
});
test('legacy original requires retained bytes before acquiring the fingerprint',async()=>{
 const f=await fixture('legacy');
 const doc=await f.context.udocArchivedDocument(f.file,f.session);
 assert.equal(f.calls[1].hashLookup,false);assert.equal(f.calls[2],'read original');
 assert.equal(doc.extracted_data.source_sha256,f.digest);
});
test('household changes during fingerprint lookup stop the reopen',async()=>{
 const f=await fixture('scope');
 await assert.rejects(f.context.udocArchivedDocument(f.file,f.session),/sesión/);
 assert.equal(f.calls.length,1);
});
test('manual impossible calendar dates never become economic drafts',async()=>{
 const {context:c}=await fixture();
 for(const date of ['2026-02-29','2026-02-31','2026-13-01','2026-11-00','2026-11']){
  assert.equal(c.testDate(date),null);
  assert.equal(c.udocDraftFromReview({interpretation:{document_type:'invoice'}},{
   'document.kind':'invoice','party.issuer.name':'Fixture','reference.document':'T-1',
   'date.issue':date,'total.payable':'10.00'
  }),null);
 }
});
test('calendar checks accept complete valid leap-day and normal dates only',async()=>{
 const {context:c}=await fixture();
 assert.equal(c.testDate('2028-02-29'),'2028-02-29');
 assert.equal(c.testDate('2026-11-12'),'2026-11-12');
 assert.equal(c.testDate(null),null);
});

test('packet proposals preserve each invoice and never substitute a combined or empty total',async()=>{
 const {context:c}=await fixture();
 const drafts=c.udocDraftsFromReview({interpretation:{document_type:'packet'}},{
  'document.kind':'invoice','party.issuer.name':'Proveedor de protocolo','reference.document':'COMBINED','date.issue':'2026-11-13','total.payable':'999',
  'document.1.kind':'invoice','document.1.reference':'A-1','document.1.date.issue':'2026-11-10','document.1.total.payable':'100',
  'document.2.kind':'invoice','document.2.reference':'A-2','document.2.date.issue':'2026-11-11','document.2.total.payable':'20',
  'document.3.kind':'invoice','document.3.reference':'EMPTY','document.3.date.issue':'2026-11-11','document.3.total.payable':null,
 });
 assert.equal(drafts.length,2);assert.deepEqual(Array.from(drafts,d=>d.invoice_number),['A-1','A-2']);assert.deepEqual(Array.from(drafts,d=>d.amount),[100,20]);assert.equal(drafts[0].type,null);assert.equal(drafts[0].review_required,false);
});
test('supplier name does not block a complete invoice and a pending packet part survives reanalysis',async()=>{
 const {context:c}=await fixture();
 const draft=c.udocDraftFromReview({interpretation:{document_type:'invoice'}},{'document.kind':'invoice','party.issuer.name':'DriiveMe','reference.document':'A-1','date.issue':'2026-11-10','total.payable':'100'});assert.ok(draft);assert.equal(draft.type,null);
 const prior=[{review_status:'confirmed',confirmed_series_id:'m1',udoc_source_sha256:'sha'},{invoice_number:'SECOND',amount:20,udoc_source_sha256:'sha'}],state=c.udocReviewDraftState(prior,[],'sha','new');assert.equal(state.preserved.length,2);assert.equal(state.preserved[1].invoice_number,'SECOND');assert.equal(state.prepared.length,0);
});
