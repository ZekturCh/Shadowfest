import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saleStage, requestDetails } from '../sales.js';
test('Lima early bird includes all October 11 and becomes S/25 at midnight', () => {
  assert.equal(saleStage(new Date('2026-10-11T23:59:59-05:00')).price, 20);
  assert.equal(saleStage(new Date('2026-10-12T00:00:00-05:00')).price, 25);
  assert.equal(requestDetails({id:'general'}, 3, new Date('2026-10-05T12:00:00-05:00')).total, 60);
});
test('packs count six people each and never invent an unconfirmed pack or VIP price', () => {
  const date = new Date('2026-10-05T12:00:00-05:00');
  const pack = requestDetails({id:'crew'}, 2, date);
  assert.equal(pack.people, 12); assert.equal(pack.total, null);
  assert.match(pack.line, /2 six pack/);
  assert.equal(requestDetails({id:'vip'}, 2, date).total, null);
  assert.throws(() => requestDetails({id:'crew'}, 1.5, date));
  assert.throws(() => requestDetails({id:'general'}, 0, date));
});
