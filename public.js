import { event } from './config.js';
import { saleStage, requestDetails } from './sales.js';
const select = document.querySelector('#package-select');
const quantity = document.querySelector('#request-quantity');
let message = '';
event.packages.forEach((pack, i) => {
  const card = document.createElement('article'); card.className = 'card';
  const number = document.createElement('span'); number.className = 'card-index'; number.textContent = `0${i + 1} / SHADOW PASS`;
  const title = document.createElement('h3'); title.textContent = pack.name;
  const tag = document.createElement('p'); tag.className = 'tag'; tag.textContent = pack.tag;
  const description = document.createElement('p'); description.textContent = pack.description;
  const price = document.createElement('p'); price.className = 'price'; price.dataset.packagePrice = pack.id;
  const link = document.createElement('a'); link.className = 'button'; link.href = '#request'; link.textContent = pack.teaser ? 'QUIERO SABER MÁS ↗' : 'QUIERO ESTE PASE ↗';
  link.addEventListener('click', () => { select.value = pack.id; quantity.value = 1; updateSelection(); });
  card.append(number, title, tag, description, price, link); document.querySelector('#package-cards').append(card);
  const option = document.createElement('option'); option.value = pack.id; option.textContent = pack.name; select.append(option);
});
function hideStaleMessage() { document.querySelector('#request-summary').classList.add('hidden'); message = ''; }
function updateSelection() {
  hideStaleMessage(); const pack = event.packages.find(p => p.id === select.value);
  document.querySelector('#quantity-label').textContent = pack.id === 'crew' ? 'Cantidad de packs (6 personas por pack)' : pack.id === 'vip' ? 'Personas interesadas en VIP' : 'Cantidad de entradas';
  try { document.querySelector('#selection-detail').textContent = requestDetails(pack, Number(quantity.value)).line; }
  catch (error) { document.querySelector('#selection-detail').textContent = error.message; }
}
function updatePrices() {
  const stage = saleStage(); document.querySelector('#hero-price').textContent = stage.closed ? 'NOS VEMOS' : `S/ ${stage.price}`;
  document.querySelector('#hero-stage').textContent = stage.label; document.querySelector('#mobile-price').textContent = stage.closed ? 'PRÓXIMAMENTE' : `S/ ${stage.price}`;
  document.querySelector('#stage-early').classList.toggle('current-stage', !stage.closed && stage.price === 20);
  document.querySelector('#stage-regular').classList.toggle('current-stage', !stage.closed && stage.price === 25);
  document.querySelector('[data-package-price="general"]').textContent = stage.closed ? 'Edición finalizada' : `S/ ${stage.price} / persona`;
  document.querySelector('[data-package-price="crew"]').textContent = '6 entradas + 1 six pack';
  document.querySelector('[data-package-price="vip"]').textContent = 'Revelación próximamente';
  document.querySelector('#request-form button[type="submit"]').disabled = stage.closed;
  try { document.querySelector('#selection-detail').textContent = requestDetails(event.packages.find(p => p.id === select.value), Number(quantity.value)).line; }
  catch (error) { document.querySelector('#selection-detail').textContent = error.message; }
}
select.addEventListener('change', updateSelection); quantity.addEventListener('input', updateSelection);
document.querySelector('#request-form input[name="name"]').addEventListener('input', hideStaleMessage);
document.querySelector('#vip-interest').addEventListener('click', () => { select.value = 'vip'; quantity.value = 1; updateSelection(); });
document.querySelector('#request-form').addEventListener('submit', e => {
  e.preventDefault(); const values = new FormData(e.target); const pack = event.packages.find(p => p.id === values.get('package'));
  const status = document.querySelector('#chat-status');
  try {
    const detail = requestDetails(pack, Number(values.get('quantity')));
    message = `¡Voy a Shadow Fest 4.0! Soy ${values.get('name').trim()}.\n31 de octubre · Lima\n${detail.line}\n¿Me confirmas disponibilidad${detail.total === null ? ', precio' : ''} y los datos para coordinar la transferencia?`;
    document.querySelector('#message-preview').textContent = message; document.querySelector('#request-summary').classList.remove('hidden');
    const chat = document.querySelector('#chat-link'); chat.classList.add('hidden'); chat.removeAttribute('href');
    if (/^\d{8,15}$/.test(event.whatsapp)) { chat.href = `https://wa.me/${event.whatsapp}?text=${encodeURIComponent(message)}`; chat.classList.remove('hidden'); status.textContent = 'Revisa y envía tu mensaje al organizador.'; }
    else status.textContent = 'Falta configurar el WhatsApp del organizador. Por ahora puedes copiar el mensaje.';
  } catch (error) { message = ''; document.querySelector('#request-summary').classList.remove('hidden'); document.querySelector('#message-preview').textContent = ''; document.querySelector('#chat-link').classList.add('hidden'); status.textContent = error.message; }
});
document.querySelector('#copy-message').addEventListener('click', async () => {
  if (!message) return;
  try { await navigator.clipboard.writeText(message); document.querySelector('#chat-status').textContent = 'Mensaje copiado.'; }
  catch { document.querySelector('#chat-status').textContent = 'Selecciona el mensaje y cópialo manualmente.'; }
});
let previousStage = saleStage().price;
updatePrices(); setInterval(() => { const nextStage = saleStage().price; if (nextStage !== previousStage) hideStaleMessage(); previousStage = nextStage; updatePrices(); }, 60000);
const motion = matchMedia('(prefers-reduced-motion: reduce)'); const image = document.querySelector('.parallax-image'); const scene = document.querySelector('.space-window');
let scheduled = false;
function moveScene() {
  scheduled = false;
  if (motion.matches) { image.style.transform = ''; return; }
  const rect = scene.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > innerHeight) return;
  const displacement = Math.max(-65, Math.min(65, (innerHeight / 2 - (rect.top + rect.height / 2)) * .12));
  image.style.transform = `translate3d(0, ${displacement}px, 0) scale(1.2)`;
}
function scheduleScene() { if (!scheduled) { scheduled = true; requestAnimationFrame(moveScene); } }
window.addEventListener('scroll', scheduleScene, { passive: true }); window.addEventListener('resize', scheduleScene); motion.addEventListener('change', moveScene); moveScene();
