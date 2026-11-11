import { buildStatementDraft, statementCreationEligibility } from './statement-draft.js';
import { createBankReminder, bindMonthlyReminder } from './monthly-reminder.js';
import { readStatementFormat, rememberStatementFormat, matchingStatementFormat } from './statement-preferences.js';
import { normalizeTreasuryItem } from './engine.js';
import { createPersistenceRuntime } from './persistence-runtime.js';
import { createIndexedDbOutbox } from './outbox-store.js';
import { createPersistencePanel } from './persistence-panel.js';
import { createTreasuryPersistence } from './persistence.js';
import { createTreasurySnapshot } from './snapshot.js';
import { buildCheckpointDraft } from './checkpoint-draft.js';
import { createTreasuryViewModel, monthlyTreasury, monthlyTreasuryBreakdowns } from './view-model.js';
import { reconcileStatement, reconciliationSummary } from './reconciliation.js';
import { createReviewSession, decideReview, reviewSummary, refreshReviewSession, selectReviewCandidate, rejectReviewCandidate, restoreReviewCandidates } from './reconciliation-review.js';
import { parseStatementCsv, inspectStatementCsv } from './statement-csv.js';
import { accountWithLocalCheckpoint, createLocalCheckpoint, validateAccountReconciliation } from './balance-checkpoint.js';
import { buildReconciliationReport, createStatementFingerprint, movementsForStatementAccount, reconciliationReportFileName, serializeReconciliationReport } from './reconciliation-report.js';

const preferenceStorage = {getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value)};
const bankReminder = createBankReminder(preferenceStorage);
window.renderMonthlyBankReminder = (userId, householdId) => bindMonthlyReminder({root: document.getElementById('monthlyBankReminder'), reminder: bankReminder, userId, householdId, onReview: () => window.openBankImport()});

const euro = value => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
const date = value => value ? new Intl.DateTimeFormat('es-ES').format(new Date(`${value}T12:00:00`)) : 'Sin fecha prevista';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const LABEL = { previsto: 'Previsto futuro', pendiente: 'Pendiente hoy', vencido: 'Vencido', realizado: 'Realizado', reprogramado: 'Reprogramado', prefinanciado: 'Prefinanciado', liquidado: 'Liquidado' };
const STATUS_HELP = {
  previsto:'Movimientos pendientes con fecha posterior a hoy.',
  pendiente:'Movimientos pendientes cuya fecha es hoy.',
  vencido:'Movimientos cuya fecha ya pasó y siguen pendientes.',
  realizado:'Movimientos ya pagados o cobrados; incluye todo el histórico cargado.',
  reprogramado:'Movimientos pendientes cuya fecha fue cambiada.',
  prefinanciado:'Ingresos cobrados anticipadamente mediante prefinanciación.',
  liquidado:'Movimientos cerrados mediante liquidación.'
};
let persistence = createTreasuryPersistence({ enabled: window.DOMUS_CONFIG?.treasuryPersistence === true });
const localCheckpoints = new Map();
const savedCheckpoints = new Map();
const checkpointFor = id => localCheckpoints.get(id) || savedCheckpoints.get(id);
const statementReviews = new Map();
let activeReviewKey = null;
let statementDraft = null, renderedStatementDraft = null, statementAccountId = '', statementPanelOpen = false;
let statementReadToken = 0;
let statementCreation = null, statementInspection = null;
function configureStatementInspection(handler) { statementInspection = handler; }
function configureStatementCreation(handler) { statementCreation = handler; }
function statementSaved() { const entry = statementReviews.get(activeReviewKey); if(entry) entry.refreshAfterCreation = true; }
let activeContext = null;
let renderGeneration = 0;
let currentSnapshot = null, runtime = null, persistencePanel = null, lastViewModel = null;
// Explicit host injection + strict feature flag. No automatic network discovery.
function configurePersistence(backend) {
  if (runtime) throw new Error('El adaptador ya está configurado en esta sesión.');
  if (window.DOMUS_CONFIG?.treasuryPersistence !== true || typeof backend?.execute !== 'function') throw new Error('Persistencia desactivada o sin adaptador explícito.');
  runtime = createPersistenceRuntime({ enabled: true, backend,
    store: createIndexedDbOutbox({ scope: new URL('.', window.location.href).pathname }),
    getContext: () => currentSnapshot ? { userId: currentSnapshot.userId, householdId: currentSnapshot.householdId } : null,
    onChange: () => { const root = document.getElementById('treasury3Root'); if (root && currentSnapshot) persistencePanel?.render(root); }
  });
  persistence = { state: runtime.mode };
  persistencePanel = createPersistencePanel({ runtime, getSnapshot: () => currentSnapshot, esc, onRemoteState: state => {
    if(!currentSnapshot || state.householdId!==currentSnapshot.householdId)return;
    savedCheckpoints.clear();
    for(const row of state.checkpoints){const date=row.balance_date.slice(0,10);const previous=savedCheckpoints.get(row.account_id);if(!previous||date>=previous.date)savedCheckpoints.set(row.account_id,{accountId:row.account_id,amount:Number(row.balance),date,persisted:true});}
    for(const [id,draft] of localCheckpoints){const saved=savedCheckpoints.get(id);if(saved&&saved.date===draft.date&&saved.amount===draft.amount)localCheckpoints.delete(id);}
    renderTreasury3(currentSnapshot);
  }});
  if (currentSnapshot) renderTreasury3(currentSnapshot);
  return runtime;
}

export function resetTreasury3() {
  currentSnapshot = null;
  lastViewModel = null;
  persistencePanel?.invalidate();
  localCheckpoints.clear();
  savedCheckpoints.clear();
  statementReviews.clear();
  activeReviewKey = null;
  statementDraft = null; renderedStatementDraft = null; statementAccountId = ''; statementPanelOpen = false; statementReadToken++;
  activeContext = null;
  renderGeneration++;
  const root = document.getElementById('treasury3Root');
  if (root) root.replaceChildren();
}

function statusCards(vm) { return Object.entries(LABEL).map(([status, label]) => {
  const row=vm.byStatus[status],items=vm.all.filter(item=>item.status===status),dates=items.map(item=>item.date).filter(Boolean).sort(),range=dates.length?(dates[0]===dates.at(-1)?date(dates[0]):date(dates[0])+' → '+date(dates.at(-1))):'Sin movimientos';
  return `<button class="card kpi treasury-status-card" type="button" data-treasury-status="${status}" title="${esc(STATUS_HELP[status]||'')}"><span class="label">${label}</span><span class="value">${euro(row.net)}</span><span class="sub"><strong>Neto</strong> = ingresos − pagos</span><span class="sub">${row.count} mov. · ingresos ${euro(row.income)} · pagos ${euro(row.expense)}</span><span class="sub">${esc(range)}</span></button>`;
 }).join(''); }
