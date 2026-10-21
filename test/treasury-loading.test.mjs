import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
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
