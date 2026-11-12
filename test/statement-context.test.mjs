import test from 'node:test';import assert from 'node:assert/strict';
import {proposeStatementDefaults,validateStatementDefaults} from '../domus-3/src/treasury/statement-context.js';
import {buildStatementDraft} from '../domus-3/src/treasury/statement-draft.js';
const account={id:'ing',household_id:'h',name:'ING Jeni'},people=[{id:'jeni',household_id:'h',name:'Jeni',active:true}],paymentMethods=[{id:'card',household_id:'h',name:'Tarjeta',active:true},{id:'cash',household_id:'h',name:'Efectivo',active:true}];
test('explicit card statement and unambiguous account owner fill reusable editable defaults',async()=>{
 const defaults=proposeStatementDefaults({account,people,paymentMethods,householdId:'h',fileName:'ING_Jeni_octubre_solo_pagos_tarjeta.csv'});
 assert.deepEqual(defaults,{personId:'jeni',payerPersonId:'jeni',paymentMethodId:'card'});
 const row={statement:{id:'s',date:'2026-10-03',signedAmount:-3.52,concept:'Molino'},candidates:[],decision:'pendiente'};
 const draft=await buildStatementDraft({householdId:'h',userId:'u',account,row,rows:[row],fileName:'tarjeta.csv',defaults,people,paymentMethods});
 assert.equal(draft.personId,'jeni');assert.equal(draft.payerPersonId,'jeni');assert.equal(draft.paymentMethodId,'card');assert.equal(draft.expense_scope,undefined);
});
test('joint/ambiguous account, foreign or inactive people and mixed statement never invent defaults',()=>{
 assert.equal(proposeStatementDefaults({account,people:[...people,{id:'other',household_id:'h',name:'Jeni'}],paymentMethods,householdId:'h',fileName:'extracto.csv'}).personId,'');
 assert.equal(proposeStatementDefaults({account,people:[{...people[0],household_id:'other'}],paymentMethods,householdId:'h'}).personId,'');
 assert.equal(proposeStatementDefaults({account,people:[{...people[0],active:false}],paymentMethods,householdId:'h'}).personId,'');
 assert.equal(proposeStatementDefaults({account,people,paymentMethods,householdId:'h',fileName:'extracto.csv',rows:[{concept:'Bizum'}]}).paymentMethodId,'');
 assert.throws(()=>validateStatementDefaults({payerPersonId:'foreign'},{people,paymentMethods,householdId:'h'}));
});
