'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {inspect} = require('./catalog-autonomy.cjs');

const sha256Buffer = (value) => crypto.createHash('sha256').update(value).digest('hex');
const sha256File = (file) => sha256Buffer(fs.readFileSync(file));
const writeAtomic = (file, contents) => {
  const temporary = file + '.tmp-' + process.pid;
  fs.writeFileSync(temporary, contents, {flag: 'wx'});
  fs.renameSync(temporary, file);
};

function snapshot(files) {
  return Object.fromEntries(files.map((file) => [file, sha256File(file)]));
}

function assertSame(before, after, label) {
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error(label + '_CHANGED');
}

function runDryRun(root = process.cwd()) {
  const resolvedRoot = path.resolve(root);
  const protectedFiles = [
    'docs/food-portrait-pipeline/checkpoints/catalog-autonomy-state-v1.json',
    'docs/food-portrait-pipeline/catalog-production-authorization-v1.json',
    'docs/food-portrait-pipeline/food-portrait-style-frozen-v1.json',
    'docs/food-portrait-pipeline/optimization/fast-same-gates-mandate-v1.json'
  ].map((file) => path.join(resolvedRoot, file));
  const frozenAssets = Object.values(JSON.parse(fs.readFileSync(path.join(resolvedRoot, 'docs/food-portrait-pipeline/food-portrait-style-frozen-v1.json'), 'utf8')).canonicalVesselReferences)
    .map((reference) => path.join(resolvedRoot, reference.source));
  const realBefore = snapshot([...protectedFiles, ...frozenAssets]);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mealup-fast-rollback-'));
  const pointer = path.join(temporaryRoot, 'pipeline-pointer.json');
  const state = path.join(temporaryRoot, 'synthetic-state.json');
  const baselinePointer = Buffer.from('{"pipeline":"BASELINE_V1"}\n');
  const baselineState = Buffer.from('{"status":"ACTIVE_READY","completed":0,"failed":0}\n');
  fs.writeFileSync(pointer, baselinePointer);
  fs.writeFileSync(state, baselineState);
  const baselineSnapshot = snapshot([pointer, state]);
  const inspectState = {schema: 'mealup-food-portrait-catalog-autonomy-state-v1', status: 'ACTIVE_READY', queue: [{recipeId: 'synthetic', title: 'Synthetic', vesselId: 'VESSEL_BOWL', state: 'PENDING'}], activeRecipeId: null};
  const inspectMandate = {schema: 'mealup-food-portrait-catalog-autonomy-v1'};
  const baselinePreflight = JSON.stringify(inspect(inspectState, inspectMandate));
  const events = [];
  const enableFast = () => {
    writeAtomic(pointer, '{"pipeline":"FAST_SAME_GATES_V1"}\n');
    events.push('FAST_POINTER_ENABLED');
  };
  const syntheticPass = () => {
    writeAtomic(state, '{"status":"ACTIVE_READY","completed":1,"failed":0}\n');
    events.push('SYNTHETIC_PASS_COMMITTED');
  };
  const injectedFail = () => {
    events.push('SYNTHETIC_FAIL_INJECTED_BEFORE_COMMIT');
    throw new Error('INJECTED_FAIL');
  };
  const rollback = () => {
    writeAtomic(pointer, baselinePointer);
    writeAtomic(state, baselineState);
    events.push('BASELINE_RESTORED');
  };
  enableFast();
  syntheticPass();
  try { injectedFail(); } catch (error) {
    if (error.message !== 'INJECTED_FAIL') throw error;
    rollback();
  }
  const firstRollbackSnapshot = snapshot([pointer, state]);
  assertSame(baselineSnapshot, firstRollbackSnapshot, 'BASELINE_BYTES');
  rollback();
  const replaySnapshot = snapshot([pointer, state]);
  assertSame(baselineSnapshot, replaySnapshot, 'ROLLBACK_REPLAY');
  const restoredPreflight = JSON.stringify(inspect(inspectState, inspectMandate));
  if (restoredPreflight !== baselinePreflight) throw new Error('BASELINE_PREFLIGHT_CHANGED');
  const activeCycle = JSON.stringify(inspect({...inspectState, activeRecipeId: 'synthetic'}, inspectMandate));
  if (!activeCycle.includes('ACTIVE_CYCLE_REQUIRES_RECOVERY_REVIEW')) throw new Error('ACTIVE_CYCLE_NOT_BLOCKED');
  const realAfter = snapshot([...protectedFiles, ...frozenAssets]);
  assertSame(realBefore, realAfter, 'PROTECTED_FILES');
  fs.rmSync(temporaryRoot, {recursive: true, force: true});
  return {
    verdict: 'PASS',
    mode: 'TEMP_FIXTURE_ONLY',
    baselineRestoredByteIdentical: true,
    rollbackReplayIdempotent: true,
    baselinePreflightIdentical: true,
    activeCycleStillBlocked: true,
    protectedFilesUnchanged: true,
    protectedFileCount: protectedFiles.length,
    frozenAssetCount: frozenAssets.length,
    events
  };
}

if (require.main === module) {
  try { console.log(JSON.stringify(runDryRun(), null, 2)); } catch (error) { console.error('FAIL fast rollback harness:', error.message); process.exitCode = 1; }
}
module.exports = {runDryRun};
