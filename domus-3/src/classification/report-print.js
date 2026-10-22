// Presentation only. No filtering, aggregation or financial calculation here.
(() => {
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(v);
  const percent=v=>v===null?'—':new Intl.NumberFormat('es-ES',{maximumFractionDigits:1,signDisplay:'exceptZero'}).format(v)+' %';
  const share=(value,income)=>income>0?new Intl.NumberFormat('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1}).format(value/income*100)+' %':'—';
  function documentHTML({period,totals,previous,changes,rows,filters,breakdowns}){
    const kpis=[['income','Ingresos'],['expense','Gastos'],['net','Balance']].map(([k,label])=>`<tr><th scope="row">${label}</th><td class="amount">${money(totals[k])}</td><td class="amount share">${share(totals[k],totals.income)}</td><td class="compare-start amount">${money(previous[k])}</td><td class="amount share">${share(previous[k],previous.income)}</td><td class="amount">${changes[k].absolute>0?'+':''}${money(changes[k].absolute)}</td><td>${esc(percent(changes[k].percent))}</td></tr>`).join('');
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>DOMUS 3.0 — Informe financiero</title><style>
    @page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#111;background:#fff;font:10pt Arial,sans-serif;line-height:1.35}
    h1{font-size:19pt;margin:0 0 4mm}h2{font-size:13pt;margin:6mm 0 2mm;break-after:avoid-page}p{margin:2mm 0}header{margin-bottom:5mm}
    ul{padding-left:5mm}.filters{columns:2;column-gap:8mm}.filters li{break-inside:avoid}
    table{width:100%;border-collapse:collapse;margin:2mm 0 5mm}th,td{padding:2mm 1.5mm;border-bottom:.2mm solid #bbb;text-align:left;vertical-align:top;overflow-wrap:anywhere}
    th{background:#f2f2f2}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.amount{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.share{font-weight:700}.compare-start{border-left:.5mm solid #999;padding-left:3mm}.grouphead{text-align:center;background:#e9edf2;font-weight:700}
    .movements{font-size:8.5pt}.date{white-space:nowrap}.totals{break-inside:avoid;border-top:.5mm solid #333;padding-top:3mm;font-weight:700}
    @media screen{body{max-width:182mm;margin:14mm auto}}
    </style></head><body><header><h1>DOMUS 3.0 — Informe financiero</h1><p><strong>Período: ${esc(period.label)}</strong></p><p>Comparación: ${esc(period.previousLabel)}</p><p>Listado y desgloses del período principal · Fechas económicas / documentales.</p></header>
    <h2>Filtros del informe</h2><ul class="filters">${filters.map(f=>`<li><strong>${esc(f.label)}:</strong> ${esc(f.value)}</li>`).join('')}</ul>
    <h2>Resumen y comparación</h2><table aria-label="KPI y comparación"><thead><tr><th rowspan="2">Concepto</th><th colspan="2" class="grouphead">Período actual</th><th colspan="4" class="grouphead compare-start">Comparación con ${esc(period.previousLabel)}</th></tr><tr><th>Importe</th><th>% sobre ingresos</th><th class="compare-start">Anterior</th><th>% sobre ingresos</th><th>Diferencia €</th><th>Variación vs anterior</th></tr></thead><tbody>${kpis}</tbody></table>
    ${breakdowns.map(g=>{const incomeGroup=/^Ingresos|cliente \/ origen/i.test(g.title),expenseGroup=/^Gasto|Doméstico \/ actividad/i.test(g.title);const denominator=incomeGroup?totals.income:expenseGroup?totals.expense:null;return `<h2>${esc(g.title)}</h2><table><thead><tr><th>Desglose</th><th>Importe</th><th>% del total</th></tr></thead><tbody>${g.entries.map(e=>{const ti=e.totals||{},income=Number(ti.income||0),expense=Number(ti.expense||0),net=Number(ti.net||0);let amount=null,sign='';if(incomeGroup){amount=income;sign='+'}else if(expenseGroup){amount=expense;sign='−'}else if(income>0&&expense===0){amount=income;sign='+'}else if(expense>0&&income===0){amount=expense;sign='−'}else{amount=net;sign=net>0?'+':net<0?'−':''}const pct=denominator>0?Math.abs(amount)/denominator*100:null;return `<tr><td>${esc(e.label)}</td><td class="amount">${sign}${money(Math.abs(amount))}</td><td class="amount">${pct==null?'—':new Intl.NumberFormat('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1}).format(pct)+' %'}</td></tr>`}).join('')}</tbody></table>`}).join('')}
    <h2>Movimientos · ${rows.length}</h2><table class="movements"><thead><tr><th>Fecha</th><th>Tipo / estado</th><th>Concepto</th><th>Importe</th><th>Titular</th><th>Pagador/cobrador</th><th>Cuenta</th></tr></thead><tbody>${rows.map(r=>`<tr data-occurrence="${esc(r.key)}"><td class="date">${esc(r.date.split('-').reverse().join('/'))}</td><td>${esc(r.type)}<br>${esc(r.status)}</td><td>${esc(r.concept)}${r.invoice?'<br>Factura: '+esc(r.invoice):''}</td><td class="amount">${money(r.amount)}</td><td>${esc(r.owner)}</td><td>${esc(r.payer)}</td><td>${esc(r.account)}</td></tr>`).join('')||'<tr><td colspan="7">Sin movimientos para estos filtros.</td></tr>'}</tbody></table>
    <p class="totals">Totales · ${totals.count} movimientos · Ingresos: ${money(totals.income)} · Gastos: ${money(totals.expense)} · Balance: ${money(totals.net)}</p></body></html>`;
  }
  function print(model){
    document.getElementById('domusReportPrintFrame')?.remove();
    const frame=document.createElement('iframe');frame.id='domusReportPrintFrame';frame.title='Informe financiero para imprimir';frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
    frame.style.cssText='position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0';
    frame.onload=()=>{const view=frame.contentWindow;view.addEventListener('afterprint',()=>frame.remove(),{once:true});view.focus();view.print();};
    frame.srcdoc=documentHTML(model);document.body.appendChild(frame);
  }
  window.DOMUSReportPrint={documentHTML,print};
})();
