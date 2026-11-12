// Visible, editable defaults for this statement; never classify its economic scope.
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const own=(rows,householdId)=>(rows||[]).filter(row=>row.household_id===householdId&&row.active!==false);
const names=row=>[row.name,...(Array.isArray(row.aliases)?row.aliases:[])].map(norm).filter(Boolean);
export function proposeStatementDefaults({account,people=[],paymentMethods=[],householdId,fileName='',rows=[]}) {
 if(!account||account.household_id!==householdId)return {};
 const accountName=' '+norm(account.name)+' ';
 const matches=own(people,householdId).filter(person=>names(person).some(name=>name.length>=3&&accountName.includes(' '+name+' ')));
 const person=matches.length===1?matches[0]:null;
 const cardFile=/\b(tarjeta|tarjetas|card|cards)\b/.test(norm(fileName));
 const cardRows=rows.length>0&&rows.every(row=>/\*{3,}\d{4}|\btarjeta\b/i.test(row.concept||''));
 const methods=own(paymentMethods,householdId).filter(method=>names(method).some(name=>/\b(tarjeta|card)\b/.test(name)));
 const generic=methods.filter(method=>names(method).some(name=>['tarjeta','card'].includes(name)));
 const nonCardRows=rows.some(row=>/\b(bizum|transferencia|domiciliacion|adeudo|efectivo|cajero)\b/.test(norm(row.concept)));
 const method=(cardFile||cardRows)&&!nonCardRows?(generic.length===1?generic[0]:methods.length===1?methods[0]:null):null;
 return {personId:person?.id||'',payerPersonId:person?.id||'',paymentMethodId:method?.id||''};
}
export function validateStatementDefaults(defaults,{people=[],paymentMethods=[],householdId}) {
 const result={};
 for(const [key,rows] of [['personId',people],['payerPersonId',people],['paymentMethodId',paymentMethods]]){
  const id=defaults?.[key];if(!id)continue;
  if(!own(rows,householdId).some(row=>row.id===id))throw Error('Un dato del extracto ya no pertenece a las opciones activas de este hogar.');
  result[key]=id;
 }
 return result;
}
