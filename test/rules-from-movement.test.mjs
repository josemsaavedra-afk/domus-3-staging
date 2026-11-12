import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';
const master=readFileSync('domus-3/src/classification/master.js','utf8'),rules=readFileSync('domus-3/src/classification/rules-ui.js','utf8');
const fields=(doc=false)=>{const p=doc?'dd':'f',n=doc?'0':'';return `<select id="${p}Type${n}"><option value="expense">Gasto</option></select><input id="${p}Concept${n}" value="Molino Acebuchal"><input id="${p}Amount${n}" value="3.52"><select id="${p}Category${n}"><option value=""></option><option value="food" selected>Alimentación</option></select><select id="${p}${doc?'Scope':'ExpenseScope'}${n}"><option value=""></option><option value="domestic" selected>Doméstico</option></select><textarea id="${p}Notes${n}">Nota que no debe perderse</textarea>`};
test('create rule from manual and document drafts preserves the draft and classifies the next matching movement',async()=>{
 const dom=new JSDOM('<form id="movementForm"><input id="editSeriesId">'+fields()+'</form><article class="draft-card">'+fields(true)+'</article>',{url:'https://example.test/',runScripts:'outside-only'}),w=dom.window,stored=[];
 Object.assign(w,{household:{id:'h'},people:[],accounts:[],categories:[{id:'food',name:'Alimentación',household_id:'h',active:true,kind:'expense'}],domusRules:[],domusRulesReady:true,currentDocDrafts:[{}],escapeHtml:String,syncPrefFields:()=>{},
  sb:{rpc:async()=>({data:34}),from:table=>{assert.equal(table,'classification_rules');return{insert:row=>({select:()=>({single:async()=>{stored.push({...row,id:'rule-'+stored.length});return{data:{id:'rule'}};}})})};}},
  refreshAll:async()=>{w.domusRules=[...stored];w.document.querySelectorAll('#movementForm input,#movementForm textarea,.draft-card input,.draft-card textarea').forEach(node=>node.value='');}});
 try{
  vm.runInContext(master+'\n'+rules,dom.getInternalVMContext());const q=id=>w.document.getElementById(id);
  w.DOMUSRuleUI.manual();q('rulePreview_manual').querySelector('[data-create-rule]').click();
  assert.equal(q('rc_text').value,'Molino Acebuchal');assert.equal(q('rp_category_id').value,'food');assert.equal(q('rp_expense_scope').value,'domestic');
  await q('ruleEditorForm').onsubmit({preventDefault(){},submitter:q('ruleEditorForm').querySelector('[type=submit]')});
  assert.equal(stored.length,1);assert.equal(q('fConcept').value,'Molino Acebuchal');assert.equal(q('fAmount').value,'3.52');assert.equal(q('fNotes').value,'Nota que no debe perderse');
  q('fCategory').value='';q('fExpenseScope').value='';w.DOMUSRuleUI.manual();q('rulePreview_manual').querySelector('[data-apply-rule]').click();assert.equal(q('fCategory').value,'food');assert.equal(q('fExpenseScope').value,'domestic');
  // Documents use the same editor without leaving or saving the movement.
  q('ddConcept0').value='Otro comercio';q('ddAmount0').value='8';q('ddNotes0').value='Documento sin perder';w.DOMUSRuleUI.docs([{}]);q('rulePreview_doc0').querySelector('[data-create-rule]').click();
  await q('ruleEditorForm').onsubmit({preventDefault(){},submitter:q('ruleEditorForm').querySelector('[type=submit]')});
  assert.equal(stored.length,2);assert.equal(q('ddConcept0').value,'Otro comercio');assert.equal(q('ddAmount0').value,'8');assert.equal(q('ddNotes0').value,'Documento sin perder');
 }finally{dom.window.close();}
});
test('Documents bank import focuses the reconciliation after the view navigation scroll reset',()=>{
 const html=readFileSync('domus-3/index.html','utf8'),source=html.split('\n').find(s=>s.startsWith('function openBankImport()'));let scroll=0,focused=false,opened=false;const queue=[],panel={open:false,scrollIntoView:()=>scroll=500};
 const c={showView:()=>queue.push(()=>scroll=0),requestAnimationFrame:fn=>queue.push(fn),window:{DOMUSTreasury3:{openStatementImport:()=>opened=true}},document:{getElementById:id=>id==='treasuryCsv'?{closest:()=>panel}:{focus:options=>{assert.equal(options.preventScroll,true);focused=true;}}}};
 vm.runInNewContext(source,c);c.openBankImport();while(queue.length)queue.shift()();assert.equal(scroll,500);assert.equal(panel.open,true);assert.equal(focused,true);assert.equal(opened,true);
});
