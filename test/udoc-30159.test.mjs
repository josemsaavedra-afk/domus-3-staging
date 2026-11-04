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

test('duplicate lookup searches the full household archive, not the 500 visible records',()=>{
  const start=html.indexOf('async function importSelectedDocuments()');
  const end=html.indexOf('async function getDocumentBlob(',start);
  assert.ok(start>=0&&end>start);
  const importer=html.slice(start,end);
  assert.match(importer,/sb\.from\('documents'\)/);
  assert.match(importer,/\.eq\('household_id',household\.id\)/);
  assert.match(importer,/\.eq\('file_name',file\.name\)/);
  assert.match(importer,/\.eq\('file_size',file\.size\)/);
  assert.match(importer,/if\(duplicateLookup\.error\)throw duplicateLookup\.error/);
  assert.doesNotMatch(importer,/documents\.filter\(/);
});

test('archived reanalysis requires a retained source and excludes confirmed movements',()=>{
  const start=html.indexOf('function canReanalyzeDocument(d)');
  const end=html.indexOf('async function reanalyzeArchivedDocument(',start);
  assert.ok(start>=0&&end>start);
  const section=html.slice(start,end);
  assert.match(section,/review_status==='confirmed'/);
  assert.match(section,/confirmed_series_id/);
  assert.match(section,/storage_path/);
  assert.match(section,/documentSourceText\(d\)/);
  assert.match(section,/async function rereadArchivedDocument\(d,opts=\{\}\)/);
  assert.match(section,/if\(!canReanalyzeDocument\(d\)\)throw/);
  assert.match(section,/sourceText:text/);
});

test('batch reanalysis keeps proposals for user review after refresh',()=>{
 const start=html.indexOf('async function reanalyzePendingDocuments()');
 const end=html.indexOf('function openStoredDocumentDraft(',start);
 assert.ok(start>=0&&end>start);
 const body=html.slice(start,end);
 assert.match(body,/await rereadArchivedDocument\(d,\{batch:true\}\)/);
 assert.match(body,/await refreshAll\(\)/);
 assert.match(body,/if\(pendingDocumentDraftBatches\.length\)openNextDocumentDraftBatch\(\)/);
 assert.doesNotMatch(body,/finally\{pendingDocumentDraftBatches=\[\]/);
 assert.doesNotMatch(body,/pendingDocumentDraftBatches=\[\];await refreshAll\(\)/);
});

test('legacy document recovery retains drafts and opens review instead of discarding them',()=>{
 const start=html.indexOf('async function recoverLegacyDocumentFiles()');
 const end=html.indexOf('async function reanalyzePendingDocuments()',start);
 assert.ok(start>=0&&end>start);
 const recovery=html.slice(start,end);
 assert.match(recovery,/await analyzeBlob\(d,file,\{batch:true\}\)/);
 assert.match(recovery,/if\(pendingDocumentDraftBatches\.length\)openNextDocumentDraftBatch\(\)/);
 assert.doesNotMatch(recovery,/pendingDocumentDraftBatches=\[\];await refreshAll\(\)/);
 assert.doesNotMatch(recovery,/finally\{pendingDocumentDraftBatches=\[\]/);
});