function treasuryTotals(rows){return rows.reduce((out,row)=>{out.income+=row.type==='income'?Number(row.amount||0):0;out.expense+=row.type==='expense'?Number(row.amount||0):0;out.net+=Number(row.signedAmount||0);out.count++;return out},{income:0,expense:0,net:0,count:0})}
function operationalTreasury(vm,available,confirmedCount,totalAccounts){
 const monthly=monthlyTreasury(vm);
 const today=vm.today,monthStart=today.slice(0,7)+'-01',monthEnd=vm.horizons.month.end;
 const settlementRows=vm.open.filter(r=>r.source?.follow_up_status==='pending_settlement'),attentionRows=vm.open.filter(r=>r.source?.follow_up_status!=='pending_settlement');
 const overdueRows=attentionRows.filter(r=>r.date<today),todayRows=attentionRows.filter(r=>r.date===today),currentMonthOpenRows=vm.open.filter(r=>r.date>=monthStart&&r.date<=monthEnd),commitmentRows=vm.open.filter(r=>r.date<=monthEnd),realMonthRows=monthly.realizedRows;
 const overdue=treasuryTotals(overdueRows),todayTotals=treasuryTotals(todayRows),currentMonthOpen=treasuryTotals(currentMonthOpenRows),commitment=treasuryTotals(commitmentRows),realMonth=treasuryTotals(realMonthRows);
 const plannedMonth=monthly.planned;
 const projected=confirmedCount>0&&confirmedCount===totalAccounts?available+commitment.net:null,projectedComplete=confirmedCount>0&&confirmedCount===totalAccounts;
 const nextCutoff=day=>{const d=new Date(today+'T12:00:00');let y=d.getFullYear(),m=d.getMonth();if(d.getDate()>day){m++;if(m>11){m=0;y++;}}return y+'-'+String(m+1).padStart(2,'0')+'-'+String(day).padStart(2,'0')};
 const cutoff10=nextCutoff(10),cutoff25=nextCutoff(25);
 const cut10Rows=vm.open.filter(r=>r.date<=cutoff10),cut25Rows=vm.open.filter(r=>r.date<=cutoff25),cut10=treasuryTotals(cut10Rows),cut25=treasuryTotals(cut25Rows);
 return {settlementRows,today,monthStart,monthEnd,overdueRows,todayRows,currentMonthOpenRows,realMonthRows,commitmentRows,overdue,todayTotals,currentMonthOpen,realMonth,plannedMonth,commitment,projected,projectedComplete,cutoff10,cutoff25,cut10Rows,cut25Rows,cut10,cut25,cutoff10Balance:projectedComplete?available+cut10.net:null,cutoff25Balance:projectedComplete?available+cut25.net:null};
}
// Los tramos se calculan con vencimientos pendientes, sin confundirlos con saldos bancarios.
function habitualIncomeIntervals(vm, limit=3){
 // El ingreso habitual es solo el límite del tramo: nunca se suma ni aparece en el detalle.
 // Se usan las fechas efectivas de los movimientos; no se presupone el día 10 o 25.
 const habitual=vm.open.filter(r=>r.type==='income'&&r.date>=vm.today&&r.source?.income_source_type==='habitual');
 const dates=[...new Set(habitual.map(r=>r.date))].sort().slice(0,limit);
 return dates.map((until,index)=>{
   // El primer tramo incluye vencidos aún pendientes. Los posteriores no repiten gastos.
   // Los gastos del propio día del cobro se dejan para el siguiente tramo.
   const from=index===0?vm.today:dates[index-1];
   const rows=vm.open.filter(r=>r.type==='expense'&&r.date<until&&(index===0||r.date>=from));
   const totals=treasuryTotals(rows);
   const overdueCount=rows.filter(r=>r.date<vm.today).length;
   return {from,until,rows,totals,overdueCount,need:totals.expense};
 });
}
function habitualIntervalCards(intervals){
 if(!intervals.length)return '<div class="card"><h3>Gastos hasta el próximo cobro habitual</h3><p class="muted">No hay ningún ingreso habitual pendiente con fecha futura registrada. Revisa la fecha efectiva prevista del cobro; no se supone una fecha fija.</p></div>';
 return '<div class="treasury-flow-grid">'+intervals.map((r,i)=>`<button class="card treasury-hero-card clickable" type="button" data-treasury-interval="${i}">
   <span class="label">${i===0?'Gastos hasta el próximo cobro habitual':'Gastos del tramo siguiente'} · ${date(r.until)}</span>
   <strong class="treasury-hero-value">${euro(r.need)}</strong>
   <small>${r.rows.length} gastos pendientes antes del cobro habitual</small>
   ${r.overdueCount?'<small>Incluye '+r.overdueCount+' vencido(s) sin pagar</small>':''}
   <small>Ver únicamente los gastos incluidos</small>
 </button>`).join('')+'</div>';
}
function operationalCards(op){
 const projectedText=op.projected==null?'Sin saldo base':euro(op.projected),projectedSub=op.projected==null?'Confirma saldos bancarios para calcularlo':(op.projectedComplete?'Saldo calculado + pendientes hasta fin de mes':'Proyección parcial: faltan cuentas por confirmar');
 return `<div class="treasury-overview-grid">
  <button class="card kpi clickable ${op.overdue.expense||op.overdue.income?'attention':''}" type="button" data-treasury-operational="overdue"><span class="label">Vencido por resolver</span><span class="value">${euro(op.overdue.expense)}</span><span class="sub">Pagos vencidos · ${op.overdue.count} mov.</span><span class="sub">Cobros vencidos: ${euro(op.overdue.income)}</span></button>
  <button class="card kpi clickable" type="button" data-treasury-operational="week"><span class="label">Próximos 7 días</span><span class="value">${op.week.net>=0?'+':''}${euro(op.week.net)}</span><span class="sub">Ingresos ${euro(op.week.income)} · pagos ${euro(op.week.expense)}</span><span class="sub">${op.week.count} movimientos</span></button>
  <button class="card kpi clickable" type="button" data-treasury-operational="monthReal"><span class="label">Este mes realizado</span><span class="value">${op.realMonth.net>=0?'+':''}${euro(op.realMonth.net)}</span><span class="sub">Cobrado ${euro(op.realMonth.income)} · pagado ${euro(op.realMonth.expense)}</span><span class="sub">${op.realMonth.count} movimientos</span></button>
  <button class="card kpi clickable" type="button" data-treasury-operational="month"><span class="label">Pendiente hasta fin de mes</span><span class="value">${op.commitment.net>=0?'+':''}${euro(op.commitment.net)}</span><span class="sub">Por cobrar ${euro(op.commitment.income)} · por pagar ${euro(op.commitment.expense)}</span><span class="sub">Incluye vencidos · ${op.commitment.count} mov.</span></button>
  <div class="card kpi treasury-balance-focus"><span class="label">Saldo proyectado fin de mes</span><span class="value">${projectedText}</span><span class="sub">${esc(projectedSub)}</span></div>
 </div>`;
}
function horizonRows(vm) { const labels = { week: '7 días', month: 'Fin de mes', days30: '30 días', year: 'Fin de año' }; return Object.entries(vm.horizons).map(([key, row]) => `<tr><td><button class="link-button" type="button" data-treasury-horizon="${key}">${labels[key]}</button><small class="muted"> · hasta ${date(row.end)}</small></td><td class="amount income">${euro(row.income)}</td><td class="amount expense">${euro(row.expense)}</td><td class="amount ${row.net < 0 ? 'expense' : 'income'}">${euro(row.net)}</td><td>${row.count}</td></tr>`).join(''); }
function accountRows(vm) { const rows=vm.accountRows.filter(row=>row.id); if (!rows.length) return '<tr><td colspan="4" class="empty">No hay cuentas configuradas.</td></tr>'; return rows.map(row => `<tr><td>${esc(row.name)}</td><td>${row.confirmedBalance == null ? `<span class="muted">${esc(row.balanceReason)}</span>` : `<strong>${euro(row.confirmedBalance)}</strong>`}</td><td class="amount ${row.realFlow < 0 ? 'expense' : 'income'}">${euro(row.realFlow)}</td><td>${row.movements}</td></tr>`).join(''); }
function accountCards(vm){const rows=vm.accountRows.filter(row=>row.id);if(!rows.length)return '<div class="empty">No hay cuentas configuradas.</div>';return rows.map(row=>`<article class="treasury-account-card"><div><strong>${esc(row.name)}</strong><small>${row.confirmedBalance==null?esc(row.balanceReason):date(row.referenceDate)+' · '+row.movements+' movimiento(s) posteriores'}</small></div><span>${row.confirmedBalance==null?'—':euro(row.confirmedBalance)}</span></article>`).join('')}
function movementRows(rows) { if (!rows.length) return '<tr><td colspan="5" class="empty">Sin movimientos en este desglose.</td></tr>'; return rows.map(row => `<tr><td>${date(row.date)}${row.originalDate&&row.originalDate!==row.date?`<small class="muted">Prevista original: ${date(row.originalDate)}</small>`:''}</td><td><span class="pill">${esc(LABEL[row.status] || row.status)}</span></td><td>${esc(row.concept)}</td><td>${row.type === 'income' ? 'Ingreso' : 'Pago'}</td><td class="amount ${row.type}">${row.type === 'income' ? '+' : '−'}${euro(row.amount)}</td></tr>`).join(''); }
function movementCards(rows){if(!rows.length)return '<div class="empty">Sin movimientos en este desglose.</div>';return rows.map(row=>`<article class="treasury-mobile-movement"><div class="treasury-mobile-movement-top"><div><strong>${esc(row.concept)}</strong><small>${date(row.date)} · ${esc(LABEL[row.status]||row.status)}</small>${row.originalDate&&row.originalDate!==row.date?`<small>Fecha prevista original: ${date(row.originalDate)}</small>`:''}</div><span class="amount ${row.type}">${row.type==='income'?'+':'−'}${euro(row.amount)}</span></div><div class="treasury-mobile-movement-type">${row.type==='income'?'Ingreso':'Pago'}</div></article>`).join('')}
// Selección efímera para cuadrar listados: no altera ni persiste movimientos.
function temporarySelectionSummary(rows,selected){
 const chosen=rows.filter((_,i)=>selected.has(i));
 const all=treasuryTotals(rows),current=treasuryTotals(chosen);
 const homogeneous=rows.length>0&&rows.every(row=>row.type===rows[0].type);
 const value=totals=>homogeneous?(rows[0].type==='income'?totals.income:totals.expense):totals.net;
 return {count:chosen.length,all:value(all),selected:value(current)};
}
function selectableMovementRows(rows,selected){
 if(!rows.length)return '<tr><td colspan="6" class="empty">Sin movimientos en este desglose.</td></tr>';
 return rows.map((row,i)=>`<tr data-treasury-select-row="${i}"${selected.has(i)?'':' style="opacity:.48"'}><td><input type="checkbox" data-treasury-select="${i}" aria-label="Incluir ${esc(row.concept)} en el cálculo" ${selected.has(i)?'checked':''}></td><td>${date(row.date)}${row.originalDate&&row.originalDate!==row.date?`<small class="muted">Prevista original: ${date(row.originalDate)}</small>`:''}</td><td><span class="pill">${esc(LABEL[row.status]||row.status)}</span></td><td>${esc(row.concept)}</td><td>${row.type==='income'?'Ingreso':'Pago'}</td><td class="amount ${row.type}">${row.type==='income'?'+':'−'}${euro(row.amount)}</td></tr>`).join('');
}
function selectableMovementCards(rows,selected){
 if(!rows.length)return '<div class="empty">Sin movimientos en este desglose.</div>';
 return rows.map((row,i)=>`<article class="treasury-mobile-movement" data-treasury-select-row="${i}"${selected.has(i)?'':' style="opacity:.48"'}><div class="treasury-mobile-movement-top"><div><label style="display:flex;align-items:center;gap:.5rem"><input type="checkbox" data-treasury-select="${i}" aria-label="Incluir ${esc(row.concept)} en el cálculo" ${selected.has(i)?'checked':''}><strong>${esc(row.concept)}</strong></label><small>${date(row.date)} · ${esc(LABEL[row.status]||row.status)}</small>${row.originalDate&&row.originalDate!==row.date?`<small>Fecha prevista original: ${date(row.originalDate)}</small>`:''}</div><span class="amount ${row.type}">${row.type==='income'?'+':'−'}${euro(row.amount)}</span></div><div class="treasury-mobile-movement-type">${row.type==='income'?'Ingreso':'Pago'}</div></article>`).join('');
}
function reconciliationRows(session) {
  const signed = value => (value > 0 ? '+' : '') + euro(value);
  return session.rows.map(row => {
    const locked = row.decision !== 'pendiente';
    const candidate = row.candidates.find(item => item.id === row.selectedMovementId) || row.candidates[0];
    const proposals = row.candidates.length ? `<select aria-label="Movimiento propuesto para ${esc(row.statement.concept)}" class="treasury-review-select" data-review-select="${esc(row.statement.id)}" ${locked ? 'disabled' : ''}><option value="">Seleccionar propuesta…</option>${row.candidates.map(item => `<option value="${esc(item.id)}" ${item.id === row.selectedMovementId ? 'selected' : ''}>${esc(item.concept)} · ${date(item.date)} · ${signed(item.signedAmount)}</option>`).join('')}</select>
      <div class="treasury-candidate-summary"><strong>${esc(candidate.concept)}</strong><p>${date(candidate.date)} · <strong>${signed(candidate.signedAmount)}</strong> · ${esc(currentSnapshot.accounts.find(account=>account.id===candidate.accountId)?.name || 'Cuenta sin asignar')}</p><button class="btn" type="button" data-review-open="${esc(row.statement.id)}" data-review-candidate="${esc(candidate.id)}" ${!statementInspection ? 'disabled' : ''}>Abrir movimiento</button><small>Consulta el movimiento completo y confirma o rechaza la coincidencia sin salir del extracto.</small></div>` : `<strong>Sin coincidencia</strong><br>${statementCreationEligibility(row) ? `<small>${esc(statementCreationEligibility(row))}</small>` : `<button class="btn primary" type="button" data-review-create="${esc(row.statement.id)}" ${locked || !statementCreation ? 'disabled' : ''}>Revisar y crear movimiento</button>`}`;
    const rejected = row.rejectedCandidates?.length ? `<p><small>${row.rejectedCandidates.length} propuesta(s) rechazada(s). La línea bancaria sigue pendiente hasta que la resuelvas.</small></p>${!locked ? `<button class="btn" type="button" data-review-restore="${esc(row.statement.id)}">Volver a ver propuestas rechazadas</button>` : ''}` : '';
    return `<tr data-review-row="${esc(row.statement.id)}"><td data-label="Fecha">${date(row.statement.date)}</td><td data-label="Extracto">${esc(row.statement.concept)}</td><td data-label="Importe" class="amount ${row.statement.signedAmount < 0 ? 'expense' : 'income'}">${signed(row.statement.signedAmount)}</td><td data-label="Estado"><span class="pill">${esc(locked ? row.decision : row.matchStatus.replaceAll('_', ' '))}</span></td><td data-label="Movimiento DOMUS">${proposals}${rejected}</td><td data-label="Decisión"><div class="actions"><button class="btn primary" type="button" data-review-confirm="${esc(row.statement.id)}" ${locked || !row.selectedMovementId ? 'disabled' : ''}>Conciliar</button><button class="btn" type="button" data-review-discard="${esc(row.statement.id)}" ${locked ? 'disabled' : ''}>Omitir esta línea</button></div></td></tr>`;
  }).join('');
}

