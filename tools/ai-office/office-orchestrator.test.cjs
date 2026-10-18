'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createOfficeOrchestrator, PROTOCOL } = require('./office-orchestrator.cjs');

function brief(id, domain, extra = {}) {
  return { id, domain, request: `Task ${id}`, scope: 'Lab proposal only',
    baselineId: 'office-connect-20261015', constitutionVersion: '1.9',
    officeVersion: '1.3', activeBriefVersion: 'office-v1.3', ...extra };
}

test('Design is connected to guarded Qwen vision, then independent QA', () => {
  const office = createOfficeOrchestrator();
  const connected = office.intake(brief('design-1', 'design'));
  assert.equal(connected.task.owner, 'Design');
  assert.deepEqual(connected.plan.stages.map(x => x.roleId),
    ['director', 'design', 'qa', 'director']);
  const h = office.handoff('design-1');
  assert.equal(h.protocol, PROTOCOL);
  assert.equal(h.adapter, 'GROQ_QWEN_3_8_27B_VISION');
  assert.equal(h.adapterStatus, 'CONNECTED_GUARDED');
  assert.equal(h.nextGate, 'QA / Verification Gate');
  assert.equal(h.execution, 'NOT_STARTED');
});

test('Food is connected to recipe pipeline and optional Prompt Architect', () => {
  const office = createOfficeOrchestrator();
  office.intake(brief('food-1', 'food', { promptSpecializationRequired: true }));
  const report = office.report('food-1');
  assert.deepEqual(report.connectionPlan.stages.map(x => x.roleId),
    ['director', 'prompt_architect', 'food', 'qa', 'director']);
  assert.equal(office.handoff('food-1').adapter, 'RECIPE_ANALYZER_VISUAL_DIRECTOR_GROQ');
});

test('Engineering and Visual connections do not imply repository or image execution', () => {
  const office = createOfficeOrchestrator();
  office.intake(brief('eng-1', 'engineering'));
  office.intake(brief('visual-1', 'visual'));
  assert.equal(office.handoff('eng-1').adapterStatus, 'INTERACTIVE_ONLY');
  assert.equal(office.handoff('visual-1').adapter, 'OPENAI_BUILT_IN_IMAGEGEN_INTERACTIVE');
  assert.equal(office.handoff('visual-1').adapterStatus, 'CONNECTED_GUARDED_CONTROLLED_LOT');
  for (const [id, action] of [['eng-1', 'push main'], ['visual-1', 'generate 454 images']]) {
    const denied = office.requestAction(id, action);
    assert.equal(denied.allowed, false);
    assert.equal(denied.executed, false);
  }
});

test('Untrusted input cannot choose an adapter, budget or authority', () => {
  const office = createOfficeOrchestrator();
  office.intake({ ...brief('inject', 'design'), adapter: 'PAID_MODEL', budgetEUR: 1000,
    authorization: 'DEPLOY', owner: 'CEO' });
  const h = office.handoff('inject');
  assert.equal(h.adapter, 'GROQ_QWEN_3_8_27B_VISION');
  assert.equal(h.payload.budgetEUR, 0);
  assert.equal(h.payload.authorization, 'PROPOSAL_ONLY');
  assert.equal(h.finalAuthority, 'CEO');
});

test('No unknown task or unsupported department can enter the office', () => {
  const office = createOfficeOrchestrator();
  assert.throws(() => office.intake(brief('unknown', 'marketing')), /UNCLASSIFIED_DOMAIN/);
  assert.throws(() => office.handoff('missing'), /UNKNOWN_OFFICE_PLAN/);
});

test('Food Portrait intake attaches an ordered complete skill plan to the handoff', () => {
  const office = createOfficeOrchestrator();
  office.intake(brief('fp-1', 'engineering', {
    taskType: 'FOOD_PORTRAIT_DETERMINISTIC_PILOT', producerId: 'imagegen',
    technicalReviewerId: 'qa-tech', visualReviewerId: 'qa-food',
    inputHashesVerified: true, quotaVerified: true,
  }));
  const h = office.handoff('fp-1');
  assert.equal(h.payload.taskType, 'FOOD_PORTRAIT_DETERMINISTIC_PILOT');
  assert.equal(h.payload.skillAssignments.length, 9);
  assert.equal(h.payload.skillAssignments[0].skillId, 'MEALUP_RECIPE_FACT_LOCK');
  assert.equal(h.payload.skillAssignments.at(-1).skillId, 'MEALUP_VERIFIED_CORRECTION_LIBRARY');
  assert.equal(office.report('fp-1').skillPlan.status, 'READY_OFFLINE');
});

test('Food Portrait intake fails closed before handoff when actors overlap', () => {
  const office = createOfficeOrchestrator();
  assert.throws(() => office.intake(brief('fp-bad', 'engineering', {
    taskType: 'FOOD_PORTRAIT_DETERMINISTIC_PILOT', producerId: 'same',
    technicalReviewerId: 'qa-tech', visualReviewerId: 'same',
    inputHashesVerified: true, quotaVerified: true,
  })), /PRODUCER_REVIEWER_NOT_INDEPENDENT/);
});
