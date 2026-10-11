import {newShortCode} from '../ticket-code.js';
import {publicConsumption} from '../consumption.js';
import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, collection, getDoc, getDocs, setDoc, updateDoc, writeBatch, query, where, serverTimestamp, runTransaction } from 'firebase/firestore';
let env;
const r=(db,name,id)=>doc(db,`shadowfest_live/2026/${name}/${id}`);
const db=uid=>uid?env.authenticatedContext(uid).firestore():env.unauthenticatedContext().firestore();
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-shadowfest',firestore:{host:'127.0.0.1',port:8080,rules:await readFile(new URL('../firestore-live.rules',import.meta.url),'utf8')}});});
beforeEach(async()=>{await env.clearFirestore();await env.withSecurityRulesDisabled(async c=>{for(const [id,role] of [['admin','supreme'],['seller','seller'],['other','seller'],['door','validator']])await setDoc(r(c.firestore(),'staff',id),{name:id,role,active:true,createdAt:serverTimestamp()});});});
after(async()=>{await env?.cleanup();});
async function issue(uid='seller',count=1){const client=db(uid),ids=Array.from({length:count},()=>randomBytes(32).toString('hex')),base=uid+'_'+randomBytes(16).toString('hex'),packageId=count===6?'crew':'general';for(let offset=0;offset<count;offset+=3){const requestId=base+'_'+Math.floor(offset/3),part=ids.slice(offset,offset+3),batch=writeBatch(client);batch.set(r(client,'requests',requestId),{sellerId:uid,packageId,ids:part,quantity:count,createdAt:serverTimestamp()});for(const token of part){const shortCode=newShortCode();await getDoc(r(client,'codes',shortCode));batch.set(r(client,'tickets',token),{token,shortCode,sellerId:uid,sellerName:uid,packageId,status:'pending',buyer:null,createdAt:serverTimestamp(),usedAt:null,requestId});batch.set(r(client,'passes',token),{token,shortCode,name:'Sin nombre',packageId,status:'pending',registered:false});batch.set(r(client,'codes',shortCode),{token,sellerId:uid});}await batch.commit();}return ids;}
async function approve(id){const client=db('admin');await runTransaction(client,async tx=>{const sales=r(client,'meta','sales'),snap=await tx.get(sales),approved=(snap.exists()?snap.data().approved:0)+1;tx.update(r(client,'tickets',id),{status:'valid',approvedAt:serverTimestamp(),approvedBy:'admin'});tx.update(r(client,'passes',id),{status:'valid'});tx.set(sales,{approved,initialSold:110,lastTicket:id,updatedAt:serverTimestamp()});tx.set(r(client,'publicStats','sales'),{approved,initialSold:110,updatedAt:serverTimestamp()});});}
test('one and six ticket issuance succeeds, owner query is isolated, anonymous cannot enumerate',async()=>{const ids=await issue('seller',6);assert.equal(ids.length,6);const client=db('seller');assert.equal((await getDocs(query(collection(client,'shadowfest_live/2026/tickets'),where('sellerId','==','seller')))).size,6);await assertFails(getDocs(collection(client,'shadowfest_live/2026/tickets')));await assertFails(getDoc(r(db('other'),'tickets',ids[0])));await assertSucceeds(getDoc(r(db(),'passes',ids[0])));await assertFails(getDoc(r(db(),'tickets',ids[0])));await assertFails(getDocs(collection(db(),'shadowfest_live/2026/passes')));await assertFails(getDoc(r(db(),'meta','sales')));});
test('seller cannot forge approvals, reassign tickets or access another seller',async()=>{const [id]=await issue();await assertFails(updateDoc(r(db('seller'),'tickets',id),{status:'valid'}));await assertFails(updateDoc(r(db('seller'),'tickets',id),{sellerId:'other'}));await assertFails(updateDoc(r(db('other'),'tickets',id),{sentAt:serverTimestamp()}));await assertFails(setDoc(r(db('seller'),'staff','hacker'),{name:'hacker',role:'supreme',active:true,createdAt:serverTimestamp()}));await assertFails(setDoc(r(db('new-unprovisioned'),'staff','new-unprovisioned'),{name:'hacker',role:'seller',active:true,createdAt:serverTimestamp()}));});
test('delivery and request preserve pending, approval atomically counts exactly once',async()=>{const [id]=await issue();const client=db('seller');await updateDoc(r(client,'tickets',id),{sentAt:serverTimestamp()});await updateDoc(r(client,'tickets',id),{approvalRequestedAt:serverTimestamp(),approvalRequestedBy:'seller'});assert.equal((await getDoc(r(client,'tickets',id))).data().status,'pending');await assertFails(updateDoc(r(db('admin'),'tickets',id),{status:'valid',approvedAt:serverTimestamp(),approvedBy:'admin'}));await approve(id);assert.equal((await getDoc(r(db(),'publicStats','sales'))).data().approved,1);await assertFails(approve(id));await assertFails(setDoc(r(db('seller'),'publicStats','sales'),{approved:999,initialSold:110,updatedAt:serverTimestamp()}));await assertFails(updateDoc(r(db('admin'),'publicStats','sales'),{approved:999,updatedAt:serverTimestamp()}));});
test('optional name is single use, bound to QR, cannot overwrite or approve',async()=>{const [id]=await issue();const client=db();const name=()=>{const batch=writeBatch(client);batch.update(r(client,'tickets',id),{buyer:{name:'Cliente',source:'buyer',registeredAt:serverTimestamp(),consentVersion:'2026-10-name-v1'}});batch.update(r(client,'passes',id),{name:'Cliente',registered:true});return batch.commit();};await assertSucceeds(name());await assertFails(name());const ticket=(await getDoc(r(db('admin'),'tickets',id))).data();assert.equal(ticket.status,'pending');assert.equal(ticket.sellerId,'seller');assert.equal(ticket.buyer.source,'buyer');});
test('door admits approved ticket only once and cannot list buyers',async()=>{const [id]=await issue();const client=db('door');const admit=()=>runTransaction(client,async tx=>{const t=await tx.get(r(client,'tickets',id));if(t.data().status!=='valid')throw new Error('not valid');tx.update(r(client,'tickets',id),{status:'used',usedAt:serverTimestamp(),validatedBy:'door'});tx.update(r(client,'passes',id),{status:'used'});});await assert.rejects(admit());await approve(id);const results=await Promise.allSettled([admit(),admit()]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal((await getDoc(r(db(),'publicStats','sales'))).data().approved,1);await assertFails(getDocs(collection(client,'shadowfest_live/2026/tickets')));});
test('revoked seller loses reads and writes and supreme role is immutable',async()=>{const [id]=await issue();await updateDoc(r(db('admin'),'staff','seller'),{active:false,revokedAt:serverTimestamp()});await assertFails(getDoc(r(db('seller'),'tickets',id)));await assertFails(issue());await assertFails(updateDoc(r(db('admin'),'staff','admin'),{active:false,revokedAt:serverTimestamp()}));});
test('cancelling approved ticket reverses count; pending cancellation does not',async()=>{const [id,pending]=await issue('seller',6);await approve(id);const client=db('admin'),batch=writeBatch(client);batch.update(r(client,'tickets',id),{status:'cancelled',cancelledAt:serverTimestamp(),cancelledBy:'admin'});batch.update(r(client,'passes',id),{status:'cancelled'});batch.set(r(client,'meta','sales'),{approved:0,initialSold:110,lastTicket:id,updatedAt:serverTimestamp()});batch.set(r(client,'publicStats','sales'),{approved:0,initialSold:110,updatedAt:serverTimestamp()});await assertSucceeds(batch.commit());const next=writeBatch(client);next.update(r(client,'tickets',pending),{status:'cancelled',cancelledAt:serverTimestamp(),cancelledBy:'admin'});next.update(r(client,'passes',pending),{status:'cancelled'});await assertSucceeds(next.commit());assert.equal((await getDoc(r(db(),'publicStats','sales'))).data().approved,0);});

test('batch of ten stays pending and short codes resolve only for staff or their seller',async()=>{const ids=await issue('seller',10);assert.equal(ids.length,10);const first=(await getDoc(r(db('seller'),'tickets',ids[0]))).data();assert.match(first.shortCode,/^[A-HJ-NP-Z2-9]{6}$/);await assertSucceeds(getDoc(r(db('door'),'codes',first.shortCode)));await assertFails(getDoc(r(db(),'codes',first.shortCode)));await assertFails(getDoc(r(db('other'),'codes',first.shortCode)));await assertFails(getDocs(collection(db('door'),'shadowfest_live/2026/codes')));await assertFails(updateDoc(r(db('seller'),'codes',first.shortCode),{token:ids[1]}));await assertFails(updateDoc(r(db('seller'),'tickets',ids[0]),{shortCode:'K7M9Q2'}));assert.equal((await getDocs(query(collection(db('seller'),'shadowfest_live/2026/tickets'),where('sellerId','==','seller')))).size,10);});

async function issueInvitations(count=1,uid='admin',base=uid+'_'+randomBytes(16).toString('hex')) {
  const client=db(uid),ids=[];
  for(let offset=0;offset<count;offset+=3) {
    const size=Math.min(3,count-offset),requestId=base+'_'+Math.floor(offset/3),entries=Array.from({length:size},()=>({id:randomBytes(32).toString('hex'),shortCode:newShortCode()}));
    const part=await runTransaction(client,async tx=>{
      const previous=await tx.get(r(client,'requests',requestId));
      if(previous.exists()) return previous.data().ids;
      const quota=await tx.get(r(client,'meta','invitations'));
      await Promise.all(entries.map(t=>tx.get(r(client,'codes',t.shortCode))));
      tx.set(r(client,'meta','invitations'),{allocated:(quota.exists()?quota.data().allocated:0)+size,lastRequest:requestId,lastTicket:null,updatedAt:serverTimestamp()});
      tx.set(r(client,'requests',requestId),{sellerId:uid,packageId:'invitation',ids:entries.map(t=>t.id),quantity:count,createdAt:serverTimestamp()});
      for(const {id,shortCode} of entries) {
        tx.set(r(client,'tickets',id),{token:id,shortCode,sellerId:uid,sellerName:uid,packageId:'invitation',status:'pending',buyer:null,createdAt:serverTimestamp(),usedAt:null,requestId});
        tx.set(r(client,'passes',id),{token:id,shortCode,name:'Sin nombre',packageId:'invitation',status:'pending',registered:false});
        tx.set(r(client,'codes',shortCode),{token:id,sellerId:uid});
      }
      return entries.map(t=>t.id);
    });
    ids.push(...part);
  }
  return ids;
}
async function cancelInvitation(id) {
  const client=db('admin');
  return runTransaction(client,async tx=>{
    const ticket=await tx.get(r(client,'tickets',id)),quota=await tx.get(r(client,'meta','invitations')),sales=await tx.get(r(client,'meta','sales'));
    tx.update(r(client,'tickets',id),{status:'cancelled',cancelledAt:serverTimestamp(),cancelledBy:'admin'});
    tx.update(r(client,'passes',id),{status:'cancelled'});
    tx.set(r(client,'meta','invitations'),{allocated:quota.data().allocated-1,lastRequest:null,lastTicket:id,updatedAt:serverTimestamp()});
    if(ticket.data().status==='valid') {
      const approved=sales.data().approved-1;
      tx.set(r(client,'meta','sales'),{approved,initialSold:110,lastTicket:id,updatedAt:serverTimestamp()});
      tx.set(r(client,'publicStats','sales'),{approved,initialSold:110,updatedAt:serverTimestamp()});
    }
  });
}
async function seedQuota(allocated) {
  await env.withSecurityRulesDisabled(c=>setDoc(r(c.firestore(),'meta','invitations'),{allocated,lastRequest:null,lastTicket:null,updatedAt:serverTimestamp()}));
}
test('only supreme can issue courtesy batches; retries preserve the same QR and quota',async()=>{
  const request='admin_'+randomBytes(16).toString('hex'),ids=await issueInvitations(10,'admin',request);
  assert.equal(ids.length,10);
  assert.deepEqual(await issueInvitations(10,'admin',request),ids);
  assert.equal((await getDoc(r(db('admin'),'meta','invitations'))).data().allocated,10);
  await assertFails(issueInvitations(1,'seller'));
  await assertFails(getDoc(r(db(),'meta','invitations')));
  await assertFails(getDocs(query(collection(db('seller'),'shadowfest_live/2026/tickets'),where('packageId','==','invitation'))));
  await assertFails(getDocs(collection(db(),'shadowfest_live/2026/passes')));
  const ticket=(await getDoc(r(db('admin'),'tickets',ids[0]))).data();
  assert.equal(ticket.packageId,'invitation');
  assert.equal(ticket.status,'pending');
  assert.equal((await getDoc(r(db(),'publicStats','sales'))).exists(),false);
  await assertFails(updateDoc(r(db('admin'),'tickets',ids[0]),{packageId:'general'}));
});
test('courtesy activation counts once, accepts optional name and delivery without a payment request',async()=>{
  const [id]=await issueInvitations();
  const visitor=db(),buyer=writeBatch(visitor);
  buyer.update(r(visitor,'tickets',id),{buyer:{name:'Invitada',source:'buyer',registeredAt:serverTimestamp(),consentVersion:'2026-10-name-v1'}});
  buyer.update(r(visitor,'passes',id),{name:'Invitada',registered:true});
  await buyer.commit();
  await assertFails(updateDoc(r(db('admin'),'tickets',id),{approvalRequestedAt:serverTimestamp(),approvalRequestedBy:'admin'}));
  await approve(id);
  await assertSucceeds(updateDoc(r(db('admin'),'tickets',id),{sentAt:serverTimestamp()}));
  await assertFails(approve(id));
  assert.equal((await getDoc(r(db(),'publicStats','sales'))).data().approved,1);
  assert.equal((await getDoc(r(db(),'passes',id))).data().name,'Invitada');
});
test('courtesy quota enforces 110 in the rules and concurrent attempts cannot exceed the cap',async()=>{
  await seedQuota(109);
  const results=await Promise.allSettled([issueInvitations(),issueInvitations()]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal((await getDoc(r(db('admin'),'meta','invitations'))).data().allocated,110);
  await assertFails(issueInvitations());
  await assertFails(updateDoc(r(db('admin'),'meta','invitations'),{allocated:0,updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(r(db('admin'),'meta','invitations'),{allocated:111,updatedAt:serverTimestamp()}));
});
test('courtesy cancellation frees one place atomically; approved cancellation reverses its count',async()=>{
  const ids=await issueInvitations(5),client=db('admin');
  const incomplete=writeBatch(client);
  incomplete.update(r(client,'tickets',ids[0]),{status:'cancelled',cancelledAt:serverTimestamp(),cancelledBy:'admin'});
  incomplete.update(r(client,'passes',ids[0]),{status:'cancelled'});
  await assertFails(incomplete.commit());
  await cancelInvitation(ids[0]);
  assert.equal((await getDoc(r(client,'meta','invitations'))).data().allocated,4);
  await approve(ids[1]);
  await cancelInvitation(ids[1]);
  assert.equal((await getDoc(r(client,'meta','invitations'))).data().allocated,3);
  assert.equal((await getDoc(r(db(),'publicStats','sales'))).data().approved,0);
  await assertFails(cancelInvitation(ids[1]));
});
test('approved courtesy passes enter only once and used passes retain their allocated place',async()=>{
  const [id]=await issueInvitations();
  await approve(id);
  const client=db('door'),admit=()=>runTransaction(client,async tx=>{
    const ticket=await tx.get(r(client,'tickets',id));
    if(ticket.data().status!=='valid') throw new Error('not valid');
    tx.update(r(client,'tickets',id),{status:'used',usedAt:serverTimestamp(),validatedBy:'door'});
    tx.update(r(client,'passes',id),{status:'used'});
  });
  const result=await Promise.allSettled([admit(),admit()]);
  assert.equal(result.filter(x=>x.status==='fulfilled').length,1);
  await assertFails(cancelInvitation(id));
  assert.equal((await getDoc(r(db('admin'),'meta','invitations'))).data().allocated,1);
  assert.equal((await getDoc(r(db(),'publicStats','sales'))).data().approved,1);
});

function orderBatch(client,order){const batch=writeBatch(client);batch.set(r(client,'consumptions',order.token),order);batch.set(r(client,'consumptionPasses',order.token),publicConsumption(order));batch.set(doc(client,`shadowfest_live/2026/passes/${order.ticketId}/consumptions/${order.token}`),publicConsumption(order));return batch;}
async function createOrder(ticketId,uid='admin'){const token=randomBytes(32).toString('hex'),ticket=(await getDoc(r(db('admin'),'tickets',ticketId))).data(),order={token,ticketId,ticketCode:ticket.shortCode,buyerName:ticket.buyer?.name||'Sin nombre',description:'2 bebidas y 1 comida',amountCents:2550,status:'pending',shortCode:null,createdAt:serverTimestamp(),createdBy:uid||'admin',redeemedAt:null};await orderBatch(db(uid),order).commit();return token;}
async function approveOrder(id,uid='admin',shortCode=newShortCode()){const client=db(uid);await runTransaction(client,async tx=>{const snap=await tx.get(r(client,'consumptions',id));const order={...snap.data(),status:'valid',shortCode,approvedAt:serverTimestamp(),approvedBy:uid};tx.update(r(client,'consumptions',id),order);tx.update(r(client,'consumptionPasses',id),publicConsumption(order));tx.update(doc(client,`shadowfest_live/2026/passes/${order.ticketId}/consumptions/${id}`),publicConsumption(order));tx.set(r(client,'consumptionCodes',shortCode),{token:id});});}
async function changeOrder(id,status,uid='admin'){const client=db(uid);await runTransaction(client,async tx=>{const snap=await tx.get(r(client,'consumptions',id));const previous=snap.data();if(status==='redeemed'&&previous.status!=='valid')throw new Error('not redeemable');const order={...previous,status,...(status==='redeemed'?{redeemedAt:serverTimestamp(),redeemedBy:uid}:{cancelledAt:serverTimestamp(),cancelledBy:uid})};tx.update(r(client,'consumptions',id),order);tx.update(r(client,'consumptionPasses',id),publicConsumption(order));tx.update(doc(client,`shadowfest_live/2026/passes/${order.ticketId}/consumptions/${id}`),publicConsumption(order));});}

test('preorders require an approved entry and supreme creation; capability reads cannot enumerate all orders',async()=>{const [ticket]=await issue();await assertFails(createOrder(ticket));await approve(ticket);const id=await createOrder(ticket);await assertFails(createOrder(ticket,'seller'));await assertFails(createOrder(ticket,null));await assertSucceeds(getDoc(r(db(),'consumptionPasses',id)));await assertSucceeds(getDocs(collection(db(),`shadowfest_live/2026/passes/${ticket}/consumptions`)));await assertFails(getDocs(collection(db(),'shadowfest_live/2026/consumptionPasses')));await assertFails(getDoc(r(db(),'consumptions',id)));await assertFails(getDocs(collection(db('seller'),'shadowfest_live/2026/consumptions')));await assertFails(getDocs(collection(db('door'),'shadowfest_live/2026/consumptions')));await assertFails(getDoc(r(db(),'consumptionCodes','K7M9Q2')));assert.equal((await getDoc(r(db(),'publicStats','sales'))).data().approved,1);});
test('preorder approval freezes amount and products; anonymous and sellers cannot approve or forge public state',async()=>{const [ticket]=await issue();await approve(ticket);const id=await createOrder(ticket);await assertFails(updateDoc(r(db('admin'),'consumptions',id),{status:'valid',shortCode:'K7M9Q2',approvedAt:serverTimestamp(),approvedBy:'admin'}));await assertFails(updateDoc(r(db(),'consumptionPasses',id),{status:'valid'}));await assertFails(approveOrder(id,'seller'));await assertFails(updateDoc(r(db('admin'),'consumptions',id),{amountCents:1}));await approveOrder(id);await assertFails(approveOrder(id));await assertFails(updateDoc(r(db('admin'),'consumptions',id),{description:'Otro pedido'}));const publicOrder=(await getDoc(r(db(),'consumptionPasses',id))).data();assert.equal(publicOrder.status,'valid');assert.equal(publicOrder.amountCents,2550);assert.equal(publicOrder.ticketId,undefined);await assertSucceeds(getDoc(r(db('door'),'consumptionCodes',publicOrder.shortCode)));});
test('only paid orders redeem, concurrent delivery succeeds once and does not consume the entry',async()=>{const [ticket]=await issue();await approve(ticket);const id=await createOrder(ticket);await assert.rejects(changeOrder(id,'redeemed','door'));await approveOrder(id);await assertFails(changeOrder(id,'redeemed','seller'));const results=await Promise.allSettled([changeOrder(id,'redeemed','door'),changeOrder(id,'redeemed','door')]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal((await getDoc(r(db(),'consumptionPasses',id))).data().status,'redeemed');assert.equal((await getDoc(r(db('admin'),'tickets',ticket))).data().status,'valid');assert.equal((await getDoc(r(db(),'publicStats','sales'))).data().approved,1);await assert.rejects(changeOrder(id,'redeemed','door'));await assertFails(changeOrder(id,'cancelled'));});
test('cancelled orders and revoked staff cannot redeem; an admitted entry can still order',async()=>{const [ticket]=await issue();await approve(ticket);const id=await createOrder(ticket);await approveOrder(id);await changeOrder(id,'cancelled');await assert.rejects(changeOrder(id,'redeemed','door'));const client=db('door'),admit=writeBatch(client);admit.update(r(client,'tickets',ticket),{status:'used',usedAt:serverTimestamp(),validatedBy:'door'});admit.update(r(client,'passes',ticket),{status:'used'});await admit.commit();const afterEntry=await createOrder(ticket);await approveOrder(afterEntry);await updateDoc(r(db('admin'),'staff','door'),{active:false,revokedAt:serverTimestamp()});await assertFails(changeOrder(afterEntry,'redeemed','door'));assert.equal((await getDoc(r(db(),'publicStats','sales'))).data().approved,1);});
