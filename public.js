import { event } from './config.js';
import { saleStage, requestDetails } from './sales.js';
import { whatsappUrl, purchaseMessage } from './whatsapp.js';
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
  const status=el('span','pass-status',pack.id==='general'?'PREVENTA':pack.id==='crew'?'CON TU CREW':'REVELACIÓN PRÓXIMAMENTE');
  const title=el('h3','',pack.name);
  const price=el('div','pass-price');
  const description=el('p','pass-description',pack.id==='general'?'Acceso al evento y sorteo de uno de los 5 baldes de chelas.':pack.id==='crew'?'6 entradas generales y un six pack de chela para compartir.':'Beneficios y precio por revelar. Consulta las próximas novedades.');
  const bottom=el('div','pass-bottom');
  const action=el('a','button',pack.id==='general'?'COMPRAR POR WHATSAPP ↗':pack.id==='crew'?'CONSULTAR PACK ↗':'CONSULTAR VIP ↗');
  action.dataset.buy=pack.id;
  let count=1;
  let countLabel, subtotal;
  let updateBounds = () => {};
  if (!pack.teaser) {
    const controls=el('div','pass-controls');
    const caption=el('span','',pack.id==='crew'?'Packs de 6':'Entradas');
    const stepper=el('div','pass-stepper');
    const minus=el('button','', '−'); minus.type='button'; minus.setAttribute('aria-label',`Quitar ${pack.id==='crew'?'pack':'entrada'}`);
    countLabel=el('output','', '1'); countLabel.setAttribute('aria-live','polite'); countLabel.setAttribute('aria-label',`Cantidad de ${pack.id==='crew'?'packs':'entradas'}`);
    const plus=el('button','', '+'); plus.type='button'; plus.setAttribute('aria-label',`Añadir ${pack.id==='crew'?'pack':'entrada'}`);
    stepper.append(minus,countLabel,plus); controls.append(caption,stepper); bottom.append(controls);
    subtotal=el('p','pass-subtotal'); bottom.append(subtotal);
    minus.addEventListener('click',()=>{ count=Math.max(1,count-1); refresh(); });
    plus.addEventListener('click',()=>{ count=Math.min(20,count+1); refresh(); });
    function bounds() { minus.disabled=count<=1; plus.disabled=count>=20; }
    updateBounds = bounds;
  }
  bottom.append(action);
  content.append(status,title,price,description,bottom); card.append(art,content); document.querySelector('#package-cards').append(card);
  function refresh() {
    const stage=saleStage(); const detail=requestDetails(pack,count);
    price.replaceChildren();
    if (pack.id==='general') { price.append(el('strong','',`S/ ${stage.price}`),el('span','', '/ persona')); }
    else if(pack.id==='crew') { price.append(el('strong','', '6 entradas'),el('span','', '+ un six pack de chela')); }
    else { price.append(el('strong','', 'Próximamente'),el('span','', 'Zona VIP')); }
    if(countLabel) countLabel.textContent=count;
    updateBounds();
    if(subtotal) subtotal.textContent=pack.id==='general'?`Subtotal: S/ ${detail.total}`:`${detail.people} personas · ${count} six pack${count>1?'s':''}`;
    action.href=whatsappUrl(event.whatsapp,purchaseMessage(detail));
  }
  views.push(refresh); refresh();
});
function updatePrices() { const stage=saleStage(); document.querySelector('#hero-price').textContent=`S/ ${stage.price}`; document.querySelector('#hero-stage').textContent=stage.label; document.querySelector('#mobile-price').textContent=`S/ ${stage.price}`; views.forEach(refresh=>refresh()); }
updatePrices(); setInterval(updatePrices,60000);
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
