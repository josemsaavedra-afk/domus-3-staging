const HEADER = {
  date: ['fecha', 'date', 'fecha operacion', 'fecha valor', 'operation_date', 'operation date', 'fecha de operacion'],
  concept: ['concepto', 'descripcion', 'description', 'detalle', 'movimiento'],
  amount: ['importe', 'amount', 'cantidad'],
  debit: ['cargo', 'debe', 'debit'],
  credit: ['abono', 'haber', 'credit'],
  reference: ['referencia', 'reference', 'ref']
};
const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const MAX_ROWS = 5000;

function records(text, delimiter) {
  const out = []; let row = [], cell = '', quoted = false, closed = false;
  const pushCell = () => { row.push(cell); cell = ''; closed = false; };
  const pushRow = () => { pushCell(); if (row.some(value => value.trim())) out.push(row); row = []; if (out.length > MAX_ROWS + 1) throw new Error('El CSV supera 5000 movimientos'); };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === delimiter) pushCell();
    else if (char === '\n' || char === '\r') { if (char === '\r' && text[i + 1] === '\n') i++; pushRow(); }
    else if (char === '"' && cell === '' && !closed) quoted = true;
    else if (char === '"' || (closed && char.trim())) throw new Error('CSV con comillas mal formadas');
    else if (!closed) cell += char;
  }
  if (quoted) throw new Error('CSV con comillas sin cerrar');
  pushRow(); return out;
}

export function parseBankAmount(value) {
  let text = String(value ?? '').trim().replace(/^(?:EUR|€)\s*/i, '').replace(/\s*(?:EUR|€)$/i, '').trim();
  if (!text) return null;
  if (/^[+-]?\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(text)) text = text.replaceAll('.', '').replace(',', '.');
  else if (/^[+-]?\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(text)) text = text.replaceAll(',', '');
  else if (/^[+-]?\d{1,3}(?:[ \u00a0]\d{3})+(?:[.,]\d{1,2})?$/.test(text)) text = text.replace(/[ \u00a0]/g, '').replace(',', '.');
  else if (/^[+-]?\d+(?:[.,]\d{1,2})?$/.test(text)) text = text.replace(',', '.');
  else throw new Error('importe no válido o ambiguo');
  const number = Number(text);
  if (!Number.isFinite(number) || Math.abs(number) > 999999999999.99) throw new Error('importe fuera de rango');
  return number;
}

export function parseBankDate(value) {
  const text = String(value || '').trim();
  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  const iso = local ? local[3] + '-' + local[2].padStart(2,'0') + '-' + local[1].padStart(2,'0') : text;
  const date = new Date(iso + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || iso.startsWith('0000') || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== iso) throw new Error('fecha no válida');
  return iso;
}

function inspect(content, delimiter, headerRow = 0) {
  const text = String(content || '').replace(/^\uFEFF/, '');
  if (text.length > 5 * 1024 * 1024) throw new Error('El CSV supera 5 MB');
  if (!delimiter) {
    const counts = { ',': 0, ';': 0, '\t': 0 }; let quote = false;
    for (const char of text) { if (char === '"') quote = !quote; else if (!quote) { if (char === '\r' || char === '\n') break; if (char in counts) counts[char]++; } }
    delimiter = Object.keys(counts).sort((a,b) => counts[b]-counts[a] || (a===';'?-1:1))[0];
  }
  if (![',',';','\t'].includes(delimiter)) throw new Error('Separador no admitido');
  const all = records(text, delimiter);
  if (!Number.isSafeInteger(headerRow) || headerRow < 0 || headerRow > 29 || headerRow >= all.length) throw new Error('Fila de encabezados no válida');
  const headers = all[headerRow], rows = all.slice(headerRow + 1), indexes = {}, ambiguous = [];
  for (const [key, aliases] of Object.entries(HEADER)) {
    const matches = headers.map((value,i) => aliases.includes(norm(value)) ? i : -1).filter(i => i >= 0);
    if (matches.length > 1) ambiguous.push(key);
    indexes[key] = matches.length === 1 ? matches[0] : -1;
  }
  return { delimiter, headerRow, headers, rows, indexes, ambiguous };
}
export function inspectStatementCsv(content, options = {}) {
  const result = inspect(content, options.delimiter, options.headerRow ?? 0);
  return { ...result, preview: result.rows.slice(0,8), count: result.rows.length };
}
export function parseStatementCsv(content, mapping = null) {
  const info = inspect(content, mapping?.delimiter, mapping?.headerRow ?? 0);
  const { headers, rows } = info;
  if (!rows.length) throw new Error('El CSV no contiene movimientos');
  let indexes = info.indexes;
  if (mapping != null) {
    if (Object.getPrototypeOf(mapping) !== Object.prototype || Object.keys(mapping).some(k => !['delimiter','headerRow',...Object.keys(HEADER)].includes(k))) throw new Error('Mapeo no válido');
    indexes = Object.fromEntries(Object.keys(HEADER).map(k => [k, mapping[k] ?? -1]));
    if (Object.values(indexes).some(i => !Number.isSafeInteger(i) || i < -1 || i >= headers.length)) throw new Error('Columna de mapeo no válida');
    const used = Object.values(indexes).filter(i => i >= 0);
    if (new Set(used).size !== used.length) throw new Error('Una columna no puede representar dos campos');
  } else if (info.ambiguous.length) throw new Error('Columnas ambiguas para ' + info.ambiguous[0]);
  if (indexes.date < 0 || indexes.concept < 0 || (indexes.amount < 0 && indexes.debit < 0 && indexes.credit < 0)) throw new Error('Se necesitan columnas de fecha, concepto y un importe (o cargo/abono)');
  if (indexes.amount >= 0 && (indexes.debit >= 0 || indexes.credit >= 0)) throw new Error('Elige importe único o cargo/abono, no ambos');
  return rows.map((cells, offset) => {
    try {
      if (cells.length !== headers.length) throw new Error('número de columnas incorrecto');
      const date = parseBankDate(cells[indexes.date]), concept = cells[indexes.concept].trim();
      if (!concept) throw new Error('concepto vacío');
      let signedAmount;
      if (indexes.amount >= 0) signedAmount = parseBankAmount(cells[indexes.amount]);
      else {
        const debit = indexes.debit >= 0 ? parseBankAmount(cells[indexes.debit]) : null;
        const credit = indexes.credit >= 0 ? parseBankAmount(cells[indexes.credit]) : null;
        if (debit && credit) throw new Error('cargo y abono simultáneos');
        if (credit < 0) throw new Error('abono negativo');
        signedAmount = credit || (debit == null ? null : -Math.abs(debit));
      }
      if (signedAmount == null || signedAmount === 0) throw new Error('importe vacío o cero');
      return { id: 'csv-' + (offset + 1), ordinal: offset + 1, date, concept, reference: indexes.reference >= 0 ? cells[indexes.reference].trim() || null : null, signedAmount };
    } catch (error) { throw new Error('Movimiento ' + (offset + 1) + ': ' + error.message); }
  });
}
