const key = ({ userId, householdId, accountId }) => `domus3:csv-format:${userId}:${householdId}:${accountId}`;
const headerSignature = headers => JSON.stringify(headers.map(value => String(value).trim().toLowerCase()));
const valid = context => context?.userId && context?.householdId && context?.accountId;

export function rememberStatementFormat(storage, context, headers, mapping) {
  if (!valid(context)) return false;
  try {
    storage.setItem(key(context), JSON.stringify({ headers: headerSignature(headers), mapping }));
    return true;
  } catch { return false; }
}

export function readStatementFormat(storage, context) {
  if (!valid(context)) return null;
  try {
    const saved = JSON.parse(storage.getItem(key(context)));
    if (!saved || typeof saved.headers !== 'string' || !saved.mapping ||
        ![';', ',', '\t'].includes(saved.mapping.delimiter) ||
        !Number.isInteger(saved.mapping.headerRow) || saved.mapping.headerRow < 0 || saved.mapping.headerRow > 29) return null;
    return saved;
  } catch { return null; }
}

export function matchingStatementFormat(saved, headers) {
  return saved?.headers === headerSignature(headers) ? saved.mapping : null;
}
