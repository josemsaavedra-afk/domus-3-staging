(function (global) {
 'use strict';
 const kinds=new Set(['people','accounts','categories','counterparties','activity_projects','tags','payment_methods']);
 function create({client,context,confirm,onDeleted,onError,onBlocked,timeoutMs=12000}) {
  const pending=new Set();
  const same=(a)=>{const b=context();return a?.userId&&a?.householdId&&a.userId===b?.userId&&a.householdId===b?.householdId;};
  async function rpc(scope,kind,id,version=null){
   if(!same(scope))throw {code:'SESSION_CHANGED'};
   const control=new AbortController(),timer=setTimeout(()=>control.abort(),timeoutMs);
   try{
    const query=client().rpc('domus3_delete_master',{p_household_id:scope.householdId,p_table:kind,p_id:id,p_expected_version:version});
    if(typeof query.abortSignal!=='function')throw {code:'CLIENT_UNSUPPORTED'};
    const {data,error}=await query.abortSignal(control.signal);
    if(error)throw error;
    if(!same(scope))throw {code:'SESSION_CHANGED'};
    if(!data||data.id!==id||!['review','blocked','deleted'].includes(data.status))throw {code:'ACK_UNKNOWN'};
    return data;
   }finally{clearTimeout(timer);}
  }
  function explain(error){
   if(error?.code==='SESSION_CHANGED')return 'La sesión o el hogar ha cambiado. Recarga para comprobar el resultado.';
   if(error?.code==='40001')return 'El registro ha cambiado. Recarga y vuelve a revisarlo antes de eliminar.';
   if(error?.code==='42501')return 'No tienes permiso para eliminar este registro en el hogar seleccionado.';
   if(error?.code==='PGRST202'||error?.code==='42883')return 'La eliminación segura aún no está disponible en el servidor. No se ha solicitado un borrado directo.';
   return 'No se ha podido confirmar la eliminación. Recarga antes de reintentar; no se repetirá automáticamente.';
  }
  async function remove(kind,id,button){
   const scope=context(),key=[scope?.householdId,scope?.userId,kind,id].join(':');
   if(!kinds.has(kind)||!same(scope)||pending.has(key))return 'ignored';
   pending.add(key);
   const previous=button?.textContent;
   if(button){button.disabled=true;button.textContent='Revisando…';button.setAttribute('aria-busy','true');}
   let acknowledged=false;
   try{
    const preview=await rpc(scope,kind,id);
    if(preview.status==='blocked'){onBlocked(preview);return 'blocked';}
    if(preview.status!=='review'||!/^[a-f0-9]{32}$/.test(preview.version)||typeof preview.name!=='string'||!preview.name.trim())throw {code:'ACK_UNKNOWN'};
    if(!await confirm(`¿Eliminar definitivamente «${preview.name}»?\n\nEl servidor no ha encontrado vínculos. Desactivar y eliminar son acciones distintas. No se borrarán movimientos ni documentos.`))return 'cancelled';
    if(!same(scope))throw {code:'SESSION_CHANGED'};
    if(button)button.textContent='Eliminando…';
    const result=await rpc(scope,kind,id,preview.version);
    if(result.status==='blocked'){onBlocked(result);return 'blocked';}
    if(result.status!=='deleted')throw {code:'ACK_UNKNOWN'};
    acknowledged=true;
    await onDeleted(result);
    return 'deleted';
   }catch(error){
    onError(acknowledged?'El registro se eliminó, pero no se pudo refrescar la lista. Recarga para comprobarla.':explain(error));
    return acknowledged?'deleted_refresh_pending':'unconfirmed';
   }finally{
    pending.delete(key);
    if(button){button.disabled=false;button.textContent=previous;button.removeAttribute('aria-busy');}
   }
  }
  return Object.freeze({remove});
 }
 global.DOMUSMasterDeletion=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
