import {request, ticketUrl} from './platform.js?v=20261011-bulk';
import {withBusy, isBusy} from './busy.js?v=20261011-bulk';
import {bulkTicketLimit, runTicketBatch, ticketLotId} from './bulk-tickets.js?v=20261011-bulk';
import {isInvitation, ticketPackageName} from './invitation-policy.js?v=20261011-bulk';
import {event} from './config.js?v=20261011-bulk';

export function setupBulkTickets({getActor, getTickets, refresh}) {
  const root=document.querySelector('#ticket-bulk'),selected=new Set();
  const feedback=root.querySelector('#bulk-status'),payment=root.querySelector('#bulk-payment-check');
  const buttons=Object.fromEntries(['select','clear','approve','request','copy','sent','download'].map(name=>[name,root.querySelector('#bulk-'+name)]));
  let visible=[],busy=false;
  const passName=t=>t.packageId==='crew'?'General (pack de 6)':ticketPackageName(event.packages,t.packageId);
  const selectable=t=>!isInvitation(t)&&['pending','valid'].includes(t.status);
  const chosen=()=>getTickets().filter(t=>selected.has(t.id));
  const owns=t=>getActor()?.role==='supreme'||t.sellerId===getActor()?.id;
  function sync() {
    const entries=getTickets(),current=new Map(entries.map(t=>[t.id,t]));
    for(const id of selected)if(!current.has(id)||!selectable(current.get(id)))selected.delete(id);
    const list=chosen(),pending=list.filter(t=>t.status==='pending'),supreme=getActor()?.role==='supreme';
    root.querySelector('#bulk-count').textContent=list.length;
    root.querySelector('#bulk-summary').textContent=`${pending.length} pendientes · ${list.length-pending.length} aprobadas sin usar`;
    root.querySelector('#bulk-payment').classList.toggle('hidden',!supreme);
    buttons.approve.classList.toggle('hidden',!supreme);
    buttons.request.classList.toggle('hidden',supreme);
    buttons.select.disabled=busy||!visible.some(selectable);
    buttons.clear.disabled=busy||!list.length;
    buttons.approve.disabled=busy||!pending.length||!payment.checked;
    buttons.request.disabled=busy||!pending.some(t=>owns(t)&&!t.approvalRequestedAt);
    buttons.copy.disabled=busy||!list.length;
    buttons.download.disabled=busy||!list.length;
    buttons.sent.disabled=busy||!list.some(t=>owns(t)&&!t.sentAt);
    payment.disabled=busy||!pending.length;
    if(!busy)buttons.approve.textContent=pending.length?`APROBAR ${pending.length} QR`:'APROBAR SELECCIONADAS';
    for(const checkbox of document.querySelectorAll('[data-bulk-id]')){checkbox.checked=selected.has(checkbox.dataset.bulkId);checkbox.disabled=busy;}
    if(busy)document.querySelectorAll('[data-ticket-id],.ticket-lot-pick,#ticket-search,#ticket-filter').forEach(n=>n.disabled=true);
  }
  function clear(){selected.clear();payment.checked=false;root.querySelector('#bulk-message-wrap').classList.add('hidden');sync();}
  function select(entries) {
    if(busy||isBusy())return;
    clear();entries.filter(selectable).slice(0,bulkTicketLimit).forEach(t=>selected.add(t.id));sync();
  }
  function selectionCell(ticket,context='') {
    const cell=document.createElement('td');cell.className='ticket-select-cell';
    if(!selectable(ticket)){cell.textContent='—';return cell;}
    const label=document.createElement('label'),check=document.createElement('input'),text=document.createElement('span');
    label.className='check-line';check.type='checkbox';check.dataset.bulkId=ticket.id;check.checked=selected.has(ticket.id);check.disabled=busy;check.setAttribute('aria-label',`Seleccionar QR ${ticket.shortCode||ticket.id.slice(0,6)}${context}`);text.textContent='Elegir';label.append(check,text);cell.append(label);
    check.onchange=()=>{if(busy){sync();return;}if(check.checked&&selected.size>=bulkTicketLimit){feedback.textContent='El máximo por operación es 50 QR.';sync();return;}check.checked?selected.add(ticket.id):selected.delete(ticket.id);payment.checked=false;sync();};
    const lot=ticketLotId(ticket),members=lot?getTickets().filter(t=>ticketLotId(t)===lot&&selectable(t)):[];
    if(members.length>1){const button=document.createElement('button');button.type='button';button.className='secondary ticket-lot-pick';button.textContent=`Lote de ${members.length}`;button.disabled=busy;button.onclick=()=>{select(members);feedback.textContent=`Lote seleccionado: ${Math.min(members.length,bulkTicketLimit)} QR. Comprueba el pago antes de aprobar.`;};cell.append(button);}
    return cell;
  }
  async function mutate(button,label,operation,verb) {
    if(busy||isBusy())return;
    await withBusy(button,label,async()=>{
      const source=chosen(),byId=new Map(source.map(t=>[t.id,t]));busy=true;sync();
      try {
        const result=await operation((done,total)=>{feedback.textContent=`${label} ${done} de ${total} QR…`;});
        const failures=result.failed.map(f=>`${byId.get(f.id)?.shortCode||'QR'}: ${f.message}`).join('\n');
        feedback.textContent=`${result.changed.length} QR ${verb}${result.unchanged.length?` · ${result.unchanged.length} ya estaban aprobados`:''}.${failures?`\n${result.failed.length} pendientes de resolver:\n${failures}\nPuedes reintentar; los ya aprobados no se duplican.`:''}`;
      } catch(error){feedback.textContent=error.message;}
      finally {
        payment.checked=false;
        try{await refresh();}catch(error){feedback.textContent+='\nNo se pudo actualizar la lista. '+error.message;}
        busy=false;document.querySelectorAll('[data-ticket-id],.ticket-lot-pick,#ticket-search,#ticket-filter').forEach(n=>n.disabled=false);sync();
      }
    },'bulk-tickets');
    sync();
  }
  const progressBatch=(entries,action,onProgress)=>runTicketBatch(entries.map(t=>t.id),async id=>{await request(action,{id});return {changed:true};},onProgress);
  buttons.select.onclick=()=>select(visible);
  buttons.clear.onclick=clear;
  payment.onchange=sync;
  buttons.approve.onclick=()=>{if(!payment.checked)return;const ids=chosen().filter(t=>t.status==='pending').map(t=>t.id);return mutate(buttons.approve,'Aprobando…',onProgress=>request('approveBatch',{ids,onProgress}),'aprobados');};
  buttons.request.onclick=()=>{const entries=chosen().filter(t=>t.status==='pending'&&owns(t)&&!t.approvalRequestedAt);return mutate(buttons.request,'Solicitando…',onProgress=>progressBatch(entries,'requestApproval',onProgress),'enviados a revisión de pago');};
  buttons.sent.onclick=()=>{const entries=chosen().filter(t=>owns(t)&&!t.sentAt);return mutate(buttons.sent,'Marcando envío…',onProgress=>progressBatch(entries,'markSent',onProgress),'marcados como enviados');};
  buttons.copy.onclick=()=>withBusy(buttons.copy,'Copiando…',async()=>{
    const list=chosen();if(!list.length)return;
    const text=['Tus entradas de Shadow Fest · 31 OCT',...list.map((t,i)=>`${i+1}. ${passName(t)} · ${t.shortCode||'Ver QR'}${t.buyer?.name?` · ${t.buyer.name}`:''}\n${ticketUrl(t.token,t.packageId)}`),'Cada QR permite un ingreso cuando figure aprobado. Evento +18; lleva tu documento de identidad.'].join('\n\n');
    root.querySelector('#bulk-message').value=text;
    try{await navigator.clipboard.writeText(text);feedback.textContent=`${list.length} enlaces copiados. Pégalos en el chat del comprador y después marca el envío.`;}catch{root.querySelector('#bulk-message-wrap').classList.remove('hidden');feedback.textContent='Selecciona y copia el texto de abajo para enviarlo por WhatsApp.';}
  });
  buttons.download.onclick=()=>{
    const list=chosen();if(!list.length)return;
    const escape=value=>{let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
    const rows=[['Comprador','Vendedor','Paquete','Código','Estado','Enlace'],...list.map(t=>[t.buyer?.name,t.sellerName,passName(t),t.shortCode,t.status==='valid'?'Aprobada':'Pendiente',ticketUrl(t.token,t.packageId)])];
    const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(escape).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`shadowfest-${list.length}-entradas.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    feedback.textContent=`${list.length} enlaces descargados. Cada persona debe recibir su QR individual.`;
  };
  return {selectionCell,clear,sync,setVisible(entries){visible=entries;sync();}};
}
