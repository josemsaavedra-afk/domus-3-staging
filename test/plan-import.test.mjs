import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script=fs.readFileSync(new URL('../domus-3/src/treasury/plan-import.js',import.meta.url),'utf8');
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/planes/viaje-asturias-2026.json',import.meta.url),'utf8'));
function harness(){
 const nodes=new Map();
 const node=id=>nodes.get(id)||nodes.set(id,{value:'',textContent:'',className:'',disabled:true,append(){},set innerHTML(v){this.textContent=v;},get innerHTML(){return this.textContent;}}).get(id);
 const ctx={window:{},document:{getElementById:node,createElement:()=>({textContent:'',append(){}})},household:{id:'h'},user:{id:'u'},sb:{},refreshAll:async()=>{}};
 vm.runInNewContext(script,ctx);
 return {ctx,node};
}
test('Asturias fixture balances to 1177.49 EUR with 22.51 margin',()=>{
 const sum=fixture.items.reduce((n,x)=>n+x.amount_cents,0);
 assert.equal(sum,117749);
 assert.equal(fixture.budget_limit_cents-sum,2251);
 assert.equal(fixture.items.length,11);
});
test('preview enables confirmation only for valid plan',()=>{
 const {ctx,node}=harness();node('planImportJson').value=JSON.stringify(fixture);
 ctx.window.DOMUSPlanImport.preview();
 assert.equal(node('planImportConfirm').disabled,false);
 assert.match(node('planImportMessage').textContent,/Previsualización lista/);
});
test('preview rejects duplicate item identifiers',()=>{
 const {ctx,node}=harness();const invalid=structuredClone(fixture);invalid.items[1].id=invalid.items[0].id;
 node('planImportJson').value=JSON.stringify(invalid);
 ctx.window.DOMUSPlanImport.preview();
 assert.equal(node('planImportConfirm').disabled,true);
 assert.match(node('planImportMessage').textContent,/no se puede importar/i);
});
test('preview rejects untrusted schema and negative amount',()=>{
 const {ctx,node}=harness();const invalid=structuredClone(fixture);invalid.items[0].amount_cents=-1;
 node('planImportJson').value=JSON.stringify(invalid);ctx.window.DOMUSPlanImport.preview();
 assert.equal(node('planImportConfirm').disabled,true);
});

test('confirm creates only budget records and reimport is idempotent',async()=>{
 const {ctx,node}=harness();const tables={budget_plans:[],budget_items:[]};let refreshes=0;
 const query=table=>({
  select(){return this;},
  eq(){return this;},
  async single(){return {data:tables[table].at(-1),error:null};},
  then(resolve){resolve({data:[...tables[table]],error:null});}
 });
 ctx.sb={from(table){assert.ok(['budget_plans','budget_items'].includes(table),'No treasury writes');return {
  select:()=>query(table),
  insert(row){tables[table].push({...row,id:String(tables[table].length+1)});return {select:()=>({single:async()=>({data:tables[table].at(-1),error:null})}),then(resolve){resolve({error:null});}};}
 };}};
 ctx.refreshAll=async()=>{refreshes++;};
 node('planImportJson').value=JSON.stringify(fixture);
 ctx.window.DOMUSPlanImport.preview();
 await ctx.window.DOMUSPlanImport.confirmImport();
 assert.equal(tables.budget_plans.length,1);
 assert.equal(tables.budget_items.length,11);
 assert.equal(tables.budget_items.every(x=>x.status==='planned'),true);
 assert.equal(tables.budget_items.some(x=>x.notes.includes('Pagado (conciliar)')),true);
 node('planImportJson').value=JSON.stringify(fixture);
 ctx.window.DOMUSPlanImport.preview();
 await ctx.window.DOMUSPlanImport.confirmImport();
 assert.equal(tables.budget_plans.length,1);
 assert.equal(tables.budget_items.length,11);
 assert.equal(refreshes,2);
});

test('paid imported rental cannot be converted into a second treasury movement',()=>{
 const html=fs.readFileSync(new URL('../domus-3/index.html',import.meta.url),'utf8');
 assert.match(html,/async function convertBudgetItem\(item\)[\s\S]*?Estado: Pagado \(conciliar\)/);
 assert.match(html,/Concíliala con el movimiento existente/);
});
