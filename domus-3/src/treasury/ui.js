import { normalizeTreasuryItem } from './engine.js';
import { createPersistenceRuntime } from './persistence-runtime.js';
import { createIndexedDbOutbox } from './outbox-store.js';
import { createPersistencePanel } from './persistence-panel.js';
import { createTreasuryPersistence } from './persistence.js';
import { createTreasurySnapshot } from './snapshot.js';
import { buildCheckpointDraft } from './checkpoint-draft.js';
import { createTreasuryViewModel, monthlyTreasury } from './view-model.js';
import { reconcileStatement, reconciliationSummary } from './reconciliation.js';
import { createReviewSession, decideReview, reviewSummary, selectReviewCandidate } from './reconciliation-review.js';
import { parseStatementCsv, inspectStatementCsv } from './statement-csv.js';
import { accountWithLocalCheckpoint, createLocalCheckpoint, validateAccountReconciliation } from './balance-checkpoint.js';
import { buildReconciliationReport, createStatementFingerprint, movementsForStatementAccount, reconciliationReportFileName, serializeReconciliationReport } from './reconciliation-report.js';

const euro = value => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
const date = value => value ? new Intl.DateTimeFormat('es-ES').format(new Date(`${value}T12:00:00`)) : 'Sin fecha prevista';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const LABEL = { previsto: 'Previsto futuro', pendiente: 'Pendiente hoy', vencido: 'Vencido', realizado: 'Realizado histórico', reprogramado: 'Reprogramado', prefinanciado: 'Prefinanciado', liquidado: 'Liquidado' };
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
 const overdueRows=vm.open.filter(r=>r.date<monthStart),todayRows=vm.open.filter(r=>r.date===today),currentMonthOpenRows=vm.open.filter(r=>r.date>=monthStart&&r.date<=monthEnd),commitmentRows=vm.open.filter(r=>r.date<=monthEnd),realMonthRows=monthly.realizedRows;
 const overdue=treasuryTotals(overdueRows),todayTotals=treasuryTotals(todayRows),currentMonthOpen=treasuryTotals(currentMonthOpenRows),commitment=treasuryTotals(commitmentRows),realMonth=treasuryTotals(realMonthRows);
 const plannedMonth=monthly.planned;
 const projected=confirmedCount>0&&confirmedCount===totalAccounts?available+commitment.net:null,projectedComplete=confirmedCount>0&&confirmedCount===totalAccounts;
 const nextCutoff=day=>{const d=new Date(today+'T12:00:00');let y=d.getFullYear(),m=d.getMonth();if(d.getDate()>day){m++;if(m>11){m=0;y++;}}return y+'-'+String(m+1).padStart(2,'0')+'-'+String(day).padStart(2,'0')};
 const cutoff10=nextCutoff(10),cutoff25=nextCutoff(25);
 const cut10Rows=vm.open.filter(r=>r.date<=cutoff10),cut25Rows=vm.open.filter(r=>r.date<=cutoff25),cut10=treasuryTotals(cut10Rows),cut25=treasuryTotals(cut25Rows);
 return {today,monthStart,monthEnd,overdueRows,todayRows,currentMonthOpenRows,realMonthRows,commitmentRows,overdue,todayTotals,currentMonthOpen,realMonth,plannedMonth,commitment,projected,projectedComplete,cutoff10,cutoff25,cut10Rows,cut25Rows,cut10,cut25,cutoff10Balance:projectedComplete?available+cut10.net:null,cutoff25Balance:projectedComplete?available+cut25.net:null};
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
function movementRows(rows) { if (!rows.length) return '<tr><td colspan="5" class="empty">Sin movimientos en este desglose.</td></tr>'; return rows.map(row => `<tr><td>${date(row.date)}</td><td><span class="pill">${esc(LABEL[row.status] || row.status)}</span></td><td>${esc(row.concept)}</td><td>${row.type === 'income' ? 'Ingreso' : 'Pago'}</td><td class="amount ${row.type}">${row.type === 'income' ? '+' : '−'}${euro(row.amount)}</td></tr>`).join(''); }
function movementCards(rows){if(!rows.length)return '<div class="empty">Sin movimientos en este desglose.</div>';return rows.map(row=>`<article class="treasury-mobile-movement"><div class="treasury-mobile-movement-top"><div><strong>${esc(row.concept)}</strong><small>${date(row.date)} · ${esc(LABEL[row.status]||row.status)}</small></div><span class="amount ${row.type}">${row.type==='income'?'+':'−'}${euro(row.amount)}</span></div><div class="treasury-mobile-movement-type">${row.type==='income'?'Ingreso':'Pago'}</div></article>`).join('')}
function reconciliationRows(session) { return session.rows.map(row => { const locked = row.decision !== 'pendiente'; return `<tr><td>${date(row.statement.date)}</td><td>${esc(row.statement.concept)}</td><td class="amount ${row.statement.signedAmount < 0 ? 'expense' : 'income'}">${euro(row.statement.signedAmount)}</td><td><span class="pill">${esc(locked ? row.decision : row.matchStatus.replaceAll('_', ' '))}</span></td><td>${row.candidates.length ? `<select class="treasury-review-select" data-review-select="${esc(row.statement.id)}" ${locked ? 'disabled' : ''}><option value="">Seleccionar…</option>${row.candidates.map(candidate => `<option value="${esc(candidate.id)}" ${candidate.id === row.selectedMovementId ? 'selected' : ''}>${esc(candidate.concept)}${candidate.id === row.candidates[0]?.id ? ` · ${row.score}%` : ''}</option>`).join('')}</select>` : '<strong>Sin coincidencia</strong><br><small class="muted">No se crea movimiento</small>'}</td><td><div class="actions"><button class="btn primary" type="button" data-review-confirm="${esc(row.statement.id)}" ${locked || !row.selectedMovementId ? 'disabled' : ''}>Conciliar</button><button class="btn" type="button" data-review-discard="${esc(row.statement.id)}" ${locked ? 'disabled' : ''}>Descartar</button></div></td></tr>`; }).join(''); }
function balanceCaptureRows(accounts, asOf) { if (!accounts.length) return '<div class="empty">No hay cuentas configuradas.</div>'; return accounts.map(account => { const checkpoint = checkpointFor(account.id); return `<div class="treasury-balance-form" data-balance-account="${esc(account.id)}"><h3>${esc(account.name || 'Cuenta sin nombre')}</h3><div class="treasury-balance-grid"><label>Saldo que muestra el banco<input data-opening-amount type="number" step="0.01" value="${checkpoint?.amount ?? ''}" placeholder="0,00"></label><label>Fecha de ese saldo<input data-opening-date type="date" max="${esc(asOf)}" value="${checkpoint?.date ?? esc(asOf)}"></label><button class="btn" type="button" data-save-opening>Aplicar saldo</button></div><details class="treasury-balance-check"><summary>Comprobar más adelante si DOMUS cuadra con el banco</summary><div class="treasury-balance-grid"><label>Saldo bancario a comprobar<input data-closing-amount type="number" step="0.01" placeholder="0,00"></label><label>Fecha del saldo bancario<input data-closing-date type="date" max="${esc(asOf)}" value="${esc(asOf)}"></label><button class="btn" type="button" data-check-balance ${checkpoint ? '' : 'disabled'}>Comprobar cuadre</button><button class="btn" type="button" data-download-checkpoint>Descargar copia técnica</button></div></details><div data-balance-result class="muted">${checkpoint ? `${checkpoint.persisted ? "Saldo guardado" : "Saldo pendiente de guardar"}: ${euro(checkpoint.amount)} a ${date(checkpoint.date)}.` : 'Introduce el saldo actual y la fecha. DOMUS empezará a calcular desde ese punto.'}</div></div>`; }).join(''); }

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
    output.innerHTML = `${entry.stale ? '<div class="msg error">Los movimientos han cambiado. Esta revisión conserva las decisiones anteriores y requiere un nuevo análisis antes de confirmar.</div>' : ''}${message ? `<div class="msg ${message.kind}">${esc(message.text)}</div>` : ''}<div class="msg info">Cuenta: <strong>${esc(metadata.account.name)}</strong> · Huella ${esc(metadata.fingerprint.contentSha256.slice(0, 12))}… · Modo seguro: ${metadata.automatic.propuesto} coincidencias claras, ${metadata.automatic.ambiguo} ambiguas, ${metadata.automatic.revisar} para revisar y ${metadata.automatic.sin_coincidencia} sin coincidencia. Ninguna línea del banco crea movimientos.</div><div class="section-title treasury-review-summary"><div><strong>${summary.total} líneas</strong> · ${summary.confirmada} conciliadas localmente · ${summary.descartada} descartadas · ${summary.pendiente} pendientes. Las líneas sin coincidencia permanecen sin contabilizar.</div><button class="btn" type="button" data-download-review>Descargar informe</button></div><div class="table-wrap" tabindex="0" role="region" aria-label="Tabla desplazable horizontalmente"><table class="table"><thead><tr><th>Fecha</th><th>Extracto</th><th>Importe</th><th>Estado</th><th>Movimiento DOMUS</th><th>Decisión</th></tr></thead><tbody>${reconciliationRows(session)}</tbody></table></div>`;
    persistencePanel?.bindReview(output, entry);
    output.querySelectorAll('[data-review-select]').forEach(select => select.onchange = () => { if (generation !== renderGeneration || entry.stale) return; try { session = selectReviewCandidate(session, select.dataset.reviewSelect, select.value); render(); } catch (error) { render({ kind: 'error', text: error.message }); } });
    output.querySelectorAll('[data-review-confirm]').forEach(button => button.onclick = () => { if (generation !== renderGeneration || entry.stale) return; try { persistencePanel?.captureDecision(entry, button.dataset.reviewConfirm, session); session = decideReview(session, button.dataset.reviewConfirm, 'confirmada'); render({ kind: 'ok', text: 'Coincidencia confirmada solo para esta revisión local.' }); } catch (error) { render({ kind: 'error', text: error.message }); } });
    output.querySelectorAll('[data-review-discard]').forEach(button => button.onclick = () => { try { session = decideReview(session, button.dataset.reviewDiscard, 'descartada'); render(); } catch (error) { render({ kind: 'error', text: error.message }); } });
    if (entry.stale) output.querySelectorAll('[data-review-confirm], [data-review-select], [data-review-discard]').forEach(control => control.disabled = true);
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
  currentSnapshot = snapshot;
  ++renderGeneration;
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
  const incomePct=op.plannedMonth.income?Math.min(100,Math.round(op.realMonth.income/op.plannedMonth.income*100)):0;
  const expensePct=op.plannedMonth.expense?Math.min(100,Math.round(op.realMonth.expense/op.plannedMonth.expense*100)):0;
  const dueIncome=op.currentMonthOpen.income,dueExpense=op.currentMonthOpen.expense;
  const overdueCount=op.overdueRows.length,todayCount=op.todayRows.length;

  root.innerHTML = `<div class="treasury-simple-head">
    <div><span class="home-kicker">Tesorería</span><h2>Tu dinero, sin rodeos</h2><p class="muted">Ingresos, gastos y resultado del mes. Los saldos bancarios se calculan por separado.</p></div>
  </div>

  <div class="treasury-hero-grid">
    <div class="card treasury-hero-card">
      <span class="label">Resultado realizado del mes</span>
      <strong class="treasury-hero-value">${euro(op.realMonth.net)}</strong>
      <small>Cobrado − pagado en el mes.</small>
    </div>
    <div class="card treasury-hero-card treasury-end-card">
      <span class="label">Resultado previsto del mes</span>
      <strong class="treasury-hero-value ${endClass}">${endBalance}</strong>
      <small>Ingresos del mes − gastos del mes. Sin arrastre de saldos.</small>
    </div>
  </div>

  <div class="treasury-flow-grid">
    <button class="card treasury-flow-card clickable" type="button" data-treasury-operational="monthIncome">
      <div class="treasury-flow-head"><span>Ingresos del mes</span><strong>${euro(op.plannedMonth.income)} previstos</strong></div>
      <div class="treasury-progress"><span style="width:${incomePct}%"></span></div>
      <div class="treasury-flow-stats"><span><small>Cobrado</small><b class="income">${euro(op.realMonth.income)}</b></span><span><small>Queda por cobrar</small><b class="income">${euro(dueIncome)}</b></span></div>
      <small class="muted">Toca para ver todos los cobros del mes. Los vencidos aparecen también en Atención.</small>
    </button>
    <button class="card treasury-flow-card clickable" type="button" data-treasury-operational="monthExpense">
      <div class="treasury-flow-head"><span>Pagos del mes</span><strong>${euro(op.plannedMonth.expense)} previstos</strong></div>
      <div class="treasury-progress"><span style="width:${expensePct}%"></span></div>
      <div class="treasury-flow-stats"><span><small>Pagado</small><b class="expense">${euro(op.realMonth.expense)}</b></span><span><small>Queda por pagar</small><b class="expense">${euro(dueExpense)}</b></span></div>
      <small class="muted">Toca para ver todos los pagos del mes. Los vencidos aparecen también en Atención.</small>
    </button>
  </div>

  <details class="card"><summary>Saldos bancarios y conciliación</summary>
    <p>Saldo confirmado y movimientos posteriores a su fecha de referencia. Sin referencia, el saldo es desconocido.</p>
    ${accountCards(vm)}
    ${balanceCaptureRows(accounts,vm.today)}
    <div class="treasury-advanced"></div>
  <div class="card treasury-cutoff-card">
    <div class="section-title"><div><h2>Próximos cortes de caja</h2><p class="muted">Tus dos fechas de referencia habituales.</p></div></div>
    <div class="treasury-cutoff-grid">
      <button type="button" class="treasury-cutoff clickable" data-treasury-operational="cut10"><small>Saldo previsto · ${date(op.cutoff10)}</small><strong>${op.cutoff10Balance==null?'—':euro(op.cutoff10Balance)}</strong><span>Por cobrar ${euro(op.cut10.income)} · por pagar ${euro(op.cut10.expense)}</span></button>
      <button type="button" class="treasury-cutoff clickable" data-treasury-operational="cut25"><small>Saldo previsto · ${date(op.cutoff25)}</small><strong>${op.cutoff25Balance==null?'—':euro(op.cutoff25Balance)}</strong><span>Por cobrar ${euro(op.cut25.income)} · por pagar ${euro(op.cut25.expense)}</span></button>
    </div>
  </div>

  </details>
  <div class="card treasury-attention-card">
    <div class="section-title"><div><h2>Atención</h2><p class="muted">Solo lo que necesita revisión ahora.</p></div></div>
    <div class="treasury-attention-grid">
      <button type="button" class="treasury-attention-item clickable ${overdueCount?'attention':''}" data-treasury-operational="overdue"><span>Vencidos</span><strong>${overdueCount}</strong><small>Cobros ${euro(op.overdue.income)} · pagos ${euro(op.overdue.expense)}</small></button>
      <button type="button" class="treasury-attention-item clickable" data-treasury-operational="today"><span>Vencen hoy</span><strong>${todayCount}</strong><small>Cobros ${euro(op.todayTotals.income)} · pagos ${euro(op.todayTotals.expense)}</small></button>
    </div>
  </div>

  <div id="treasury3Detail" class="card hidden"><div class="section-title treasury-detail-head"><h2 id="treasury3DetailTitle">Desglose</h2><button class="btn" type="button" id="treasury3Close">Cerrar</button></div><div id="treasury3DetailMobile" class="treasury-detail-mobile"></div><div class="table-wrap treasury-detail-table" tabindex="0" role="region" aria-label="Detalle de tesorería"><table class="table"><thead><tr><th>Fecha</th><th>Estado</th><th>Concepto</th><th>Tipo</th><th>Importe</th></tr></thead><tbody id="treasury3DetailBody"></tbody></table></div></div>`;

  bindBalanceCapture(root,snapshot,vm,renderGeneration);
  persistencePanel?.render(root);
  root.querySelector('#treasury3Close').onclick=()=>root.querySelector('#treasury3Detail').classList.add('hidden');
  const detail=root.querySelector('#treasury3Detail'),title=root.querySelector('#treasury3DetailTitle'),body=root.querySelector('#treasury3DetailBody'),mobile=root.querySelector('#treasury3DetailMobile');
  const show=(label,rows)=>{title.textContent=label+' · '+rows.length+' movimientos · '+euro(treasuryTotals(rows).net);body.innerHTML=movementRows(rows);mobile.innerHTML=movementCards(rows);detail.classList.remove('hidden');detail.scrollIntoView({behavior:'smooth',block:'start'});};
  const rowsByKey={
    monthIncome:[...op.currentMonthOpenRows,...op.realMonthRows].filter(r=>r.type==='income'),
    monthExpense:[...op.currentMonthOpenRows,...op.realMonthRows].filter(r=>r.type==='expense'),
    overdue:op.overdueRows,
    today:op.todayRows,
    cut10:op.cut10Rows,
    cut25:op.cut25Rows
  };
  const labels={monthIncome:'Ingresos del mes · previstos y cobrados',monthExpense:'Gastos del mes · previstos y pagados',overdue:'Vencidos pendientes',today:'Vencen hoy',cut10:'Movimientos hasta '+date(op.cutoff10),cut25:'Movimientos hasta '+date(op.cutoff25)};
  root.querySelectorAll('[data-treasury-operational]').forEach(button=>button.onclick=()=>show(labels[button.dataset.treasuryOperational],rowsByKey[button.dataset.treasuryOperational]||[]));
  return vm;
}
window.DOMUSTreasury3 = { render: renderTreasury3, reset: resetTreasury3, snapshot: createTreasurySnapshot, configurePersistence, normalize: normalizeTreasuryItem, monthly: monthlyTreasury, summary: () => lastViewModel };
window.dispatchEvent(new CustomEvent('domus-treasury3-ready'));
