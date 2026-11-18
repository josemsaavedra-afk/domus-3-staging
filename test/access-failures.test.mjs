import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const html=readFileSync('domus-3/index.html','utf8');
function setup(errorMessage){
 const dom=new JSDOM(html,{url:'https://families.invalid',runScripts:'outside-only'}),w=dom.window,d=w.document,calls=[];
 w.sb={auth:{async signUp(){calls.push('signup');return {error:{message:errorMessage}}},async signInWithPassword(){calls.push('login');return {error:{message:errorMessage}}}}};
 w.msg=(id,message)=>{d.getElementById(id).textContent=message};w.setBusy=(button,busy)=>{button.disabled=busy};
 w.authRedirectUrl=()=>w.location.origin;
 w.eval(html.slice(html.indexOf('function friendlyAuthError('),html.indexOf("\ndocument.getElementById('createHouseholdBtn')")));
 w.eval(html.slice(html.indexOf("let authMode='login';"),html.indexOf("document.getElementById('forgotPasswordBtn').onclick=")));
 d.getElementById('authEmail').value='owner@example.invalid';d.getElementById('authPassword').value='test-password';
 return {w,d,calls,close:()=>w.close(),submit:()=>d.getElementById('authForm').onsubmit({preventDefault(){}})};
}
test('a rejected signup keeps the form usable and explains the private access issue',async()=>{
 const x=setup('Database error saving new user');try{x.d.getElementById('toggleAuthMode').click();await x.submit();assert.deepEqual(x.calls,['signup']);assert.match(x.d.getElementById('authMsg').textContent,/correo autorizado/);assert.doesNotMatch(x.d.getElementById('authMsg').textContent,/Database|Supabase/);assert.equal(x.d.getElementById('authSubmit').disabled,false);assert.equal(x.d.getElementById('authPassword').autocomplete,'new-password');}finally{x.close()}
});
test('invalid login and unconfirmed email give different next actions',async()=>{
 for(const [error,expected] of [['Invalid login credentials',/Correo o contraseña incorrectos/],['Email not confirmed',/Confirma tu correo/]]){const x=setup(error);try{await x.submit();assert.deepEqual(x.calls,['login']);assert.match(x.d.getElementById('authMsg').textContent,expected);assert.equal(x.d.getElementById('authSubmit').disabled,false);}finally{x.close()}}
});
test('throttling and connection errors never encourage immediate repeated submissions',async()=>{
 for(const [error,expected] of [['email rate limit exceeded',/Espera unos minutos/],['Failed to fetch',/Comprueba tu conexión/]]){const x=setup(error);try{await x.submit();assert.match(x.d.getElementById('authMsg').textContent,expected);}finally{x.close()}}
});
test('unexpected provider details are not displayed to a family user',async()=>{
 const x=setup('internal database relation private.secret_table failed');try{await x.submit();assert.equal(x.d.getElementById('authMsg').textContent,'No se pudo completar la solicitud. Inténtalo de nuevo más tarde.');assert.equal(x.calls.length,1);}finally{x.close()}
});
