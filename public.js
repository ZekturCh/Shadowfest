import { event } from './config.js';
document.querySelector('#event-meta').textContent = `${event.date} / ${event.location}`;
const cards = document.querySelector('#package-cards');
event.packages.forEach((pack, i) => {
  const card = document.createElement('article'); card.className = 'card';
  const number = document.createElement('span'); number.className = 'card-index'; number.textContent = `0${i + 1} / SHADOW PASS`;
  const title = document.createElement('h3'); title.textContent = pack.name;
  const tag = document.createElement('p'); tag.className = 'tag'; tag.textContent = pack.tag;
  const description = document.createElement('p'); description.textContent = pack.description;
  const price = document.createElement('p'); price.className = 'price'; price.textContent = 'Precio por anunciar';
  const link = document.createElement('a'); link.className = 'button'; link.href = '#request'; link.textContent = 'SOLICITAR INFORMACIÓN ↗';
  link.addEventListener('click', () => { document.querySelector('#package-select').value = pack.id; });
  card.append(number, title, tag, description, price, link); cards.append(card);
  const option = document.createElement('option'); option.value = pack.id; option.textContent = pack.name; document.querySelector('#package-select').append(option);
});
let message = '';
document.querySelector('#request-form').addEventListener('submit', e => {
  e.preventDefault(); const values = new FormData(e.target);
  const pack = event.packages.find(p => p.id === values.get('package'));
  message = `Hola, soy ${values.get('name').trim()}. Quiero información para ShadowFest.\nPaquete: ${pack.name}\nPersonas: ${values.get('quantity')}\nConsulta por preventa de bebidas: ${values.get('drinks')}\n¿Me confirmas precios, disponibilidad y cómo coordinar la transferencia?`;
  document.querySelector('#message-preview').textContent = message;
  document.querySelector('#request-summary').classList.remove('hidden');
  const chat = document.querySelector('#chat-link');
  if (/^\d{8,15}$/.test(event.whatsapp)) { chat.href = `https://wa.me/${event.whatsapp}?text=${encodeURIComponent(message)}`; chat.classList.remove('hidden'); }
  document.querySelector('#chat-status').textContent = event.whatsapp ? 'Revisa el mensaje antes de enviarlo.' : 'El contacto del organizador aún no está configurado. Puedes copiar el mensaje.';
});
document.querySelector('#copy-message').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(message); document.querySelector('#chat-status').textContent = 'Mensaje copiado.'; }
  catch { document.querySelector('#chat-status').textContent = 'No se pudo copiar. Selecciona el texto del mensaje para copiarlo manualmente.'; }
});
