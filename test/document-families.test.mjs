import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync('domus-3/index.html','utf8');
function setup(rows=[]){
 const c=vm.createContext({lastDocumentOcrMode:"text",lastDocumentOcrConfidence:null,people:[],series:rows,window:{DOMUSClassification:{documentProposal:()=>({person_id:null,expense_scope:null}),matchCounterparty:()=>null}},dateKey:d=>d.toISOString().slice(0,10)});
 for(const [a,b] of [['function moneyFrom','function documentData'],['function documentData','function guessDocDate'],['function normDocText','async function analyzeBlob'],['function normalizedRef','function referenceKeys'],['function referenceKeys','function inferredExpenseRole'],['function duplicateCandidates','function duplicateWarning']]){
 const start=html.indexOf(a),end=html.indexOf(b,start+a.length);assert.ok(start>=0&&end>start,a);vm.runInContext(html.slice(start,end),c);
 }return c;
}
function read(c,text,name){return c.knownDocumentDraft(text,{file_name:name});}
test('VS Baloise summary excludes annex and preserves legacy contribution',()=>{
 const c=setup();assert.equal(read(c,'VS-26-123\nBaloise\nResumen de facturas\nMonto total 12,34 €\nAnexo\nMonto total 98,00 €','VS-26-123.pdf').amount,12.34);
 assert.equal(read(c,'VS-26-124\nContribución total\n10,00 €\n2,00 €\n12,00 €\nLe rogamos','VS-26-124.pdf').amount,12);
 assert.equal(read(c,'VS-26-125\nBaloise\nResumen de facturas\nAnexo\nMonto total 98,00 €','VS-26-125.pdf'),null);
});
test('fuel product or station does not decide economic scope',()=>{
 const c=setup();const d=read(c,'REPSOL\nGasolina\nFecha factura: 19/10/2026\nTOTAL 40,00 €','ticket.pdf');assert.equal(d.document_family,'fuel');assert.equal(d.expense_scope,null);
});
test('same invoice with distinct issuers is not a duplicate; unknown issuer remains a candidate',()=>{
 const c=setup([{id:'a',invoice_number:'F-1',counterparty:'Comercio A'}]);assert.equal(c.duplicateCandidates({invoice_number:'F-1',counterparty:'Comercio B'}).length,0);assert.equal(c.duplicateCandidates({invoice_number:' F-1 ',counterparty:'Comercio A'}).length,1);assert.equal(c.duplicateCandidates({invoice_number:'F-1'}).length,1);assert.equal(c.duplicateCandidates({amount:40,date:'2026-10-19'}).length,0);
});
test('related invoices require complete reference and include transport key',()=>{
 const c=setup([{id:'a',type:'income',invoice_number:'G260001-123456-123456-10',transport_number:'1234567'},{id:'b',type:'income',invoice_number:'G260001-123456-123456-1'}]);assert.deepEqual(Array.from(c.draftLinkedIncomeIds({document_reference_keys:['G260001-123456-123456-1']})),['b']);assert.deepEqual(Array.from(c.draftLinkedIncomeIds({document_reference_keys:['1234567']})),['a']);
});
test('historical ambiguity is left for review',()=>{const c=setup();assert.equal(c.dominantHistoricalValue([{person_id:'a'},{person_id:'a'},{person_id:'b'}],'person_id'),null);assert.equal(c.dominantHistoricalValue([{person_id:'a'},{person_id:'a'}],'person_id'),'a');});
test('deterministic income keeps its role when document mentions deductions',()=>{const c=setup();const d=c.enrichDocumentDraft({deterministic_reader:true,type:'income',movement_role:'standard',invoice_number:'G260001-123456-123456-1'},'comisión seguro');assert.equal(d.type,'income');assert.equal(d.movement_role,'standard');});
test('unknown issuer cannot authorize replacement',()=>{const c=setup([{id:'a',invoice_number:'F-1'}]);assert.equal(c.duplicateCandidates({invoice_number:'F-1',counterparty:'A'})[0].exactInvoice,false);});
test('every inline application script compiles',()=>{for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){if(m[1].trim())new vm.Script(m[1]);}});
test('document review renders family and preserves a suggested payer separately',()=>{
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){}},innerHTML:''});return nodes.get(id);};
 const c=vm.createContext({document:{getElementById:node},window:{DOMUSClassification:{labelOptions:()=>''}},people:[],accounts:[],categories:[],series:[],escapeHtml:String,newMasterOptions:()=>'',bestPendingMatch:()=>null,draftLinkedIncomeIds:()=>[],euro:String});
 const a=html.indexOf('function renderDocDrafts'),b=html.indexOf('\nfunction ',a+10);new vm.Script(html.slice(a,b)).runInContext(c);
 c.renderDocDrafts([{document_family:'onlogist_insurance',extraction_quality:'high',amount:12,person_id:'owner',payer_person_id:'payer'}],{id:'test',file_name:'test.pdf'});
 assert.match(node('docDrafts').innerHTML,/ONLOGIST seguro/);assert.match(node('docDrafts').innerHTML,/ddPerson0/);assert.match(node('docDrafts').innerHTML,/ddPayer0/);
});
test('real V26 layout keeps own invoice, commission total and wrapped G reference',()=>{
 const c=setup();const text='ONLOGIST GmbH\nNúmero de factura                 fecha\nV26-162583                      14/10/2026\nPrecio de transporte 95,00 € G261014-017735-\n375400-1\n total (neto) 14,25 €\nTotal 14,25 €\nSu derecho total (bruto) 114,95 €\nCantidad 100,70 €';const d=c.enrichDocumentDraft(read(c,text,'V26-162583.pdf'),text);assert.equal(d.invoice_number,'V26-162583');assert.equal(d.amount,14.25);assert.ok(d.document_reference_keys.includes('G261014-017735-375400-1'));assert.equal(d.movement_role,'commission');
});
test('real VS summary layout reads 9.44 once despite annex premiums',()=>{const c=setup();const text='Resumen de facturas                         fecha\nVS-26-154071                              08/10/2026\nTransporte número 2624000\nINV-ES-2624000 7,64 €\nINV-ADA-ONL-26-2624000 1,80 €\nMonto total 9,44 €\nN.º de factura INV-ES-2624000 Fecha 05.10.2026\nBaloise\nPrima de seguro 7,64 EUR\nPrima total 1,80 €';assert.equal(read(c,text,'VS-26-154071.pdf').amount,9.44);});
