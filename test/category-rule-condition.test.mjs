import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {JSDOM} from 'jsdom';
const source=readFileSync('domus-3/src/classification/master.js','utf8'),ui=readFileSync('domus-3/src/classification/rules-ui.js','utf8');
const win={};vm.runInNewContext(source,{window:win});const C=win.DOMUSClassification;
const household='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',category='00000000-0000-4000-8000-000000000003',foreign='00000000-0000-4000-8000-000000000004';
const catalogs={categories:[{id:category,household_id:household,name:'Gastos de actividad económica',kind:'expense',active:true},{id:foreign,household_id:other,name:'Ajena',kind:'expense'}]};
const rule={household_id:household,name:'Categoría profesional → actividad',priority:100,active:true,conditions:{category_id:category},proposals:{expense_scope:'business'}};

test('category alone can condition scope without a supplier, concept or changing category',()=>{
 assert.doesNotThrow(()=>C.validateRule(rule,catalogs));
 const row={household_id:household,type:'expense',category_id:category};
 assert.equal(C.proposeRules(row,[rule],catalogs).proposals.expense_scope,'business');
 assert.equal(C.proposeRules({...row,category_id:'another'},[rule],catalogs).proposals.expense_scope,undefined);
 assert.equal(C.proposeRules({...row,category_id:null},[rule],catalogs).proposals.expense_scope,undefined);
 assert.equal(row.category_id,category);
 assert.throws(()=>C.validateRule({...rule,conditions:{category_id:foreign}},catalogs),/hogar/);
});

test('rule editor saves, reopens and applies a category condition with no other condition',async()=>{
 const dom=new JSDOM('<div id="classificationRuleList"></div><form id="movementForm"><input id="editSeriesId"><select id="fType"><option value="expense">Gasto</option></select><input id="fConcept"><input id="fAmount"><select id="fCategory"><option value="'+category+'">Gastos</option></select><select id="fExpenseScope"><option value=""></option><option value="business">Actividad</option></select></form>',{url:'https://example.test/',runScripts:'outside-only'});
 const w=dom.window,stored=[];Object.defineProperty(w.navigator,'onLine',{value:true});
 Object.assign(w,{people:[],accounts:[],categories:catalogs.categories.filter(x=>x.household_id===household),household:{id:household},domusRules:[],domusRulesReady:true,escapeHtml:s=>String(s),syncPrefFields:()=>{},sb:{rpc:async()=>({data:34}),from:()=>({insert:row=>({select:()=>({single:async()=>{stored.push({...row,id:'r'});return{data:{id:'r'}};}})}),update:()=>assert.fail('unexpected update')})},refreshAll:async()=>{w.domusRules=stored;}});
 try{
  vm.runInContext(source+'\n'+ui,dom.getInternalVMContext());w.DOMUSRuleUI.edit();
  const q=id=>w.document.getElementById(id);q('ruleName').value=rule.name;q('rc_category_id').value=category;q('rp_expense_scope').value='business';
  await q('ruleEditorForm').onsubmit({preventDefault(){},submitter:q('ruleEditorForm').querySelector('[type=submit]')});
  assert.equal(stored.length,1);assert.deepEqual({...stored[0].conditions},{category_id:category});assert.deepEqual({...stored[0].proposals},{expense_scope:'business'});
  w.DOMUSRuleUI.edit('r');assert.equal(q('rc_category_id').value,category);assert.equal(q('rp_expense_scope').value,'business');
  w.DOMUSRuleUI.manual();assert.match(q('rulePreview_manual').textContent,/Actividad económica/);q('rulePreview_manual').querySelector('button').click();assert.equal(q('fExpenseScope').value,'business');
 }finally{dom.window.close();}
});

test('database migration accepts same-household category and still rejects missing/foreign categories',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create schema auth;create function auth.uid() returns uuid language sql as $$select '${household}'::uuid$$;create table categories(id uuid primary key,household_id uuid);create table classification_rules(id uuid default gen_random_uuid(),household_id uuid,name text,conditions jsonb,proposals jsonb,revision int,updated_at timestamptz,updated_by uuid);insert into categories values('${category}','${household}'),('${foreign}','${other}');`);
  await db.exec(readFileSync('test/fixtures/classification-rule-validator-34.sql','utf8')+';create trigger validate_rule before insert or update on classification_rules for each row execute function domus3_validate_classification_rule();');
  const insert=id=>db.query("insert into classification_rules(household_id,name,conditions,proposals) values($1,'Regla',$2,$3) returning revision",[household,JSON.stringify({category_id:id}),JSON.stringify({expense_scope:'business'})]);
  await assert.rejects(()=>insert(category),/Unsupported rule field/);
  const migration=readFileSync('supabase/migrations/20261111193914_category_rule_condition.sql','utf8');await db.exec(migration);await db.exec(migration);
  assert.equal((await insert(category)).rows[0].revision,1);
  await assert.rejects(()=>insert(foreign),/outside household/);await assert.rejects(()=>insert('00000000-0000-4000-8000-000000000099'),/outside household/);
  assert.equal((await db.query('select count(*)::int n from classification_rules')).rows[0].n,1);
 }finally{await db.close();}
});
