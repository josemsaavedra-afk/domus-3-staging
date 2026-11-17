import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source=readFileSync('domus-3/src/classification/master-delete.js','utf8');
const id='30000000-0000-4000-8000-000000000001',version='a'.repeat(32);
function fixture(responses,options={}){
 const calls=[],errors=[],blocks=[],deleted=[],confirmations=[];
 let scope={userId:'user',householdId:'home'};
 const context=vm.createContext({AbortController,setTimeout,clearTimeout});vm.runInContext(source,context);
 const controller=context.DOMUSMasterDeletion.create({client:()=>({rpc:(name,args)=>{
  calls.push({name,args});return {abortSignal:signal=>{
   const next=responses.shift();return typeof next==='function'?next(signal):Promise.resolve(next);
  }};}}),context:()=>scope,confirm:async text=>{confirmations.push(text);return options.confirm?options.confirm():true;},
  onDeleted:async data=>{deleted.push(data);if(options.refreshError)throw Error('refresh failed');},
  onError:x=>errors.push(x),onBlocked:x=>blocks.push(x),timeoutMs:options.timeoutMs||100});
 const button={textContent:'Eliminar',disabled:false,setAttribute(){},removeAttribute(){}};
 return {controller,calls,errors,blocks,deleted,confirmations,button,setScope:value=>scope=value};
}
const review=()=>({data:{status:'review',id,version,name:'Nombre actual del servidor',active:false}});
const deleted=()=>({data:{status:'deleted',id}});

test('preview and confirmation send exactly one versioned delete and restore button',async()=>{
 const f=fixture([review(),deleted()]);assert.equal(await f.controller.remove('people',id,f.button),'deleted');
 assert.equal(f.calls.length,2);assert.equal(f.calls[0].args.p_expected_version,null);assert.equal(f.calls[1].args.p_expected_version,version);
 assert.match(f.confirmations[0],/Nombre actual del servidor/);assert.equal(f.button.textContent,'Eliminar');assert.equal(f.button.disabled,false);
});
test('cancel only performs a preview',async()=>{
 const f=fixture([review()],{confirm:()=>false});assert.equal(await f.controller.remove('people',id,f.button),'cancelled');assert.equal(f.calls.length,1);assert.equal(f.deleted.length,0);
});
test('dependencies block without confirmation or mutation',async()=>{
 const f=fixture([{data:{status:'blocked',id,version}}]);assert.equal(await f.controller.remove('people',id,f.button),'blocked');assert.equal(f.calls.length,1);assert.equal(f.confirmations.length,0);assert.equal(f.blocks.length,1);
});
test('late dependency block is shown without claiming deletion',async()=>{
 const f=fixture([review(),{data:{status:'blocked',id,version}}]);assert.equal(await f.controller.remove('people',id,f.button),'blocked');assert.equal(f.deleted.length,0);
});
test('household change during confirmation cannot send a delete',async()=>{
 let f;f=fixture([review()],{confirm:()=>{f.setScope({userId:'user',householdId:'other'});return true;}});
 assert.equal(await f.controller.remove('people',id,f.button),'unconfirmed');assert.equal(f.calls.length,1);assert.match(f.errors[0],/sesión o el hogar/);
});
test('missing RPC has no direct-table delete fallback',async()=>{
 const f=fixture([{error:{code:'PGRST202'}}]);assert.equal(await f.controller.remove('people',id,f.button),'unconfirmed');assert.equal(f.calls.length,1);assert.match(f.errors[0],/borrado directo/);
});
test('stale version and uncertain acknowledgements never retry',async()=>{
 for(const response of [{error:{code:'40001'}},{data:{status:'deleted',id:'other'}}]){
  const f=fixture([review(),response]);assert.equal(await f.controller.remove('people',id,f.button),'unconfirmed');assert.equal(f.calls.length,2);assert.equal(f.deleted.length,0);
 }
});
test('timeout stops busy state and does not resubmit',async()=>{
 const f=fixture([signal=>new Promise(resolve=>signal.addEventListener('abort',()=>resolve({error:{code:'ABORT'}})))],{timeoutMs:5});
 assert.equal(await f.controller.remove('people',id,f.button),'unconfirmed');assert.equal(f.button.disabled,false);assert.equal(f.calls.length,1);assert.match(f.errors[0],/no se repetirá/);
});
test('rapid repeated click only starts one operation',async()=>{
 let release;const f=fixture([()=>new Promise(resolve=>release=()=>resolve(review())),deleted()]);
 const first=f.controller.remove('people',id,f.button);assert.equal(await f.controller.remove('people',id,f.button),'ignored');release();assert.equal(await first,'deleted');assert.equal(f.calls.length,2);
});
test('refresh failure after confirmed deletion is reported accurately',async()=>{
 const f=fixture([review(),deleted()],{refreshError:true});assert.equal(await f.controller.remove('people',id,f.button),'deleted_refresh_pending');assert.match(f.errors[0],/se eliminó/);
});
test('actual settings markup exposes separate delete actions for active and inactive rows in all seven catalogs',()=>{
 const html=readFileSync('domus-3/index.html','utf8'),dom=new JSDOM(html,{runScripts:'outside-only'}),w=dom.window;
 try{
  const row=[{id,name:'Activo',active:true},{id:'second',name:'Inactivo',active:false}];
  for(const key of ['people','accounts','categories','paymentMethods'])w[key]=row;
  w.user={email:'synthetic@example.invalid'};w.household={name:'Synthetic',invite_code:'fixture'};w.members=[];
  w.domusCounterparties=row;w.domusLabels={activities:row,tags:row};w.domusCounterpartiesReady=true;
  w.DOMUSClassification={categoryLabel:x=>x.name};w.escapeHtml=x=>String(x);w.renderDocumentPaymentRules=()=>{};
  const code=html.match(/function renderSettings\(\)\{[^\n]+/)[0];w.eval(code);w.renderSettings();
  for(const list of ['peopleSettingsList','accountsSettingsList','categorySettingsList','counterpartiesSettingsList','activity_projectsSettingsList','tagsSettingsList','paymentMethodsSettingsList']){
   const buttons=[...w.document.getElementById(list).querySelectorAll('button')];
   assert.equal(buttons.filter(b=>b.textContent==='Eliminar').length,2,list);
   assert.equal(buttons.filter(b=>b.textContent==='Desactivar').length,1,list);
   assert.equal(buttons.filter(b=>b.textContent==='Reactivar').length,1,list);
  }
 }finally{w.close();}
});
