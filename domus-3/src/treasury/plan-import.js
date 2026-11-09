/* Importador de planes v1. No crea ni modifica movimientos de Tesorería. */
(function(){
'use strict';
const marker=id=>'[DOMUS-IMPORT:'+id+']';
const itemMarker=id=>'[DOMUS-ITEM:'+id+']';
let staged=null;
const $=id=>document.getElementById(id);
function message(text,error=false){const el=$('planImportMessage');if(el){el.textContent=text;el.className=error?'msg error':'msg info';}}
function validate(raw){
 if(!raw||raw.schema_version!=='domus.plan-import.v1'||!/^[-\w:.]{8,150}$/.test(raw.external_id||''))throw Error('Formato o identificador externo no válido');
 if(!raw.title||raw.title.length>160||!Array.isArray(raw.items)||raw.items.length<1||raw.items.length>150)throw Error('Nombre o partidas no válidos');
 if(!/^\d{4}-\d\d-\d\d$/.test(raw.start_date)||!/^\d{4}-\d\d-\d\d$/.test(raw.end_date)||raw.start_date>raw.end_date)throw Error('Fechas inválidas');
 if(!Number.isSafeInteger(raw.budget_limit_cents)||raw.budget_limit_cents<0)throw Error('Presupuesto inválido');
 const ids=new Set();
 for(const item of raw.items){
  if(!item.id||!/^[\w-]{1,80}$/.test(item.id)||ids.has(item.id)||!item.description||item.description.length>240||!Number.isSafeInteger(item.amount_cents)||item.amount_cents<0||!['planned','reserved','paid','estimate'].includes(item.status)||item.date&&!/^\d{4}-\d\d-\d\d$/.test(item.date))throw Error('Partida inválida o repetida: '+(item.id||'?'));
  ids.add(item.id);
 }
 const total=raw.items.reduce((n,x)=>n+x.amount_cents,0);
 if(!Number.isSafeInteger(total))throw Error('Suma fuera de rango');
 return total;
}
function preview(){
 try{
  const raw=JSON.parse($('planImportJson').value);const total=validate(raw);staged=raw;
  const fmt=n=>(n/100).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  const container=$('planImportPreview');container.textContent='';
  const title=document.createElement('strong');title.textContent=raw.title;container.append(title);
  const summary=document.createElement('p');summary.textContent=raw.items.length+' partidas · Presupuesto '+fmt(raw.budget_limit_cents)+' · Previsión '+fmt(total)+' · Margen '+fmt(raw.budget_limit_cents-total);container.append(summary);
  const list=document.createElement('ul');for(const item of raw.items){const li=document.createElement('li');li.textContent=item.description+' · '+fmt(item.amount_cents)+' · '+item.status;list.append(li)}container.append(list);
  $('planImportConfirm').disabled=false;message('Previsualización lista. Ningún dato se ha guardado.');
 }catch(e){staged=null;$('planImportConfirm').disabled=true;$('planImportPreview').textContent='';message('No se puede importar: '+e.message,true);}
}
async function confirmImport(){
 if(!staged||!household?.id||!user?.id||!sb){message('Inicia sesión y selecciona un hogar.',true);return;}
 const raw=staged;const total=validate(raw);const button=$('planImportConfirm');button.disabled=true;
 try{
  const key=marker(raw.external_id);
  const {data:plans,error:readError}=await sb.from('budget_plans').select('*').eq('household_id',household.id);
  if(readError)throw readError;
  let plan=(plans||[]).find(p=>(p.notes||'').includes(key));
  if(plan&&plan.status!=='active')throw Error('El plan importado está inactivo; no se reactivará automáticamente.');
  if(plan&&Number(plan.target_amount)!==raw.budget_limit_cents/100)throw Error('El presupuesto existente fue modificado. Revisión manual necesaria.');
  if(!plan){
   const notes=[key,'Importado desde ChatGPT; no equivale a gasto real.',...(raw.notes||[])].join('\n').slice(0,4000);
   const {data,error}=await sb.from('budget_plans').insert({household_id:household.id,name:raw.title,start_date:raw.start_date,end_date:raw.end_date,target_amount:raw.budget_limit_cents/100,status:'active',notes,created_by:user.id,updated_by:user.id}).select('*').single();
   if(error)throw error;plan=data;
  }
  const {data:existing,error:itemsError}=await sb.from('budget_items').select('*').eq('household_id',household.id).eq('plan_id',plan.id);
  if(itemsError)throw itemsError;
  let added=0,unchanged=0;
  for(const item of raw.items){
   const label={planned:'Previsto',reserved:'Reservado (pago sin confirmar)',paid:'Pagado (conciliar)',estimate:'Estimación'}[item.status];
   const concept=item.description;
   const itemTag=itemMarker(item.id);
   const itemNotes='Origen: '+marker(raw.external_id)+' · '+itemTag+' · Estado: '+label;
   const prior=(existing||[]).find(x=>(x.notes||'').includes(itemTag));
   if(prior){
    if(prior.status!=='planned'||Math.round(Number(prior.amount)*100)!==item.amount_cents||prior.concept!==concept)throw Error('Partida existente modificada: '+item.id+'. No se sobrescribe.');
    unchanged++;continue;
   }
   const {error}=await sb.from('budget_items').insert({household_id:household.id,plan_id:plan.id,movement_type:'expense',concept,notes:itemNotes,amount:item.amount_cents/100,planned_date:item.date||null,expense_scope:'domestic',status:'planned',created_by:user.id,updated_by:user.id});
   if(error)throw error;added++;
  }
  message('Importación completada: '+added+' partidas nuevas y '+unchanged+' ya existentes. No se han creado movimientos.');
  staged=null;$('planImportJson').value='';$('planImportPreview').textContent='';
  await refreshAll();
 }catch(e){message('Importación incompleta o bloqueada: '+(e.message||String(e))+'. Puedes reintentar sin duplicar las partidas ya creadas.',true);}
 finally{button.disabled=!staged;}
}
window.DOMUSPlanImport={preview,confirmImport};
})();
