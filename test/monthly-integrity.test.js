import test from 'node:test';
import assert from 'node:assert/strict';
import {createTreasurySnapshot} from '../domus-3/src/treasury/snapshot.js';
import {createTreasuryViewModel,monthlyTreasury} from '../domus-3/src/treasury/view-model.js';
const movement=(id,extra={})=>({id,household_id:'h',type:'income',concept:'Same provider',amount:3000,recurrence:'monthly',start_date:'2026-09-25',...extra});
const snapshot=(series,states=[])=>createTreasurySnapshot({householdId:'h',userId:'u',asOf:'2026-10-21',series,states});
test('closed segment excludes stale pending states but preserves explicitly moved October obligation',()=>{
 const rows=snapshot([movement('old',{recurrence_end:'2026-10-24'})],[{series_id:'old',occurrence_date:'2026-10-25',rescheduled_date:'2026-10-23',status:'pending'},{series_id:'old',occurrence_date:'2026-11-25',status:'pending'}]).rows;
 assert.equal(rows.filter(r=>r.rescheduled_date==='2026-10-23').length,1);
 assert.ok(!rows.some(r=>r.occurrence_date==='2026-11-25'));
});
test('targeted cancellation preserves following months and independent invoice of equal amount',()=>{
 const rows=snapshot([movement('old',{recurrence_end:'2026-10-25'}),movement('next',{start_date:'2026-10-26',recurrence_end:'2027-03-25'}),movement('independent',{recurrence:'none',start_date:'2026-10-09',invoice_number:'OTHER'})],[{series_id:'old',occurrence_date:'2026-10-25',rescheduled_date:'2026-10-23',status:'pending'},{series_id:'next',occurrence_date:'2026-10-26',status:'cancelled'}]).rows;
 const vm=createTreasuryViewModel(rows,[],'2026-10-21'),oct=monthlyTreasury(vm);
 assert.equal(oct.plannedRows.filter(r=>r.seriesId!=='independent').length,1);
 assert.equal(oct.planned.income,6000);
 assert.ok(vm.open.some(r=>r.seriesId==='next'&&r.date==='2026-11-26'));
});
test('monthly result excludes prior overdue 29.74 and does not require a bank balance',()=>{
 const rows=[movement('income',{recurrence:'none',start_date:'2026-10-23',amount:100}),movement('expense',{type:'expense',recurrence:'none',start_date:'2026-10-20',amount:40}),movement('overdue',{type:'expense',recurrence:'none',start_date:'2026-09-18',amount:29.74}),movement('foreign',{household_id:'other'})];
 const states=[{series_id:'expense',occurrence_date:'2026-10-20',status:'done',actual_date:'2026-10-20'}];
 const vm=createTreasuryViewModel(snapshot(rows,states).rows,[],'2026-10-21'),m=monthlyTreasury(vm);
 assert.equal(m.planned.net,60);assert.equal(m.realized.net,-40);assert.equal(m.pending.expense,0);assert.equal(m.pending.income,100);
 assert.ok(vm.open.some(r=>r.amount===29.74));assert.ok(!vm.all.some(r=>r.seriesId==='foreign'));
 const november=monthlyTreasury(vm,'2026-11');assert.equal(november.planned.count,0);
});
test('actual payment date changes its economic month and is no longer pending after reload',()=>{
 const input=[movement('payment',{recurrence:'none',type:'expense',start_date:'2026-09-30',amount:10})],states=[{series_id:'payment',occurrence_date:'2026-09-30',status:'done',actual_date:'2026-10-02'}];
 for(let reload=0;reload<2;reload++){
  const vm=createTreasuryViewModel(snapshot(input,states).rows,[],'2026-10-21');
  assert.equal(monthlyTreasury(vm).realized.expense,10);assert.equal(monthlyTreasury(vm,'2026-09').planned.expense,0);assert.equal(vm.open.length,0);
 }
});
test('duplicate occurrence states fail explicitly instead of silently selecting one',()=>{
 assert.throws(()=>snapshot([movement('s')],[{series_id:'s',occurrence_date:'2026-10-25'},{series_id:'s',occurrence_date:'2026-10-25'}]),/Estado duplicado/);
});
