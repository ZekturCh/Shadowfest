import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
export const hash=value=>createHash('sha256').update(value).digest('hex');
const random=bytes=>randomBytes(bytes).toString('hex');
const fail=(message,status=400)=>{const e=new Error(message);e.status=status;throw e;};
const assert=(condition,message,status)=>{if(!condition)fail(message,status);};
const publicTicket=t=>({name:t.buyer?.name||'Sin nombre',packageId:t.packageId,status:t.status,registered:!!t.buyer,token:t.token});
export function createService(db,supremeSecret){
  // Dedicated namespace: existing collections in this project are not touched.
  const root=db.collection('shadowfest_events').doc('2026');
  const collection=name=>root.collection(name),statsRef=collection('meta').doc('sales');
  const now=()=>new Date().toISOString();
  async function rateLimit(ip,action){
    const bucket=Math.floor(Date.now()/60000),ref=collection('rate_limits').doc(hash(`${ip}:${action}:${bucket}`));
    await db.runTransaction(async tx=>{const s=await tx.get(ref),count=s.exists?s.data().count:0;assert(count<(action==='login'?8:60),'Demasiados intentos. Espera un minuto.',429);tx.set(ref,{count:count+1,expiresAt:new Date((bucket+2)*60000)});});
  }
  async function authenticate(token){
    assert(/^[a-f0-9]{64}$/.test(token||''),'Ingresa tu código de acceso.',401);
    const snap=await collection('sessions').doc(hash(token)).get();assert(snap.exists&&snap.data().expiresAt.toMillis()>Date.now(),'Sesión vencida. Ingresa nuevamente.',401);
    const actor=snap.data().actor;
    if(actor.id==='supreme')assert(snap.data().secretVersion===hash(supremeSecret),'Sesión vencida.',401);
    else {const access=await collection('accesses').doc(actor.id).get();assert(access.exists&&access.data().active,'Acceso revocado.',401);}
    return actor;
  }
  function allow(actor,roles){assert(roles.includes(actor.role),'No tienes permiso para esta operación.',403);}
  async function findTicket(code,type='token'){
    assert(new RegExp(type==='token'?'^[a-f0-9]{64}$':'^[a-f0-9]{32}$').test(code||''),'Código inválido.');
    const index=await collection(type==='token'?'tokens':'claims').doc(hash(code)).get();assert(index.exists,'Entrada no encontrada.',404);
    const ref=collection('tickets').doc(index.data().ticketId),snap=await ref.get();assert(snap.exists,'Entrada no encontrada.',404);return {ref,ticket:snap.data()};
  }
  return async function execute(action,data={},token='',ip='unknown'){
    assert(typeof action==='string','Solicitud inválida.');
    if(['login','claimLookup','claim','ticket','buyerName'].includes(action))await rateLimit(ip,action);
    if(action==='stats'){const s=await statsRef.get();return {sold:110+(s.exists?s.data().issued:0),initialSold:110};}
    if(action==='login'){
      assert(typeof data.code==='string'&&data.code.length<=64,'Código inválido.');
      let actor;
      if(timingSafeEqual(Buffer.from(hash(data.code),'hex'),Buffer.from(hash(supremeSecret),'hex')))actor={id:'supreme',name:'Organizador supremo',role:'supreme'};
      else {const s=await collection('accesses').doc(hash(data.code)).get();assert(s.exists&&s.data().active,'Código incorrecto o revocado.',401);actor={id:s.id,name:s.data().name,role:s.data().role};}
      const sessionToken=random(32);await collection('sessions').doc(hash(sessionToken)).set({actor,expiresAt:new Date(Date.now()+8*3600000),secretVersion:actor.id==='supreme'?hash(supremeSecret):null});return {token:sessionToken,actor};
    }
    if(action==='ticket'){const {ticket}=await findTicket(data.code);return publicTicket(ticket);}
    if(action==='buyerName'){
      const {ref}=await findTicket(data.code);const name=String(data.name||'').trim();assert(name.length>=2&&name.length<=80&&data.consent===true,'Escribe tu nombre y acepta guardarlo.');
      return db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();assert(['pending','valid'].includes(current.status),'Entrada no disponible.');assert(!current.buyer?.name,'Esta entrada ya tiene nombre.',409);const buyer={name,registeredAt:now(),source:'buyer'};tx.update(ref,{buyer});return publicTicket({...current,buyer});});
    }
    if(action==='claimLookup'||action==='claim'){
      const {ref,ticket}=await findTicket(data.code,'claim');assert(ticket.status!=='cancelled','Entrada anulada.');
      if(action==='claimLookup')return ticket.buyer?publicTicket(ticket):{packageId:ticket.packageId,registered:false};
      const name=String(data.name||'').trim(),phone=String(data.phone||'').trim();
      assert(name.length>=3&&name.length<=80&&/^\+?[0-9 ()-]{7,20}$/.test(phone)&&data.adult===true&&data.consent===true,'Completa tus datos y las confirmaciones.');
      return db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();assert(current.status==='valid','Entrada no disponible.');assert(!current.buyer,'Esta entrada ya fue registrada.',409);const buyer={name,phone,adultDeclared:true,consentVersion:'2026-10-v1',registeredAt:now()};tx.update(ref,{buyer});return publicTicket({...current,buyer});});
    }
    const actor=await authenticate(token);
    if(action==='me')return actor;
    if(action==='logout'){await collection('sessions').doc(hash(token)).delete();return {};}
    if(action==='accessList'){allow(actor,['supreme']);return (await collection('accesses').get()).docs.map(s=>({id:s.id,...s.data()}));}
    if(action==='accessCreate'){
      allow(actor,['supreme']);const name=String(data.name||'').trim(),code=String(data.code||'').trim();
      assert(name.length>=2&&name.length<=60&&/^\S{8,64}$/.test(code)&&['seller','validator'].includes(data.role),'Usa un nombre y un código de 8 a 64 caracteres sin espacios.');assert(hash(code)!==hash(supremeSecret),'El código ya existe.');
      const ref=collection('accesses').doc(hash(code));await db.runTransaction(async tx=>{assert(!(await tx.get(ref)).exists,'El código ya existe.');tx.create(ref,{name,role:data.role,active:true,createdAt:now(),createdBy:actor.id});});return {id:ref.id};
    }
    if(action==='accessRevoke'){allow(actor,['supreme']);assert(/^[a-f0-9]{64}$/.test(data.id||''),'Acceso inválido.');await collection('accesses').doc(data.id).update({active:false,revokedAt:now()});return {};}
    if(action==='list'){allow(actor,['supreme','seller']);let query=collection('tickets');if(actor.role==='seller')query=query.where('sellerId','==',actor.id);return (await query.get()).docs.map(s=>({id:s.id,...s.data()})).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));}
    if(action==='issue'){
      allow(actor,['supreme','seller']);assert(['general','crew','vip'].includes(data.packageId),'Selecciona un paquete válido.');assert(/^[a-f0-9]{32}$/.test(data.requestId||''),'Solicitud inválida.');
      await rateLimit(actor.id,'issue');
      const requestRef=collection('issue_requests').doc(hash(`${actor.id}:${data.requestId}`));
      const tickets=Array.from({length:data.packageId==='crew'?6:1},()=>({id:random(16),token:random(32),claimCode:random(16),packageId:data.packageId,sellerId:actor.id,sellerName:actor.name,status:'pending',buyer:typeof data.name==='string'&&data.name.trim()?{name:data.name.trim().slice(0,80)}:null,createdAt:now(),usedAt:null}));
      return db.runTransaction(async tx=>{const prev=await tx.get(requestRef);if(prev.exists){assert(prev.data().packageId===data.packageId,'Solicitud reutilizada con otro paquete.');const snaps=await Promise.all(prev.data().ids.map(id=>tx.get(collection('tickets').doc(id))));return snaps.map(s=>({id:s.id,...s.data()}));}
        const stats=await tx.get(statsRef);tickets.forEach(({id,...t})=>{tx.create(collection('tickets').doc(id),t);tx.create(collection('tokens').doc(hash(t.token)),{ticketId:id});tx.create(collection('claims').doc(hash(t.claimCode)),{ticketId:id});});tx.create(requestRef,{ids:tickets.map(t=>t.id),packageId:data.packageId,sellerId:actor.id,createdAt:now()});return tickets;});
    }
    if(['markSent','requestApproval'].includes(action)){
      allow(actor,['supreme','seller']);assert(/^[a-f0-9]{32}$/.test(data.id||''),'Entrada inválida.');const ref=collection('tickets').doc(data.id);
      await db.runTransaction(async tx=>{const snap=await tx.get(ref);assert(snap.exists,'Entrada no encontrada.');const current=snap.data();assert(actor.role==='supreme'||current.sellerId===actor.id,'No tienes permiso sobre esta entrada.',403);assert(current.status==='pending','Solo se modifican entradas pendientes.');const field=action==='markSent'?'sentAt':'approvalRequestedAt';if(!current[field])tx.update(ref,{[field]:now(),...(action==='requestApproval'?{approvalRequestedBy:actor.id}:{})});});return {};
    }
    if(action==='approve'||action==='cancel'){
      allow(actor,['supreme']);assert(/^[a-f0-9]{32}$/.test(data.id||''),'Entrada inválida.');const ref=collection('tickets').doc(data.id);
      await db.runTransaction(async tx=>{const snap=await tx.get(ref),stats=await tx.get(statsRef);assert(snap.exists,'Entrada no encontrada.');const current=snap.data();
        if(action==='approve'){assert(current.status==='pending','Solo se aprueban entradas pendientes.');tx.update(ref,{status:'valid',approvedAt:now(),approvedBy:actor.id});tx.set(statsRef,{issued:(stats.exists?stats.data().issued:0)+1,initialSold:110,updatedAt:now()});}
        else {assert(['pending','valid'].includes(current.status),'Solo se invalidan entradas pendientes o aprobadas.');tx.update(ref,{status:'cancelled',cancelledAt:now(),cancelledBy:actor.id});if(current.status==='valid')tx.set(statsRef,{issued:Math.max(0,(stats.exists?stats.data().issued:0)-1),initialSold:110,updatedAt:now()});}
      });return {};
    }
    if(action==='lookup'||action==='validate'){
      allow(actor,['supreme','validator']);const {ref,ticket}=await findTicket(data.code);
      if(action==='lookup')return publicTicket(ticket);
      return db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();assert(current.status==='valid','QR utilizado, invalidado o pendiente de aprobación.',409);tx.update(ref,{status:'used',usedAt:now(),validatedBy:actor.id});return {status:'used'};});
    }
    fail('Operación no disponible.',404);
  };
}
