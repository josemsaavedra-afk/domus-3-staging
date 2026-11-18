import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, sep } from 'node:path';
import { chromium, devices } from 'playwright';

const root = resolve('domus-3');
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json' };
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const path = resolve(root, url.pathname === '/' ? 'index.html' : '.' + url.pathname);
  try {
    if (!path.startsWith(root + sep)) throw Error('Invalid path');
    const content = await readFile(path);
    response.setHeader('Content-Type', types[path.split('.').at(-1)] || 'application/octet-stream');
    response.end(content);
  } catch {
    response.statusCode = 404;
    response.end();
  }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));

let browser;
try {
  browser = await chromium.launch();
  for (const [label, device] of [['desktop', {}], ['iPhone profile', devices['iPhone 13']]]) {
    const page = await browser.newPage(device);
    const errors = [];
    const unexpectedRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (new URL(request.url()).hostname.endsWith('.supabase.co')) unexpectedRequests.push(request.url());
    });
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => document.getElementById('authSubmit').disabled);
    await page.click('#domusHelpButton');
    assert.equal(await page.textContent('#domusHelpTitle'), 'Acceso a DOMUS');
    await page.click('#familyHelpClose');

    // Exercise the real UI from the end of successful sign-in, with no live database.
    await page.evaluate(() => {
      user = { id: 'browser-test' };
      household = { id: 'fixture-home', name: 'Hogar de prueba' };
      membership = { member: { user_id: user.id, household_id: household.id, role: 'owner' }, household };
      showOnly('app');
      DOMUSFamilyHelp.start({ userId: 'browser-test', householdId: 'fixture-home' });
    });
    assert.equal(await page.textContent('#domusHelpTitle'), 'Tu hogar digital');
    await page.click('#familyHelpNext');
    await page.click('#familyHelpAction');
    assert.deepEqual(errors, []);
    assert.equal(await page.inputValue('#fType'), 'income');
    assert.equal(await page.inputValue('#fRecurrence'), 'monthly');
    assert.equal(await page.inputValue('#fStatus'), 'pending');
    assert.equal(await page.inputValue('#fExpenseScope'), 'domestic');
    assert.equal(await page.locator('#fExpenseScope').isVisible(), false);
    await page.evaluate(() => closeForm(true));

    for (const [view, topic] of [['calendar', 'Agenda'], ['treasury', 'Dinero y conciliación'], ['documents', 'Documentos'], ['settings', 'Ajustes']]) {
      await page.evaluate(view => {
        for (const button of document.querySelectorAll('[data-view]')) button.classList.toggle('active', button.dataset.view === view);
      }, view);
      await page.click('#domusHelpButton');
      assert.equal(await page.textContent('#domusHelpTitle'), topic);
      await page.click('#familyHelpClose');
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(unexpectedRequests, []);
    await page.close();
    console.log('DOMUS Familias tutor and login gate passed in Chromium (' + label + ')');
  }
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}
