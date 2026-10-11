import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saleStage, requestDetails, packagePrice } from '../sales.js';
test('Lima early bird includes all October 20 and becomes S/25 at midnight', () => {
  assert.equal(saleStage(new Date('2026-10-20T23:59:59.999-05:00')).price, 20);
  assert.equal(saleStage(new Date('2026-10-21T00:00:00-05:00')).price, 25);
  assert.equal(requestDetails({id:'general'}, 3, new Date('2026-10-21T00:00:00-05:00')).total, 75);
  assert.equal(requestDetails({id:'general'}, 3, new Date('2026-10-05T12:00:00-05:00')).total, 60);
});
test('pack includes six general entries, VIP is double, totals follow the sale stage', () => {
  const date = new Date('2026-10-05T12:00:00-05:00');
  const pack = requestDetails({id:'crew'}, 2, date);
  assert.equal(pack.people, 12); assert.equal(pack.total, 240);
  assert.match(pack.line, /2 six pack/);
  assert.equal(requestDetails({id:'vip'}, 2, date).total, 80);
  const regular = new Date('2026-10-21T00:00:00-05:00');
  assert.equal(requestDetails({id:'crew'}, 2, regular).total, 300);
  assert.equal(requestDetails({id:'vip'}, 2, regular).total, 100);
  assert.equal(packagePrice('crew', date), 120);
  assert.equal(packagePrice('vip', date), 40);
  assert.throws(() => requestDetails({id:'unknown'}, 1, date));
  assert.throws(() => requestDetails({id:'vip'}, 21, date));
  assert.throws(() => requestDetails({id:'crew'}, 1.5, date));
  assert.throws(() => requestDetails({id:'general'}, 0, date));
});
