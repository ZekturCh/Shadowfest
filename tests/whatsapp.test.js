import { test } from 'node:test';
import assert from 'node:assert/strict';
import { event } from '../config.js';
import { whatsappUrl } from '../whatsapp.js';
test('WhatsApp points to the organizer and preserves accented text, lines and quantities', () => {
  const message = '¡Voy a Shadow Fest!\n2 packs · 12 entradas + 2 six packs\nS/ 20 & VIP';
  const url = new URL(whatsappUrl(event.whatsapp, message));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/51955121011');
  assert.equal(url.searchParams.get('text'), message);
  assert.throws(() => whatsappUrl('+51 955 121 011', message));
});
