import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmedSales } from '../public-stats.js';
test('only approved tickets count, regardless of the legacy 110 baseline', () => {
  assert.deepEqual(confirmedSales({ approved: 10, initialSold: 110 }), { sold: 10, initialSold: 0 });
  assert.equal(confirmedSales({ approved: 0, initialSold: 110 }).sold, 0);
  assert.equal(confirmedSales({ approved: 9, initialSold: 110 }).sold, 9);
  assert.equal(confirmedSales().sold, 0);
});
test('invalid statistics cannot become a fake count', () => {
  for (const approved of [-1, 1.5, NaN, '10', Infinity]) assert.throws(() => confirmedSales({ approved }));
});
