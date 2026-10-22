import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {withLoadDeadline} from '../domus-3/src/treasury/data-loading.js';
const html=readFileSync('domus-3/index.html','utf8');
const source=html.slice(html.indexOf('function renderTreasury3(){'),html.indexOf('// RC1 Staging only:',html.indexOf('function renderTreasury3(){')));
test('treasury never presents an empty dataset as zero before the authenticated load finishes',()=>{
 for(const error of [false,true]){
  const root={textContent:''};let called=false;
  const context={user:{id:'u'},household:{id:'h'},treasuryLoadedContext:null,treasuryLoadError:error,document:{getElementById:()=>root},window:{DOMUSTreasury3:{render:()=>called=true}}};
  vm.createContext(context);vm.runInContext(source,context);context.renderTreasury3();
  assert.equal(called,false);assert.match(root.textContent,error?/No se han podido cargar/:/Cargando/);assert.ok(!root.textContent.includes('0,00'));
 }
});
test('a different household cannot reuse the previous loaded economic snapshot',()=>{
 const root={textContent:''},context={user:{id:'u'},household:{id:'new'},treasuryLoadedContext:'u|old',treasuryLoadError:false,document:{getElementById:()=>root},window:{DOMUSTreasury3:{render:()=>assert.fail('foreign data rendered')}}};
 vm.createContext(context);vm.runInContext(source,context);context.renderTreasury3();assert.match(root.textContent,/Cargando/);
});

test('a stalled load ends explicitly and its late result cannot publish data',async()=>{
 let finish,published=false;
 const slow=new Promise(resolve=>{finish=resolve});
 await assert.rejects(()=>withLoadDeadline(()=>slow,10).then(()=>{published=true}),/Sincronizar/);
 finish({data:[1]});await Promise.resolve();
 assert.equal(published,false);
 assert.deepEqual(await withLoadDeadline(()=>Promise.resolve({data:[2]}),100),{data:[2]});
});

test('refresh bursts run serially, share completion and retain one trailing refresh',async()=>{
 const jobs=[];let active=0,peak=0;
 const c={Promise,user:{id:'u'},household:{id:'h'},performRefreshAll:()=>{active++;peak=Math.max(peak,active);return new Promise(resolve=>jobs.push(()=>{active--;resolve()}))}};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf('let refreshFlight=null;'),html.indexOf('async function performRefreshAll()')),c);
 const first=c.refreshAll(),second=c.refreshAll(),third=c.refreshAll();
 assert.equal(first,second);assert.equal(second,third);assert.equal(jobs.length,1);
 jobs.shift()();await new Promise(setImmediate);assert.equal(jobs.length,1);
 jobs.shift()();await first;assert.equal(peak,1);
 const retry=c.refreshAll();assert.equal(jobs.length,1);jobs.shift()();await retry;
});

test('startup renders the visible Home and shared financial summary without rendering hidden reports',()=>{
 const calls=[];const c={Date,Intl,document:{getElementById:id=>({textContent:'',classList:{contains:name=>id==='movementModal'?false:id!=='dashboardView'}})}};
 for(const name of ['renderTreasury3','renderDashboard','renderMilestones','renderTreasury','renderCalendar','renderMovements','renderBudgets','renderStats','renderDocuments','renderSettings','populateSelects'])c[name]=()=>calls.push(name);
 vm.createContext(c);vm.runInContext(html.split('\n').find(line=>line.startsWith('function renderAll(){')),c);c.renderAll();
 assert.deepEqual(calls,['renderTreasury3','renderDashboard','renderMilestones','populateSelects']);
});

test('late household load cannot publish, and a budget failure cannot publish half the dataset',async()=>{
 const body=html.slice(html.indexOf('async function performRefreshAll(){'),html.indexOf('\nfunction subscribeRealtime()')).replace("await import('./src/treasury/data-loading.js')",'loader');
 for(const stale of [true,false]){
  let release;const gate=new Promise(resolve=>{release=resolve});
  const query=table=>new Proxy({then:done=>gate.then(()=>done(table==='budget_plans'&&!stale?{error:new Error('budget failed')}:{data:[]}))},{get:(target,key)=>key in target?target[key]:()=>query(table)});
  const original=[{id:'previous'}],c={Promise,user:{id:'u'},household:{id:'h'},refreshRequest:0,navigator:{onLine:true},flushOfflineQueue:async()=>{},ensureBeginnerExamples:async()=>{},
   loader:{withLoadDeadline,readAllPages:async make=>await make()},sb:{from:query},loadCounterpartyCatalog:async()=>({data:[]}),loadLabelCatalog:async()=>({activities:[],tags:[],links:[]}),loadRuleCatalog:async()=>({data:[]}),
   people:original,documentLoadState:'ready',treasuryLoadError:false,renderTreasury3:()=>{},renderDashboard:()=>{},console:{warn:()=>{}},isNetworkError:()=>true};
  vm.createContext(c);vm.runInContext(body,c);const pending=c.performRefreshAll();await new Promise(setImmediate);
  if(stale)c.household={id:'different'};release();await pending;
  assert.equal(c.people,original);
  assert.equal(c.treasuryLoadError,!stale);
 }
});
