const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const contract = JSON.parse(fs.readFileSync(path.join(__dirname, 'deterministic-gauge-contract.json'), 'utf8'));
const angle = kcal => -60 + 120 * Math.min(Math.max(kcal, 0), 1000) / 1000;

test('Food Portrait gauge maps exact kcal monotonically and clamps only the needle', () => {
  assert.equal(angle(0), -60);
  assert.equal(angle(95), -48.6);
  assert.ok(Math.abs(angle(380) - (-14.4)) < 1e-9);
  assert.equal(angle(975), 57);
  assert.equal(angle(1600), 60);
});

test('candidate keeps movable needle, reduced-motion fallback and explicit approval gate', () => {
  assert.deepEqual(contract.assets.needle.pivotPixels, [254, 231]);
  assert.equal(contract.motion.durationMs, 680);
  assert.equal(contract.motion.reducedMotion, 'STATIC_TARGET');
  assert.equal(contract.approval.owner, 'PENDING');
  assert.equal(contract.approval.automaticFreeze, false);
  for (const asset of ['shell', 'needle']) {
    assert.ok(fs.existsSync(path.join(root, contract.assets[asset].path)));
  }
});
