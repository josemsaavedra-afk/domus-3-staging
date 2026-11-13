import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../domus-3/index.html', import.meta.url), 'utf8');
const handler = html.slice(html.indexOf('const udocReviewButton='), html.indexOf('async function getDocumentBlob'));

function element() {
  return {
    children: [],
    dataset: {},
    handlers: {},
    addEventListener(name, listener) { this.handlers[name] = listener; },
    append(child) { this.children.push(child); },
    replaceChildren() { this.children = []; },
    showModal() { this.open = true; },
  };
}

async function run(documentText, fields, overrides = {}) {
  const file = new Blob([documentText], { type: 'text/plain' });
  const digest = Buffer.from(await webcrypto.subtle.digest('SHA-256', await file.arrayBuffer())).toString('hex');
  const ids = new Map();
  const document = {
    getElementById(id) {
      if (!ids.has(id)) ids.set(id, element());
      return ids.get(id);
    },
    createElement: element,
  };
  const requests = [];
  const retained={id:'doc',household_id:'fixture-home',file_retained:true,storage_path:'retained',updated_at:'2026-11-13T08:00:00Z',extracted_data:{source_sha256:digest}};
  const context = vm.createContext({
    document, crypto: webcrypto, URL, AbortSignal, TextEncoder,
    window: { DOMUS_CONFIG: { udocReview: true, udocReviewOrigin: 'https://udoc.example' } },
    selectedDocumentFiles: [file],
    user: { id: 'fixture-user' }, household: { id: 'fixture-home' },
    sb: { auth: { getSession: async () => ({
      data: { session: { user: { id: 'fixture-user' }, access_token: 'fixture-token' } },
    }) },from:()=>{let patch;const q={eq:()=>q,or:()=>q,limit:async()=>({data:[retained]}),select:()=>patch?Promise.resolve({data:[{id:retained.id,updated_at:retained.updated_at}]}):q,update:value=>{patch=value;Object.assign(retained,value);return q;}};return q;} },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => ({
        schema_version: '1.0', automatic_economic_action: false, source_sha256: digest,
        status: 'NEEDS_REVIEW', attempts: [{ interpretation: { fields, document_type: fields[0]?.value, warnings: ['Comprobar con el original'] } }], ...overrides,
      }) };
    },
  });
  vm.runInContext(handler, context);
  const button = ids.get('udocReviewBtn');
  assert.equal(button.hidden, false);
  await button.handlers.click();
  assert.equal(button.disabled, false);
  assert.equal(requests.length, 1);
  const [{ url, options }] = requests;
  assert.equal(url, 'https://udoc.example/v1/documents/review');
  assert.equal(options.headers.Authorization, 'Bearer fixture-token');
  assert.equal(await options.body.text(), documentText);
  return ids;
}

for (const [label, documentText, kind] of [
  ['Spanish fuel delivery note', 'ALBARÁN DE COMBUSTIBLE A-17 · IVA 21 % · Total 60,50 EUR', 'delivery_note'],
  ['German invoice', 'ONLOGIST · Rechnung R-42 · Rechnungsbetrag 60,50 EUR', 'invoice'],
]) {
  test(label + ' reaches the editable review with a simulated response', async () => {
    const ids = await run(documentText, [{ path: 'document.kind', value: kind }]);
    assert.equal(ids.get('udocReviewDialog').open, true);
    const [group] = ids.get('udocReviewFields').children;
    const [legend, fieldLabel, warning] = group.children;
    assert.match(legend.textContent, kind === 'invoice' ? /Factura/ : /Albarán/);
    assert.equal(warning.textContent, 'Comprobar con el original');
    const [input] = fieldLabel.children;
    assert.equal(input.type, 'text');
    assert.equal(input.value, kind);
  });
}

test('a response for another original is rejected before review opens', async () => {
  const ids = await run('original', [], { source_sha256: 'wrong' });
  assert.equal(ids.get('udocReviewDialog').open, undefined);
  assert.match(ids.get('udocReviewStatus').textContent, /no corresponde/);
});

