import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTreasuryViewModel,monthlyTreasuryBreakdowns} from '../domus-3/src/treasury/view-model.js';
const row=(id,type,date,status='pending',amount=10,extra={})=>({id,type,start_date:date,occurrence_date:date,status,amount,...extra});
test('October drill-downs exclude January history and future January and never mix cash states',()=>{
 const vm=createTreasuryViewModel([
  row('jan-history','income','2026-01-10','done',1000),row('jan-overdue','expense','2026-01-20'),
  row('jan-future','income','2027-01-10','pending',2000),row('oct-pending','income','2026-10-23','pending',3000),
  row('oct-paid','income','2026-10-01','done',50),row('oct-payable','expense','2026-10-30','pending',40),
  row('oct-expense','expense','2026-10-02','done',20),row('sept','income','2026-09-30','done',100)
 ],[],'2026-10-21');
 const d=monthlyTreasuryBreakdowns(vm);
 assert.deepEqual(Object.fromEntries(Object.entries(d).map(([key,rows])=>[key,rows.map(r=>r.id)])),{
  monthIncomePending:['oct-pending'],monthIncomeReal:['oct-paid'],monthExpensePending:['oct-payable'],monthExpenseReal:['oct-expense']});
 assert.equal(new Set(Object.values(d).flat().map(r=>r.id)).size,4);
 assert.deepEqual(monthlyTreasuryBreakdowns(vm,'2027-01').monthIncomePending.map(r=>r.id),['jan-future']);
});
test('original January invoice collected in October belongs only to October collected with original date retained',()=>{
 const vm=createTreasuryViewModel([row('late','income','2026-01-10','done',25,{actual_date:'2026-10-03'})],[],'2026-10-21');
 const d=monthlyTreasuryBreakdowns(vm);assert.equal(d.monthIncomeReal[0].date,'2026-10-03');assert.equal(d.monthIncomeReal[0].originalDate,'2026-01-10');assert.equal(d.monthIncomePending.length,0);assert.equal(monthlyTreasuryBreakdowns(vm,'2026-01').monthIncomeReal.length,0);
});
test('Treasury binds four separate monthly controls and shows original date when it differs',()=>{
 const s=readFileSync('domus-3/src/treasury/ui.js','utf8');
 for(const key of ['monthIncomePending','monthIncomeReal','monthExpensePending','monthExpenseReal'])assert.match(s,new RegExp('data-treasury-operational="'+key+'"'));
 assert.match(s,/\.\.\.monthlyTreasuryBreakdowns\(vm\)/);assert.ok(!s.includes('previstos y cobrados'));assert.ok(!s.includes('previstos y pagados'));assert.match(s,/Fecha prevista original/);
});
