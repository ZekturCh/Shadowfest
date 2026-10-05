import { localDemo, apiEndpoint } from './runtime.js';
export { localDemo };
const sessionKey = 'shadowfest-session-v2';
let token = sessionStorage.getItem(sessionKey) || '';
export async function request(action, data = {}) {
  if (localDemo) { const { demoRequest } = await import('./platform-demo.js'); return demoRequest(action, data, token); }
  const response = await fetch(apiEndpoint, { method: 'POST', cache: 'no-store', headers: { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) }, body:JSON.stringify({ action, ...data }) });
  let result; try { result = await response.json(); } catch { throw new Error('El servicio de entradas todavía no está conectado.'); }
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación.');
  return result;
}
export async function login(code) { const result = await request('login', { code }); token = result.token; sessionStorage.setItem(sessionKey, token); return result.actor; }
export async function logout() { try { await request('logout'); } finally { token=''; sessionStorage.removeItem(sessionKey); location.reload(); } }
export function ticketUrl(code) { const url = new URL('qr.html',location.href); url.hash = code; return url.href; }
export function claimUrl(code) { const url = new URL('activar.html',location.href); url.hash = code; return url.href; }
export function extractCode(value) { let code=value.trim(); if (/^https?:/i.test(code)) { const url=new URL(code); if(url.origin!==location.origin || !url.pathname.endsWith('/qr.html')) throw new Error('Enlace de entrada inválido.'); code=url.hash.slice(1); } if(!/^[a-f0-9]{64}$/i.test(code)) throw new Error('Introduce el código QR completo o su enlace.'); return code.toLowerCase(); }
export function showMode() { const banner=document.querySelector('#demo-notice'); if(banner) { banner.textContent=localDemo ? 'VISTA PREVIA LOCAL · QR y accesos de prueba. Firebase aún no está conectado; los datos solo se comparten en este navegador.' : ''; banner.classList.toggle('hidden',!localDemo); } }
