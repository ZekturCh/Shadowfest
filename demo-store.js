const KEY = 'shadowfest-demo-v1';
export const DEMO_NOTICE = 'DEMO LOCAL · No confirma pagos reales. Los datos solo se comparten entre pestañas de este navegador; no hay autenticación ni sincronización entre dispositivos.';
export function readTickets() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('Los datos de demostración no son válidos.');
  return data;
}
function writeTickets(tickets) { localStorage.setItem(KEY, JSON.stringify(tickets)); }
async function locked(action) {
  if (!navigator.locks) throw new Error('Este navegador no admite el bloqueo necesario. Prueba un navegador actualizado en localhost o HTTPS.');
  return navigator.locks.request(KEY, action);
}
export async function issueTicket(name, packageId, paymentConfirmed) {
  if (!paymentConfirmed) throw new Error('Debes confirmar el pago de prueba antes de emitir.');
  if (!name.trim()) throw new Error('Indica el nombre del asistente.');
  return locked(() => {
    const tickets = readTickets();
    const ticket = { id: crypto.randomUUID(), name: name.trim().slice(0, 60), packageId, status: 'valid', createdAt: new Date().toISOString(), usedAt: null };
    tickets.push(ticket); writeTickets(tickets); return ticket;
  });
}
export function getTicket(id) { return readTickets().find(t => t.id === id); }
export async function validateTicket(id) {
  return locked(() => {
    const tickets = readTickets(); const ticket = tickets.find(t => t.id === id);
    if (!ticket) throw new Error('La entrada no existe en este navegador de demostración.');
    if (ticket.status === 'used') throw new Error('Entrada ya utilizada. No autorizar otro ingreso.');
    if (ticket.status !== 'valid') throw new Error('Entrada anulada. No autorizar ingreso.');
    ticket.status = 'used'; ticket.usedAt = new Date().toISOString(); writeTickets(tickets); return ticket;
  });
}
export async function cancelTicket(id) {
  return locked(() => {
    const tickets = readTickets(); const ticket = tickets.find(t => t.id === id);
    if (!ticket || ticket.status !== 'valid') throw new Error('Solo puedes anular una entrada válida.');
    ticket.status = 'cancelled'; writeTickets(tickets);
  });
}
export function ticketUrl(id) { const url = new URL('qr.html', location.href); url.searchParams.set('c', id); return url.href; }
export function extractCode(value) {
  const text = value.trim(); let code = text;
  try { const url = new URL(text); if (url.origin !== location.origin || url.pathname !== new URL('qr.html', location.href).pathname) throw new Error('Enlace de otro sitio.'); code = url.searchParams.get('c') || ''; }
  catch (error) { if (/^https?:/i.test(text)) throw error; }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(code)) throw new Error('Introduce un código o enlace de entrada válido.');
  return code;
}
export const statusLabels = { valid: 'Válida', used: 'Utilizada', cancelled: 'Anulada' };
export function installDemoBanner() { document.querySelector('#demo-notice').textContent = DEMO_NOTICE; }
