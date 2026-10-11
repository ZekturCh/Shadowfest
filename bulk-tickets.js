export const bulkTicketLimit = 50;
export function ticketIds(ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > bulkTicketLimit || ids.some(id => typeof id !== 'string' || !/^(?:[a-f0-9]{32}|[a-f0-9]{64})$/.test(id))) throw new Error('Selecciona entre 1 y 50 QR válidos.');
  return [...new Set(ids)];
}
export function ticketLotId(ticket) {
  return String(ticket.requestId || '').replace(/_(?:[0-9]|1[0-6])$/, '');
}
export async function runTicketBatch(ids, operation, onProgress) {
  const selected = ticketIds(ids), result = {changed: [], unchanged: [], failed: []};
  for (const id of selected) {
    try {
      const outcome = await operation(id);
      (outcome?.changed === false ? result.unchanged : result.changed).push(id);
    } catch (error) {
      result.failed.push({id, message: error.message || 'No se pudo guardar este QR.'});
    }
    onProgress?.(result.changed.length + result.unchanged.length + result.failed.length, selected.length);
  }
  return result;
}
