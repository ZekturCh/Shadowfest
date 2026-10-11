import {runTransaction, serverTimestamp} from 'firebase/firestore';

export async function approveTicket(db, ref, id, actorId, {retry = false, paidOnly = false} = {}) {
  return runTransaction(db, async tx => {
    const entryRef = ref('tickets', id), salesRef = ref('meta', 'sales');
    const entry = await tx.get(entryRef), sales = await tx.get(salesRef);
    if (!entry.exists()) throw new Error('Entrada no encontrada.');
    const ticket = entry.data();
    if (paidOnly && ticket.packageId === 'invitation') throw new Error('Activa las cortesías desde el panel de invitaciones.');
    if (retry && ['valid', 'used'].includes(ticket.status)) return {changed: false};
    if (ticket.status !== 'pending') throw new Error('Solo se aprueban entradas pendientes.');
    const previous = sales.exists() ? sales.data().approved : 0;
    if (!Number.isSafeInteger(previous) || previous < 0) throw new Error('No se pudo confirmar el contador de entradas.');
    const approved = previous + 1;
    tx.update(entryRef, {status: 'valid', approvedAt: serverTimestamp(), approvedBy: actorId});
    tx.update(ref('passes', id), {status: 'valid'});
    tx.set(salesRef, {approved, initialSold: 110, lastTicket: id, updatedAt: serverTimestamp()});
    tx.set(ref('publicStats', 'sales'), {approved, initialSold: 110, updatedAt: serverTimestamp()});
    return {changed: true};
  });
}
