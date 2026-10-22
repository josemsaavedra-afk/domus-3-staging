import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync('domus-3/index.html','utf8');
test('short entry synchronizes document and actual dates, pending keeps actual date empty',()=>{
 const nodes={movementForm:{classList:{contains:()=>true}},fDocumentDate:{value:''},fActualDate:{value:''},fDate:{value:'2026-10-22'},fStatus:{value:'done'}};
 const context={document:{getElementById:id=>nodes[id]}};vm.createContext(context);
 const source=html.slice(html.indexOf('function syncSimpleMovementDates(){'),html.indexOf('function openForm('));vm.runInContext(source,context);
 context.syncSimpleMovementDates();assert.equal(nodes.fActualDate.value,'2026-10-22');assert.equal(nodes.fDocumentDate.value,'2026-10-22');
 nodes.fStatus.value='pending';context.syncSimpleMovementDates();assert.equal(nodes.fActualDate.value,'');
 nodes.movementForm.classList.contains=()=>false;nodes.fDocumentDate.value='2026-08-31';context.syncSimpleMovementDates();assert.equal(nodes.fDocumentDate.value,'2026-08-31');
});
test('Home renders without removed balance nodes and limits upcoming items to seven days',()=>{
 const nodes=Object.fromEntries(['todayActionList','homeAttentionStrip','lateTotal','lateCount','priorityInfo','priorityList','incomeList'].map(id=>[id,{classList:{toggle(){}},textContent:'',innerHTML:''}]));
 const today=new Date('2026-10-22T12:00:00'),pending=[{id:'tomorrow',type:'expense',occurrenceDate:new Date('2026-10-23T12:00:00'),amount:20},{id:'later',type:'expense',occurrenceDate:new Date('2026-11-03T12:00:00'),amount:50}];
 const c={document:{getElementById:id=>{assert.ok(nodes[id],id);return nodes[id]}},user:{id:'u'},household:{id:'h'},treasuryLoadedContext:'u|h',dashboardBuckets:()=>({today,pending,late:[],dueActions:[]}),amountOf:()=>0,euro:String,renderItem:x=>x.id,renderMilestones(){},addDays:(d,n)=>new Date(+d+n*86400000)};vm.createContext(c);
 vm.runInContext(html.slice(html.indexOf('function renderDashboard(){'),html.indexOf('function monthKey(')),c);c.renderDashboard();assert.equal(nodes.priorityList.innerHTML,'tomorrow');assert.ok(!nodes.priorityList.innerHTML.includes('later'));
});
