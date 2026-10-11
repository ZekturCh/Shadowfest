import { localDemo } from './runtime.js?v=20261011c';
export { extractTicketCode as extractCode } from './ticket-code.js?v=20261011c';
export { localDemo };
const sessionKey = 'shadowfest-session-v2';
let token = sessionStorage.getItem(sessionKey) || '';
export async function request(action, data = {}) {
  if (localDemo) { const { demoRequest } = await import('./platform-demo.js?v=20261011c'); return demoRequest(action, data, token); }
  const { firebaseRequest } = await import('./platform-firebase.js?v=20261011c');
  return firebaseRequest(action, data);
}
export async function login(code) { const result = await request('login', { code }); token = result.token; sessionStorage.setItem(sessionKey, token); return result.actor; }
export async function logout() { try { await request('logout'); } finally { token=''; sessionStorage.removeItem(sessionKey); location.reload(); } }
export function ticketUrl(code) { const url = new URL('qr.html',localDemo?location.href:'https://shadowfest.web.app/'); url.hash = code; return url.href; }
export function claimUrl(code) { const url = new URL('activar.html',location.href); url.hash = code; return url.href; }
export function consumptionUrl(code) { const url = new URL('canje.html',localDemo?location.href:'https://shadowfest.web.app/'); url.hash = code; return url.href; }
export async function watchConsumptionData(kind,code,next,error){
  if(!localDemo){const sdk=await import('./platform-firebase.js?v=20261011c');return sdk.watchConsumptionData(kind,code,next,error);}
  const action={admin:'consumptionList',ticket:'consumptionsForTicket',pass:'consumptionPass'}[kind];
  let stopped=false;const refresh=()=>request(action,{code}).then(data=>{if(!stopped)next(data);}).catch(e=>{if(!stopped)error(e);});
  window.addEventListener('storage',refresh);window.addEventListener('shadowfest-change',refresh);await refresh();
  return ()=>{stopped=true;window.removeEventListener('storage',refresh);window.removeEventListener('shadowfest-change',refresh);};
}
export function showMode() { const banner=document.querySelector('#demo-notice'); if(banner) { banner.textContent=localDemo ? 'VISTA PREVIA LOCAL · QR y accesos de prueba. Firebase aún no está conectado; los datos solo se comparten en este navegador.' : ''; banner.classList.toggle('hidden',!localDemo); } }
