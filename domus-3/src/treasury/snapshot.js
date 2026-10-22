import { parseBankDate } from './statement-csv.js';

// Rebuild all known history; only forecasts have an upper horizon.
export function createTreasurySnapshot({ householdId, userId, accounts = [], series = [], states = [], asOf }) {
  const today = parseBankDate(asOf), horizon = `${Number(today.slice(0, 4)) + 2}-12-31`;
  const members = series.filter(row => row.household_id === householdId);
  const statesBySeries = new Map();
  for (const state of states) {
    if (!statesBySeries.has(state.series_id)) statesBySeries.set(state.series_id, []);
    statesBySeries.get(state.series_id).push(state);
  }
  const rows = [];
  for (const movement of members) {
    const start = parseBankDate(movement.start_date);
    const stateMap = new Map();
    for (const state of statesBySeries.get(movement.id) || []) {
      const key = parseBankDate(state.occurrence_date);
      const previous = stateMap.get(key);
      if (!previous) { stateMap.set(key, state); continue; }
      const previousRevision = Number(previous.treasury_revision || 0), nextRevision = Number(state.treasury_revision || 0);
      const previousUpdated = String(previous.updated_at || ''), nextUpdated = String(state.updated_at || '');
      if (nextRevision > previousRevision || (nextRevision === previousRevision && nextUpdated > previousUpdated)) stateMap.set(key, state);
    }
    const dates = new Set(stateMap.keys());
    if (movement.recurrence === 'none') dates.add(start);
    else {
      const step = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 }[movement.recurrence];
      if (!step) throw new Error('Recurrencia no reconocida: ' + movement.recurrence);
      const end = movement.recurrence_end ? parseBankDate(movement.recurrence_end) : horizon;
      const [year, month, day] = start.split('-').map(Number);
      let index = 0;
      for (; index < 12000; index++) {
        const date = new Date(0); date.setUTCFullYear(year, month - 1 + index * step, 1); date.setUTCHours(0, 0, 0, 0);
        const last = new Date(date); last.setUTCMonth(last.getUTCMonth() + 1, 0);
        date.setUTCDate(Math.min(day, last.getUTCDate()));
        const key = date.toISOString().slice(0, 10);
        if (key > end || key > horizon) break;
        dates.add(key);
      }
      if (index === 12000) throw new Error('Historial demasiado extenso; no se calculará un saldo parcial');
    }
    for (const original of dates) {
      const state = stateMap.get(original) || {};
      // Closed segments can retain old pending exceptions. Only an explicit
      // reschedule or a realized operation survives outside the segment.
      const outside = original < start || (movement.recurrence_end && original > movement.recurrence_end);
      if (outside && !state.rescheduled_date && !state.actual_date && state.status !== 'done') continue;
      if (movement.active === false && state.status !== 'done' && !state.actual_date) continue;
      const effective = state.actual_date || state.prefinanced_at || state.rescheduled_date || original;
      if (parseBankDate(effective) > horizon) continue;
      rows.push({ ...movement, ...state, id: `${movement.id}|${original}`, series_id: movement.id,
        occurrence_date: original, expected_treasury_date: original, status: state.status || 'pending' });
    }
  }
  return { householdId, userId, asOf: today, accounts: accounts.filter(row => row.household_id === householdId).map(row => ({ ...row })), rows };
}
