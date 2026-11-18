/* DOMUS 4.0 Beta Familias — ayuda contextual no invasiva.
   No toca datos ni sustituye las comprobaciones de aislamiento multi-hogar. */
(() => {
  'use strict';
  const topics = {
    dashboard: ['Inicio', 'Aquí aparecen los movimientos y avisos más relevantes. Revisa primero lo pendiente de hoy y entra en cada elemento para comprobarlo.'],
    treasury: ['Dinero y cuentas', 'Consulta tus cuentas, saldos y entradas o salidas de dinero. Antes de importar un extracto comprueba la cuenta y el periodo; revisa los movimientos propuestos antes de confirmarlos.'],
    calendar: ['Agenda', 'La agenda muestra ingresos, pagos y previsiones por fecha. Abre un día para revisar sus elementos. Una previsión no es necesariamente un pago realizado.'],
    movements: ['Movimientos', 'Registra ingresos y gastos, corrige importes y fechas y comprueba quién paga o cobra. Guarda y verifica que el movimiento aparece en la lista.'],
    budgets: ['Previsiones', 'Anota ingresos y gastos habituales con importe estimado, fecha y periodicidad. Cuando llegue el recibo real, comprueba la coincidencia antes de crear otro movimiento.'],
    stats: ['Informes', 'Selecciona el periodo y revisa el desglose de ingresos y gastos. Comprueba los movimientos que lo componen antes de tomar decisiones.'],
    documents: ['Documentos', 'Sube una factura o justificante. Revisa fecha, proveedor, concepto e importe antes de confirmar: la lectura automática puede equivocarse.'],
    settings: ['Ajustes y reglas', 'Configura las cuentas, categorías y preferencias. Una regla funciona así: SI un movimiento cumple ciertas condiciones, ENTONCES DOMUS propone una clasificación. Comprueba su efecto antes de activarla.']
  };
  const css = document.createElement('style');
  css.textContent = `
  #domusHelpButton{position:fixed;right:18px;bottom:calc(78px + env(safe-area-inset-bottom,0px));z-index:79;width:52px;height:52px;border-radius:50%;border:2px solid #fff;background:#073b3a;color:#fff;font-weight:800;font-size:24px;box-shadow:0 4px 20px #0004;cursor:pointer}
  #domusHelpDialog{position:fixed;inset:0;z-index:100;background:#0009;display:none;align-items:center;justify-content:center;padding:16px}
  #domusHelpDialog[aria-hidden="false"]{display:flex}
  #domusHelpPanel{width:min(520px,100%);max-height:85vh;overflow:auto;border-radius:16px;padding:22px;background:var(--panel,#fff);color:var(--ink,#172033);box-shadow:0 12px 48px #0005}
  #domusHelpPanel h2{margin:0 0 12px}#domusHelpPanel p{line-height:1.55}
  #domusHelpPanel button{margin:6px 8px 0 0;padding:9px 12px;border-radius:9px;border:1px solid #888;background:transparent;color:inherit}
  #domusHelpPanel button.primary{background:#073b3a;color:white}
  `;
  document.head.appendChild(css);
  const trigger = document.createElement('button');
  trigger.id='domusHelpButton'; trigger.type='button';trigger.textContent='?';trigger.setAttribute('aria-label','Abrir ayuda de DOMUS');
  const dialog=document.createElement('div');dialog.id='domusHelpDialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-hidden','true');dialog.setAttribute('aria-labelledby','domusHelpTitle');
  dialog.innerHTML='<section id="domusHelpPanel"><h2 id="domusHelpTitle"></h2><p id="domusHelpBody"></p><div><button type="button" id="domusHelpIntro">Primeros pasos</button><button type="button" class="primary" id="domusHelpClose">Cerrar</button></div></section>';
  let previousFocus=null;
  const activeTopic=()=>document.querySelector('nav button.active[data-view],.bottom-nav button.active[data-view]')?.dataset.view||'dashboard';
  function show(intro=false){
    previousFocus=document.activeElement;
    const [title,body]=intro?['Bienvenido a DOMUS','Empieza en Ajustes para revisar las cuentas y categorías de tu hogar. Después registra tus ingresos habituales y tus gastos previstos. Consulta Inicio para lo urgente, Agenda para las fechas y Movimientos para registrar lo que realmente sucede. Puedes abrir esta ayuda con ? en cualquier momento. No necesitas indicar cuántas personas viven en casa. Comparte el acceso solo cuando quieras.']:topics[activeTopic()]||topics.dashboard;
    dialog.querySelector('#domusHelpTitle').textContent=title;
    dialog.querySelector('#domusHelpBody').textContent=body;
    dialog.setAttribute('aria-hidden','false');dialog.querySelector('#domusHelpClose').focus();
  }
  function close(){dialog.setAttribute('aria-hidden','true');previousFocus?.focus?.();}
  trigger.addEventListener('click',()=>show(false));
  dialog.querySelector('#domusHelpIntro').addEventListener('click',()=>show(true));
  dialog.querySelector('#domusHelpClose').addEventListener('click',close);
  dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog.getAttribute('aria-hidden')==='false'){e.preventDefault();close();}});
  document.body.append(trigger,dialog);
})();
