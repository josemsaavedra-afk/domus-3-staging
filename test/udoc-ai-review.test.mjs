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
  const context = vm.createContext({
    document, crypto: webcrypto, URL, AbortSignal,
    window: { DOMUS_CONFIG: { udocReview: true, udocReviewOrigin: 'https://udoc.example' } },
    selectedDocumentFiles: [file],
    user: { id: 'fixture-user' }, household: { id: 'fixture-home' },
    sb: { auth: { getSession: async () => ({
      data: { session: { user: { id: 'fixture-user' }, access_token: 'fixture-token' } },
    }) } },
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
