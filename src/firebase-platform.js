import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence, inMemoryPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, query, where, runTransaction, writeBatch, serverTimestamp } from 'firebase/firestore';
import { newShortCode, shortCodePattern, ticketQuantity } from '../ticket-code.js';

export const firebaseConfig={apiKey:'AIzaSyCL4RyZwSHQighzQ61qbaGfK9jCiIfB30U',authDomain:'comecome-ab1a0.firebaseapp.com',projectId:'comecome-ab1a0',storageBucket:'comecome-ab1a0.firebasestorage.app',messagingSenderId:'399645583727',appId:'1:399645583727:web:2e777325eaa14ed559a09a'};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const ready=setPersistence(auth,typeof window==='undefined'?inMemoryPersistence:browserSessionPersistence);
const path='shadowfest_live/2026',coll=name=>collection(db,`${path}/${name}`),ref=(name,id)=>doc(coll(name),id);
const random=n=>[...crypto.getRandomValues(new Uint8Array(n))].map(b=>b.toString(16).padStart(2,'0')).join('');
const requireValue=(value,message)=>{if(!value)throw new Error(message);};
export async function codeEmail(code){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')+'@shadowfest.invalid';}
function plain(value){if(value?.toDate)return value.toDate().toISOString();if(Array.isArray(value))return value.map(plain);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,plain(v)]));return value;}
async function actor(){await ready;await auth.authStateReady();requireValue(auth.currentUser,'Ingresa tu código de acceso.');const snap=await getDoc(ref('staff',auth.currentUser.uid));requireValue(snap.exists()&&snap.data().active,'Código sin permiso o revocado.');return {id:snap.id,...plain(snap.data())};}
function allow(a,roles){requireValue(roles.includes(a.role),'No tienes permiso para esta operación.');}
const publicData=t=>({name:t.buyer?.name||'Sin nombre',packageId:t.packageId,status:t.status,registered:!!t.buyer?.name,token:t.token,shortCode:t.shortCode});
async function resolveCode(code){if(shortCodePattern.test(code||'')){const snap=await getDoc(ref('codes',code));requireValue(snap.exists(),'Código de entrada no encontrado.');return snap.data().token;}requireValue(/^[a-f0-9]{64}$/.test(code||''),'Código QR inválido.');return code;}
async function publicTicket(code){requireValue(/^[a-f0-9]{64}$/.test(code||''),'Código QR inválido.');const snap=await getDoc(ref('passes',code));requireValue(snap.exists(),'Entrada no encontrada.');return {id:code,...plain(snap.data())};}
async function execute(action,data){
  if(action==='login'){await ready;await signInWithEmailAndPassword(auth,await codeEmail(data.code),data.code);return {actor:await actor(),token:'firebase-session'};}
  if(action==='logout'){await signOut(auth);return {};}
  if(action==='stats'){const snap=await getDoc(ref('publicStats','sales'));return {sold:110+(snap.exists()?snap.data().approved:0),initialSold:110};}
  if(action==='ticket')return publicTicket(data.code);
  if(action==='buyerName'){
    const entry=await publicTicket(data.code),name=String(data.name||'').trim();requireValue(name.length>=2&&name.length<=80&&data.consent===true,'Escribe tu nombre y acepta guardarlo.');requireValue(!entry.registered,'Esta entrada ya tiene nombre.');
    const buyer={name,source:'buyer',registeredAt:serverTimestamp(),consentVersion:'2026-10-name-v1'};
    const batch=writeBatch(db);batch.update(ref('tickets',data.code),{buyer});batch.update(ref('passes',data.code),{name,registered:true});await batch.commit();return publicTicket(data.code);
  }
  const a=await actor();
  if(action==='me')return a;
  if(action==='accessList'){allow(a,['supreme']);return (await getDocs(coll('staff'))).docs.filter(s=>s.data().role!=='supreme').map(s=>({id:s.id,...plain(s.data())}));}
  if(action==='accessCreate'){
    allow(a,['supreme']);const name=String(data.name||'').trim(),code=String(data.code||'').trim();requireValue(name.length>=2&&name.length<=60&&/^\S{8,64}$/.test(code)&&['seller','validator'].includes(data.role),'Usa un nombre y código de 8 a 64 caracteres sin espacios.');
    const secondary=initializeApp(firebaseConfig,'staff-'+random(8)),secondaryAuth=getAuth(secondary);let user;
    try{await setPersistence(secondaryAuth,inMemoryPersistence);user=(await createUserWithEmailAndPassword(secondaryAuth,await codeEmail(code),code)).user;await writeBatch(db).set(ref('staff',user.uid),{name,role:data.role,active:true,createdAt:serverTimestamp()}).commit();return {id:user.uid};}
    catch(error){if(user)await deleteUser(user).catch(()=>{});throw error;}finally{await deleteApp(secondary);}
  }
  if(action==='accessRevoke'){allow(a,['supreme']);await writeBatch(db).update(ref('staff',data.id),{active:false,revokedAt:serverTimestamp()}).commit();return {};}
  if(action==='list'){allow(a,['supreme','seller']);const q=a.role==='seller'?query(coll('tickets'),where('sellerId','==',a.id)):coll('tickets');return (await getDocs(q)).docs.map(s=>({id:s.id,...plain(s.data())})).sort((x,y)=>x.createdAt.localeCompare(y.createdAt));}
  if(action==='issue'){
    allow(a,['supreme','seller']);requireValue(['general','crew','vip'].includes(data.packageId)&&/^[a-f0-9]{32}$/.test(data.requestId||''),'Solicitud o paquete inválido.');
    const quantity=ticketQuantity(data.packageId,data.quantity),baseRequest=a.id+'_'+data.requestId;
    const name=String(data.name||'').trim();requireValue(name.length<=80,'Nombre demasiado largo.');
    for(let offset=0;offset<quantity;offset+=3){const requestId=baseRequest+'_'+Math.floor(offset/3),requestRef=ref('requests',requestId),size=Math.min(3,quantity-offset);let complete=false;
      for(let attempt=0;attempt<3&&!complete;attempt++){const entries=Array.from({length:size},()=>({id:random(32),shortCode:newShortCode()}));
        try{await runTransaction(db,async tx=>{const previous=await tx.get(requestRef);if(previous.exists()){requireValue(previous.data().packageId===data.packageId&&previous.data().quantity===quantity,'Solicitud reutilizada con otro lote.');return;}
          const reservations=await Promise.all(entries.map(t=>tx.get(ref('codes',t.shortCode))));requireValue(reservations.every(s=>!s.exists())&&new Set(entries.map(t=>t.shortCode)).size===size,'Colisión de código. Reintentando.');
          for(const {id,shortCode} of entries){const ticket={token:id,shortCode,packageId:data.packageId,sellerId:a.id,sellerName:a.name,status:'pending',buyer:name?{name,source:'seller'}:null,createdAt:serverTimestamp(),usedAt:null,requestId};tx.set(ref('tickets',id),ticket);tx.set(ref('passes',id),publicData(ticket));tx.set(ref('codes',shortCode),{token:id,sellerId:a.id});}tx.set(requestRef,{sellerId:a.id,packageId:data.packageId,ids:entries.map(t=>t.id),quantity,createdAt:serverTimestamp()});});complete=true;}
        catch(error){if(attempt===2||(!['permission-denied','aborted'].includes(error.code)&&!error.message.includes('Colisión')))throw error;}
      }data.onProgress?.(offset+size,quantity);
    }return {quantity};
  }
  if(['markSent','requestApproval'].includes(action)){
    allow(a,['supreme','seller']);await runTransaction(db,async tx=>{const r=ref('tickets',data.id),snap=await tx.get(r);requireValue(snap.exists(),'Entrada no encontrada.');const t=snap.data();requireValue(t.sellerId===a.id,'Solo puedes marcar tus propias entradas.');requireValue(t.status==='pending','Solo se modifican entradas pendientes.');const field=action==='markSent'?'sentAt':'approvalRequestedAt';if(!t[field])tx.update(r,{[field]:serverTimestamp(),...(action==='requestApproval'?{approvalRequestedBy:a.id}:{})});});return {};
  }
  if(['approve','cancel'].includes(action)){
    allow(a,['supreme']);await runTransaction(db,async tx=>{const r=ref('tickets',data.id),salesRef=ref('meta','sales'),snap=await tx.get(r),sales=await tx.get(salesRef);requireValue(snap.exists(),'Entrada no encontrada.');const t=snap.data();requireValue(action==='approve'?t.status==='pending':['pending','valid'].includes(t.status),'Esta entrada ya no permite esta operación.');const status=action==='approve'?'valid':'cancelled';tx.update(r,{status,...(action==='approve'?{approvedAt:serverTimestamp(),approvedBy:a.id}:{cancelledAt:serverTimestamp(),cancelledBy:a.id})});tx.update(ref('passes',data.id),{status});const delta=action==='approve'?1:t.status==='valid'?-1:0;if(delta){const approved=(sales.exists()?sales.data().approved:0)+delta;tx.set(salesRef,{approved,initialSold:110,lastTicket:data.id,updatedAt:serverTimestamp()});tx.set(ref('publicStats','sales'),{approved,initialSold:110,updatedAt:serverTimestamp()});}});return {};
  }
  if(action==='lookup'||action==='validate'){
    allow(a,['supreme','validator']);const code=await resolveCode(data.code);if(action==='lookup')return publicTicket(code);
    await runTransaction(db,async tx=>{const r=ref('tickets',code),snap=await tx.get(r);requireValue(snap.exists()&&snap.data().status==='valid','QR utilizado, invalidado o pendiente de aprobación.');tx.update(r,{status:'used',usedAt:serverTimestamp(),validatedBy:a.id});tx.update(ref('passes',code),{status:'used'});});return {status:'used'};
  }
  throw new Error('Operación no disponible.');
}
export async function firebaseRequest(action,data={}){try{return await execute(action,data);}catch(error){const messages={'auth/invalid-credential':'Código incorrecto o revocado.','auth/user-not-found':'Código incorrecto o revocado.','auth/wrong-password':'Código incorrecto o revocado.','auth/operation-not-allowed':'Falta activar el acceso interno en Firebase Authentication.','auth/configuration-not-found':'Falta configurar Firebase Authentication.','auth/email-already-in-use':'Este código de acceso ya existe.','auth/too-many-requests':'Demasiados intentos. Espera antes de volver a intentar.','permission-denied':'Firebase rechazó la operación. Revisa que tu acceso esté activo y las reglas estén publicadas.','unavailable':'No hay conexión con Firebase. Intenta nuevamente.'};throw new Error(messages[error.code]||error.message);}}
