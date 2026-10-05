export function whatsappUrl(number, message) {
  if (!/^\d{8,15}$/.test(number)) throw new Error('Número de WhatsApp inválido.');
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