function bindDetails(root, vm) {
  const detail = root.querySelector('#treasury3Detail'), title = root.querySelector('#treasury3DetailTitle'), body = root.querySelector('#treasury3DetailBody'), mobile = root.querySelector('#treasury3DetailMobile');
  const show = (label, rows) => { title.textContent = label; body.innerHTML = movementRows(rows); if(mobile)mobile.innerHTML=movementCards(rows); detail.classList.remove('hidden'); detail.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  root.querySelectorAll('[data-treasury-status]').forEach(button => button.onclick = () => show(LABEL[button.dataset.treasuryStatus], vm.all.filter(row => row.status === button.dataset.treasuryStatus)));
  root.querySelectorAll('button[data-treasury-horizon]').forEach(button => button.onclick = () => { const horizon = vm.horizons[button.dataset.treasuryHorizon]; show(`Previsión hasta ${date(horizon.end)}`, vm.open.filter(row => row.date <= horizon.end)); });
  const op=operationalTreasury(vm,0,0,0),opRows={overdue:op.overdueRows,week:op.weekRows,month:op.commitmentRows,monthExpense:op.currentMonthOpenRows.filter(row=>row.type==='expense'),monthIncome:op.currentMonthOpenRows.filter(row=>row.type==='income'),monthReal:op.realMonthRows};
  const opLabels={overdue:'Vencidos por resolver',week:'Próximos 7 días',month:'Pendiente hasta fin de mes',monthExpense:'Pagos que quedan este mes',monthIncome:'Cobros que quedan este mes',monthReal:'Realizado este mes'};
  root.querySelectorAll('[data-treasury-operational]').forEach(button=>button.onclick=()=>show(opLabels[button.dataset.treasuryOperational],opRows[button.dataset.treasuryOperational]||[]));
  root.querySelectorAll('[data-treasury-unassigned]').forEach(button=>button.onclick=()=>show('Histórico sin cuenta asignada',vm.real.filter(row=>!row.accountId)));
}

function downloadReport(report, fileName) {
  const url = URL.createObjectURL(new Blob([serializeReconciliationReport(report)], { type: 'application/json;charset=utf-8' })), link = document.createElement('a');
  link.href = url; link.download = reconciliationReportFileName(fileName); document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

function bindReconciliationReview(output, entry, generation) {
  let session = entry.session;
  const metadata = entry.metadata;
  const render = message => {
    if (generation !== renderGeneration) return;
    entry.session = session;
    const summary = reviewSummary(session);
    output.className = '';
    output.innerHTML = `${entry.stale ? '<div class="msg error">Los movimientos han cambiado. Esta revisión conserva las decisiones anteriores y requiere un nuevo análisis antes de confirmar.</div>' : ''}${message ? `<div class="msg ${message.kind}">${esc(message.text)}</div>` : ''}<div class="msg info">Cuenta: <strong>${esc(metadata.account.name)}</strong> · Resultado de la comparación: ${metadata.automatic.propuesto} coincidencias claras, ${metadata.automatic.ambiguo} ambiguas, ${metadata.automatic.revisar} para revisar y ${metadata.automatic.sin_coincidencia} sin coincidencia. Pulsa «Abrir movimiento» para consultar su ficha y confirmar o rechazar la coincidencia sin salir del extracto. Cargar el archivo no crea movimientos. Las operaciones ausentes se pueden revisar y guardar con «Revisar y crear movimiento».</div><div class="section-title treasury-review-summary"><div><strong>${summary.total} líneas</strong> · ${summary.confirmada} conciliadas localmente · ${summary.descartada} descartadas · ${summary.pendiente} pendientes. Las operaciones ausentes no se incorporan hasta que revises y guardes su formulario.</div><button class="btn" type="button" data-download-review>Descargar informe</button></div><div class="table-wrap treasury-review-table" tabindex="0" role="region" aria-label="Revisión del extracto"><table class="table"><thead><tr><th>Fecha</th><th>Extracto</th><th>Importe</th><th>Estado</th><th>Movimiento DOMUS</th><th>Decisión</th></tr></thead><tbody>${reconciliationRows(session)}</tbody></table></div>`;
    persistencePanel?.bindReview(output, entry);
    output.querySelectorAll('[data-review-create]').forEach(button => button.onclick = async () => {
      if (generation !== renderGeneration || entry.stale || !statementCreation) return;
      button.disabled = true; button.textContent = 'Preparando revisión…';
      const context = currentSnapshot;
      try {
        const row = session.rows.find(item => item.statement.id === button.dataset.reviewCreate);
        const draft = await buildStatementDraft({ householdId: context.householdId, userId: context.userId, account: metadata.account, row, rows: session.rows, fileName: metadata.fileName });
        if (generation !== renderGeneration || currentSnapshot !== context) return;
        await statementCreation(draft);
        render({kind:'info', text:'Formulario preparado. El movimiento solo se incorpora al pulsar Guardar. Después se actualizarán las coincidencias del extracto.'});
      } catch(error) { render({kind:'error', text:error.message}); }
    });
    output.querySelectorAll('[data-review-open]').forEach(button => button.onclick = async () => {
      if (!statementInspection || generation !== renderGeneration) return;
      const statementId = button.dataset.reviewOpen, movementId = button.dataset.reviewCandidate;
      const boundContext = activeContext;
      const row = entry.session.rows.find(item=>item.statement.id===statementId);
      const candidate = row?.candidates.find(item=>item.id===movementId);
      if (!candidate) return;
      const decide = action => {
        if (boundContext !== activeContext || entry.stale || statementReviews.get(activeReviewKey) !== entry) throw new Error('La revisión ha cambiado. Vuelve al extracto y comprueba los datos actuales.');
        const latest = entry.session.rows.find(item=>item.statement.id===statementId);
        if (!latest || latest.decision !== 'pendiente' || !latest.candidates.some(item=>item.id===movementId)) throw new Error('Esta línea ya no admite esa decisión.');
        if (action === 'confirm') {
          const selected = selectReviewCandidate(entry.session, statementId, movementId);
          const confirmed = decideReview(selected, statementId, 'confirmada');
          persistencePanel?.captureDecision(entry, statementId, selected);
          entry.session = confirmed;
        } else entry.session = rejectReviewCandidate(entry.session, statementId, movementId);
        renderTreasury3(currentSnapshot);
      };
      try { await statementInspection({candidate, statement:row.statement, account:metadata.account,
        userId:currentSnapshot.userId, householdId:currentSnapshot.householdId,
        canDecide:row.decision==='pendiente'&&!entry.stale,
        onConfirm:()=>decide('confirm'), onReject:()=>decide('reject')});
      } catch(error) { render({kind:'error',text:error.message}); }
    });
    output.querySelectorAll('[data-review-restore]').forEach(button => button.onclick = () => {
      if (generation !== renderGeneration || entry.stale) return;
      try { session = restoreReviewCandidates(entry.session, button.dataset.reviewRestore); render(); }
      catch(error) { render({kind:'error',text:error.message}); }
    });
    output.querySelectorAll('[data-review-select]').forEach(select => select.onchange = () => { if (generation !== renderGeneration || entry.stale) return; try { session = selectReviewCandidate(session, select.dataset.reviewSelect, select.value); render(); } catch (error) { render({ kind: 'error', text: error.message }); } });
    output.querySelectorAll('[data-review-confirm]').forEach(button => button.onclick = () => { if (generation !== renderGeneration || entry.stale) return; try { persistencePanel?.captureDecision(entry, button.dataset.reviewConfirm, session); session = decideReview(session, button.dataset.reviewConfirm, 'confirmada'); render({ kind: 'ok', text: 'Coincidencia revisada. Falta preparar las conciliaciones y sincronizarlas para guardarla en el historial.' }); } catch (error) { render({ kind: 'error', text: error.message }); } });
    output.querySelectorAll('[data-review-discard]').forEach(button => button.onclick = () => { try { session = decideReview(session, button.dataset.reviewDiscard, 'descartada'); render(); } catch (error) { render({ kind: 'error', text: error.message }); } });
    if (entry.stale) output.querySelectorAll('[data-review-confirm], [data-review-select], [data-review-discard], [data-review-create], [data-review-restore]').forEach(control => control.disabled = true);
    output.querySelector('[data-download-review]').onclick = () => {
      if (generation !== renderGeneration) return;
      downloadReport({ ...buildReconciliationReport({ account: metadata.account, fileName: metadata.fileName, fingerprint: metadata.fingerprint, session }), stale: !!entry.stale }, metadata.fileName);
    };
  };
  render();
}

function bindBalanceCapture(root, snapshot, vm, generation) {
  root.querySelectorAll('[data-balance-account]').forEach(box => {
    const account = (snapshot.accounts || []).find(item => item.id === box.dataset.balanceAccount), output = box.querySelector('[data-balance-result]');
    persistencePanel?.bindCheckpoint(box, account, vm.today);
    box.querySelector('[data-download-checkpoint]').onclick = () => {
      if (generation !== renderGeneration) return;
      try {
        const draft = buildCheckpointDraft({ householdId: snapshot.householdId, account,
          amount: box.querySelector('[data-opening-amount]').value,
          date: box.querySelector('[data-opening-date]').value, asOf: vm.today });
        const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2) + '\n'], { type: 'application/json;charset=utf-8' }));
        const link = document.createElement('a');
        try {
          link.href = url; link.download = 'domus-saldo-' + draft.proposal.account_id + '-' + draft.proposal.balance_date + '.json';
          document.body.appendChild(link); link.click();
        } finally { link.remove(); URL.revokeObjectURL(url); }
        output.className = 'msg info';
        output.textContent = 'Borrador descargado. No se ha guardado el saldo ni enviado a Supabase.';
      } catch (error) { output.className = 'msg error'; output.textContent = error.message; }
    };
    box.querySelector('[data-save-opening]').onclick = () => { if (generation !== renderGeneration) return; try { const checkpoint = createLocalCheckpoint({ accountId: account.id, amount: box.querySelector('[data-opening-amount]').value, date: box.querySelector('[data-opening-date]').value }, snapshot.asOf); localCheckpoints.set(account.id, checkpoint); renderTreasury3(snapshot); } catch (error) { output.className = 'msg error'; output.textContent = error.message; } };
    box.querySelector('[data-check-balance]').onclick = () => { if (generation !== renderGeneration) return; try { const result = validateAccountReconciliation({ account, checkpoint: checkpointFor(account.id), realMovements: vm.real, bankBalance: box.querySelector('[data-closing-amount]').value, bankBalanceDate: box.querySelector('[data-closing-date]').value }, snapshot.asOf); output.className = `msg ${result.balanced ? 'ok' : 'error'}`; output.textContent = result.balanced ? `Cuadrado: ${euro(result.calculatedBalance)} con ${result.movements} movimiento(s) reales.` : `Descuadre ${euro(result.difference)}. DOMUS calcula ${euro(result.calculatedBalance)} y el banco indica ${euro(result.observedBalance)}. No se ha corregido nada.`; } catch (error) { output.className = 'msg error'; output.textContent = error.message; } };
  });
}

