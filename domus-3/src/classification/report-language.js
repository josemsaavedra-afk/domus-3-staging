// Controlled Spanish -> existing report filters. No totals, persistence or classification rules.
(() => {
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[¿?¡!,;:]/g,' ').replace(/\s+/g,' ').trim();
 const months='enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(' '),monthRE='(?:'+months.join('|')+'|setiembre)';
 const iso=d=>d.toISOString().slice(0,10),utc=(y,m,d)=>new Date(Date.UTC(y,m,d)),shift=(d,n)=>new Date(+d+n*86400000);
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 function parse(question,{now=new Date(),householdId,catalogs={}}={}){
  try{
   if(!householdId)throw Error('Selecciona un hogar antes de consultar.');
   let text=' '+norm(question)+' ';if(text.trim().length>1000)throw Error('La pregunta es demasiado larga. Formula una consulta cada vez.');
   if(!text.trim())throw Error('Escribe una pregunta sobre ingresos, gastos o movimientos.');
   const today=utc(now.getFullYear(),now.getMonth(),now.getDate()),year=today.getUTCFullYear(),month=today.getUTCMonth();
   const filters={mode:'done',type:'all',person:'all',payer:'all',account:'all',category:'all',counterparty:'all',activity:'all',tag:'all',scope:'all',component:'all',text:''},resolved=[],notes=[];
   const dimensions={people:'person',accounts:'account',categories:'category',counterparties:'counterparty',activities:'activity',tags:'tag'};
   const candidates=[];
   for(const [table,field] of Object.entries(dimensions))for(const row of catalogs[table]||[]){
    if(row.household_id!==householdId)continue;
    const names=[row.name,...(table==='counterparties'?row.aliases||[]:[]),...(table==='categories'?[window.DOMUSClassification.categoryLabel(row)]:[])];
    for(const name of new Set(names.map(norm).filter(Boolean))){const re=new RegExp('(?<![a-z0-9])'+escape(name)+'(?![a-z0-9])','g');for(const match of text.matchAll(re))candidates.push({start:match.index,end:match.index+name.length,term:name,field,id:row.id,name:table==='categories'?window.DOMUSClassification.categoryLabel(row):row.name});}
   }
   candidates.sort((a,b)=>a.start-b.start||(b.end-b.start)-(a.end-a.start));let consumed=-1;
   for(let i=0;i<candidates.length;i++){
    const c=candidates[i];if(c.start<consumed)continue;
    const same=candidates.filter(x=>x.start===c.start&&x.end===c.end),prefix=text.slice(0,c.start);
    const explicitMatch=prefix.match(/(?:\b(categoria|tercero|proveedor|comercio|actividad|proyecto|etiqueta|cuenta|titular|propietario|pagador|cobrador)\s+(?:de\s+)?)["']?$/);const explicit=explicitMatch?.[1];
    const payerContext=/\b(?:pago|paga|pagaron|pagados?|cobro|cobra|cobraron|cobrados?)\s+(?:por\s+)?$/.test(prefix);
    const hint={categoria:'category',tercero:'counterparty',proveedor:'counterparty',comercio:'counterparty',actividad:'activity',proyecto:'activity',etiqueta:'tag',cuenta:'account',titular:'person',propietario:'person',pagador:'person',cobrador:'person'}[explicit]||(payerContext?'person':/\bdesde\s+$/.test(prefix)?'account':null);
    // Calendar/grammar words used as names require their dimension to be explicit.
    if(!hint&&new RegExp('^(?:'+monthRE+'|hoy|ayer|esta semana|este mes|mes anterior|este ano|ano anterior|ingresos y gastos|realizados y previstos|ingresos|gastos|pagos|saldo|neto|previstos|realizados)$').test(c.term))continue;
    const choices=[...new Map(same.filter(x=>!hint||x.field===hint).map(x=>[x.field+'|'+x.id,x])).values()];
    if(choices.length!==1)throw Error('Aclara «'+c.term+'»: '+(choices.length?choices.map(x=>({person:'persona',category:'categoría',counterparty:'tercero',activity:'proyecto',tag:'etiqueta',account:'cuenta'}[x.field])+': '+x.name).join(' / '):'no coincide con el maestro indicado')+'.');
    const chosen=choices[0];let field=chosen.field;if(field==='person'&&!hint&&/\bpor\s+$/.test(prefix))throw Error('Aclara «'+c.term+'»: indica titular o pagador/cobrador.');
    if(field==='person'&&(/\b(?:pagador|cobrador)\s*$/.test(prefix)||/\b(?:pago|paga|pagaron|pagados?|cobro|cobra|cobraron|cobrados?)\s+(?:por\s+)?$/.test(prefix)))field='payer';
    if(filters[field]!=='all'&&filters[field]!==chosen.id)throw Error('Aclara «'+c.term+'»: solo se admite un filtro de '+field+' por consulta.');
    filters[field]=chosen.id;resolved.push({...chosen,field,maskStart:explicitMatch?.index??chosen.start});consumed=c.end;
   }
   // Mask all resolved names so their words cannot alter intent or dates.
   for(const r of [...resolved].sort((a,b)=>b.start-a.start))text=text.slice(0,r.maskStart)+' '.repeat(r.end-r.maskStart)+text.slice(r.end);
   text=text.replace(/\s+/g,' ');
   const financial=/\b(?:ingresos?|ingresado|ingresamos|cobros?|cobrado|cobrados|gastos?|gaste|gasto|gastado|gastamos|pagos?|pago|pagado|pagados|saldo|neto|dinero|movimientos?|previsiones?|previstos?|previstas?|pendientes?)\b/.test(text);
   if(!financial)throw Error('Pregunta no soportada. Pregunta por ingresos, gastos, neto o movimientos.');
   const income=/\b(?:ingresos?|ingresado|ingresamos|cobros?|cobrado|cobrados)\b/.test(text),expense=/\b(?:gastos?|gaste|gasto|gastado|gastamos|pagos?|pago|pagado|pagados)\b/.test(text),net=/\b(?:saldo|neto)\b/.test(text),need=/\bnecesito\b/.test(text);
   filters.type=net||income&&expense?'all':expense||need?'expense':income?'income':'all';
   if(net)notes.push('Saldo/neto significa ingresos menos gastos del período, no saldo bancario.');
   const done=/\b(?:realizados?|realizadas?)\b/.test(text),pending=/\b(?:previstos?|previstas?|previsiones?|pendientes?)\b/.test(text);
   if(done&&pending&&!/\by\b|\bambos\b/.test(text))throw Error('Aclara si quieres realizados, previstos o ambos.');
   filters.mode=done&&pending||/\bambos\b/.test(text)?'all':pending||!done&&/\b(?:proximos|hasta|necesito)\b/.test(text)?'pending':'done';
   if(need){if(done)throw Error('Para «dinero necesito» indica un período previsto.');notes.push('«Dinero necesito» se interpreta como gastos previstos del intervalo; no como saldo bancario disponible.');}
   const future=filters.mode!=='done';let period=null;
   const set=(kind,input)=>{if(period)throw Error('Hay varios períodos. Indica uno solo.');period={kind,input};};
   const remove=(re,fn)=>{text=text.replace(re,(...args)=>{fn(...args);return ' ';});};
   const valid=(y,m,d)=>{const v=utc(y,m,d);if(y<1001||y>9999||v.getUTCFullYear()!==y||v.getUTCMonth()!==m||v.getUTCDate()!==d)throw Error('La fecha indicada no existe.');return v;};
   const monthIndex=s=>s==='setiembre'?8:months.indexOf(s);
   const atom='(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/.]\\d{1,2}(?:[/.]\\d{4})?|\\d{1,2}(?:\\s+de\\s+'+monthRE+'(?:\\s+(?:de\\s+)?\\d{4})?)?)';
   function date(s,baseMonth=month,baseYear=year){let m;if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/)))return {d:valid(+m[1],+m[2]-1,+m[3]),explicit:true};if((m=s.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{4}))?$/)))return {d:valid(+(m[3]||baseYear),+m[2]-1,+m[1]),explicit:true};if((m=s.match(new RegExp('^(\\d{1,2})(?:\\s+de\\s+('+monthRE+')(?:\\s+(?:de\\s+)?(\\d{4}))?)?$'))))return {d:valid(+(m[3]||baseYear),m[2]?monthIndex(m[2]):baseMonth,+m[1]),explicit:!!m[2]};throw Error('No reconozco la fecha.');}
   remove(new RegExp('\\b(?:entre\\s+(?:el\\s+)?|del?\\s+)('+atom+')\\s+(?:y|al?)\\s+(?:el\\s+)?('+atom+')(?![\\d/.-])','g'),(_,a,b)=>{let end=date(b),start=date(a,end.d.getUTCMonth(),end.d.getUTCFullYear());if(!start.explicit&&!end.explicit&&future&&end.d<today){const next=utc(year,month+1,1);end=date(b,next.getUTCMonth(),next.getUTCFullYear());start=date(a,next.getUTCMonth(),next.getUTCFullYear());}set('custom',{from:iso(start.d),to:iso(end.d)});});
   remove(/\bproximos\s+(\d+)\s+dias\b/g,(_,n)=>{n=Number(n);if(n<1||n>3660)throw Error('Indica entre 1 y 3660 días.');set('custom',{from:iso(today),to:iso(shift(today,n-1))});notes.push('Los próximos '+n+' días incluyen hoy.');});
   remove(/\bhasta\s+(?:el\s+)?(?:fin|final)\s+de\s+(?:este\s+|el\s+)?(mes|ano)\b/g,(_,unit)=>{set('custom',{from:iso(future?today:utc(year,unit==='mes'?month:0,1)),to:iso(unit==='mes'?utc(year,month+1,0):utc(year,11,31))});});
   remove(new RegExp('\\bhasta\\s+(?:el\\s+)?(?:dia\\s+)?('+atom+')(?![\\d/.-])','g'),(_,a)=>{let end;if(/^\d{1,2}$/.test(a)&&future){const day=Number(a);if(day<1||day>31)throw Error('La fecha indicada no existe.');for(let offset=0;offset<13;offset++){const candidate=utc(year,month+offset,day),first=utc(year,month+offset,1);if(candidate.getUTCMonth()===first.getUTCMonth()&&candidate>=today){end={d:candidate};break}}}else end=date(a);set('custom',{from:iso(future?today:utc(end.d.getUTCFullYear(),end.d.getUTCMonth(),1)),to:iso(end.d)});});
   remove(/\b(hoy|ayer|esta semana|este mes|mes anterior|este ano|ano anterior)\b/g,(_,unit)=>{if(unit==='hoy'||unit==='ayer'){const d=shift(today,unit==='ayer'?-1:0);set('custom',{from:iso(d),to:iso(d)})}else if(unit==='esta semana'){const start=shift(today,-((today.getUTCDay()+6)%7));set('custom',{from:iso(start),to:iso(shift(start,6))})}else if(unit.includes('mes')){const d=utc(year,month-(unit==='mes anterior'?1:0),1);set('month',{month:iso(d).slice(0,7)})}else set('year',{year:year-(unit==='ano anterior'?1:0)});});
   remove(new RegExp('\\b('+monthRE+')(?:\\s+(?:de\\s+)?(\\d{4}))?\\b','g'),(_,name,y)=>{set('month',{month:iso(valid(+(y||year),monthIndex(name),1)).slice(0,7)});if(!y)notes.push('Mes sin año: se utiliza '+year+'.');});
   remove(/\b(?:ano\s+)(\d{4})\b/g,(_,y)=>set('year',{year:+y}));
   const leftover=text.replace(/\b(?:cuanto|cuanta|cuantos|cuantas|que|cuales|muestrame|mostrar|dime|ver|hemos|he|ha|han|tengo|tenemos|tiene|necesito|dinero|ingresos?|ingresado|ingresamos|cobros?|cobrado|cobrados|gastos?|gaste|gasto|gastado|gastamos|pagos?|pago|pagado|pagados|saldo|neto|movimientos?|previsiones?|previstos?|previstas?|pendientes?|realizados?|realizadas?|ambos|de|del|en|el|la|los|las|un|una|por|desde|con|y|para)\b/g,' ').replace(/["'.]/g,' ').trim();
   if(leftover)throw Error('No reconozco «'+leftover.replace(/\s+/g,' ')+'». Aclara el nombre del maestro o reformula la pregunta.');
   if(!period){period={kind:'month',input:{month:iso(today).slice(0,7)}};notes.push('Sin período explícito: este mes.');}
   const selected=window.DOMUSReport.period(period.kind,period.input);
   if(selected.from.slice(0,4)<'1001'||selected.to.slice(0,4)>'9999')throw Error('Período fuera de rango.');
   return {ok:true,filters,period,selected,resolved,notes,list:/\b(?:que|cuales|muestrame|mostrar|ver)\b/.test(norm(question))};
  }catch(error){return {ok:false,error:error.message};}
 }
 window.DOMUSReportLanguage={parse};
})();
