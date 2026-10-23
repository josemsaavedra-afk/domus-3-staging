import test from 'node:test';
import assert from 'node:assert/strict';
import {createBankReminder, reminderVisible, bindMonthlyReminder} from '../domus-3/src/treasury/monthly-reminder.js';
import {rememberStatementFormat, readStatementFormat, matchingStatementFormat} from '../domus-3/src/treasury/statement-preferences.js';
import {inspectStatementCsv, parseStatementCsv} from '../domus-3/src/treasury/statement-csv.js';
const at = (month, day) => new Date(2026, month - 1, day, 12);
const storage = () => { const values = new Map(); return {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)}; };

test('monthly review is optional, starts on the first, snoozes to tomorrow and renews next month', () => {
  const store = storage(), reminder = createBankReminder(store);
  assert.equal(reminderVisible(null, at(10,1)), true);
  assert.equal(reminderVisible(null, at(10,2)), false);
  reminder.choose('u','h','later',at(10,1));
  const afterReload = createBankReminder(store).read('u','h');
  assert.equal(reminderVisible(afterReload, at(10,1)), false);
  assert.equal(reminderVisible(afterReload, at(10,2)), true);
  reminder.choose('u','h','skip',at(10,2));
  assert.equal(reminderVisible(reminder.read('u','h'),at(10,3)),false);
  assert.equal(reminderVisible(reminder.read('u','h'),at(11,1)),true);
  reminder.choose('u','h','review',at(11,1));
  assert.equal(reminderVisible(reminder.read('u','h'),at(11,1)),false);
  assert.equal(reminder.read('other','h'),null);
  assert.equal(reminder.read('u','other'),null);
});

test('snooze handles month boundaries and unavailable storage never blocks the app', () => {
  const broken = {getItem(){throw Error('disabled')},setItem(){throw Error('full')}};
  const reminder = createBankReminder(broken);
  assert.equal(reminder.read('u','h'),null);
  assert.equal(reminder.choose('u','h','later',at(12,31)),false);
  assert.equal(reminderVisible(reminder.read('u','h'),new Date(2027,0,1,12)),true);
  assert.throws(()=>reminder.choose('u','h','unknown'), /desconocida/);
});

test('review prompt routes only on Review; dismissals persist and no financial write is involved', () => {
  const savedDocument = globalThis.document;
  const node = () => ({children:[],classList:{add(){},remove(){}},appendChild(child){this.children.push(child)},append(...children){this.children.push(...children)},replaceChildren(){this.children=[]}});
  globalThis.document = {createElement: node};
  try {
    const store = storage(), reminder = createBankReminder(store), root = node(); let reviews = 0;
    const render = () => bindMonthlyReminder({root,reminder,userId:'u',householdId:'h',now:at(10,1),onReview:()=>reviews++});
    render(); assert.equal(root.children[2].children.length,3);
    root.children[2].children[1].onclick(); assert.equal(reviews,0);
    render(); assert.equal(root.children.length,0);
    bindMonthlyReminder({root,reminder,userId:'u',householdId:'h',now:at(10,2),onReview:()=>reviews++});
    root.children[2].children[0].onclick(); assert.equal(reviews,1);
    assert.equal(createBankReminder(store).read('u','h').choice,'review');
  } finally { globalThis.document = savedDocument; }
});

test('CSV column preferences survive refresh, isolate account/user/household, and reject changed headers', () => {
  const store = storage(), context={userId:'u',householdId:'h',accountId:'a'};
  const mapping={delimiter:';',headerRow:2,date:0,concept:1,amount:3,debit:-1,credit:-1,reference:2};
  assert.equal(rememberStatementFormat(store,context,['Fecha','Texto','Ref','Euros'],mapping),true);
  const saved=readStatementFormat(store,context);
  assert.deepEqual(matchingStatementFormat(saved,[' FECHA ','texto','ref','euros']),mapping);
  assert.equal(matchingStatementFormat(saved,['Fecha','Euros','Ref','Texto']),null);
  for(const patch of [{userId:'other'},{householdId:'other'},{accountId:'other'}]) assert.equal(readStatementFormat(store,{...context,...patch}),null);
  assert.equal(readStatementFormat(store,{}),null);
  const broken={getItem(){return '{broken'},setItem(){throw Error('full')}};
  assert.equal(readStatementFormat(broken,context),null);
  assert.equal(rememberStatementFormat(broken,context,[],mapping),false);
});

test('remembered unknown bank format reads a later file with the same headings and retains original references', () => {
  const store=storage(), context={userId:'u',householdId:'h',accountId:'bank'};
  const mapping={delimiter:';',headerRow:1,date:2,concept:0,amount:3,debit:-1,credit:-1,reference:1};
  const first='Extracto\nTexto;Clave;Día;Euros\nPetroprix;REF1;12/10/2026;-20,00';
  const headers=inspectStatementCsv(first,mapping).headers;
  assert.equal(parseStatementCsv(first,mapping)[0].signedAmount,-20);
  rememberStatementFormat(store,context,headers,mapping);
  const saved=readStatementFormat(store,context);
  const next='Extracto\nTexto;Clave;Día;Euros\nMercado;REF2;15/10/2026;-10,50';
  const info=inspectStatementCsv(next,saved.mapping);
  const row=parseStatementCsv(next,matchingStatementFormat(saved,info.headers))[0];
  assert.equal(row.date,'2026-10-15'); assert.equal(row.signedAmount,-10.5); assert.equal(row.reference,'REF2');
});
