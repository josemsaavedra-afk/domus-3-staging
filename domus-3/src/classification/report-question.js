(function(){
 const el=id=>document.getElementById(id),fields={mode:'Mode',type:'Type',person:'Person',payer:'Payer',account:'Account',category:'Category',counterparty:'Counterparty',activity:'Activity',tag:'Tag',scope:'Scope',component:'Component',text:'Text'};
 let signature=null,interpretation='';
 const current=()=>JSON.stringify([...Object.values(fields),'PeriodType','Month','Year','From','To'].map(x=>el('report'+x)?.value));
 const qnorm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[¿?¡!,;:]/g,' ').replace(/\s+/g,' ').trim();
 const personInitials=name=>qnorm(name).split(' ').filter(Boolean).map(part=>part[0]).join('');
 function resolvePersonToken(token){
  const value=qnorm(token);if(!value)return null;
  const matches=(people||[]).filter(p=>qnorm(p.name)===value||personInitials(p.name)===value);
  return matches.length===1?matches[0]:null;
 }
 function dynamicQuestion(raw){
  const normalized=qnorm(raw),match=normalized.match(/\bhasta\s+(?:el\s+)?proximo\s+ingreso\s+habitual(?:\s+de\s+([a-z0-9 ]+?))?(?=\s*$)/);
  if(!match)return {question:raw,note:''};
  const token=(match[1]||'').trim(),person=token?resolvePersonToken(token):null;
  if(token&&!person)throw Error('No puedo identificar de forma inequívoca a «'+token+'». Escribe el nombre completo.');
  const today=startOfDay(new Date()),horizon=addDays(today,370),future=occurrencesBetween(today,horizon).filter(x=>x.status==='pending'&&habitualBusinessIncome(x)&&x.occurrenceDate>=today&&(!person||x.person_id===person.id)).sort((a,b)=>a.occurrenceDate-b.occurrenceDate);
  if(!future.length)throw Error('No hay un ingreso habitual pendiente'+(person?' de '+person.name:'')+' en los próximos 370 días.');
  const target=future[0],date=dateKey(target.occurrenceDate),personClause=person?' titular '+person.name:'';
  const stripped=normalized.replace(match[0],'').trim();
  return {question:(stripped+' previstos hasta '+date+personClause).trim(),note:'Horizonte dinámico: hasta '+fmt(target.occurrenceDate)+' ('+target.concept+(person?' · '+person.name:'')+').'};
 }
 function query(){
  const out=el('reportQuestionResult');let prepared;
  try{prepared=dynamicQuestion(el('reportQuestion').value)}catch(error){signature=null;out.textContent=error.message+' No se ha ejecutado la pregunta; el informe anterior permanece sin cambios.';return}
  const parsed=window.DOMUSReportLanguage.parse(prepared.question,{now:new Date(),householdId:household?.id,catalogs:{people,accounts,categories,counterparties:window.domusCounterparties||[],activities:window.domusLabels?.activities||[],tags:window.domusLabels?.tags||[]}});
  if(!parsed.ok){signature=null;out.textContent=parsed.error+' No se ha ejecutado la pregunta; el informe anterior permanece sin cambios.';return;}
  if(prepared.note)parsed.notes.unshift(prepared.note);
  populateReportFilters();
  for(const [key,suffix] of Object.entries(fields))el('report'+suffix).value=parsed.filters[key];
  el('reportPeriodType').value=parsed.period.kind;
  if(parsed.period.kind==='month')el('reportMonth').value=parsed.period.input.month;
  if(parsed.period.kind==='year')el('reportYear').value=parsed.period.input.year;
  el('reportFrom').value=parsed.selected.from;el('reportTo').value=parsed.selected.to;
  const names={person:'Titular económico',payer:'Pagador/cobrador',account:'Cuenta',category:'Categoría',counterparty:'Tercero',activity:'Actividad/proyecto',tag:'Etiqueta'};
  interpretation='Interpretación: '+({done:'Realizados',pending:'Previstos',all:'Realizados y previstos'}[parsed.filters.mode])+' · '+({income:'Ingresos',expense:'Gastos',all:'Ingresos y gastos / neto'}[parsed.filters.type])+' · '+parsed.selected.label+'. '+(parsed.resolved.length?parsed.resolved.map(r=>names[r.field]+': '+r.name).join(' · '):'Todo el hogar, sin filtros de maestros.')+' '+parsed.notes.join(' ');
  signature=null;renderReports();signature=current();out.textContent=interpretation+' Las cifras y el listado siguientes proceden de estos filtros; pulsa «Ver movimientos del informe» o un desglose para comprobarlos.';
 }
 function changed(){if(signature&&signature!==current()){signature=null;el('reportQuestionResult').textContent='Los filtros han cambiado. El informe refleja los filtros actuales; vuelve a consultar para interpretar la pregunta.';}}
 function rows(){openSummary('Movimientos del informe actual',reportSnapshot.rows);el('dayModalSummary').textContent=reportTotalsText(reportSnapshot.rows);}
 window.DOMUSReportQuestion={query,changed,rows};
})();
