import test from 'node:test';
import assert from 'node:assert/strict';
import {allocateInvitations, invitationLimit, isInvitation, ticketPackageName} from '../invitation-policy.js';

test('courtesy quota accepts the last available place and rejects exceeding 110', () => {
  assert.equal(invitationLimit, 110);
  assert.equal(allocateInvitations(0, 10), 10);
  assert.equal(allocateInvitations(107, 3), 110);
  assert.equal(allocateInvitations(109, 1), 110);
  assert.throws(() => allocateInvitations(109, 2), /Quedan 1/);
  assert.throws(() => allocateInvitations(110, 1), /Quedan 0/);
});

test('courtesy allocations reject malformed counters and quantities', () => {
  for (const current of [-1, 111, 0.5, NaN, '0', null]) assert.throws(() => allocateInvitations(current, 1));
  for (const quantity of [0, -1, 11, 1.5, Infinity, '1']) assert.throws(() => allocateInvitations(0, quantity));
});

test('courtesy passes remain distinct from paid General and VIP packages', () => {
  const packages = [{id: 'general', name: 'General'}, {id: 'vip', name: 'VIP'}];
  assert.equal(isInvitation({packageId: 'invitation'}), true);
  assert.equal(isInvitation({packageId: 'general'}), false);
  assert.equal(isInvitation(null), false);
  assert.equal(ticketPackageName(packages, 'invitation'), 'Cortesía · General');
  assert.equal(ticketPackageName(packages, 'general'), 'General');
  assert.equal(ticketPackageName(packages, 'vip'), 'VIP');
});