test('an empty interpretation does not open a blank review', async () => {
  const ids = await run('original', [], { attempts: [] });
  assert.equal(ids.get('udocReviewDialog').open, undefined);
  assert.match(ids.get('udocReviewStatus').textContent, /no devolvió una propuesta/);
});


test('an unvalidated paid interpretation is visibly quarantined for review', async () => {
 const ids=await run('protocol',[],{attempts:[{status:'INVALID_PROPOSAL',interpretation:{document_type:'unknown',fields:[],warnings:[]},issues:['contract:invalid_field_format']}]});
 assert.equal(ids.get('udocReviewDialog').open,true);
 assert.match(ids.get('udocReviewStatus').textContent,/errores de validación/);
 const [group]=ids.get('udocReviewFields').children;
 assert.match(group.children[1].textContent,/no es una propuesta validada/);
});

test('only a complete reviewed invoice becomes a draft and settlement-like readings remain blocked', async () => {
  const source = html.slice(html.indexOf('const udocReviewButton='), html.indexOf('async function getDocumentBlob'));
  const context = vm.createContext({ document: { querySelectorAll: () => [] } });
  vm.runInContext(source.slice(source.indexOf('const udocMoney='), source.indexOf('async function udocArchivedDocument'))+';globalThis.__udocDraftFromReview=udocDraftFromReview;', context);
  const invoice = context.__udocDraftFromReview({ interpretation: { document_type: 'invoice' } }, {
    'document.kind': 'invoice', 'party.issuer.name': 'Proveedor real', 'reference.document': 'F-42',
    'date.issue': '2026-11-08', 'total.payable': '12,50 €',
  });
  assert.equal(invoice.invoice_number, 'F-42');
  assert.equal(invoice.amount, 12.5);
  assert.equal(context.__udocDraftFromReview({ interpretation: { document_type: 'settlement' } }, {
    'document.kind': 'settlement', 'party.issuer.name': 'RHD', 'reference.document': 'RHD-1',
    'date.issue': '2026-11-08', 'total.payable': '12,50 €',
  }), null);
  assert.equal(context.__udocDraftFromReview({ interpretation: { document_type: 'invoice', economic_type: 'income' } }, {
    'document.kind': 'invoice', 'party.issuer.name': 'Cliente real', 'reference.document': 'F-43',
    'date.issue': '2026-11-08', 'total.payable': '12,50 €', 'movement.type': 'income',
  }).type, 'income');
});

test('saving a reopened review preserves its confirmed movement and identifies the original by SHA-256', () => {
  const source = html.slice(html.indexOf('const udocReviewButton='), html.indexOf('async function getDocumentBlob'));
  const context = vm.createContext({ document: { querySelectorAll: () => [] } });
  vm.runInContext(source.slice(source.indexOf('function udocOriginalMatches'), source.indexOf('async function udocArchivedDocument'))+';globalThis.__udocOriginalMatches=udocOriginalMatches;globalThis.__udocReviewDraftState=udocReviewDraftState;', context);
  const original = { file_name: 'same-name.pdf', file_size: 42, extracted_data: { source_sha256: 'sha-original' } };
  assert.equal(context.__udocOriginalMatches(original, 'sha-original'), true);
  assert.equal(context.__udocOriginalMatches(original, 'different-bytes'), false);
  const prior = [{ invoice_number: 'F-42', review_status: 'confirmed', confirmed_series_id: 'series-1', udoc_source_sha256: 'sha-original', udoc_interpretation_sha256: 'interpretation-1' }];
  const state = context.__udocReviewDraftState(prior, [{ invoice_number: 'F-42', type: 'expense' }], 'sha-original', 'interpretation-2');
  assert.equal(state.prepared.length, 0);
  assert.equal(state.preserved.length, 1);
  assert.equal(state.preserved[0].confirmed_series_id, 'series-1');
  assert.equal(state.preserved[0].review_status, 'confirmed');
});

