import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html = readFileSync('domus-3/index.html', 'utf8');
const script = html.match(/<script id="domusAppearance">([\s\S]*?)<\/script>/)[1];

function openAppearance({saved, systemDark = false, storageBlocked = false} = {}) {
  const picker = {addEventListener: (_, handler) => { picker.change = handler; }};
  const dataset = {};
  const theme = {};
  const system = {
    matches: systemDark,
    addEventListener: (_, handler) => { system.change = handler; },
  };
  const document = {
    documentElement: {dataset},
    querySelector: () => theme,
    getElementById: () => picker,
    addEventListener: (_, handler) => handler(),
  };
  const localStorage = {
    getItem() {
      if (storageBlocked) throw Error('Storage unavailable');
      return saved;
    },
    setItem(_, value) {
      if (storageBlocked) throw Error('Storage unavailable');
      saved = value;
    },
  };
  runInNewContext(script, {document, localStorage, matchMedia: () => system});
  return {
    dataset, theme, picker, saved: () => saved,
    setSystem(dark) {
      system.matches = dark;
      system.change();
    },
    choose(value) {
      picker.value = value;
      picker.change();
    },
  };
}

test('appearance follows the device by default and updates when the device changes', () => {
  const app = openAppearance({systemDark: true});
  assert.equal(app.picker.value, 'system');
  assert.equal(app.dataset.appearance, 'dark');
  assert.equal(app.theme.content, '#111820');
  app.setSystem(false);
  assert.equal(app.dataset.appearance, 'light');
  assert.equal(app.theme.content, '#073b3a');
});

test('manual appearance survives reopening and takes precedence over the device', () => {
  const app = openAppearance({systemDark: true});
  app.choose('light');
  assert.equal(app.dataset.appearance, 'light');
  assert.equal(openAppearance({saved: app.saved(), systemDark: true}).dataset.appearance, 'light');
  app.choose('dark');
  app.setSystem(false);
  assert.equal(openAppearance({saved: app.saved()}).dataset.appearance, 'dark');
  app.choose('system');
  assert.equal(app.dataset.appearance, 'light');
});

test('appearance works when the browser prevents storing preferences', () => {
  const app = openAppearance({storageBlocked: true});
  app.choose('dark');
  assert.equal(app.dataset.appearance, 'dark');
});
