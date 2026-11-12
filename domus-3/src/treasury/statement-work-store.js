// Progress stays in this browser, isolated by signed-in user and household.
const key=context=>`domus3:statement-work:v1:${context.userId}:${context.householdId}`;
const valid=context=>Boolean(context?.userId&&context?.householdId);
const candidate=row=>({id:row.id,date:row.date,signedAmount:row.signedAmount,concept:row.concept,accountId:row.accountId});
export function saveStatementWork(storage,context,{reviews,activeReviewKey,draft,accountId}){
 if(!valid(context))throw Error('Inicia sesión para guardar el avance.');
 const state={version:1,savedAt:new Date().toISOString(),activeReviewKey,accountId,
  reviews:[...reviews].map(([id,entry])=>({id,metadata:{accountId:entry.metadata.account.id,fileName:entry.metadata.fileName,csv:entry.metadata.csv,mapping:entry.metadata.mapping,fingerprint:entry.metadata.fingerprint,defaults:entry.metadata.defaults},
   session:{rows:entry.session.rows.map(row=>({...row,candidates:row.candidates.map(candidate),rejectedCandidates:(row.rejectedCandidates||[]).map(candidate)}))},showOnlyPending:entry.showOnlyPending})),
  draft:draft?{fileName:draft.file.name,text:draft.text,accountId:draft.accountId,controls:draft.controls,format:{delimiter:draft.info.delimiter,headerRow:draft.info.headerRow},defaults:draft.defaults}:null};
 storage.setItem(key(context),JSON.stringify(state));return state.savedAt;
}
export function readStatementWork(storage,context){
 if(!valid(context))return null;
 try{const state=JSON.parse(storage.getItem(key(context)));if(state?.version!==1||!Array.isArray(state.reviews)||state.reviews.some(row=>typeof row.id!=='string'||typeof row.metadata?.csv!=='string'||!Array.isArray(row.session?.rows)))return null;return state;}catch{return null;}
}
