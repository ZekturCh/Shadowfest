import { test } from 'node:test';
import assert from 'node:assert/strict';
import { event } from '../config.js';
import { whatsappUrl, purchaseMessage } from '../whatsapp.js';
import { requestDetails } from '../sales.js';
test('WhatsApp points to the organizer and preserves accented text, lines and quantities', () => {
  const message = '¡Voy a Shadow Fest!\n2 packs · 12 entradas + 2 six packs\nS/ 20 & VIP';
  const url = new URL(whatsappUrl(event.whatsapp, message));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/51955121011');
  assert.equal(url.searchParams.get('text'), message);
  assert.throws(() => whatsappUrl('+51 955 121 011', message));
});
test('direct purchase does not require a name and keeps the chosen pack quantity', () => {
  const details = requestDetails({id:'crew'}, 2, new Date('2026-10-05T12:00:00-05:00'));
  const message = purchaseMessage(details);
  assert.match(message,/12 entradas/); assert.match(message,/2 six pack/);
  assert.match(message,/disponibilidad, precio/);
  assert.doesNotMatch(message,/Soy undefined/);
});
