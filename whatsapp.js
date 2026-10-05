export function whatsappUrl(number, message) {
  if (!/^\d{8,15}$/.test(number)) throw new Error('Número de WhatsApp inválido.');
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
export function purchaseMessage(detail) {
  return `¡Voy a Shadow Fest 4.0!\n31 de octubre · Lima\n${detail.line}\n¿Me confirmas disponibilidad${detail.total === null ? ', precio' : ''} y los datos para coordinar la transferencia?`;
}
