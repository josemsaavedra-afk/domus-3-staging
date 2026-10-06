// Shared catalog rules. No account-to-person inference and no remote writes.
(() => {
  const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
  const variableAliases = new Set(['variables', 'variable', 'nueva linea de negocio', 'variable / nueva linea', 'variable/nueva linea', 'variable / nueva linea de negocio']);
  const categoryLabel = row => variableAliases.has(key(row?.name)) ? 'Variables' : String(row?.name || 'Sin categoría');
  function selectable(rows, currentId = '', history = false) {
    const result = rows.filter(row => history || row.active !== false || row.id === currentId);
    if (currentId && !rows.some(row => row.id === currentId)) result.push({id: currentId, name: 'Referencia histórica no disponible', active: false});
    return result;
  }
  function options(rows, currentId, {history = false, category = false, empty = 'Sin asignar'} = {}) {
    const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    return `<option value="">${escape(empty)}</option>` + selectable(rows, currentId, history).map(row => `<option value="${escape(row.id)}"${row.id === currentId ? ' selected' : ''}>${escape(category ? categoryLabel(row) : row.name)}${row.active === false ? ' (inactivo)' : ''}</option>`).join('');
  }
  function validateMovement(row, previous, catalogs) {
    if (previous && row.household_id !== previous.household_id) throw new Error('No se puede trasladar un movimiento a otro hogar.');
    for (const [field, table] of [['person_id','people'],['payer_person_id','people'],['account_id','accounts'],['category_id','categories']]) {
      const value = row[field];
      if (!value || (previous && value === previous[field])) continue;
      const found = catalogs[table].find(item => item.id === value && item.household_id === row.household_id);
      if (!found || found.active === false) throw new Error('Selecciona miembros, cuentas y categorías activos del hogar. El histórico se conserva.');
    }
    if (row.counterparty_id && row.counterparty_id !== previous?.counterparty_id) {
      const found = (catalogs.counterparties || window.domusCounterparties || []).find(x=>x.id===row.counterparty_id && x.household_id===row.household_id && x.active!==false);
      if (!found) throw new Error('Selecciona un tercero activo del hogar.');
    }
    const labels=window.domusLabels || {};
    if(row.activity_project_id && row.activity_project_id!==previous?.activity_project_id && !(labels.activities||[]).some(x=>x.id===row.activity_project_id&&x.household_id===row.household_id&&x.active!==false))throw new Error('Selecciona una actividad activa del hogar.');
    for(const id of row.tag_ids||[])if(!(previous?.tag_ids||[]).includes(id)&&!(labels.tags||[]).some(x=>x.id===id&&x.household_id===row.household_id&&x.active!==false))throw new Error('Selecciona etiquetas activas del hogar.');
    return row;
  }
  const equivalentCategory = (rows, name, exceptId) => rows.find(row => row.id !== exceptId && key(categoryLabel(row)) === key(categoryLabel({name})));
  function masterPayload(table, input, rows, currentId = '') {
    if (!['people','accounts','categories','counterparties','activity_projects','tags'].includes(table)) throw new Error('Maestro no admitido.');
    let name = String(input.name || '').trim();
    if (!name) throw new Error('Indica un nombre.');
    const current = rows.find(row => row.id === currentId);
    if (currentId && !current) throw new Error('El elemento ya no está disponible.');
    if (table === 'categories') {
      name = categoryLabel({name});
      if (current && categoryLabel(current) === 'Variables' && name !== 'Variables') throw new Error('Variables conserva su identidad y nombre maestro.');
      if (equivalentCategory(rows, name, currentId)) throw new Error('Esta categoría ya existe. Edítala o reactívala en la lista.');
      if (!['income','expense','both'].includes(input.kind)) throw new Error('Selecciona el tipo de categoría.');
    }
    const payload = {name};
    if (table === 'categories') payload.kind = input.kind;
    if (table === 'accounts') {
      const order = input.sort_order === '' || input.sort_order == null ? 0 : Number(input.sort_order);
      if (!Number.isSafeInteger(order) || order < -2147483648 || order > 2147483647) throw new Error('El orden debe ser un número entero.');
      payload.sort_order = order;
    }
    if (table === 'counterparties') {
      if (rows.some(row => row.id !== currentId && key(row.name) === key(name))) throw new Error('Este tercero ya existe; edítalo o reactívalo.');
      payload.aliases = [...new Set(String(input.aliases || '').split(/\r?\n/).map(x=>x.trim()).filter(Boolean))];
    }
    if (['activity_projects','tags'].includes(table) && rows.some(row=>row.id!==currentId && key(row.name)===key(name))) throw new Error('Este nombre ya existe; edítalo o reactívalo.');
    return payload;
  }
  function labelOptions(rows, selected = []) {
    const ids = Array.isArray(selected) ? selected : [];
    const catalog = rows.filter(x=>x.active!==false || ids.includes(x.id));
    for(const id of ids) if(!catalog.some(x=>x.id===id))catalog.push({id,name:'Referencia histórica no disponible',active:false});
    return catalog.map(row=>options([row],ids.includes(row.id)?row.id:null).replace(/^<option[^>]*>[^<]*<\/option>/,'')).join('');
  }
  function labelFields(activity, tags, previous = {}) {
    const ids=[...new Set(tags || [])];
    return window.domusLabels?.ready || activity || ids.length || Object.hasOwn(previous,'activity_project_id') || Object.hasOwn(previous,'tag_ids') ? {activity_project_id:activity || null,tag_ids:ids} : {};
  }
  function labelName(rows,id){const row=(rows||[]).find(x=>x.id===id);return row?row.name+(row.active===false?' (inactivo)':''):id?'Referencia histórica no disponible':''}
  function labelText(row){return [labelName(window.domusLabels?.activities,row.activity_project_id),...(row.tag_ids||[]).map(id=>labelName(window.domusLabels?.tags,id))].filter(Boolean).join(' · ')}

  function matchCounterparty(text, rows = window.domusCounterparties || []) {
    if (!key(text)) return null;
    const matches = rows.filter(row => row.active !== false && [row.name,...(row.aliases || [])].some(name => key(name) === key(text)));
    return matches.length === 1 ? matches[0].id : null;
  }
  function counterpartyFields(id, previous = {}) {
    if (id || window.domusCounterpartiesReady || Object.hasOwn(previous,'counterparty_id')) return {counterparty_id:id || null};
    return {};
  }
  function counterpartyLabel(row) {
    const found = (window.domusCounterparties || []).find(x => x.id === row.counterparty_id);
    return found ? found.name + (found.active === false ? ' (inactivo)' : '') : row.counterparty || (row.counterparty_id ? 'Referencia histórica no disponible' : '');
  }
  // Only explicit, unambiguous document fields propose identities. A bank name
  // or a person's name elsewhere in the text does not establish their role.
  function documentProposal(text, type, catalogs) {
    const fields = new Map();
    for (const line of String(text || '').split(/\r?\n/)) {
      const match = line.match(/^\s*([^:]+):\s*(.+?)\s*$/);
      if (!match) continue;
      const label = key(match[1]);
      fields.set(label, [...(fields.get(label) || []), match[2]]);
    }
    const values = labels => labels.flatMap(label => fields.get(label) || []);
    const unique = list => { const distinct = [...new Set(list)]; return distinct.length === 1 ? distinct[0] : null; };
    const match = (labels, rows, label = row => row.name) => {
      const evidence = values(labels);
      if (!evidence.length) return null;
      const matches = evidence.map(value => {
        const candidates = rows.filter(row => row.active !== false && key(label(row)) === key(value));
        return candidates.length === 1 ? candidates[0].id : null;
      });
      return matches.includes(null) ? null : unique(matches);
    };
    const scopeNames = {domestico:'domestic', 'actividad economica':'business', mixto:'mixed'};
    const scopes = values(['ambito', 'ambito del gasto']).map(value => Object.hasOwn(scopeNames, key(value)) ? scopeNames[key(value)] : null);
    return {
      person_id: match(['titular economico', 'de quien es'], catalogs.people),
      payer_person_id: match(type === 'income' ? ['cobrador', 'cobrado por', 'quien cobra'] : ['pagador', 'pagado por', 'quien paga'], catalogs.people),
      account_id: match(['cuenta', 'cuenta / medio', 'cuenta de pago', 'cuenta de cobro'], catalogs.accounts),
      category_id: match(['categoria'], catalogs.categories.filter(row => !row.kind || row.kind === 'both' || row.kind === type), categoryLabel),
      expense_scope: type === 'expense' && !scopes.includes(null) ? unique(scopes) : null,
      counterparty: unique(values(type === 'income' ? ['cliente'] : ['proveedor', 'comercio']))
    };
  }
  const ruleRefs={person_id:'people',payer_person_id:'people',account_id:'accounts',counterparty_id:'counterparties',category_id:'categories',activity_project_id:'activity_projects',tag_ids:'tags'};
  function validateRule(rule,catalogs){
    if(!rule.household_id||!String(rule.name||'').trim()||!Number.isInteger(rule.priority)||rule.priority < -2147483648||rule.priority > 2147483647)throw Error('Nombre y prioridad entera obligatorios.');
    for(const [part,allowed] of [['conditions',['counterparty_id','concept','account_id','type','person_id','payer_person_id','amount']],['proposals',['category_id','person_id','payer_person_id','counterparty_id','activity_project_id','tag_ids','expense_scope']]]){
      const data=rule[part];if(!data||Array.isArray(data)||typeof data!=='object'||!Object.keys(data).length)throw Error('Define al menos una condición y una propuesta.');
      for(const [field,value] of Object.entries(data)){
        if(!allowed.includes(field))throw Error('Campo no admitido: '+field);
        if(ruleRefs[field]){const ids=field==='tag_ids'?value:[value];if(!Array.isArray(ids)||!ids.length||ids.some(id=>!(catalogs[ruleRefs[field]]||[]).some(x=>x.id===id&&x.household_id===rule.household_id)))throw Error('Las referencias deben pertenecer al mismo hogar.');}
        if(field==='type'&&!['income','expense'].includes(value))throw Error('Tipo no válido.');
        if(field==='expense_scope'&&!['domestic','business','mixed'].includes(value))throw Error('Ámbito no válido.');
        if(field==='concept'&&(!value||!['contains','equals'].includes(value.mode)||typeof value.value!=='string'||!value.value.trim()||Object.keys(value).some(k=>!['mode','value'].includes(k))))throw Error('Condición de concepto no válida.');
        if(field==='amount'&&(!value||Array.isArray(value)||!Object.keys(value).length||Object.entries(value).some(([k,v])=>!['min','max'].includes(k)||typeof v!=='number'||!Number.isFinite(v)||v<0)||value.min!=null&&value.max!=null&&value.min>value.max))throw Error('Rango de importe no válido.');
      }
    }return rule;
  }
  function proposeRules(input,rules,catalogs){
    const row={...input},matches=[],proposals={},explanation={},conflicts=[],warnings=[];
    const own=Object.fromEntries(Object.entries(catalogs).map(([k,v])=>[k,(v||[]).filter(x=>x.household_id===row.household_id)]));
    const identified=!row.counterparty_id?matchCounterparty(row.counterparty,own.counterparties||[]):null;
    if(identified)row.counterparty_id=identified;
    for(const rule of rules.filter(x=>x.household_id===row.household_id&&x.active!==false).sort((a,b)=>a.priority-b.priority||String(a.id).localeCompare(String(b.id)))){
      try{validateRule(rule,own)}catch(_){warnings.push('Regla no disponible para proponer: '+rule.name);continue}
      const reasons=[];let hit=true;
      for(const [field,value] of Object.entries(rule.conditions)){
        const ok=field==='concept'?(value.mode==='contains'?key(row.concept).includes(key(value.value)):key(row.concept)===key(value.value)):field==='amount'?(row.amount!=null&&row.amount!==''&&Number.isFinite(Number(row.amount))&&(value.min==null||Number(row.amount)>=value.min)&&(value.max==null||Number(row.amount)<=value.max)):row[field]===value;
        if(!ok){hit=false;break}reasons.push({field,condition:value,observed:row[field]??null});
      }
      if(hit)matches.push({id:rule.id,revision:rule.revision||1,name:rule.name,priority:rule.priority,reasons,proposals:rule.proposals});
    }
    for(const field of [...new Set(matches.flatMap(r=>Object.keys(r.proposals)))]){
      const candidates=[];
      for(const rule of matches.filter(r=>Object.hasOwn(r.proposals,field))){
        let value=rule.proposals[field];
        if(ruleRefs[field]){const valid=id=>(own[ruleRefs[field]]||[]).some(x=>x.id===id&&x.active!==false&&(field!=='category_id'||!x.kind||x.kind==='both'||x.kind===row.type));if(field==='tag_ids'){const filtered=value.filter(valid);if(filtered.length!==value.length)warnings.push(rule.name+': etiquetas inactivas no propuestas.');value=filtered;if(!value.length)continue}else if(!valid(value)){warnings.push(rule.name+': '+field+' inactivo o incompatible; no propuesto.');continue}}
        if(field==='expense_scope'&&row.type!=='expense'){warnings.push(rule.name+': ámbito no aplicable a ingresos.');continue}
        candidates.push({...rule,value});
      }
      if(!candidates.length)continue;
      if(field==='tag_ids'){proposals[field]=[...new Set(candidates.flatMap(x=>x.value))];explanation[field]=candidates;continue}
      const top=candidates.filter(x=>x.priority===candidates[0].priority),values=[...new Set(top.map(x=>x.value))];
      if(values.length>1){conflicts.push({field,rules:top});continue}
      proposals[field]=values[0];explanation[field]=top;
    }
    if(identified&&!Object.hasOwn(proposals,'counterparty_id')&&!conflicts.some(x=>x.field==='counterparty_id')){proposals.counterparty_id=identified;explanation.counterparty_id=[{name:'Alias/nombre único del maestro',reasons:[{field:'counterparty',observed:input.counterparty}]}]}
    return {input:{...input},identified_counterparty_id:identified,matches,proposals,explanation,conflicts,warnings};
  }
  window.DOMUSClassification = Object.freeze({validateRule, proposeRules, labelOptions, labelFields, labelText, labelName, matchCounterparty, counterpartyFields, counterpartyLabel, masterPayload, categoryLabel, selectable, options, validateMovement, equivalentCategory, documentProposal});
})();
