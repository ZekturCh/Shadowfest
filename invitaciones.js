import { request, ticketUrl } from './platform.js?v=20261011-invites';
import { setupAccess } from './access.js?v=20261011-invites';
import { withBusy, isBusy } from './busy.js?v=20261011-invites';
import { invitationPackageId } from './invitation-policy.js?v=20261011-invites';
const form=document.querySelector('#invitation-form'),feedback=document.querySelector('#invitation-status');
const labels={pending:'Por activar',valid:'Cortesía activada',used:'Utilizada',cancelled:'Anulada'};
let actor,tickets=[],quota={limit:110,allocated:0},issueRequest='';
const random=()=>[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');
const url=t=>ticketUrl(t.token,invitationPackageId);
function cell(text){const node=document.createElement('td');node.textContent=text;return node;}
function render(){
  document.querySelector('#invite-remaining').textContent=quota.limit-quota.allocated;
  document.querySelector('#invite-approved').textContent=tickets.filter(t=>['valid','used'].includes(t.status)).length;
  document.querySelector('#invite-used').textContent=tickets.filter(t=>t.status==='used').length;
  const search=document.querySelector('#invitation-search').value.trim().toLowerCase(),filter=document.querySelector('#invitation-filter').value,rows=document.querySelector('#invitation-rows');rows.replaceChildren();
  for(const t of tickets.slice().reverse().filter(t=>(filter==='all'||t.status===filter)&&(!search||`${t.buyer?.name||''} ${t.shortCode}`.toLowerCase().includes(search)))){
    const row=document.createElement('tr'),actions=cell('');
    const open=document.createElement('a');open.className='secondary';open.textContent='Ver invitación ↗';open.href=url(t);open.target='_blank';open.rel='noopener';actions.append(open);
    const button=(label,action)=>{const b=document.createElement('button');b.className='secondary';b.textContent=label;b.dataset.invitationId=t.id;b.onclick=()=>withBusy(b,'Procesando…',async()=>{const peers=[...document.querySelectorAll(`[data-invitation-id="${t.id}"]`)];peers.forEach(p=>p.disabled=true);try{await action();}catch(error){feedback.textContent=error.message;}finally{peers.forEach(p=>p.disabled=false);}},'invitation:'+t.id);actions.append(b);};
    button('Copiar enlace',async()=>{try{await navigator.clipboard.writeText(`Tu invitación de cortesía a Shadow Fest\nCódigo de puerta: ${t.shortCode}\n${url(t)}\nEl ingreso requiere que figure activada. Evento +18; lleva tu documento de identidad.`);feedback.textContent='Enlace de cortesía copiado.';}catch{feedback.textContent='Abre la invitación y copia su dirección.';}});
    if(['pending','valid'].includes(t.status)&&!t.sentAt)button('Marcar enviada',async()=>{await request('markSent',{id:t.id});await refresh();feedback.textContent='Invitación marcada como enviada.';});
    if(t.status==='pending')button('Activar cortesía',async()=>{await request('approve',{id:t.id});await refresh();feedback.textContent='Cortesía activada. Ya permite un ingreso.';});
    if(['pending','valid'].includes(t.status))button('Anular',async()=>{if(!confirm('¿Anular esta invitación y liberar su cupo?'))return;await request('cancel',{id:t.id});await refresh();feedback.textContent='Invitación anulada. Cupo liberado.';});
    row.append(cell(t.buyer?.name||'Nombre por completar'),cell(t.shortCode),cell(`${labels[t.status]} · ${t.sentAt?'Enviada':'Sin marcar envío'}`),actions);rows.append(row);
  }
  if(!rows.children.length){const row=document.createElement('tr'),empty=cell('No hay invitaciones que coincidan.');empty.colSpan=4;row.append(empty);rows.append(row);}
}
async function refresh(){[tickets,quota]=await Promise.all([request('invitationList'),request('invitationStats')]);render();}
function nameMode(){const batch=Number(form.elements.quantity.value)>1;form.elements.name.disabled=batch;document.querySelector('#invite-name-help').textContent=batch?'Cada invitado puede completar su nombre en su propio enlace.':'Puedes dejar el nombre vacío para que el invitado lo complete en su enlace.';}
setupAccess(['supreme'],async current=>{actor=current;await refresh();});
form.onsubmit=e=>{e.preventDefault();return withBusy(form.querySelector('button[type=submit]'),'Generando…',async()=>{
  const data=new FormData(form),quantity=Number(data.get('quantity')),controls=[...form.querySelectorAll('input,select')],status=document.querySelector('#invitation-issue-status');controls.forEach(c=>c.disabled=true);
  try{if(!issueRequest&&quantity>quota.limit-quota.allocated)throw new Error(`Solo quedan ${quota.limit-quota.allocated} cupos. Elige un lote menor.`);issueRequest ||=random();const result=await request('issue',{packageId:invitationPackageId,quantity,name:data.get('name')||'',requestId:issueRequest,onProgress:(done,total)=>{status.textContent=`Guardando ${done} de ${total} invitaciones…`;}});issueRequest='';form.reset();status.textContent=result.quantity===1?"1 invitación generada. Actívala antes de compartirla.":`${result.quantity} invitaciones generadas. Actívalas antes de compartirlas.`;}
  catch(error){status.textContent=error.message+' Si el lote quedó incompleto, reintenta la misma solicitud para completar los QR sin duplicarlos.';}
  finally{controls.forEach(c=>c.disabled=false);nameMode();try{await refresh();}catch(error){feedback.textContent='No se pudo actualizar la lista. '+error.message;}}
},'invitation-issue');};
form.elements.quantity.onchange=()=>{issueRequest='';nameMode();};form.elements.name.oninput=()=>issueRequest='';nameMode();
document.querySelector('#invitation-search').oninput=render;document.querySelector('#invitation-filter').onchange=render;
document.querySelector('#invitation-refresh').onclick=e=>withBusy(e.currentTarget,'Actualizando…',()=>refresh().catch(error=>feedback.textContent=error.message));
document.querySelector('#invitation-export').onclick=()=>{const escape=value=>{let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};const rows=[['Invitado','Código de puerta','Estado','Enlace'],...tickets.map(t=>[t.buyer?.name,t.shortCode,labels[t.status],url(t)])];const download=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(escape).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=download;a.download='shadowfest-invitaciones.csv';a.click();setTimeout(()=>URL.revokeObjectURL(download),1000);};
setInterval(()=>{if(actor&&!document.hidden&&!isBusy())refresh().catch(error=>feedback.textContent=error.message);},30000);
