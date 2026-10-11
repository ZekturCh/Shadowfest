// Only approved, non-cancelled tickets count. Ignore the retired legacy baseline.
export function confirmedSales(data = {}) {
  const approved = data.approved ?? 0;
  if (!Number.isSafeInteger(approved) || approved < 0) throw new Error('No se pudo confirmar el contador de entradas.');
  return { sold: approved, initialSold: 0 };
}
