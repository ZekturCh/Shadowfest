import { event } from './config.js?v=20261011-sale3';
import { saleStage, packagePrice, requestDetails, earlyBirdEnds } from './sales.js?v=20261011-pack145';
import { whatsappUrl, purchaseMessage } from './whatsapp.js?v=20261011-sale3';
import { request, localDemo } from './platform.js?v=20261011-sale3';
import { surprises } from './surprises.js?v=20261011-sale3';
const unlockCards = document.querySelector('#unlock-cards');
function renderUnlocks(sold) {
  document.querySelector('#sold-count').textContent=sold;
  const next=surprises.find(s=>s.goal>sold);
  const max=next?.goal||surprises.at(-1)?.goal||sold;
  const percentage=Math.min(100,Math.floor(sold/max*100));
  document.querySelector('#surprises').style.setProperty('--unlock-angle',`${percentage*3.6}deg`);
  document.querySelector('#unlock-percentage').textContent=`${percentage}%`;
  document.querySelector('#next-goal').textContent=next?`${next.goal} entradas`:'Todas las metas alcanzadas';
  document.querySelector('#next-gap').textContent=next?`Faltan ${next.goal-sold} para la próxima revelación.`:'La noche está desbloqueada.';
  document.querySelector('#unlock-progress').style.width=`${Math.min(100,sold/max*100)}%`;
  const track=document.querySelector('.unlock-track');track.setAttribute('aria-valuemax',max);track.setAttribute('aria-valuenow',Math.min(sold,max));
  unlockCards.replaceChildren();
  surprises.forEach((s,i)=>{const card=document.createElement('article');card.className=`unlock-card ${sold>=s.goal?'unlocked':next===s?'next-unlock':''}`;const number=document.createElement('span');number.className='unlock-index';number.textContent=`0${i+1}`;number.setAttribute('aria-hidden','true');const label=document.createElement('span');label.className='lock-label';label.textContent=sold>=s.goal?'DESBLOQUEADA':next===s?'PRÓXIMA REVELACIÓN':'BAJO LLAVE';const title=document.createElement('h3');title.textContent=s.title;const goal=document.createElement('strong');goal.className='unlock-goal';goal.textContent=`${s.goal} entradas`;const description=document.createElement('p');description.textContent=sold>=s.goal?s.description:`${s.goal-sold} entradas para desbloquear`;card.append(number,label,title,goal,description);unlockCards.append(card);});
}
let refreshingSales = false;
async function updateSold(){
  if (refreshingSales || document.hidden) return;
  refreshingSales = true;
  try {
    const stats = await request('stats');
    renderUnlocks(stats.sold);
    document.querySelector('#unlock-status').textContent = localDemo ? 'Vista previa: solo entradas de prueba aprobadas en este navegador.' : 'El contador suma entradas aprobadas. Las sorpresas se anunciarán en nuestro Instagram.';
  } catch {
    document.querySelector('#unlock-status').textContent = 'No pudimos actualizar el contador. Puedes comprar por WhatsApp con normalidad.';
  } finally { refreshingSales = false; }
}
updateSold();setInterval(updateSold,60000);window.addEventListener('storage',updateSold);
const views = [];
const icons = { general:'mask', crew:'beer', vip:'mask' };
function el(tag, className, text) { const node = document.createElement(tag); if(className) node.className=className; if(text) node.textContent=text; return node; }
event.packages.forEach((pack, i) => {
  const card=el('article', `purchase-card pass-${pack.id}`);
  const art=el('div','pass-art');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('aria-hidden','true');
  const use=document.createElementNS('http://www.w3.org/2000/svg','use'); use.setAttribute('href',`assets/festival-icons.svg#${icons[pack.id]}`); svg.append(use);
  art.append(svg, el('span','pass-edition','SHADOW FEST 4.0'), el('span','pass-number',`0${i+1}`));
  const content=el('div','pass-content');
  const status=el('span','pass-status',pack.tag);
  const title=el('h3','',pack.name);
  const price=el('div','pass-price');
  const description=el('p','pass-description',pack.description);
  const benefits=el('ul','pass-benefits');
  for (const benefit of pack.benefits) benefits.append(el('li','',benefit));
  const bottom=el('div','pass-bottom');
  const action=el('a','button',pack.id==='crew'?'QUIERO EL PACK ↗':pack.id==='vip'?'QUIERO VIP ↗':'QUIERO GENERAL ↗');
  action.target='_blank'; action.rel='noopener';
  action.dataset.buy=pack.id;
  let count=1;
  let countLabel, subtotal;
  let updateBounds = () => {};
  if (!pack.teaser) {
    const controls=el('div','pass-controls');
    const caption=el('span','',pack.id==='crew'?'Packs de 6':'Entradas');
    const stepper=el('div','pass-stepper');
    const minus=el('button','', '−'); minus.type='button'; minus.setAttribute('aria-label',`Quitar ${pack.name}`);
    countLabel=el('output','', '1'); countLabel.setAttribute('aria-live','polite'); countLabel.setAttribute('aria-label',`Cantidad de ${pack.id==='crew'?'packs':'entradas'}`);
    const plus=el('button','', '+'); plus.type='button'; plus.setAttribute('aria-label',`Añadir ${pack.name}`);
    stepper.append(minus,countLabel,plus); controls.append(caption,stepper); bottom.append(controls);
    subtotal=el('p','pass-subtotal'); bottom.append(subtotal);
    minus.addEventListener('click',()=>{ count=Math.max(1,count-1); refresh(); });
    plus.addEventListener('click',()=>{ count=Math.min(20,count+1); refresh(); });
    function bounds() { minus.disabled=count<=1; plus.disabled=count>=20; }
    updateBounds = bounds;
  }
  bottom.append(action);
  content.append(status,title,price,description,benefits,bottom); card.append(art,content); document.querySelector('#package-cards').append(card);
  function refresh() {
    const detail=requestDetails(pack,count);
    price.replaceChildren();
    price.append(el('strong','',`S/ ${packagePrice(pack.id)}`),el('span','',pack.id==='crew'?'/ pack · sixpack incluido':'/ persona'));
    if(countLabel) countLabel.textContent=count;
    updateBounds();
    if(subtotal) subtotal.textContent=`Total: S/ ${detail.total}${pack.id==='crew'?` · ${detail.people} personas`:''}`;
    action.href=whatsappUrl(event.whatsapp,purchaseMessage(detail));
  }
  views.push(refresh); refresh();
});
function updatePrices() { const stage=saleStage(); document.querySelector('#hero-price').textContent=`S/ ${stage.price}`; document.querySelector('#hero-stage').textContent=stage.label; document.querySelector('#mobile-price').textContent=`S/ ${stage.price}`; document.querySelector('#package-stage').textContent = new Date() < earlyBirdEnds ? 'PREVENTA HASTA EL 20 DE OCTUBRE' : 'VENTA REGULAR · ENTRADAS DESDE S/25'; views.forEach(refresh=>refresh()); }
let countdownExpired;
function updateCountdown() {
  const remaining = Math.max(0, Math.ceil((earlyBirdEnds - new Date()) / 1000));
  const expired = remaining === 0;
  const values = { days: Math.floor(remaining / 86400), hours: Math.floor(remaining / 3600) % 24, minutes: Math.floor(remaining / 60) % 60, seconds: remaining % 60 };
  for (const [unit, value] of Object.entries(values)) document.querySelector(`[data-countdown=${unit}]`).textContent = String(value).padStart(2, '0');
  if (expired !== countdownExpired) {
    countdownExpired = expired;
    document.querySelector('#presale-countdown').classList.toggle('expired', expired);
    document.querySelector('#countdown-kicker').textContent = expired ? 'VENTA REGULAR' : 'PREVENTA HASTA EL 20 OCT';
    document.querySelector('#countdown-title').textContent = expired ? 'La noche sigue. Tu entrada está a S/25.' : 'El precio de S/20 se acaba en';
    document.querySelector('#countdown-note').textContent = expired ? 'Compra por WhatsApp y asegura tu entrada.' : '20 OCT · 11:59 p. m. · hora de Lima';
    updatePrices();
  }
}
updateCountdown(); setInterval(updateCountdown,1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { updateCountdown(); updateSold(); } });
const mobileBuy = document.querySelector('.mobile-buy');
const purchaseVisibility = new IntersectionObserver(entries => {
  mobileBuy.classList.toggle('hidden', entries[0].isIntersecting);
}, { threshold: 0 });
purchaseVisibility.observe(document.querySelector('#packages'));
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector('.festival-hero');
let pointerFrame = null;
hero.addEventListener('pointermove', e => {
  if (motion.matches || e.pointerType !== 'mouse') return;
  const rect = hero.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width - .5) * 16;
  const y = ((e.clientY - rect.top) / rect.height - .5) * 12;
  if (pointerFrame) cancelAnimationFrame(pointerFrame);
  pointerFrame = requestAnimationFrame(() => { hero.style.setProperty('--art-x', `${x}px`); hero.style.setProperty('--art-y', `${y}px`); });
});
function resetHero() { if (pointerFrame) cancelAnimationFrame(pointerFrame); hero.style.setProperty('--art-x', '0px'); hero.style.setProperty('--art-y', '0px'); }
hero.addEventListener('pointerleave', resetHero); motion.addEventListener('change', resetHero);
