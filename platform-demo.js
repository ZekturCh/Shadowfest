import { initialSold } from './surprises.js';
const key='shadowfest-platform-v2';
const random = bytes => [...crypto.getRandomValues(new Uint8Array(bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
const initial=()=>({accesses:[],sessions:[],tickets:[]});
function read(){return JSON.parse(localStorage.getItem(key)||'null')||initial();}
function publicTicket(t){return {id:t.id,name:t.buyer?.name||'Pendiente de registro',packageId:t.packageId,status:t.status,registered:!!t.buyer,token:t.token};}
export async function demoRequest(action,data,token){
  const localSecret=action==='login'?(await (await fetch('.shadowfest-local.json',{cache:'no-store'})).json()).supremeCode:null;
  return navigator.locks.request(key,()=>{
    const state=read();
    const save=()=>localStorage.setItem(key,JSON.stringify(state));
    if(action==='stats') return {sold:initialSold+state.tickets.filter(t=>t.status!=='cancelled').length,initialSold};
    if(action==='login') {
      // Only served on localhost; production never imports this module.
      const access=data.code===localSecret?{id:'supreme',name:'Organizador supremo',role:'supreme',active:true}:state.accesses.find(a=>a.code===data.code&&a.active);
      if(!access) throw new Error('Código incorrecto o revocado.');
      const session={token:random(32),actor:{id:access.id,name:access.name,role:access.role},expires:Date.now()+8*3600000};state.sessions.push(session);save();return session;
    }
    if(action==='claimLookup'||action==='claim') {
      const ticket=state.tickets.find(t=>t.claimCode===data.code);
      if(!ticket||ticket.status==='cancelled') throw new Error('Código inválido o entrada anulada.');
      if(action==='claim') { if(ticket.buyer) throw new Error('La entrada ya fue registrada.'); const name=String(data.name||'').trim(),phone=String(data.phone||'').trim(); if(name.length<3||name.length>80||!/^\+?[0-9 ()-]{7,20}$/.test(phone)||!data.adult||!data.consent)throw new Error('Completa tus datos y las confirmaciones.');ticket.buyer={name,phone,registeredAt:new Date().toISOString()};save(); }
      return ticket.buyer?publicTicket(ticket):{packageId:ticket.packageId,registered:false};
    }
    if(action==='ticket') {const t=state.tickets.find(t=>t.token===data.code);if(!t)throw new Error('Entrada no encontrada.');return publicTicket(t);}
    const session=state.sessions.find(s=>s.token===token&&s.expires>Date.now());
    if(!session || (session.actor.id!=='supreme'&&!state.accesses.some(a=>a.id===session.actor.id&&a.active)))throw new Error('Ingresa tu código de acceso.');
    const actor=session.actor;
    if(action==='me')return actor;
    if(action==='logout'){state.sessions=state.sessions.filter(s=>s.token!==token);save();return {};}
    const supreme=()=>{if(actor.role!=='supreme')throw new Error('Solo el organizador supremo puede realizar esta acción.');};
    if(action==='accessList'){supreme();return state.accesses.map(({code,...a})=>a);}
    if(action==='accessCreate'){supreme();const name=String(data.name||'').trim(),code=String(data.code||'').trim();if(name.length<2||name.length>60||!/^\S{8,64}$/.test(code)||!['seller','validator'].includes(data.role))throw new Error('Usa un nombre y un código de 8 a 64 caracteres sin espacios.');if(state.accesses.some(a=>a.code===code))throw new Error('El código ya existe.');const a={id:random(16),name,code,role:data.role,active:true,createdAt:new Date().toISOString()};state.accesses.push(a);save();return {id:a.id};}
    if(action==='accessRevoke'){supreme();const a=state.accesses.find(a=>a.id===data.id);if(!a)throw new Error('Acceso no encontrado.');a.active=false;save();return {};}
    if(action==='list'){if(actor.role==='validator')throw new Error('Acceso solo de validación.');return state.tickets.filter(t=>actor.role==='supreme'||t.sellerId===actor.id);}
    if(action==='issue'){
      if(!['seller','supreme'].includes(actor.role)||!data.paymentConfirmed||!['general','crew','vip'].includes(data.packageId))throw new Error('Confirma el pago y el paquete.');
      if(!/^[a-f0-9]{32}$/.test(data.requestId||''))throw new Error('Solicitud inválida.');
      const previous=state.tickets.filter(t=>t.requestId===data.requestId&&t.sellerId===actor.id);if(previous.length)return previous;
      const tickets=Array.from({length:data.packageId==='crew'?6:1},()=>({id:random(16),token:random(32),claimCode:random(16),packageId:data.packageId,sellerId:actor.id,sellerName:actor.name,status:'valid',buyer:null,requestId:data.requestId,createdAt:new Date().toISOString(),usedAt:null}));state.tickets.push(...tickets);save();return tickets;
    }
    const t=state.tickets.find(t=>action==='cancel'?t.id===data.id:t.token===data.code);if(!t)throw new Error('Entrada no encontrada.');
    if(action==='cancel'){if(actor.role!=='supreme')throw new Error('Solo el organizador puede anular.');if(t.status!=='valid')throw new Error('Solo se anulan entradas válidas.');t.status='cancelled';save();return {};}
    if(action==='lookup'||action==='validate'){if(!['supreme','validator'].includes(actor.role))throw new Error('No tienes permiso de validación.');if(action==='validate'){if(t.status!=='valid'||!t.buyer)throw new Error('QR utilizado, anulado o pendiente de registro.');t.status='used';t.usedAt=new Date().toISOString();t.validatedBy=actor.id;save();}return publicTicket(t);}
    throw new Error('Operación no disponible.');
  });
}
