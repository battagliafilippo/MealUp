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
  assert.equal(office.handoff('visual-1').adapterStatus, 'CONNECTED_GUARDED_SINGLE_CANDIDATE');
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
