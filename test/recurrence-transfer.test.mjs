import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('domus-3/index.html','utf8');
const source=html.slice(html.indexOf('async function saveFutureRecurrence('),html.indexOf("document.getElementById('movementForm').onsubmit="));
async function exercise(fail=false){
 const old={id:'original',amount:3000,start_date:'2026-09-25',recurrence:'monthly',recurrence_end:'2027-03-25'},series=[{...old}];
 const states=[{series_id:'original',occurrence_date:'2026-10-25',status:'pending',rescheduled_date:'2026-10-23'},{series_id:'original',occurrence_date:'2026-11-25',status:'done',actual_date:'2026-11-25'}];
 const initial=structuredClone(states);let failed=false;
 const context={Date,Number,Error,crypto:{randomUUID:()=> 'successor'},user:{id:'u'},series,states,
  parseDate:s=>new Date(s+'T12:00:00'),dateKey:d=>d.toISOString().slice(0,10),addDays:(d,n)=>new Date(+d+n*86400000),friendlyCloudError:e=>e.message,
  findOccurrence:()=>({amount:3000,state:states[0]}),document:{getElementById:id=>({value:id==='fActualDate'?'':'2026-10-25'})},
  insertSeriesSafely:async row=>{series.push({...row});return row},
  updateSeriesSafely:async(id,patch)=>Object.assign(series.find(r=>r.id===id),patch),
  upsertState:async row=>{if(fail&&!failed&&row.series_id==='original'&&row.status==='cancelled'){failed=true;throw Error('network failure')};const found=states.find(r=>r.series_id===row.series_id&&r.occurrence_date===row.occurrence_date);if(found)Object.assign(found,row);else states.push({...row})},
  deleteWhereSafely:async(table,where)=>{const list=table==='movement_series'?series:states;for(let i=list.length-1;i>=0;i--)if(Object.entries(where).every(([k,v])=>list[i][k]===v))list.splice(i,1)}
 };vm.createContext(context);vm.runInContext(source,context);
 const run=()=>context.saveFutureRecurrence(old,{...old},'2026-10-25','2026-10-26','pending');
 if(fail){await assert.rejects(run,/network failure/);assert.deepEqual(states,initial);assert.deepEqual(series,[{...old,updated_by:"u"}]);}
 else {await run();assert.equal(series[0].recurrence_end,'2026-10-24');assert.equal(states.filter(r=>r.series_id==='original'&&r.status!=='cancelled').length,0);assert.equal(states.filter(r=>r.series_id==='successor'&&r.status==='done').length,1);assert.equal(states.find(r=>r.series_id==='successor'&&r.status==='done').actual_date,'2026-11-25');}
}
test('future edit transfers rescheduled and realized exceptions without retaining active copies',()=>exercise());
test('future edit restores original segment and exceptions when transfer fails',()=>exercise(true));
