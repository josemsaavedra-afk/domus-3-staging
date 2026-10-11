(function(){
 const STATUS={INTERPRETED:'interpreted',NEEDS_REVIEW:'needs_review',PENDING_REVIEW:'pending_review'};
 const money=function(s){if(s==null)return null;var t=String(s).replace(/[^0-9,.-]/g,'').trim();if(!t)return null;if(t.indexOf(',')>=0&&t.indexOf('.')>=0)t=t.lastIndexOf(',')>t.lastIndexOf('.')?t.replaceAll('.','').replace(',','.'):t.replaceAll(',','');else if(t.indexOf(',')>=0)t=t.replace(',','.');var n=Number(t);return Number.isFinite(n)?Math.abs(n):null};
 const uniq=function(a){return Array.from(new Set(a.filter(function(v){return v!==null&&v!==undefined&&v!==''})))};
 const validDate=function(s){var m=String(s||'').match(/^(?:(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})|(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}))$/);if(!m)return null;var y=Number(m[1]||m[6]),mo=Number(m[2]||m[5]),d=Number(m[3]||m[4]),v=new Date(y,mo-1,d);return v.getFullYear()===y&&v.getMonth()===mo-1&&v.getDate()===d?y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0'):null};
 function filenameEvidence(name){
  var base=String(name||'').replace(/\.[^.]+$/,'').trim(),date='',merchant=base,m=base.match(/(?:^|\D)(20\d{2})(\d{2})(\d{2})(?:\D|$)/);
  if(m){date=validDate(m[1]+'-'+m[2]+'-'+m[3])||'';if(date)merchant=merchant.replace(m[0].trim(),' ')}
  merchant=merchant.replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
  return {merchant:/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(merchant)?merchant:'',date:date};
 }
 function dateCandidates(text){
  var p='(?:20\\d{2}[-/.]\\d{1,2}[-/.]\\d{1,2}|\\d{1,2}[-/.]\\d{1,2}[-/.]20\\d{2})',re=new RegExp('(?:fecha[^0-9]{0,20})?('+p+')','gi'),out=[],m;
  while((m=re.exec(String(text||'')))){var d=validDate(m[1]);if(d)out.push(d)}
  return uniq(out);
 }
 function totalCandidates(text){
  var lines=String(text||'').split(/\r?\n/),out=[];
  lines.forEach(function(line){if(!/t[o0]ta[l1i]|a\s*pagar|importe\s*(?:final|total)|amount\s*due|grand\s*total/i.test(line))return;var vals=Array.from(line.matchAll(/\d{1,3}(?:[ .]\d{3})*[,.]\d{2}/g)).map(function(m){return money(m[0])}).filter(function(v){return v!=null});if(vals.length)out.push(vals[vals.length-1])});
  return uniq(out);
 }
 function issuerCandidates(text){
  var lines=String(text||'').split(/\r?\n/).map(function(x){return x.trim()}).filter(Boolean),out=[];
  lines.slice(0,14).forEach(function(line){if(line.length<3||line.length>80||/^\s*(factura|ticket|fecha|hora|total|base|iva|vat|nif|cif|tel|www\.|http|pagina)\b/i.test(line))return;var letters=(line.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g)||[]).length,digits=(line.match(/\d/g)||[]).length;if(letters>=4&&letters>digits)out.push(line.replace(/^["']+|["']+$/g,''))});
  return uniq(out);
 }
 function suspiciousIssuer(s){s=String(s||'').trim();if(!s)return true;var letters=(s.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g)||[]).length,digits=(s.match(/\d/g)||[]).length;return /^["']/.test(s)||(digits>=letters&&letters<7)||(/[A-Z]\d[A-Z0-9]{2,}/.test(s)&&letters<8)}
 function interpretReceipt(input){
  input=input||{};var filename=input.filename||'',readings=(input.readings||[]).filter(Boolean),firstPass=input.firstPass||{},file=filenameEvidence(filename),warnings=[],provenance={},amount=firstPass.amount,date=firstPass.date||'',issuer=firstPass.supplier||firstPass.counterparty||firstPass.concept||'';
  if(amount!=null)provenance.amount='primera lectura';else{var amounts=uniq([].concat.apply([],readings.map(totalCandidates)));if(amounts.length===1){amount=amounts[0];provenance.amount='lecturas OCR'}else if(amounts.length>1)warnings.push('importe ambiguo')}
  if(date)provenance.date='primera lectura';else{var dates=uniq([].concat.apply([],readings.map(dateCandidates)));if(dates.length===1){date=dates[0];provenance.date='lecturas OCR'}else if(!dates.length&&file.date){date=file.date;provenance.date='nombre del archivo'}else if(dates.length>1)warnings.push('fecha ambigua')}
  if(issuer&&!suspiciousIssuer(issuer))provenance.issuer='primera lectura';else if(file.merchant){issuer=file.merchant;provenance.issuer='nombre del archivo'}else{var issuers=uniq([].concat.apply([],readings.map(issuerCandidates))),exact=issuers.find(function(x){return !suspiciousIssuer(x)});if(exact){issuer=exact;provenance.issuer='lecturas OCR'}else{issuer='';warnings.push('emisor no identificado')}}
  if(amount==null)warnings.push('importe no identificado');if(!date)warnings.push('fecha no identificada');if(!issuer)warnings.push('emisor no identificado');
  return {status:warnings.length?STATUS.PENDING_REVIEW:STATUS.INTERPRETED,amount:amount,date:date,issuer:issuer,provenance:provenance,warnings:warnings};
 }
 window.DOMUSTransportERPEngine={STATUS:STATUS,interpretReceipt:interpretReceipt,filenameEvidence:filenameEvidence,totalCandidates:totalCandidates,dateCandidates:dateCandidates,issuerCandidates:issuerCandidates};
})();