'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');
const pilot = JSON.parse(fs.readFileSync(path.join(root, 'docs/food-portrait-pipeline/optimization/fast-same-gates-pilot-v1.json'), 'utf8'));
const state = JSON.parse(fs.readFileSync(path.join(root, 'docs/food-portrait-pipeline/checkpoints/catalog-autonomy-state-v1.json'), 'utf8'));
const sourceTool = path.join(root, 'tools/food-portrait-pipeline/catalog-recipe-source.cjs');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

test('pilot spends no duplicate image calls and has no production authority', () => {
  assert.equal(pilot.cohort.length, 10);
  assert.equal(pilot.comparison.noDuplicateGeneration, true);
  assert.equal(pilot.execution.maximumImageCalls, 10);
  assert.equal(pilot.execution.stopOnFirstCriticalFailure, true);
  assert.equal(pilot.authority.imageGenerationAuthorized, false);
  assert.equal(pilot.authority.additionalBudgetEUR, 0);
  for (const key of ['automaticRetryAuthorized', 'automaticAcceptanceAuthorized', 'automaticFreezeAuthorized', 'integrationAuthorized', 'deploymentAuthorized']) {
    assert.equal(pilot.authority[key], false, key);
  }
});

test('cohort is unique, pending, diversified and source-locked', () => {
  const ids = new Set();
  const vessels = new Set();
  let mediumHigh = 0;
  for (const entry of pilot.cohort) {
    assert.ok(!ids.has(entry.recipeId), entry.recipeId);
    ids.add(entry.recipeId);
    vessels.add(entry.vesselId);
    if (['MEDIUM', 'HIGH'].includes(entry.risk)) mediumHigh += 1;
    assert.ok(!pilot.coverage.excluded.includes(entry.recipeId));
    assert.ok(!pilot.coverage.excluded.includes(entry.vesselId));
    const queued = state.queue.find((item) => item.recipeId === entry.recipeId);
    assert.equal(queued?.state, 'PENDING', entry.recipeId);
    assert.equal(queued?.vesselId, entry.vesselId, entry.recipeId);
    const facts = JSON.parse(execFileSync(process.execPath, [sourceTool, '--recipe-id', entry.recipeId], { cwd: root, encoding: 'utf8' }));
    assert.equal(facts.sourceHash, entry.sourceHash, entry.recipeId);
    assert.equal(facts.title, entry.title, entry.recipeId);
    assert.equal(facts.kcal, entry.kcal, entry.recipeId);
  }
  assert.ok(vessels.size >= 4);
  assert.equal(vessels.size, 6);
  assert.ok(mediumHigh >= 3);
});

test('all six FROZEN references exist and match queue SHA', () => {
  const checked = new Set();
  for (const entry of pilot.cohort) {
    if (checked.has(entry.vesselId)) continue;
    checked.add(entry.vesselId);
    const queued = state.queue.find((item) => item.recipeId === entry.recipeId);
    const absolute = path.join(root, queued.reference.asset);
    assert.ok(fs.existsSync(absolute), queued.reference.asset);
    assert.equal(sha256(absolute), queued.reference.sha256, entry.vesselId);
  }
  assert.equal(checked.size, 6);
});

test('GO requires measured savings, complete owner acceptance and rollback proof', () => {
  assert.equal(pilot.goCriteria.criticalRegressionCount, 0);
  assert.equal(pilot.goCriteria.ownerAcceptedCount, 10);
  assert.ok(pilot.goCriteria.minimumFirstShotQaPassRate >= 0.909);
  assert.ok(pilot.goCriteria.minimumOrchestrationTokenSavingPercent >= 40);
  assert.ok(pilot.goCriteria.minimumMedianTimeSavingPercent >= 20);
  assert.equal(pilot.goCriteria.rollbackDemonstrated, true);
  assert.equal(pilot.goCriteria.missingRequiredMetricDecision, 'NO_GO_INCONCLUSIVE');
  assert.equal(pilot.rollback.status, 'UNVERIFIED_PENDING_EXECUTABLE_DRY_RUN');
});
