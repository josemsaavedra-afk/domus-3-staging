import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseStatementCsv,inspectStatementCsv} from '../domus-3/src/treasury/statement-csv.js';
import {validateOperation} from '../domus-3/src/treasury/runtime-contract.js';
const accountId='4c85b46f-3296-4012-add0-104143c8a299';
test('Unknown bank headers can map signed amounts without rewriting evidence',()=>{
 const csv='Día;Texto banco;Euros\n09/10/2026;Prueba;-1,25';
 assert.throws(()=>parseStatementCsv(csv));
 const info=inspectStatementCsv(csv);assert.equal(info.count,1);
 const mapping={delimiter:';',headerRow:0,date:0,concept:1,amount:2};
 assert.equal(parseStatementCsv(csv,mapping)[0].signedAmount,-1.25);
 assert.equal(validateOperation('import',{accountId,csv,mapping}).csv,csv);
});
test('TSV and prefaced debit/credit exports share strict RC1 validation',()=>{
 const csv='Extracto\nDía\tTexto\tSalida\tEntrada\n09/10/2026\tCargo\t3,50\t\n10/10/2026\tCobro\t\t8';
 const mapping={delimiter:'\t',headerRow:1,date:0,concept:1,debit:2,credit:3};
 assert.deepEqual(parseStatementCsv(csv,mapping).map(r=>r.signedAmount),[-3.5,8]);
 assert.throws(()=>parseStatementCsv(csv.replace('3,50\t','3,50\t2'),mapping),/simultáneos/);
 assert.throws(()=>parseStatementCsv(csv,{...mapping,concept:0}),/dos campos/);
 assert.throws(()=>parseStatementCsv(csv,{...mapping,unexpected:1}),/Mapeo/);
});
test('Client and server use identical CSV and operation contracts',()=>{
 for(const name of ['statement-csv.js','runtime-contract.js']) assert.equal(readFileSync('domus-3/src/treasury/'+name,'utf8'),readFileSync('backend/treasury/'+name,'utf8'));
});
