import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {JSDOM} from 'jsdom';

function setup(){
 const dom=new JSDOM(readFileSync('domus-3/index.html','utf8'),{url:'https://families.invalid',runScripts:'outside-only'});
 const w=dom.window,d=w.document,calls=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){this.open=false};
 d.getElementById('appScreen').classList.remove('hidden');
 w.DOMUSFamilyNavigation={showView:x=>{calls.push(x);d.getElementById(x+'View')?.classList.remove('hidden')},openForm(){},setSimpleMovementMode(){},syncPrefFields(){},captureMovementForm(){}};
 w.eval(readFileSync('domus-3/src/family-help.js','utf8'));
 return {w,d,calls,el:id=>d.getElementById(id),close:()=>w.close()};
}

test('unfinished tutor resumes its exact step separately for each household',()=>{
 const x=setup();try{
  const a={userId:'actor',householdId:'home-a'};
  x.w.DOMUSFamilyHelp.start(a);x.el('familyHelpNext').click();x.el('familyHelpNext').click();
  x.w.DOMUSFamilyHelp.reset();x.w.DOMUSFamilyHelp.start(a);
  assert.equal(x.el('domusHelpTitle').textContent,'Cuentas');
  assert.equal(x.el('familyHelpProgress').textContent,'Paso 3 de 5');
  x.w.DOMUSFamilyHelp.start({...a,householdId:'home-b'});
  assert.equal(x.el('domusHelpTitle').textContent,'Tu hogar digital');
  x.w.DOMUSFamilyHelp.start(a);assert.equal(x.el('domusHelpTitle').textContent,'Cuentas');
 }finally{x.close()}
});

test('help gives ordered usable instructions for every main section and domestic rules',()=>{
 const x=setup();try{
  x.w.DOMUSFamilyHelp.start({userId:'actor',householdId:'home'});x.el('familyHelpClose').click();
  for(const view of ['dashboard','treasury','calendar','movements','budgets','stats','documents','settings']){
   for(const button of x.d.querySelectorAll('button[data-view]'))button.classList.toggle('active',button.dataset.view===view);
   x.el('domusHelpButton').click();assert.ok(x.el('familyHelpInstructions').children.length>=3,view);
   assert.equal(x.el('familyHelpProgress').textContent,'');x.el('familyHelpClose').click();
  }
  x.el('domusHelpButton').click();x.el('familyHelpRules').click();
  assert.match(x.el('familyHelpInstructions').textContent,/supermercado/);
  assert.match(x.el('familyHelpInstructions').textContent,/prioridad/);
  assert.doesNotMatch(x.el('familyHelpInstructions').textContent,/Gastos de actividad económica/);
 }finally{x.close()}
});

test('invalid or legacy progress never prevents first-use help',()=>{
 const x=setup();try{
  for(const saved of ['not-json','{"step":999}','{"step":-1}','{"step":1.5}']){
   x.w.localStorage.setItem('domus4-guide:actor:home',saved);x.w.DOMUSFamilyHelp.reset();
   x.w.DOMUSFamilyHelp.start({userId:'actor',householdId:'home'});
   assert.equal(x.el('domusHelpTitle').textContent,'Tu hogar digital');
  }
  x.w.localStorage.setItem('domus4-guide:actor:home','complete');x.w.DOMUSFamilyHelp.reset();
  x.w.DOMUSFamilyHelp.start({userId:'actor',householdId:'home'});assert.equal(x.el('domusHelpDialog').open,false);
 }finally{x.close()}
});

test('external context mutation cannot move tutor progress to another household',()=>{
 const x=setup();try{
  const context={userId:'actor',householdId:'home'};x.w.DOMUSFamilyHelp.start(context);
  context.householdId='other';x.el('familyHelpNext').click();
  assert.equal(JSON.parse(x.w.localStorage.getItem('domus4-guide:actor:home')).step,1);
  assert.equal(x.w.localStorage.getItem('domus4-guide:actor:other'),null);
 }finally{x.close()}
});

test('guide actions use real domestic recurring income and expense form controls',()=>{
 const x=setup();try{
  x.w.DOMUSFamilyHelp.start({userId:'actor',householdId:'home'});
  x.el('familyHelpNext').click();x.el('familyHelpAction').click();
  assert.equal(x.el('fType').value,'income');assert.equal(x.el('fRecurrence').value,'monthly');
  x.el('domusHelpButton').click();x.el('familyHelpGuide').click();
  x.el('familyHelpNext').click();x.el('familyHelpAction').click();
  assert.equal(x.calls.at(-1),'settings');assert.equal(x.d.activeElement.id,'newAccount');
  x.el('domusHelpButton').click();x.el('familyHelpGuide').click();x.el('familyHelpNext').click();x.el('familyHelpAction').click();
  assert.equal(x.el('fType').value,'expense');assert.equal(x.el('fStatus').value,'pending');
  assert.equal(x.el('domusHelpButton').getAttribute('aria-label'),'Abrir ayuda de DOMUS');
 }finally{x.close()}
});
