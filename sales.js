export const earlyBirdEnds = new Date('2026-10-14T00:00:00-05:00');
export function saleStage(now = new Date()) {
  return now < earlyBirdEnds ? { price: 20, label: 'Preventa hasta el 13 OCT', closed: false } : { price: 25, label: 'Preventa regular', closed: false };
}
export function requestDetails(pack, quantity, now = new Date()) {
  if (!pack || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error('Elige una cantidad entre 1 y 20.');
  const stage = saleStage(now);
  if (stage.closed) throw new Error('Esta edición ya terminó. Consulta próximos eventos con el organizador.');
  if (pack.id === 'general') return { people: quantity, total: stage.price * quantity, line: `${quantity} entrada(s) general(es) · S/ ${stage.price} c/u · total referencial S/ ${stage.price * quantity}` };
  if (pack.id === 'crew') return { people: quantity * 6, total: null, line: `${quantity} pack(s) de 6 · ${quantity * 6} entradas + ${quantity} six pack(s) de chela · precio por confirmar` };
  return { people: quantity, total: null, line: `Consulta VIP para ${quantity} persona(s) · detalles y precio por anunciar` };
}
