import { event } from './config.js';
import { readTickets, issueTicket, cancelTicket, ticketUrl, statusLabels, installDemoBanner } from './demo-store.js';
installDemoBanner();
event.packages.forEach(pack => { const option = document.createElement('option'); option.value = pack.id; option.textContent = pack.name; document.querySelector('#issue-package').append(option); });
const status = document.querySelector('#admin-status');
function render() {
  try {
    const tickets = readTickets();
    document.querySelector('#total-count').textContent = tickets.length;
    document.querySelector('#valid-count').textContent = tickets.filter(t => t.status === 'valid').length;
    document.querySelector('#used-count').textContent = tickets.filter(t => t.status === 'used').length;
    const search = document.querySelector('#ticket-search').value.trim().toLowerCase(); const filter = document.querySelector('#ticket-filter').value;
    const rows = document.querySelector('#ticket-rows'); rows.replaceChildren();
    const filtered = tickets.filter(t => (!search || `${t.name} ${t.id}`.toLowerCase().includes(search)) && (filter === 'all' || t.status === filter));
    filtered.slice().reverse().forEach(ticket => {
      const row = document.createElement('tr');
      const name = document.createElement('td'); name.textContent = ticket.name;
      const pack = document.createElement('td'); pack.textContent = event.packages.find(p => p.id === ticket.packageId)?.name || ticket.packageId;
      const state = document.createElement('td'); const badge = document.createElement('span'); badge.className = `badge ${ticket.status}`; badge.textContent = statusLabels[ticket.status]; state.append(badge);
      const actions = document.createElement('td');
      const open = document.createElement('a'); open.className = 'secondary'; open.href = ticketUrl(ticket.id); open.target = '_blank'; open.rel = 'noopener'; open.textContent = 'Ver QR';
      const copy = document.createElement('button'); copy.className = 'secondary'; copy.textContent = 'Copiar enlace';
      copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(ticketUrl(ticket.id)); status.textContent = 'Enlace copiado.'; } catch { status.textContent = 'No se pudo copiar. Abre el QR y copia su dirección.'; } });
      actions.append(open, ' ', copy);
      if (ticket.status === 'valid') { const cancel = document.createElement('button'); cancel.className = 'secondary'; cancel.textContent = 'Anular'; cancel.addEventListener('click', async () => { if (!confirm(`¿Anular la entrada de prueba de ${ticket.name}?`)) return; try { await cancelTicket(ticket.id); render(); status.textContent = 'Entrada anulada.'; } catch (error) { status.textContent = error.message; } }); actions.append(' ', cancel); }
      row.append(name, pack, state, actions); rows.append(row);
    });
    if (!filtered.length) { const row = document.createElement('tr'); const cell = document.createElement('td'); cell.colSpan = 4; cell.className = 'empty'; cell.textContent = 'No hay entradas para mostrar. Emite una entrada de prueba para comenzar.'; row.append(cell); rows.append(row); }
  } catch (error) { status.textContent = error.message; }
}
document.querySelector('#issue-form').addEventListener('submit', async e => {
  e.preventDefault(); const button = e.target.querySelector('button'); button.disabled = true;
  const feedback = document.querySelector('#issue-status'); const link = document.querySelector('#issued-link'); link.classList.add('hidden');
  try { const data = new FormData(e.target); const ticket = await issueTicket(data.get('name'), data.get('package'), data.has('payment')); feedback.textContent = 'Entrada de prueba emitida.'; link.href = ticketUrl(ticket.id); link.classList.remove('hidden'); e.target.reset(); render(); }
  catch (error) { feedback.textContent = error.message; } finally { button.disabled = false; }
});
document.querySelector('#ticket-search').addEventListener('input', render); document.querySelector('#ticket-filter').addEventListener('change', render); window.addEventListener('storage', render);
document.querySelector('#export-tickets').addEventListener('click', () => {
  try {
    const cell = value => { let text = String(value ?? ''); if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; };
    const rows = [['Código', 'Nombre', 'Paquete', 'Estado', 'Creada', 'Ingreso'], ...readTickets().map(t => [t.id, t.name, t.packageId, statusLabels[t.status], t.createdAt, t.usedAt])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'shadowfest-entradas-demo.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) { status.textContent = error.message; }
}); render();
