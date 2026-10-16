'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const mandate = JSON.parse(fs.readFileSync(path.join(root, 'docs/food-portrait-pipeline/optimization/fast-same-gates-mandate-v1.json'), 'utf8'));
const skill = fs.readFileSync(path.join(root, '.agents/skills/mealup-food-portrait-fast-same-gates/SKILL.md'), 'utf8');

test('mandate preserves quality gates and zero-cost authority', () => {
  assert.equal(mandate.status, 'ACTIVE_RESEARCH_AND_PILOT_DESIGN_ONLY');
  assert.equal(mandate.truthBoundary.guaranteedFirstGenerationPerfection, false);
  assert.equal(mandate.truthBoundary.requiredProcessBehavior, 'FAIL_CLOSED_NO_DEFECT_MAY_PASS');
  for (const invariant of ['AUTO_ACCEPT', 'AUTO_FREEZE', 'INTEGRATION', 'DEPLOY', 'PAID_API', 'REMOVING_INDEPENDENT_VISUAL_QA']) {
    assert.ok(mandate.forbidden.includes(invariant));
  }
});

test('director and every department receive the optimization skill', () => {
  assert.ok(mandate.activatedDepartments.length >= 7);
  for (const department of mandate.activatedDepartments) {
    assert.ok(department.skills.includes('mealup-food-portrait-fast-same-gates'), department.id);
  }
  assert.equal(mandate.communication.crossDepartmentMessaging, true);
  assert.equal(mandate.communication.directorIsSingleConsolidator, true);
});

test('pilot thresholds require measurable savings and no regression', () => {
  const gates = mandate.pilot.goThresholds;
  assert.equal(gates.criticalRegressionCount, 0);
  assert.ok(gates.minimumOrchestrationTokenSavingPercent >= 40);
  assert.ok(gates.minimumMedianTimeSavingPercent >= 20);
  assert.equal(gates.rollbackDemonstrated, true);
  assert.match(skill, /QA visivo indipendente/);
  assert.match(skill, /Nessuna estensione al catalogo prima della decisione owner/);
});
