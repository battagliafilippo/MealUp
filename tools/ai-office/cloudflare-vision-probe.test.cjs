'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const p = require('./cloudflare-vision-probe.cjs');
const k = 'a'.repeat(32);
const allowed = { MEALUP_FREE_ONLY:'YES', MEALUP_WORKERS_FREE_CONFIRMED:'YES',
  CLOUDFLARE_ACCOUNT_ID:k, CLOUDFLARE_API_TOKEN:'x'.repeat(30) };
test('model points ONLY to Cloudflare-hosted Mistral vision', () => {
  assert.equal(p.MODEL, '@cf/mistralai/mistral-small-3.1-24b-instruct');
  assert.equal(p.INPUT, 'assets/family-fo/pasta.webp');
});
test('refuses calls without explicit Free plan confirmation', () => {
  assert.ok(p.checkFreeOnly({...allowed, MEALUP_WORKERS_FREE_CONFIRMED:'NO'}).includes('WORKERS_FREE_PLAN_NOT_CONFIRMED'));
  assert.ok(p.checkFreeOnly({...allowed, MEALUP_FREE_ONLY:'NO'}).includes('FREE_ONLY_GATE'));
});
test('refuses when missing or malformed account credentials', () => {
  assert.ok(p.checkFreeOnly({...allowed, CLOUDFLARE_ACCOUNT_ID:''}).includes('ACCOUNT_ID'));
  assert.ok(p.checkFreeOnly({...allowed, CLOUDFLARE_API_TOKEN:''}).includes('API_TOKEN'));
  assert.deepEqual(p.checkFreeOnly(allowed), []);
});
test('builds one image and same fixed observation-only brief', () => {
  const body = p.buildBody('test-b64'.repeat(100));
  assert.equal(body.messages.length, 2);
  assert.equal(body.messages[1].content.filter(x => x.type === 'image_url').length, 1);
  assert.ok(body.messages[1].content[1].image_url.url.startsWith('data:image/webp;base64,'));
  assert.equal(body.temperature, 0.1);
  assert.equal(body.stream, false);
  assert.match(body.messages[0].content, /FROZEN/);
});
test('rejects invalid Account ID without exposing credentials', () => {
  assert.throws(() => p.safeAccountId('invalid'), /INVALID_ACCOUNT_ID/);
  assert.equal(p.safeAccountId(k),k);
});