export function renderTreasury3(snapshot) {
  const root = document.getElementById('treasury3Root'); if (!root || !snapshot) return null;
  const context = JSON.stringify([snapshot.userId || null, snapshot.householdId || null]);
  if (context !== activeContext) { resetTreasury3(); activeContext = context; }
  const previousPanel = root.querySelector('[data-statement-panel]');
  if (previousPanel) statementPanelOpen = previousPanel.open;
  if (statementDraft && renderedStatementDraft === statementDraft && previousPanel) {
    const mapping = [...previousPanel.querySelectorAll('[data-csv-map]')];
    if (mapping.length) statementDraft.controls = {
      mapping: Object.fromEntries(mapping.map(el => [el.dataset.csvMap, Number(el.value)])),
      delimiter: previousPanel.querySelector('[data-csv-delimiter]').value,
      headerRow: previousPanel.querySelector('[data-csv-header]').value
    };
  }
  currentSnapshot = snapshot;
  const generation=++renderGeneration;
  const sourceAccounts = (snapshot.accounts || []).filter(account => snapshot.householdId && account.household_id === snapshot.householdId && account.active !== false);
  const accounts = sourceAccounts.map(account => accountWithLocalCheckpoint(account, checkpointFor(account.id)));
  const vm = createTreasuryViewModel(snapshot.rows || [], accounts, snapshot.asOf || new Date());
  lastViewModel = vm; queueMicrotask(()=>window.renderDashboard?.());

  const realAccounts=vm.accountRows.filter(row=>row.id),confirmedAccounts=realAccounts.filter(row=>row.confirmedBalance!=null);
  const available=confirmedAccounts.reduce((sum,row)=>sum+Number(row.confirmedBalance||0),0);
  const op=operationalTreasury(vm,available,confirmedAccounts.length,realAccounts.length);
  const hasBalance=confirmedAccounts.length>0;
  const balanceText=hasBalance?euro(available):'Sin saldo base';
  const balanceSub=hasBalance?'Saldo total consolidado. Da igual en qué cuenta esté.':'Falta un saldo de partida para proyectar la caja.';
  const endBalance=euro(op.plannedMonth.net);
  const endClass=op.plannedMonth.net<0?'expense':'income';
  const monthLabel=new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(new Date(op.monthStart+'T12:00:00'));
  const overdueCount=op.overdueRows.length,todayCount=op.todayRows.length;

  root.innerHTML = `<div class="treasury-simple-head">
    <div><span class="home-kicker">Tesorería</span><h2>Tu dinero, sin rodeos</h2><p class="muted">Ingresos, gastos y resultado del mes, sin arrastrar saldos bancarios.</p></div>
  </div>

  <div class="treasury-flow-grid">
<button class="card treasury-hero-card clickable" type="button" data-treasury-operational="monthIncomeReal"><span class="label">Dinero cobrado</span><strong class="treasury-hero-value">${euro(op.realMonth.income)}</strong><small>${esc(monthLabel)} · Ver movimientos</small></button>
<button class="card treasury-hero-card clickable" type="button" data-treasury-operational="monthIncomePending"><span class="label">Dinero por cobrar</span><strong class="treasury-hero-value">${euro(op.currentMonthOpen.income)}</strong><small>${esc(monthLabel)} · Ver movimientos</small></button>
<button class="card treasury-hero-card clickable" type="button" data-treasury-operational="monthExpenseReal"><span class="label">Dinero pagado</span><strong class="treasury-hero-value">${euro(op.realMonth.expense)}</strong><small>${esc(monthLabel)} · Ver movimientos</small></button>
<button class="card treasury-hero-card clickable" type="button" data-treasury-operational="monthExpensePending"><span class="label">Dinero por pagar</span><strong class="treasury-hero-value">${euro(op.currentMonthOpen.expense)}</strong><small>${esc(monthLabel)} · Ver movimientos</small></button>
<button class="card treasury-hero-card clickable" type="button" data-treasury-operational="monthReal"><span class="label">Resultado realizado</span><strong class="treasury-hero-value">${euro(op.realMonth.net)}</strong><small>${esc(monthLabel)} · Ver movimientos</small></button>
<button class="card treasury-hero-card clickable" type="button" data-treasury-operational="monthPlanned"><span class="label">Resultado previsto</span><strong class="treasury-hero-value">${euro(op.plannedMonth.net)}</strong><small>${esc(monthLabel)} · Ver movimientos</small></button>
  </div>
  <p class="muted">Resultado realizado: cobrado menos pagado. Resultado previsto: todos los ingresos menos todos los gastos del mes, realizados y pendientes. Estas cifras no son saldos bancarios.</p>
  <section class="treasury-income-intervals">
    <h3>Gastos hasta el próximo cobro habitual</h3>
    <p class="muted">Solo gastos pendientes anteriores a la fecha efectiva del siguiente cobro habitual, incluidos los vencidos sin pagar. Ningún ingreso se suma ni se descuenta.</p>
    ${habitualIntervalCards(habitualIncomeIntervals(vm))}
  </section>
  <details class="card" data-statement-panel ${statementPanelOpen || activeReviewKey || statementDraft ? 'open' : ''}><summary>Importar y comparar un extracto (opcional)</summary>
    <p>Compara pagos y cobros con tus movimientos. Esta revisión es voluntaria y no calcula saldos bancarios.</p>

    <div class="treasury-advanced">    <div class="card"><div class="section-title"><div><h2>Conciliación bancaria segura</h2><p class="muted">Compara lo que ya tienes y añade las operaciones que falten, después de revisarlas.</p></div><label class="btn">2. Seleccionar extracto<input id="treasuryCsv" type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" hidden></label></div><div class="msg info"><strong>Cómo hacerlo:</strong><ol><li>Selecciona la cuenta y carga el extracto CSV.</li><li>Comprueba las columnas y pulsa «Validar y preparar revisión».</li><li>Si el movimiento ya existe, elige «Conciliar»; no se crea otra copia.</li><li>Si falta, pulsa «Revisar y crear movimiento», comprueba quién paga o cobra, el ámbito y la categoría y pulsa «Guardar».</li><li>Al guardar, DOMUS actualiza las coincidencias. Continúa con las demás operaciones que falten.</li></ol>Cargar el archivo no guarda gastos ni cobros. «Preparar guardado del extracto» guarda el documento bancario; «Preparar conciliaciones» guarda sus enlaces con movimientos existentes. Los traspasos entre cuentas no son ingresos ni gastos.</div><div id="treasuryCsvResult" class="empty">1. Selecciona la cuenta. Después elige tu CSV o TSV. DOMUS buscará coincidencias y te permitirá revisar las operaciones que falten.</div></div>
</div>
  </details>
  <button type="button" class="card clickable" data-treasury-operational="settlement"><strong>Pendientes de liquidación · ${op.settlementRows.length}</strong><p>Siguen pendientes y conservan sus fechas e importes. Se consultan aquí sin avisos repetidos de urgencia.</p><span>${euro(treasuryTotals(op.settlementRows).expense)} · Ver movimientos</span></button>
  <div class="card treasury-attention-card">
    <div class="section-title"><div><h2>Atención</h2><p class="muted">Solo lo que necesita revisión ahora.</p></div></div>
    <div class="treasury-attention-grid">
      <button type="button" class="treasury-attention-item clickable ${overdueCount?'attention':''}" data-treasury-operational="overdue"><span>Vencidos</span><strong>${overdueCount}</strong><small>Cobros ${euro(op.overdue.income)} · pagos ${euro(op.overdue.expense)}</small></button>
      <button type="button" class="treasury-attention-item clickable" data-treasury-operational="today"><span>Vencen hoy</span><strong>${todayCount}</strong><small>Cobros ${euro(op.todayTotals.income)} · pagos ${euro(op.todayTotals.expense)}</small></button>
    </div>
  </div>

  <div id="treasury3Detail" class="card hidden"><div class="section-title treasury-detail-head"><h2 id="treasury3DetailTitle">Desglose</h2><button class="btn" type="button" id="treasury3Close">Cerrar</button></div><div id="treasury3DetailMobile" class="treasury-detail-mobile"></div><div class="table-wrap treasury-detail-table" tabindex="0" role="region" aria-label="Detalle de tesorería"><table class="table"><thead><tr><th>✓</th><th>Fecha</th><th>Estado</th><th>Concepto</th><th>Tipo</th><th>Importe</th></tr></thead><tbody id="treasury3DetailBody"></tbody></table></div><div class="treasury-selection-summary" aria-live="polite" style="position:sticky;bottom:calc(76px + env(safe-area-inset-bottom, 0px));z-index:15;display:flex;flex-wrap:wrap;align-items:center;gap:.7rem;margin:1rem 0;padding:.8rem;background:var(--surface,#fff);border:1px solid var(--line,#ddd);border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.14)"><strong id="treasury3SelectedTotal"></strong><span id="treasury3FullTotal" class="muted"></span><button class="btn" type="button" id="treasury3SelectAll">Marcar todos</button><button class="btn" type="button" id="treasury3SelectNone">Desmarcar todos</button><small class="muted">Selección temporal: se restablece al cerrar.</small></div></div>`;

  const accountSelect = document.createElement('select');
  accountSelect.id = 'treasuryCsvAccount'; accountSelect.className = 'treasury-review-select'; accountSelect.setAttribute('aria-label', 'Cuenta del extracto');
  accountSelect.innerHTML = '<option value="">1. Cuenta del extracto…</option>'+sourceAccounts.map(account => `<option value="${esc(account.id)}">${esc(account.name || 'Cuenta sin nombre')}</option>`).join('');
  const fileLabel = root.querySelector('#treasuryCsv').closest('label'); fileLabel.parentElement.insertBefore(accountSelect, fileLabel);
  if (sourceAccounts.some(account => account.id === statementAccountId)) accountSelect.value = statementAccountId;
  const signature = accountId => JSON.stringify(movementsForStatementAccount(vm.real, accountId).map(row => [row.id, row.date, row.signedAmount, row.concept]));
  const showReview = key => {
    const entry = statementReviews.get(key); if (!entry) return;
    if (!sourceAccounts.some(account => account.id === entry.metadata.account.id)) return;
    statementDraft = null;
    activeReviewKey = key; statementAccountId = entry.metadata.account.id; accountSelect.value = statementAccountId;
    entry.stale = entry.signature !== signature(entry.metadata.account.id);
    if (entry.stale && entry.refreshAfterCreation) {
      const results = reconcileStatement(entry.session.rows.map(row=>row.statement), movementsForStatementAccount(vm.real,entry.metadata.account.id));
      entry.session = refreshReviewSession(entry.session, results);
      entry.metadata.automatic = reconciliationSummary(results);
      entry.signature = signature(entry.metadata.account.id); entry.stale = false; entry.refreshAfterCreation = false;
    }
    bindReconciliationReview(root.querySelector('#treasuryCsvResult'), entry, generation);
  };
  if (statementReviews.size) {
    const saved = document.createElement('select'); saved.setAttribute('aria-label', 'Revisiones de esta sesión');
    saved.innerHTML = '<option value="">Reabrir revisión…</option>' + [...statementReviews].map(([key,entry]) => '<option value="' + esc(key) + '">' + esc(entry.metadata.account.name + ' · ' + entry.metadata.fileName) + '</option>').join('');
    fileLabel.parentElement.insertBefore(saved, fileLabel); saved.value = activeReviewKey || '';
    saved.onchange = () => { if (generation === renderGeneration) { statementReadToken++; showReview(saved.value); } };
  }
  if (activeReviewKey) showReview(activeReviewKey);
  const fileInput = root.querySelector('#treasuryCsv');
  fileInput.disabled = !accountSelect.value;
  accountSelect.onchange = () => { statementAccountId = accountSelect.value; statementDraft = null; activeReviewKey = null; statementReadToken++; fileInput.disabled = !accountSelect.value; root.querySelector('#treasuryCsvResult').textContent = '2. Selecciona el archivo para esta cuenta. Las revisiones anteriores se conservan.'; };
  const displayDraft = draft => {
    const {file, text, formatContext} = draft;
    const account = sourceAccounts.find(item => item.id === draft.accountId);
    if (!account) { statementDraft = null; return; }
    const output = root.querySelector('#treasuryCsvResult');
    renderedStatementDraft = draft;
    const draftContext = activeContext;
    let {info, restoredFormat} = draft;
    const display = () => {
      output.className = '';
      const option = selected => '<option value="-1">Sin columna</option>' + info.headers.map((h,i) => `<option value="${i}" ${i===selected?'selected':''}>${i+1}. ${esc(h || '(sin título)')}</option>`).join('');
      const labels = { date:'Fecha real de operación', concept:'Concepto', amount:'Importe con signo (− cargo / + abono)', debit:'Cargo', credit:'Abono', reference:'Referencia (opcional)' };
      output.innerHTML = `<h3>3. Formato detectado · ${info.delimiter==='\t'?'TSV':'CSV'}</h3><p>${esc(file.name)} · ${info.count} filas · Cuenta: ${esc(account.name)}</p><label>Separador <select data-csv-delimiter><option value=";">Punto y coma</option><option value=",">Coma</option><option value="tab">Tabulación</option></select></label><label>Fila de encabezados <input data-csv-header type="number" min="1" max="30" value="${info.headerRow+1}"></label><button class="btn" data-csv-format>Actualizar formato</button><h3>4. Vista previa del archivo</h3><p>Muestra de ${info.preview.length} de ${info.count} movimientos. La revisión del siguiente paso incluye todos.</p><div class="table-wrap"><table class="table"><thead><tr>${info.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${info.preview.map(row=>`<tr>${row.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><h3>5. Comprueba las columnas</h3><p>${restoredFormat?'Hemos recuperado las columnas que elegiste para esta cuenta. Revisa la propuesta. ':''}Elige fecha y concepto, y después importe único o cargo / abono. Si una columna no se detecta, selecciónala aquí.</p><div class="grid two">${Object.entries(labels).map(([key,label])=>`<label>${label}<select data-csv-map="${key}">${option(draft.controls?.mapping[key] ?? info.indexes[key])}</select></label>`).join('')}</div><p class="msg info" data-csv-message>No importado todavía. La vista previa no modifica el historial.</p><button class="btn primary" data-csv-review>6. Validar y preparar revisión</button>`;
      output.querySelector('[data-csv-delimiter]').value = draft.controls?.delimiter ?? (info.delimiter==='\t'?'tab':info.delimiter);
      if (draft.controls) output.querySelector('[data-csv-header]').value = draft.controls.headerRow;
      output.querySelector('[data-csv-format]').onclick = () => { try { const delimiter = output.querySelector('[data-csv-delimiter]').value; info = inspectStatementCsv(text,{delimiter:delimiter==='tab'?'\t':delimiter,headerRow:Number(output.querySelector('[data-csv-header]').value)-1}); restoredFormat=false; draft.info=info; draft.restoredFormat=false; draft.controls=null; display(); } catch(error) { output.querySelector('[data-csv-message]').textContent = 'No importado: '+error.message; } };
      output.querySelector('[data-csv-review]').onclick = async () => {
        const note = output.querySelector('[data-csv-message]');
        try {
          if (generation !== renderGeneration || accountSelect.value !== account.id) throw new Error('La cuenta ha cambiado. Selecciona de nuevo el archivo.');
          const mapping = {delimiter:info.delimiter,headerRow:info.headerRow,...Object.fromEntries([...output.querySelectorAll('[data-csv-map]')].map(el=>[el.dataset.csvMap,Number(el.value)]))};
          const rows = parseStatementCsv(text,mapping), fingerprint = await createStatementFingerprint(account.id,text);
          if (draftContext !== activeContext || statementDraft !== draft || statementAccountId !== account.id) return;
          rememberStatementFormat(preferenceStorage, formatContext, info.headers, mapping);
          const existing = statementReviews.get(fingerprint.duplicateKey);
          if (existing && !existing.stale && !existing.needsPersistentReview) { statementDraft=null; activeReviewKey=fingerprint.duplicateKey; renderTreasury3(currentSnapshot); return; }
          const currentMovements = movementsForStatementAccount(lastViewModel.real,account.id);
          const results = reconcileStatement(rows,currentMovements);
          const key = existing ? fingerprint.duplicateKey+':revision:'+(statementReviews.size+1) : fingerprint.duplicateKey;
          statementReviews.set(key,{session:createReviewSession(results),signature:JSON.stringify(currentMovements.map(row => [row.id, row.date, row.signedAmount, row.concept])),metadata:{account,fileName:file.name,csv:text,mapping,fingerprint,automatic:reconciliationSummary(results)}});
          statementDraft=null;activeReviewKey=key;renderTreasury3(currentSnapshot);
        } catch(error) { note.className='msg error';note.textContent='No importado: '+error.message+'. El historial anterior se conserva.'; }
      };
    };
    display();
  };
  if (statementDraft) displayDraft(statementDraft);
  fileInput.onchange = async event => {
    const file = event.target.files?.[0], account = sourceAccounts.find(item => item.id === accountSelect.value);
    if (!file) return;
    const readToken = ++statementReadToken;
    const readContext = activeContext;
    try {
      if (!account) throw new Error('Selecciona la cuenta a la que pertenece el extracto');
      if (file.size > 5 * 1024 * 1024) throw new Error('El archivo supera 5 MB');
      if (/\.(xlsx?|pdf)$/i.test(file.name)) throw new Error('Este paso lee extractos CSV o TSV. Exporta el extracto bancario a CSV; los documentos profesionales mantienen su circuito de TransportERP.');
      const text = await file.text();
      if (readToken !== statementReadToken || readContext !== activeContext) return;
      const formatContext = {userId: snapshot.userId, householdId: snapshot.householdId, accountId: account.id};
      const savedFormat = readStatementFormat(preferenceStorage, formatContext);
      let info = inspectStatementCsv(text), restoredFormat = false;
      if (savedFormat) {
        try {
          const detected = inspectStatementCsv(text, savedFormat.mapping);
          const matching = matchingStatementFormat(savedFormat, detected.headers);
          if (matching) { info = {...detected, indexes: {...detected.indexes, ...matching}}; restoredFormat = true; }
        } catch { /* A different format uses fresh detection and visible column choices. */ }
      }
      statementDraft = {file: {name:file.name}, text, accountId:account.id, formatContext, info, restoredFormat};
      statementAccountId = account.id; activeReviewKey = null; statementPanelOpen = true;
      renderTreasury3(currentSnapshot);
    } catch(error) {
      if (readToken === statementReadToken && readContext === activeContext) {
        const output = document.getElementById('treasuryCsvResult');
        if (output) { output.className='msg error';output.textContent='No importado: '+error.message+'. El historial anterior se conserva.'; }
      }
    } finally { event.target.value=''; }
  };
  bindBalanceCapture(root,snapshot,vm,renderGeneration);
  persistencePanel?.render(root);
  const detail=root.querySelector('#treasury3Detail'),title=root.querySelector('#treasury3DetailTitle'),body=root.querySelector('#treasury3DetailBody'),mobile=root.querySelector('#treasury3DetailMobile');
  let detailRows=[],selected=new Set();
  const updateSelection=()=>{
    const totals=temporarySelectionSummary(detailRows,selected);
    root.querySelector('#treasury3SelectedTotal').textContent='Seleccionado: '+euro(totals.selected)+' · '+totals.count+' de '+detailRows.length;
    root.querySelector('#treasury3FullTotal').textContent='Total completo: '+euro(totals.all);
    body.innerHTML=selectableMovementRows(detailRows,selected);
    mobile.innerHTML=selectableMovementCards(detailRows,selected);
  };
  detail.onchange=event=>{
    const input=event.target.closest('input[data-treasury-select]');
    if(!input)return;
    const index=Number(input.dataset.treasurySelect);
    if(!Number.isInteger(index)||index<0||index>=detailRows.length)return;
    if(input.checked)selected.add(index);else selected.delete(index);
    updateSelection();
  };
  root.querySelector('#treasury3SelectAll').onclick=()=>{selected=new Set(detailRows.map((_,i)=>i));updateSelection();};
  root.querySelector('#treasury3SelectNone').onclick=()=>{selected.clear();updateSelection();};
  root.querySelector('#treasury3Close').onclick=()=>{detail.classList.add('hidden');detailRows=[];selected.clear();};
  const show=(label,rows)=>{
    detailRows=rows.slice();selected=new Set(detailRows.map((_,i)=>i));
    title.textContent=label+' · '+rows.length+' movimientos';
    updateSelection();
    detail.classList.remove('hidden');
    detail.scrollIntoView({behavior:'smooth',block:'start'});
  };
  const rowsByKey={
    settlement:op.settlementRows,
    monthReal:op.realMonthRows,
    ...monthlyTreasuryBreakdowns(vm),
    monthPlanned:[...op.realMonthRows,...op.currentMonthOpenRows],
    overdue:op.overdueRows,
    today:op.todayRows,
    cut10:op.cut10Rows,
    cut25:op.cut25Rows
  };
  const labels={settlement:'Pendientes de liquidación',monthIncomePending:'Por cobrar · '+monthLabel,monthIncomeReal:'Cobrado · '+monthLabel,monthExpensePending:'Por pagar · '+monthLabel,monthExpenseReal:'Pagado · '+monthLabel,monthReal:'Realizado · '+monthLabel,monthPlanned:'Total previsto del mes · '+monthLabel,overdue:'Vencidos pendientes',today:'Vencen hoy',cut10:'Movimientos hasta '+date(op.cutoff10),cut25:'Movimientos hasta '+date(op.cutoff25)};
  root.querySelectorAll('[data-treasury-operational]').forEach(button=>button.onclick=()=>show(labels[button.dataset.treasuryOperational],rowsByKey[button.dataset.treasuryOperational]||[]));
  const incomeIntervals=habitualIncomeIntervals(vm);
  root.querySelectorAll('[data-treasury-interval]').forEach(button=>button.onclick=()=>{
    const interval=incomeIntervals[Number(button.dataset.treasuryInterval)];
    if(interval)show('Gastos pendientes hasta el cobro habitual del '+date(interval.until),interval.rows.slice().sort((a,b)=>a.date.localeCompare(b.date)));
  });
  if(window.__domusTreasuryReadAdapter){
    root.querySelectorAll('[data-enqueue-checkpoint],[data-enqueue-import],[data-enqueue-confirmations],[data-sync-treasury]').forEach(button=>{button.disabled=true;button.title='Guardado remoto no disponible en este adaptador';});
  }
  return vm;
}
window.DOMUSTreasury3 = { render: renderTreasury3, reset: resetTreasury3, snapshot: createTreasurySnapshot, configurePersistence, configureStatementCreation, configureStatementInspection, statementSaved, normalize: normalizeTreasuryItem, monthly: monthlyTreasury, summary: () => lastViewModel };
window.dispatchEvent(new CustomEvent('domus-treasury3-ready'));
