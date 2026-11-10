import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../domus-3/index.html', import.meta.url), 'utf8');

test('editing one recurring bill does not silently replace the series with a one-off movement', () => {
  const start = html.indexOf("const seriesFieldsChanged=['type','concept'", html.indexOf("document.getElementById('movementForm').onsubmit"));
  const end = html.indexOf("if(common.type==='expense')await syncExpenseLinks", start);
  assert.ok(start >= 0 && end > start, 'recurring edit branch exists');
  const branch = html.slice(start, end);
  assert.match(branch, /if\(seriesFieldsChanged\)\{throw new Error\('Este recibo pertenece a una serie periódica/);
  assert.doesNotMatch(branch, /const replacement=/);
  assert.match(branch, /amount_override:amount!==Number\(m.amount\)\?amount:null/);
  assert.match(branch, /rescheduled_date:newDate!==originalDate\?newDate:null/);
});
