import test from 'node:test';
import assert from 'node:assert/strict';
import {runTicketBatch,ticketIds,ticketLotId} from '../bulk-tickets.js';
import {ticketQuantity} from '../ticket-code.js';
const id=n=>n.toString(16).padStart(64,'0');

test('bulk operations reject oversized or malformed selections and process duplicates only once',async()=>{
  assert.throws(()=>ticketIds([]));
  assert.throws(()=>ticketIds(Array.from({length:51},(_,i)=>id(i))));
  assert.throws(()=>ticketIds(['not-a-qr']));
  assert.throws(()=>ticketIds([null]));
  const calls=[],progress=[];
  const result=await runTicketBatch([id(1),id(1),id(2)],async value=>{calls.push(value);return {changed:true};},(done,total)=>progress.push([done,total]));
  assert.deepEqual(calls,[id(1),id(2)]);
  assert.equal(result.changed.length,2);
  assert.deepEqual(progress,[[1,2],[2,2]]);
});
test('partial bulk failures are reported while remaining tickets finish; safe retries skip approvals',async()=>{
  const approved=new Set(),operation=async value=>{if(value===id(2))throw new Error('Entrada anulada.');if(approved.has(value))return {changed:false};approved.add(value);return {changed:true};};
  const first=await runTicketBatch([id(1),id(2),id(3)],operation);
  assert.deepEqual(first.changed,[id(1),id(3)]);
  assert.deepEqual(first.failed,[{id:id(2),message:'Entrada anulada.'}]);
  const retry=await runTicketBatch([id(1),id(3)],operation);
  assert.equal(retry.changed.length,0);
  assert.deepEqual(retry.unchanged,[id(1),id(3)]);
});
test('fifty individual entries form one issuance group; pack and courtesy quantities retain their limits',()=>{
  const group='seller_'+'a'.repeat(32);
  for(const part of [0,3,10,16])assert.equal(ticketLotId({requestId:group+'_'+part}),group);
  assert.equal(ticketLotId({requestId:'a'.repeat(32)}),'a'.repeat(32));
  assert.equal(ticketLotId({}), '');
  assert.equal(ticketQuantity('general',50),50);
  assert.equal(ticketQuantity('vip',25),25);
  assert.equal(ticketQuantity('crew',50),6);
  assert.throws(()=>ticketQuantity('invitation',50));
});
