(function(){
 const el=id=>document.getElementById(id),fields={mode:'Mode',type:'Type',person:'Person',payer:'Payer',account:'Account',category:'Category',counterparty:'Counterparty',activity:'Activity',tag:'Tag',scope:'Scope',component:'Component',text:'Text'};
 let signature=null,interpretation='';
 const current=()=>JSON.stringify([...Object.values(fields),'PeriodType','Month','Year','From','To'].map(x=>el('report'+x)?.value));
 function query(){
  const out=el('reportQuestionResult'),parsed=window.DOMUSReportLanguage.parse(el('reportQuestion').value,{now:new Date(),householdId:household?.id,catalogs:{people,accounts,categories,counterparties:window.domusCounterparties||[],activities:window.domusLabels?.activities||[],tags:window.domusLabels?.tags||[]}});
  if(!parsed.ok){signature=null;out.textContent=parsed.error+' No se ha ejecutado la pregunta; el informe anterior permanece sin cambios.';return;}
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
