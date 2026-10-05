import { event } from './config.js';
import { getTicket, extractCode, ticketUrl, installDemoBanner } from './demo-store.js';
installDemoBanner();
const status = document.querySelector('#qr-status');
let renderedId = '';
function render() {
  const box = document.querySelector('#qr-box'); box.classList.add('hidden'); document.querySelector('#copy-ticket').classList.add('hidden');
  try {
    const code = extractCode(new URL(location.href).searchParams.get('c') || ''); const ticket = getTicket(code);
    if (!ticket) throw new Error('Esta entrada no existe en este navegador de demostración.');
    document.querySelector('#guest-name').textContent = ticket.name;
    document.querySelector('#guest-package').textContent = event.packages.find(p => p.id === ticket.packageId)?.name || '';
    document.querySelector('#ticket-code').textContent = code;
    if (ticket.status === 'used') { status.textContent = 'Entrada utilizada. Este QR ya no permite ingresar.'; status.className = 'status used'; return; }
    if (ticket.status !== 'valid') { status.textContent = 'Entrada anulada. No permite ingresar.'; status.className = 'status error'; return; }
    if (!window.QRCode) throw new Error('No se pudo cargar el generador QR. Recarga la página.');
    if (renderedId !== code) { box.replaceChildren(); new window.QRCode(box, { text: ticketUrl(code), width: 220, height: 220, correctLevel: window.QRCode.CorrectLevel.M }); renderedId = code; }
    box.classList.remove('hidden'); status.textContent = 'Entrada de prueba válida. Presenta este QR para probar el ingreso.'; status.className = 'status valid'; document.querySelector('#copy-ticket').classList.remove('hidden');
  } catch (error) { status.textContent = error.message; status.className = 'status error'; }
}
document.querySelector('#copy-ticket').addEventListener('click', async () => { try { await navigator.clipboard.writeText(ticketUrl(renderedId)); status.textContent = 'Enlace copiado.'; } catch { status.textContent = 'Copia la dirección desde el navegador.'; } });
window.addEventListener('storage', render); render();