test('save, confirm and reopen retain the review and block a second draft after reanalysis', async () => {
  const documentRow = { id: 'doc-1', household_id:'home', updated_at:'2026-11-10T10:00:00Z', analysis_status: 'review', extracted_data: { source_sha256: 'original' } };
  const file = new Blob(['fixture']);
  const ids = new Map();
  const fields = {
    'document.kind': 'invoice', 'party.issuer.name': 'Proveedor',
    'reference.document': 'F-42', 'date.issue': '2026-11-08', 'total.payable': '12.50',
  };
  const attempts = [{ status: 'NEEDS_REVIEW', interpretation: { document_type: 'invoice', fields: Object.keys(fields).map(path => ({ path })) } }];
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (!ids.has(id)) ids.set(id, { ...element(), close() {} });
        return ids.get(id);
      },
      querySelectorAll: () => Object.entries(fields).map(([path, value]) => ({ dataset: { udocPath: path }, value })),
    },
    window: {}, selectedDocumentFiles: [file], user: { id: 'user' }, household: { id: 'home' },
    documents: [documentRow], file, attempts, structuredClone,
    updateRowSafely: async (_table, _id, payload) => Object.assign(documentRow, structuredClone(payload)),
    sb: {auth:{getSession:async()=>({data:{session:{user:{id:'user'},access_token:'fixture'}}})},
      from:()=>({update:payload=>{const q={eq:()=>q,select:async()=>{
        Object.assign(documentRow,structuredClone(payload));return {data:[{id:documentRow.id,updated_at:documentRow.updated_at}]};
      }};return q;}})},
    refreshAll: async () => {},
    renderDocDrafts: drafts => { context.currentDocDrafts = drafts; },
    currentDocDrafts: [], currentDocumentId: 'doc-1',
  });
  vm.runInContext(handler.slice(0, handler.indexOf('const udocReviewUrl=')) +
    ';udocArchivedDocument=async()=>documents[0];' +
    html.slice(html.indexOf('function documentConfirmationState('), html.indexOf('function continueDocumentDraftReview(')) +
    'async function saveFixture(hash){udocReviewSession={file,owner:"user",home:"home",digest:"original",interpretations:attempts,interpretationHash:hash,result:{status:"NEEDS_REVIEW"}};await saveUdocReview()}', context);
  await context.saveFixture('first-run');
  assert.equal(documentRow.extracted_data.drafts.length, 1);
  await context.completeDocumentDraft(0, 'movement-1');
  assert.equal(documentRow.extracted_data.udoc_review_history.length, 1);
  assert.equal(documentRow.extracted_data.source_sha256, 'original');
  await context.saveFixture('different-run');
  assert.equal(documentRow.analysis_status, 'confirmed');
  assert.equal(documentRow.extracted_data.udoc_review_history.length, 2);
  assert.equal(documentRow.extracted_data.drafts.length, 1);
  assert.equal(documentRow.extracted_data.drafts[0].confirmed_series_id, 'movement-1');
});

test('original evidence stays literal text alongside its editable field', async () => {
 const ids=await run('protocol', [{path:'reference.document',value:'R-1',
  evidence:[{source_id:'page:2',quote:'<script>R-1</script>',region:[0,0,1,1]}]}]);
 const label=ids.get('udocReviewFields').children[0].children[1];
 assert.equal(label.children[0].value,'R-1');
 assert.match(label.children[1].textContent,/Evidencia original.*page:2.*<script>R-1<\/script>/);
 assert.equal(label.children[1].innerHTML,undefined);
});
test('related references remain visibly proposed instead of automatic links', async () => {
 const ids=await run('protocol', [],{attempts:[{interpretation:{document_type:'settlement',
  fields:[{path:'reference.insurance.1',value:'VS-1'}],
  relationships:[{kind:'settled_insurance',reference_path:'reference.insurance.1'}]}}]});
 const group=ids.get('udocReviewFields').children[0];
 assert.match(group.children[2].textContent,/Relación sugerida, sin confirmar.*VS-1/);
});
