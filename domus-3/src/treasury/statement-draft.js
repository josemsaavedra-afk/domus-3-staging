import { parseBankDate } from './statement-csv.js';

const canonical = row => JSON.stringify([parseBankDate(row.date), Math.round(row.signedAmount * 100), String(row.concept).trim().normalize('NFC'), row.reference || null]);
export function statementCreationEligibility(row) {
  if (!row || row.decision !== 'pendiente' || row.candidates.length) return 'Revisa primero las coincidencias existentes.';
  if (/\b(traspaso|transferencia entre cuentas|entre mis cuentas)\b/i.test(row.statement.concept)) return 'Un traspaso entre cuentas no es un ingreso ni un gasto.';
  return null;
}

// Identity belongs to the bank operation, not to a filename, selected subset or CSV row number.
// Identical operations are kept separate by their occurrence within the statement.
export async function buildStatementDraft({ householdId, userId, account, row, rows, fileName }, cryptoProvider = globalThis.crypto) {
  const reason = statementCreationEligibility(row);
  if (reason) throw new Error(reason);
  if (!householdId || !userId || !account?.id || account.household_id !== householdId || account.active === false) throw new Error('La cuenta no pertenece a la sesión activa.');
  const statement = row.statement;
  if (!statement.concept?.trim() || !Number.isFinite(statement.signedAmount) || statement.signedAmount === 0) throw new Error('La línea bancaria no tiene concepto o importe válido.');
  const key = canonical(statement), index = rows.findIndex(item => item.statement.id === statement.id);
  if (index < 0) throw new Error('Línea no encontrada en este extracto.');
  const occurrence = rows.slice(0, index + 1).filter(item => canonical(item.statement) === key).length;
  const digest = new Uint8Array(await cryptoProvider.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(['bank-operation-v1', householdId, account.id, key, occurrence]))));
  digest[6] = (digest[6] & 15) | 80; digest[8] = (digest[8] & 63) | 128;
  const hex = Array.from(digest.slice(0,16), byte => byte.toString(16).padStart(2,'0')).join('');
  const id = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  return Object.freeze({ id, householdId, userId, accountId: account.id, date: parseBankDate(statement.date), amount: Math.abs(statement.signedAmount), type: statement.signedAmount < 0 ? 'expense' : 'income', concept: statement.concept.trim(), notes: `Extracto bancario: ${String(fileName || 'extracto').replace(/[\r\n]/g,' ')}. Línea ${statement.ordinal || index + 1}. Referencia: ${statement.reference || 'sin referencia'}. Origen DOMUS: ${id}` });
}
