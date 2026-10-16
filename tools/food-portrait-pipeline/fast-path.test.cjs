'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {buildPacket, canonicalJson, MAX_PACKET_BYTES} = require('./fast-job-packet.cjs');
const {runDryRun} = require('./fast-rollback-harness.cjs');

const root = path.resolve(__dirname, '..', '..');

test('packet is deterministic, compact and source/reference locked', () => {
  const first = buildPacket({root, recipeId: 'a10'});
  const second = buildPacket({root, recipeId: 'a10'});
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.match(first.packetSha256, /^[a-f0-9]{64}$/);
  assert.ok(first.packetBytes <= MAX_PACKET_BYTES);
  assert.equal(first.recipeFacts.kcal, 380);
  assert.equal(first.gaugeTarget.exactKcalText, '380 kcal');
  assert.equal(first.reference.sha256, '7be03065e37431a37dc97798cb4c2a2d8660080c30d193f4061ad2808dfc78c0');
  assert.equal('queue' in first, false);
  assert.equal('history' in first, false);
  assert.equal(first.constraints.maximumImages, 1);
  assert.equal(first.gates.independentVisualQaRequired, true);
  assert.equal(first.gates.automaticAcceptance, false);
  assert.equal(first.gates.budgetEUR, 0);
});

test('different recipe facts produce a different packet hash', () => {
  const plate = buildPacket({root, recipeId: 'a10'});
  const bowl = buildPacket({root, recipeId: 'p09'});
  assert.notEqual(plate.packetSha256, bowl.packetSha256);
  assert.notEqual(plate.reference.sha256, bowl.reference.sha256);
});

test('all ten preregistered packets remain below the hard byte ceiling', () => {
  const pilot = JSON.parse(fs.readFileSync(path.join(root, 'docs/food-portrait-pipeline/optimization/fast-same-gates-pilot-v1.json'), 'utf8'));
  const sizes = pilot.cohort.map(({recipeId}) => buildPacket({root, recipeId}).packetBytes);
  assert.equal(sizes.length, 10);
  assert.ok(Math.max(...sizes) <= MAX_PACKET_BYTES);
});

test('packet compiler fails closed on missing or mismatched reference', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mealup-fast-packet-'));
  const pilotPath = path.join(temporaryRoot, 'pilot.json');
  const statePath = path.join(temporaryRoot, 'state.json');
  const pilot = JSON.parse(fs.readFileSync(path.join(root, 'docs/food-portrait-pipeline/optimization/fast-same-gates-pilot-v1.json'), 'utf8'));
  const state = JSON.parse(fs.readFileSync(path.join(root, 'docs/food-portrait-pipeline/checkpoints/catalog-autonomy-state-v1.json'), 'utf8'));
  state.queue.find((entry) => entry.recipeId === 'a10').reference.sha256 = '0'.repeat(64);
  fs.writeFileSync(pilotPath, JSON.stringify(pilot));
  fs.writeFileSync(statePath, JSON.stringify(state));
  assert.throws(() => buildPacket({root, recipeId: 'a10', pilot: pilotPath, state: statePath}), /QUEUE_REFERENCE_MISMATCH/);
  fs.rmSync(temporaryRoot, {recursive: true, force: true});
});

test('non-pilot and non-pending recipes cannot get a packet', () => {
  assert.throws(() => buildPacket({root, recipeId: 'r7'}), /RECIPE_NOT_IN_PILOT/);
  assert.throws(() => buildPacket({root}), /RECIPE_ID_REQUIRED/);
});

test('rollback dry-run restores baseline bytes and never touches protected files', () => {
  const result = runDryRun(root);
  assert.equal(result.verdict, 'PASS');
  assert.equal(result.mode, 'TEMP_FIXTURE_ONLY');
  assert.equal(result.baselineRestoredByteIdentical, true);
  assert.equal(result.rollbackReplayIdempotent, true);
  assert.equal(result.baselinePreflightIdentical, true);
  assert.equal(result.activeCycleStillBlocked, true);
  assert.equal(result.protectedFilesUnchanged, true);
  assert.equal(result.frozenAssetCount, 6);
});
