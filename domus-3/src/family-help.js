(() => {
  'use strict';

  const topics = {
    dashboard: ['Inicio', 'Revisa lo pendiente de hoy y los pagos de los próximos siete días. Abre una fila para ver el detalle. Usa «Añadir sin ticket» para registrar un pago o cobro.'],
    treasury: ['Dinero y conciliación', 'Abre la cuenta que quieras revisar. En conciliación, selecciona esa misma cuenta e importa su extracto. Comprueba las coincidencias propuestas. Abre cada fila dudosa para asociarla al movimiento correcto o registrar el que falte.'],
    calendar: ['Agenda', 'Elige un día para consultar cobros y pagos. Abre un movimiento para editarlo o confirmar que ya ocurrió. Si todavía lo esperas, conserva su estado pendiente.'],
    movements: ['Movimientos', 'Añade un gasto o ingreso con concepto, importe y fecha. Elige Pendiente si todavía lo esperas y Realizado si ya ocurrió. Para repetirlo, abre «Más detalles y repetición» y elige la frecuencia. Abre una fila guardada para revisarla o editarla.'],
    budgets: ['Planes', 'Crea un presupuesto para un proyecto o una compra y añade sus partidas previstas. Revisa cada partida antes de convertirla en movimiento. Para un recibo que se repite, usa la repetición del formulario de Movimientos.'],
    stats: ['Informes', 'Elige el periodo y filtra por categoría o cuenta. Revisa las filas de la consulta antes de usar «Imprimir / Guardar PDF».'],
    documents: ['Documentos', 'Sube el justificante y abre su propuesta. Corrige el concepto, la fecha, el importe y la cuenta antes de guardar. Si el gasto o ingreso ya existe, comprueba el vínculo para evitar duplicados.'],
    settings: ['Ajustes', 'Añade tus cuentas, formas de pago y categorías. Utiliza Editar para corregir un nombre y desactiva lo que ya no uses. Crea y revisa las reglas de clasificación en esta misma pantalla.'],
    rules: ['Reglas de clasificación', 'En Ajustes, crea una regla con una condición y un resultado. Por ejemplo, si el concepto contiene «supermercado», DOMUS propone Alimentación. Se comprueban primero las prioridades con número más bajo. Guarda la regla activa y abre un movimiento nuevo de ejemplo: revisa la propuesta antes de aceptar o guardar. Si dos reglas coinciden, revisa la prioridad y la propuesta que aparece. En Ajustes puedes editar o desactivar la regla.'],
    sharing: ['Compartir el hogar', 'El acceso a esta revisión está limitado al propietario. Las invitaciones quedan pendientes de la aprobación de la beta.']
  };

  const steps = [
    ['Tu hogar digital', 'Ya puedes configurar tus ingresos, cuentas y gastos habituales. Puedes avanzar y volver a este recorrido cuando quieras.'],
    ['Ingresos habituales', 'Registra tu nómina, pensión, prestación, alquiler o ingresos de tu actividad. Indica cuándo esperas cobrar y cada cuánto se repite.', 'Añadir un ingreso', 'income'],
    ['Cuentas', 'En Ajustes, escribe un nombre para tu banco o caja y pulsa «Añadir cuenta». Puedes registrar varias cuentas.', 'Configurar cuentas', 'accounts'],
    ['Gastos habituales', 'Registra el alquiler, los seguros o los recibos. Indica el importe previsto, la primera fecha y la frecuencia.', 'Añadir un gasto', 'expense'],
    ['Resumen', 'En Inicio verás lo más próximo. Usa Agenda para revisar fechas y Movimientos para confirmar los cobros y pagos. Puedes volver al recorrido desde el botón ?.']
  ];

  const trigger = document.createElement('button');
  trigger.id = 'domusHelpButton';
  trigger.type = 'button';
  trigger.textContent = '?';
  trigger.setAttribute('aria-label', 'Abrir ayuda de DOMUS');
  const dialog = document.createElement('dialog');
  dialog.id = 'domusHelpDialog';
  dialog.setAttribute('aria-labelledby', 'domusHelpTitle');
  dialog.innerHTML = `
    <h2 id="domusHelpTitle"></h2>
    <p id="domusHelpBody"></p>
    <div class="actions">
      <button type="button" id="familyHelpAction" class="btn primary"></button>
      <button type="button" id="familyHelpBack" class="btn">Atrás</button>
      <button type="button" id="familyHelpNext" class="btn">Continuar</button>
      <button type="button" id="familyHelpGuide" class="btn">Primeros pasos</button>
      <button type="button" id="familyHelpRules" class="btn">Reglas</button>
      <button type="button" id="familyHelpSharing" class="btn">Compartir</button>
      <button type="button" id="familyHelpClose" class="btn" autofocus>Cerrar</button>
    </div>`;
  document.body.append(trigger, dialog);

  const el = id => document.getElementById(id);
  const next = el('familyHelpNext');
  const action = el('familyHelpAction');
  let step = 0;
  let active = null;
  let completed = false;

  function activeTopic() {
    if (el('ruleEditor')?.classList.contains('show')) return 'rules';
    if (el('movementModal')?.classList.contains('show')) return 'movements';
    return el('appScreen').querySelector('button.active[data-view]')?.dataset.view || 'dashboard';
  }

  function present(topic) {
    const guide = topic === 'guide';
    const [title, body, label, destination] = guide ? steps[step] : topics[topic];
    el('domusHelpTitle').textContent = title;
    el('domusHelpBody').textContent = body;
    el('familyHelpBack').hidden = !guide || step === 0;
    el('familyHelpGuide').hidden = guide || !active;
    el('familyHelpRules').hidden = guide || topic === 'rules' || !active;
    el('familyHelpSharing').hidden = guide || topic === 'sharing' || !active;
    action.hidden = !destination;
    action.textContent = label || '';
    action.onclick = destination ? () => {
      dialog.close();
      const nav = window.DOMUSFamilyNavigation;
      if (destination === 'accounts') {
        nav.showView('settings');
        el('newAccount').focus();
        return;
      }
      nav.showView('movements');
      nav.openForm();
      nav.setSimpleMovementMode(false);
      el('fType').value = destination;
      el('fStatus').value = 'pending';
      el('fRecurrence').value = 'monthly';
      nav.syncPrefFields();
      nav.captureMovementForm();
    } : null;
    next.hidden = !guide;
    next.textContent = step === steps.length - 1 ? 'Ir a Inicio' : 'Continuar';
    if (!dialog.open) dialog.showModal();
  }

  function storageKey() {
    return 'domus4-guide:' + active.userId + ':' + active.householdId;
  }

  next.onclick = () => {
    if (step < steps.length - 1) {
      step += 1;
      present('guide');
      return;
    }
    if (active) {
      try { localStorage.setItem(storageKey(), 'complete'); } catch {}
      completed = true;
    }
    dialog.close();
    window.DOMUSFamilyNavigation.showView('dashboard');
  };
  el('familyHelpBack').onclick = () => { step -= 1; present('guide'); };
  el('familyHelpGuide').onclick = () => { if (completed) step = 0; present('guide'); };
  el('familyHelpRules').onclick = () => present('rules');
  el('familyHelpSharing').onclick = () => present('sharing');
  el('familyHelpClose').onclick = () => dialog.close();
  trigger.onclick = () => {
    if (active) present(activeTopic());
    else {
      topics.access = ['Acceso a DOMUS', 'Entra con tu cuenta de la beta. Después podrás crear tu hogar digital y configurar tus ingresos, cuentas y gastos.'];
      present('access');
    }
  };
  window.DOMUSFamilyHelp = Object.freeze({
    start(context) {
      if (active?.userId === context.userId && active.householdId === context.householdId) return;
      active = context;
      step = 0;
      completed = false;
      try { completed = localStorage.getItem(storageKey()) === 'complete'; } catch {}
      if (completed) return;
      present('guide');
    },
    reset() {
      if (active && dialog.open) dialog.close();
      active = null;
    }
  });
})();
