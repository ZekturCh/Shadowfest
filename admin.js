import { event } from './config.js';
import { request, ticketUrl, claimUrl } from './platform.js';
import { setupAccess } from './access.js';
let actor,tickets=[],issueRequest='';
const status=document.querySelector('#admin-status');
const labels={valid:'Válida',used:'Utilizada',cancelled:'Anulada'};
const roleNames={seller:'Vendedor',validator:'Validador'};
const random=()=>[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');
const packageName=id=>event.packages.find(p=>p.id===id)?.name||id;
function cell(text){const td=document.createElement('td');td.textContent=text;return td;}
function link(text,url){const a=document.createElement('a');a.textContent=text;a.href=url;a.className='secondary';a.target='_blank';a.rel='noopener';return a;}
async function copy(text){try{await navigator.clipboard.writeText(text);status.textContent='Copiado.';}catch{status.textContent='No se pudo copiar. Abre el enlace y copia su dirección.';}}
function render(){
  document.querySelector('#total-count').textContent=tickets.length;
  document.querySelector('#valid-count').textContent=tickets.filter(t=>t.status==='valid').length;
  document.querySelector('#used-count').textContent=tickets.filter(t=>t.status==='used').length;
  const search=document.querySelector('#ticket-search').value.trim().toLowerCase(),filter=document.querySelector('#ticket-filter').value;
  const rows=document.querySelector('#ticket-rows');rows.replaceChildren();
  tickets.filter(t=>(filter==='all'||t.status===filter)&&(!search||`${t.buyer?.name||''} ${t.buyer?.phone||''} ${t.sellerName} ${t.id}`.toLowerCase().includes(search))).slice().reverse().forEach(t=>{
    const row=document.createElement('tr'),actions=cell('');
    actions.append(link('Registro del comprador',claimUrl(t.claimCode)));
    const copyButton=document.createElement('button');copyButton.className='secondary';copyButton.textContent='Copiar enlace y código';copyButton.onclick=()=>copy(`Tu entrada de Shadow Fest\n${claimUrl(t.claimCode)}\nCódigo brindado: ${t.claimCode}\nRegistra tus datos para obtener tu QR.`);actions.append(copyButton);
    if(t.buyer)actions.append(link('Ver QR',ticketUrl(t.token)));
    if(actor.role==='supreme'&&t.status==='valid'){const cancel=document.createElement('button');cancel.className='secondary';cancel.textContent='Anular';cancel.onclick=async()=>{if(!confirm('¿Anular esta entrada y descontarla del contador?'))return;try{await request('cancel',{id:t.id});await refresh();}catch(e){status.textContent=e.message;}};actions.append(cancel);}
    row.append(cell(t.buyer?.name||'Sin asignar · pendiente de registro'),cell(t.buyer?.phone||'—'),cell(t.sellerName),cell(packageName(t.packageId)),cell(labels[t.status]),actions);rows.append(row);
  });
  if(!rows.children.length){const row=document.createElement('tr'),td=cell('Aún no hay entradas que coincidan.');td.colSpan=6;row.append(td);rows.append(row);}
}
async function refresh(){tickets=await request('list');render();if(actor.role==='supreme'){const stats=await request('stats');document.querySelector('#sold-admin').textContent=stats.sold;await renderAccesses();}}
async function renderAccesses(){const rows=document.querySelector('#access-list');rows.replaceChildren();(await request('accessList')).forEach(a=>{const row=document.createElement('div');row.className='access-row';const text=document.createElement('span');text.textContent=`${a.name} · ${roleNames[a.role]} · ${a.active?'Activo':'Revocado'}`;row.append(text);if(a.active){const button=document.createElement('button');button.className='secondary';button.textContent='Revocar';button.onclick=async()=>{try{await request('accessRevoke',{id:a.id});await renderAccesses();}catch(e){status.textContent=e.message;}};row.append(button);}rows.append(row);});}
event.packages.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;document.querySelector('#issue-package').append(o);});
setupAccess(['supreme','seller'],async current=>{actor=current;document.querySelectorAll('[data-supreme]').forEach(n=>n.classList.toggle('hidden',actor.role!=='supreme'));await refresh();});
document.querySelector('#issue-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;const feedback=document.querySelector('#issue-status');try{issueRequest ||=random();const data=new FormData(e.target);await request('issue',{packageId:data.get('package'),paymentConfirmed:data.has('payment'),requestId:issueRequest});issueRequest='';e.target.reset();feedback.textContent='Entradas creadas. Copia los enlaces de registro de la lista inferior.';await refresh();}catch(error){feedback.textContent=error.message;}finally{button.disabled=false;}});
document.querySelector('#issue-package').addEventListener('change',()=>issueRequest='');
document.querySelector('#create-access').addEventListener('submit',async e=>{e.preventDefault();const button=e.target.querySelector('button[type=submit]');button.disabled=true;const f=new FormData(e.target);try{await request('accessCreate',{name:f.get('name'),code:f.get('code'),role:f.get('role')});document.querySelector('#create-access-status').textContent='Acceso creado. Entrega el código de forma privada; no se mostrará nuevamente.';e.target.reset();await renderAccesses();}catch(error){document.querySelector('#create-access-status').textContent=error.message;}finally{button.disabled=false;}});
document.querySelector('#generate-access-code').onclick=()=>{document.querySelector('#seller-code').value=random();};
document.querySelector('#ticket-search').oninput=render;document.querySelector('#ticket-filter').onchange=render;
document.querySelector('#refresh-tickets').onclick=()=>refresh().catch(e=>status.textContent=e.message);
window.addEventListener('storage',()=>{if(actor)refresh().catch(e=>status.textContent=e.message);});
setInterval(()=>{if(actor&&!document.hidden)refresh().catch(e=>status.textContent=e.message);},30000);
document.querySelector('#export-tickets').onclick=()=>{const escape=v=>{let text=String(v??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};const rows=[['Comprador','Teléfono','Vendedor','Paquete','Estado','Emitida','Registro','Ingreso'],...tickets.map(t=>[t.buyer?.name,t.buyer?.phone,t.sellerName,t.packageId,labels[t.status],t.createdAt,t.buyer?.registeredAt,t.usedAt])];const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(escape).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='shadowfest-entradas.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
