export const earlyBirdEnds = new Date('2026-10-21T00:00:00-05:00');
export function saleStage(now = new Date()) {
  return now < earlyBirdEnds ? { price: 20, label: 'Preventa hasta el 20 OCT', closed: false } : { price: 25, label: 'Venta regular', closed: false };
}
export function packagePrice(id, now = new Date()) {
  const multiplier = { general: 1, crew: 6, vip: 2 }[id];
  if (!multiplier) throw new Error('Selecciona una entrada válida.');
  return saleStage(now).price * multiplier;
}
export function requestDetails(pack, quantity, now = new Date()) {
  if (!pack || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error('Elige una cantidad entre 1 y 20.');
  const unitPrice = packagePrice(pack.id, now), total = unitPrice * quantity;
  if (pack.id === 'crew') return { people: quantity * 6, total, line: `${quantity} ${quantity === 1 ? 'pack' : 'packs'} de 6 · ${quantity * 6} entradas generales + ${quantity} six ${quantity === 1 ? 'pack' : 'packs'} de Pilsen · S/ ${unitPrice} por pack · total S/ ${total}` };
  const label = pack.id === 'vip' ? 'VIP' : quantity === 1 ? 'general' : 'generales';
  return { people: quantity, total, line: `${quantity} ${quantity === 1 ? 'entrada' : 'entradas'} ${label} · S/ ${unitPrice} c/u · total S/ ${total}` };
}
