'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCandidate, buildOfficePlan } = require('./design-live-pilot.cjs');

const valid = { visibleObservations: ['FO di pasta visibile'], foodFamily: 'Pasta',
  risksToVerify: ['Leggibilita da verificare'], recommendedMobileTest: 'Test su card iPhone',
  assumptions: [], approvalClaim: false, decision: 'PROPOSAL_ONLY', filesModified: [],
  otherDepartmentsActivated: [] };

test('Live pilot plan selects only guarded Design and independent QA', () => {
  const { handoff } = buildOfficePlan();
  assert.equal(handoff.owner, 'Design');
  assert.equal(handoff.adapter, 'GROQ_QWEN_3_8_27B_VISION');
  assert.equal(handoff.payload.writeScope, 'NONE');
  assert.equal(handoff.payload.budgetEUR, 0);
  assert.equal(handoff.nextGate, 'QA / Verification Gate');
});

test('Candidate schema is accepted only as proposal', () => {
  assert.deepEqual(validateCandidate(valid), []);
  assert.ok(validateCandidate({ ...valid, decision: 'APPROVED' }).includes('DECISION_MUST_BE_PROPOSAL_ONLY'));
  assert.ok(validateCandidate({ ...valid, approvalClaim: true }).includes('APPROVAL_CLAIM_FORBIDDEN'));
});

test('Candidate cannot claim writes or activate another department', () => {
  assert.ok(validateCandidate({ ...valid, filesModified: ['app.js'] }).includes('FILES_MODIFIED_FORBIDDEN'));
  assert.ok(validateCandidate({ ...valid, otherDepartmentsActivated: ['Engineering'] })
    .includes('CROSS_DEPARTMENT_ACTIVATION_FORBIDDEN'));
});
