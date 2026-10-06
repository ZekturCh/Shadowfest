import { localDemo } from './runtime.js?v=20261006b';
export { extractTicketCode as extractCode } from './ticket-code.js?v=20261006b';
export { localDemo };
const sessionKey = 'shadowfest-session-v2';
let token = sessionStorage.getItem(sessionKey) || '';
export async function request(action, data = {}) {
  if (localDemo) { const { demoRequest } = await import('./platform-demo.js?v=20261006b'); return demoRequest(action, data, token); }
  const { firebaseRequest } = await import('./platform-firebase.js?v=20261006b');
  return firebaseRequest(action, data);
}
export async function login(code) { const result = await request('login', { code }); token = result.token; sessionStorage.setItem(sessionKey, token); return result.actor; }
export async function logout() { try { await request('logout'); } finally { token=''; sessionStorage.removeItem(sessionKey); location.reload(); } }
export function ticketUrl(code) { const url = new URL('qr.html',localDemo?location.href:'https://zekturch.github.io/Shadowfest/'); url.hash = code; return url.href; }
export function claimUrl(code) { const url = new URL('activar.html',location.href); url.hash = code; return url.href; }
export function showMode() { const banner=document.querySelector('#demo-notice'); if(banner) { banner.textContent=localDemo ? 'VISTA PREVIA LOCAL · QR y accesos de prueba. Firebase aún no está conectado; los datos solo se comparten en este navegador.' : ''; banner.classList.toggle('hidden',!localDemo); } }
