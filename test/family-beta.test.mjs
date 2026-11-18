import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { PGlite } from '@electric-sql/pglite';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('family frontend rejects the existing DOMUS projects and an unprovisioned origin', () => {
  const { window } = new JSDOM('', { runScripts: 'outside-only' });
  try {
    window.eval(source('domus-3/src/treasury/runtime-config.js'));
    window.eval(source('domus-3/src/family-environment.js'));
    const read = raw => window.DOMUSFamilyEnvironment.readConfig(raw, window.DOMUSRuntime);
    const config = ref => ({
      edition: 'domus-families-beta',
      familyProjectRef: ref,
      supabaseUrl: 'https://' + ref + '.supabase.co',
      supabasePublishableKey: 'sb_publishable_test',
    });
    assert.equal(read({}).ready, false);
    assert.equal(read(config('pmgonotpbmybtwvxbcvf')).ready, false);
    assert.equal(read(config('jiwfpczmffsjpfvsrrvk')).ready, false);
    assert.equal(read({ ...config('abcdefghijklmnopqrst'), familyProjectRef: 'abcdefghijklmnopqrsz' }).ready, false);
    assert.equal(read(config('abcdefghijklmnopqrst')).ready, true);
  } finally {
    window.close();
  }
});

test('tutor opens on first use, resumes income setup and follows module navigation', () => {
  const { window } = new JSDOM(source('domus-3/index.html'), {
    runScripts: 'outside-only', url: 'https://families.invalid',
  });
  try {
    const { document } = window;
    const get = id => document.getElementById(id);
    const dialog = window.HTMLDialogElement.prototype;
    dialog.showModal = function () { this.open = true; };
    dialog.close = function () { this.open = false; };
    const visited = [];
    window.DOMUSFamilyNavigation = {
      showView: view => visited.push(view), openForm() {}, setSimpleMovementMode() {},
      syncPrefFields() {}, captureMovementForm() {},
    };
    window.eval(source('domus-3/src/family-help.js'));
    const context = { userId: 'owner', householdId: 'home' };
    window.DOMUSFamilyHelp.start(context);
    assert.equal(get('domusHelpTitle').textContent, 'Tu hogar digital');
    get('familyHelpNext').click();
    get('familyHelpAction').click();
    assert.deepEqual(visited, ['movements']);
    assert.equal(get('fType').value, 'income');
    assert.equal(get('fStatus').value, 'pending');
    assert.equal(get('fRecurrence').value, 'monthly');
    for (const button of document.querySelectorAll('button[data-view]')) button.classList.toggle('active', button.dataset.view === 'calendar');
    get('domusHelpButton').click();
    assert.equal(get('domusHelpTitle').textContent, 'Agenda');
    get('familyHelpGuide').click();
    assert.equal(get('domusHelpTitle').textContent, 'Ingresos habituales');
    for (let i = 0; i < 4; i++) get('familyHelpNext').click();
    assert.equal(visited.at(-1), 'dashboard');
    window.DOMUSFamilyHelp.reset();
    window.DOMUSFamilyHelp.start(context);
    assert.equal(get('domusHelpDialog').open, false);
    window.DOMUSFamilyHelp.start({ ...context, householdId: 'another-home' });
    assert.equal(get('domusHelpDialog').open, true);
  } finally {
    window.close();
  }
});

test('family setup seeds only generic categories once per authenticated household', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create table auth.users(id uuid);
      create table storage.objects(id uuid);
      create function auth.uid() returns uuid language sql as
        $$ select nullif(current_setting('test.actor',true),'')::uuid $$;
      create table public.households(id uuid primary key default gen_random_uuid(), name text);
      create table public.household_members(household_id uuid, user_id uuid);
      create table public.categories(household_id uuid, name text, kind text);
      create function public.create_household(p_name text, p_display_name text)
      returns uuid language plpgsql as $$
      declare home uuid;
      begin
        insert into public.households(name) values(p_name) returning id into home;
        insert into public.household_members values(home,auth.uid());
        return home;
      end $$;
      create function public.join_household_by_code(text,text) returns uuid language sql as $$ select null::uuid $$;
    `);
    await db.exec(source('backend/families/private-review.sql'));
    await db.exec('set role anon');
    await assert.rejects(db.query("select public.domus_family_create_home('Hogar','Nombre')"), /permission denied/);
    await db.exec('set role authenticated');
    await assert.rejects(db.query("select public.domus_family_create_home('Hogar','Nombre')"), /Inicia sesión/);
    const create = async actor => {
      await db.query("select set_config('test.actor',$1,false)", [actor]);
      return (await db.query("select public.domus_family_create_home('Hogar','Nombre') as id")).rows[0].id;
    };
    const first = '00000000-0000-4000-8000-000000000001';
    const second = '00000000-0000-4000-8000-000000000002';
    const home = await create(first);
    assert.equal(await create(first), home);
    assert.notEqual(await create(second), home);
    await assert.rejects(db.query("select public.join_household_by_code('code','Nombre')"), /permission denied/);
    await db.exec('reset role');
    const { rows } = await db.query("select kind, count(*)::int as count from public.categories where household_id=$1 group by kind order by kind", [home]);
    assert.deepEqual(rows, [{ kind: 'expense', count: 10 }, { kind: 'income', count: 6 }]);
  } finally {
    await db.close();
  }
});
