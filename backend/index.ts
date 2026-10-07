import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import {identity,validateOperation,TreasuryError} from './treasury/runtime-contract.js';
import {parseStatementCsv} from './treasury/statement-csv.js';
import {createStatementFingerprint} from './treasury/reconciliation-report.js';
import {checkpointDecimal} from './treasury/checkpoint-draft.js';
const cors={'Access-Control-Allow-Origin':'https://josemsaavedra-afk.github.io','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store'};
const known=new Set(['UNAUTHORIZED','HOUSEHOLD_MISMATCH','ACCOUNT_MISMATCH','INVALID_PAYLOAD','DUPLICATE_OPERATION','SOURCE_CHANGED','STALE_VERSION','OCCURRENCE_CONFLICT','ALREADY_CONFIRMED','ALREADY_REVOKED']);
Deno.serve(async request=>{
 const answer=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:cors});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return answer({error:{code:'INVALID_PAYLOAD'}},405);
 const token=request.headers.get('authorization')||'';
 if(!token.startsWith('Bearer '))return answer({error:{code:'UNAUTHORIZED'}},401);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_ANON_KEY');
 if(!url||!key||url!=='https://pmgonotpbmybtwvxbcvf.supabase.co')return answer({error:{code:'BACKEND_UNAVAILABLE'}},503);
 const client=createClient(url,key,{global:{headers:{Authorization:token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await client.auth.getUser(token.slice(7));
 if(authError||!auth.user)return answer({error:{code:'UNAUTHORIZED'}},401);
 try{
 const body=await request.json(),h=identity(body.householdId);
 if(identity(body.actorId)!==auth.user.id)throw new TreasuryError('UNAUTHORIZED');
 const input=body.operation;
 if(!input||typeof input.type!=='string')throw new TreasuryError('INVALID_PAYLOAD');
 let op;
 if(input.type==='read')op={type:'read'};
 else{
 const payload=validateOperation(input.type,input.payload,input.baseRevision??null);
 const id=identity(input.id);
 if(id!==identity(input.idempotencyKey))throw new TreasuryError('DUPLICATE_OPERATION');
 op={id,idempotencyKey:id,type:input.type,payload,baseRevision:input.baseRevision??null};
 if(input.type==='import'){
 const parsed=parseStatementCsv(payload.csv),hash=await createStatementFingerprint(payload.accountId,payload.csv);
 if(!parsed.length||parsed.length>20000)throw new TreasuryError('INVALID_PAYLOAD');
 const lines=await Promise.all(parsed.map(async row=>({ordinal:row.ordinal,date:row.date,concept:row.concept,reference:row.reference,amount:checkpointDecimal(row.signedAmount),hash:(await createStatementFingerprint(payload.accountId,JSON.stringify([row.date,row.concept,row.reference,row.signedAmount]))).contentSha256})));
 op.payload={accountId:payload.accountId,fileName:payload.fileName||'extracto.csv',contentSha256:hash.contentSha256,lines};
 }
 }
 const {data,error}=await client.rpc('domus_treasury_execute',{household_id:h,operation:op});
 if(error){const code=known.has(error.message)?error.message:error.code==='42501'?'UNAUTHORIZED':['40001','40P01','57014'].includes(error.code)?'BACKEND_UNAVAILABLE':'INTEGRITY_VIOLATION';return answer({error:{code}},code==='UNAUTHORIZED'?401:code==='BACKEND_UNAVAILABLE'?503:409);}
 return answer({value:data});
 }catch(error){return answer({error:{code:error instanceof TreasuryError?error.code:'INVALID_PAYLOAD'}},400);}
});
