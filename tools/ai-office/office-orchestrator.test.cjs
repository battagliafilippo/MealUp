'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createOfficeOrchestrator, PROTOCOL } = require('./office-orchestrator.cjs');

function brief(id, domain, extra = {}) {
  return { id, domain, request: `Task ${id}`, scope: 'Lab proposal only',
    baselineId: 'office-connect-20261015', constitutionVersion: '1.9',
    officeVersion: '1.3', activeBriefVersion: 'office-v1.3', ...extra };
}
const hash='b'.repeat(64);
const foodPortraitExtra=()=>({
 taskType:'FOOD_PORTRAIT_DETERMINISTIC_PILOT',producerId:'imagegen',
 technicalReviewerId:'qa-tech',visualReviewerId:'qa-food',inputHashesVerified:true,
 quotaVerified:true,recipeId:'r3',vesselId:'VESSEL_BOWL',candidateLimit:1,
 budgetEUR:0,automaticRetry:false,gaugeContractVerified:true,
 vesselTemplate:{vesselId:'VESSEL_BOWL',verified:true,immutable:true,
  sourceBoardSha256:hash,bodySha256:hash,foodClipSha256:hash,frontOccluderSha256:hash}
});

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
    ...foodPortraitExtra(),
  }));
  const h = office.handoff('fp-1');
  assert.equal(h.payload.taskType, 'FOOD_PORTRAIT_DETERMINISTIC_PILOT');
  assert.equal(h.payload.skillAssignments.length, 7);
  assert.equal(h.payload.skillAssignments[0].skillId, 'MEALUP_SOURCE_FACTS_DISPLAY_ROLES');
  assert.equal(h.payload.skillAssignments.at(-1).skillId, 'MEALUP_CHECKPOINT_AUDIT');
  assert.equal(office.report('fp-1').skillPlan.status, 'READY_OFFLINE');
  assert.equal(h.payload.candidateLimit,1);
  assert.equal(h.payload.earlyQaBeforeComposition,true);
  assert.equal(h.payload.finalQaAfterComposition,true);
});

test('Food Portrait intake fails closed before handoff when actors overlap', () => {
  const office = createOfficeOrchestrator();
  assert.throws(() => office.intake(brief('fp-bad', 'engineering', {
    ...foodPortraitExtra(),producerId:'same',visualReviewerId:'same',
  })), /PRODUCER_REVIEWER_NOT_INDEPENDENT/);
});
test('Food Portrait handoff is blocked without verified immutable vessel evidence',()=>{
 const office=createOfficeOrchestrator();const extra=foodPortraitExtra();
 extra.vesselTemplate.verified=false;
 assert.throws(()=>office.intake(brief('fp-vessel','engineering',extra)),
  /VERIFIED_VESSEL_TEMPLATE_REQUIRED/);
});
