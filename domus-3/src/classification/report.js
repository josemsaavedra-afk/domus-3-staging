// Report calculations share one filtered occurrence set; no persistence or inference.
(() => {
  const match = (value, selected) => !selected || selected === 'all' || (selected === 'none' ? value == null || value === '' : value === selected);
  const day = value => typeof value === 'string' ? value.slice(0,10) : `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
  function filter(rows, f = {}, search = () => []) {
    if (f.from && f.to && f.from > f.to) return [];
    return rows.filter(r => (!f.from || day(r.occurrenceDate) >= f.from) && (!f.to || day(r.occurrenceDate) <= f.to)
      && match(r.person_id,f.person) && match(r.payer_person_id,f.payer) && match(r.account_id,f.account)
      && match(r.activity_project_id,f.activity) && (!f.tag || f.tag==='all' || (f.tag==='none' ? !(r.tag_ids||[]).length : (r.tag_ids||[]).includes(f.tag))) && match(r.counterparty_id,f.counterparty) && match(r.category_id,f.category) && match(r.type,f.type) && match(r.status,f.mode)
      && match(r.expense_scope || 'unclassified',f.scope) && match(r.movement_role || 'standard',f.component)
      && (!f.text || [r.concept,r.invoice_number,r.counterparty,r.transport_number,r.notes,...search(r)].some(v => String(v || '').toLowerCase().includes(f.text.trim().toLowerCase()))));
  }
  function totals(rows) {
    let income=0,expense=0;
    for (const r of rows) { const cents=Math.round(Number(r.amount || 0)*100); if(r.type==='income')income+=cents;else if(r.type==='expense')expense+=cents; }
    return {count:rows.length,income:income/100,expense:expense/100,net:(income-expense)/100};
  }
  function groups(rows, key) {
    const map=new Map();
    for(const row of rows){const id=key(row) ?? null;if(!map.has(id))map.set(id,[]);map.get(id).push(row);}
    return [...map].map(([key,rows])=>({key,rows,totals:totals(rows)}));
  }
  // UTC calendar arithmetic: an inclusive N-day range stays N days across DST.
  const iso = date => date.toISOString().slice(0,10);
  function parseCalendar(value) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw Error('Selecciona fechas válidas.');
    const date=new Date(value+'T00:00:00Z');
    if(!Number.isFinite(+date) || iso(date)!==value) throw Error('Selecciona fechas válidas.');
    return date;
  }
  function period(kind, input) {
    let from,to,previousFrom,previousTo;
    if(kind==='month'){
      if(!/^\d{4}-\d{2}$/.test(input.month || ''))throw Error('Selecciona un mes válido.');
      from=parseCalendar(input.month+'-01');to=new Date(Date.UTC(from.getUTCFullYear(),from.getUTCMonth()+1,0));
      previousFrom=new Date(Date.UTC(from.getUTCFullYear(),from.getUTCMonth()-1,1));previousTo=new Date(+from-86400000);
    }else if(kind==='year'){
      if(!/^\d{4}$/.test(String(input.year)) || Number(input.year)<1001 || Number(input.year)>9999)throw Error('Selecciona un año válido.');
      const year=Number(input.year);from=new Date(Date.UTC(year,0,1));to=new Date(Date.UTC(year,11,31));previousFrom=new Date(Date.UTC(year-1,0,1));previousTo=new Date(Date.UTC(year-1,11,31));
    }else{
      from=parseCalendar(input.from);to=parseCalendar(input.to);
      if(from>to)throw Error('Desde debe ser anterior o igual a Hasta.');
      previousTo=new Date(+from-86400000);previousFrom=new Date(+from-(+to-+from+86400000));
    }
    const label=(a,b)=>kind==='month'?new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'UTC'}).format(a):kind==='year'?String(a.getUTCFullYear()):[a,b].map(d=>new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(d)).join(' – ');
    return {from:iso(from),to:iso(to),previous:{from:iso(previousFrom),to:iso(previousTo)},label:label(from,to),previousLabel:label(previousFrom,previousTo)};
  }
  function compare(rows, filters, selected, search) {
    const currentRows=filter(rows,{...filters,from:selected.from,to:selected.to},search);
    const previousRows=filter(rows,{...filters,...selected.previous},search);
    const current=totals(currentRows),previous=totals(previousRows),changes={};
    for(const key of ['income','expense','net']){
      const absolute=(Math.round(current[key]*100)-Math.round(previous[key]*100))/100;
      changes[key]={absolute,percent:previous[key]>0?absolute/previous[key]*100:null};
    }
    return {currentRows,previousRows,current,previous,changes};
  }
  window.DOMUSReport={filter,totals,groups,day,period,compare};
})();
