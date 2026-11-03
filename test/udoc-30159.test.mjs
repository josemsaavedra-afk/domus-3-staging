import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const html=readFileSync(new URL('../domus-3/index.html',import.meta.url),'utf8');
const version=JSON.parse(readFileSync(new URL('../domus-3/version.json',import.meta.url),'utf8'));
const sw=readFileSync(new URL('../domus-3/sw.js',import.meta.url),'utf8');
const manifest=readFileSync(new URL('../domus-3/asset-manifest.js',import.meta.url),'utf8');

test('all packaged components share the current build identifier',()=>{
  assert.ok(version.build>=30159);
  assert.ok(html.includes("const APP_BUILD='"+version.build+"'"));
  assert.ok(sw.includes('const EXPECTED_BUILD='+version.build+';'));
  assert.ok(manifest.includes('self.DOMUS3_BUILD='+version.build+';'));
});

test('inline JavaScript parses without executing browser code',()=>{
  let count=0;
  for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    if(/\bsrc\s*=/.test(m[1])||/\btype\s*=\s*["']application\/json/.test(m[1])||!m[2].trim())continue;
    new Script(m[2],{filename:'domus-3/index.html'});
    count++;
  }
  assert.ok(count>0,'expected inline application scripts');
});

test('duplicate detection is non-destructive and only after user consent',()=>{
  assert.match(html,/crypto\.subtle\.digest\('SHA-256'/);
  assert.match(html,/exactBatchDuplicates/);
  assert.match(html,/possibleDuplicates/);
  assert.match(html,/if\(!proceed\)\{skippedDuplicates\+\+;continue;\}/);
  assert.match(html,/seenInBatch\.push/);
  assert.match(html,/await sb\.from\('documents'\)\.insert/);
  assert.ok(html.indexOf('if(!proceed){skippedDuplicates++;continue;}')<html.indexOf("await sb.from('documents').insert"));
});
