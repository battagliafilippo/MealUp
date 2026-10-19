const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {gaugeLayer} = require('./deterministic-gauge-compositor.cjs');

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
  assert.equal(contract.approval.owner, 'APPROVED');
  assert.equal(contract.approval.automaticFreeze, false);
  for (const asset of ['shell', 'needle']) {
    assert.ok(fs.existsSync(path.join(root, contract.assets[asset].path)));
  }
});

test('approved compositor emits a verified food-only overlay plan', () => {
  const layer=gaugeLayer({root,kcal:380});
  assert.equal(layer.status,'READY');
  assert.equal(layer.value.text,'380 kcal');
  assert.ok(Math.abs(layer.needle.angleDegrees-(-14.4))<1e-9);
  assert.equal(layer.imageGenerationScope,'FOOD_ONLY_NO_GAUGE_NO_TEXT');
  assert.deepEqual(layer.renderOrder,['FOOD_PORTRAIT','GAUGE_SHELL','GAUGE_NEEDLE','EXACT_KCAL_TEXT']);
});

test('non-generative r2 compositor checkpoint preserves gates', () => {
  const checkpoint=JSON.parse(fs.readFileSync(path.join(root,'docs','food-portrait-pipeline','checkpoints','gauge-v4-compositor-r2-qa-001.json'),'utf8'));
  assert.equal(checkpoint.status,'PASS_NON_GENERATIVE_COMPOSITION_QA');
  assert.equal(checkpoint.composition.imageGenerationCalls,0);
  assert.equal(checkpoint.independentVisualQa.status,'PASS_VISUAL_QA_ONLY');
  assert.equal(checkpoint.gates.sourcePortraitPromoted,false);
  assert.equal(checkpoint.gates.batchReopened,false);
  assert.equal(checkpoint.gates.do01Generated,false);
});
