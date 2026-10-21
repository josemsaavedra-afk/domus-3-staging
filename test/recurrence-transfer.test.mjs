import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('domus-3/index.html','utf8');
const source=html.slice(html.indexOf('async function saveFutureRecurrence('),html.indexOf("document.getElementById('movementForm').onsubmit="));
async function exercise(fail=false){
 const old={id:'original',amount:3000,start_date:'2026-09-25',recurrence:'monthly',recurrence_end:'2027-03-25',treasury_revision:1},series=[{...old}];
 const states=[{series_id:'original',occurrence_date:'2026-10-25',status:'pending',rescheduled_date:'2026-10-23'},{series_id:'original',occurrence_date:'2026-11-25',status:'done',actual_date:'2026-11-25'}];
 const initial=structuredClone(states);let command=null;
 const context={Date,Number,Error,crypto:{randomUUID:()=> 'successor'},user:{id:'u'},series,states,
  parseDate:s=>new Date(s+'T12:00:00'),dateKey:d=>d.toISOString().slice(0,10),addDays:(d,n)=>new Date(+d+n*86400000),friendlyCloudError:e=>e.message,
  findOccurrence:()=>({amount:3000,state:states[0]}),document:{getElementById:id=>({value:id==='fActualDate'?'':'2026-10-25'})},
  navigator:{onLine:true},requireLabelsSchema:async()=>{},
  sb:{rpc:async(name,args)=>{assert.equal(name,'domus3_save_recurrence_segment');command=args;return fail?{error:Error('network failure')}:{data:args.p_target_id}}}

 };vm.createContext(context);vm.runInContext(source,context);
 const run=()=>context.saveFutureRecurrence(old,{...old},'2026-10-25','2026-10-26','pending');
 if(fail){await assert.rejects(run,/network failure/);assert.deepEqual(states,initial);assert.deepEqual(series,[old]);}
 else {await run();assert.equal(command.p_source_id,'original');assert.equal(command.p_expected_revision,1);assert.equal(command.p_states.filter(r=>r.status==='done').length,1);assert.equal(command.p_states.find(r=>r.status==='done').actual_date,'2026-11-25');assert.equal(command.p_expected_states.length,2);assert.deepEqual(states,initial);assert.deepEqual(series,[old]);}

}
test('future edit submits the full transfer as one revision-checked RPC',()=>exercise());
test('failed RPC never mutates local series or falls back to partial client writes',()=>exercise(true));
