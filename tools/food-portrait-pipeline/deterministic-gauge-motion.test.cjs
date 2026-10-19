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
  assert.equal(layer.layout.canvasAspectRatio,'1:1');
  assert.equal(layer.layout.gaugeWidthPercent,34);
  assert.equal(layer.layout.gaugeTopPercent,2.5);
  assert.equal(layer.layout.gaugeRightPercent,2.5);
  assert.equal(layer.layout.foodMaximumWidthPercent,92);
  assert.equal(layer.layout.foodMaximumHeightPercent,74);
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

test('all recipe cards share one frozen proportional geometry', () => {
  const geometry=JSON.parse(fs.readFileSync(path.join(root,'docs','food-portrait-pipeline','food-portrait-card-geometry-v1.json'),'utf8'));
  assert.equal(geometry.status,'FROZEN_OWNER_DELEGATED');
  assert.equal(geometry.canvas.aspectRatio,'1:1');
  assert.equal(geometry.foodPortrait.maximumSubjectWidthPercent,92);
  assert.equal(geometry.foodPortrait.maximumSubjectHeightPercent,74);
  assert.equal(geometry.gauge.widthPercent,34);
  assert.equal(geometry.gauge.topPercent,2.5);
  assert.equal(geometry.gauge.rightPercent,2.5);
  assert.equal(geometry.gauge.minimumValidatedCardWidthPixels,390);
  assert.deepEqual(geometry.gauge.compactCard.artBoxPixels,[151,104]);
  assert.equal(geometry.gauge.compactCard.numberMinimumPixels,10);
  assert.equal(geometry.gauge.compactCard.unitMinimumPixels,8);
  assert.equal(geometry.gauge.compactCard.duplicateKcalMetadataPolicy,'SUPPRESS_WHEN_GAUGE_ACTIVE');
});
