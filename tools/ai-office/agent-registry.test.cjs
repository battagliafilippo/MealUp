'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { CONTRACT, getRole, roleForOwner, connectionPlan } = require('./agent-registry.cjs');

test('Registry locks Constitution, office version and zero budget', () => {
  assert.deepEqual(CONTRACT, { constitution: '1.9', office: '1.3', budgetEUR: 0 });
  assert.equal(Object.isFrozen(CONTRACT), true);
});

test('Every routed owner resolves to one evidenced office role', () => {
  assert.equal(roleForOwner('Design'), 'design');
  assert.equal(roleForOwner('Engineering'), 'engineering');
  assert.equal(roleForOwner('Food'), 'food');
  assert.equal(roleForOwner('Visual Production'), 'visual');
  assert.throws(() => roleForOwner('CEO'), /UNMAPPED_OWNER/);
  assert.throws(() => roleForOwner('__proto__'), /UNMAPPED_OWNER/);
});

test('Design and Food use guarded existing Groq connections', () => {
  const design = getRole('design');
  const food = getRole('food');
  assert.equal(design.adapter, 'GROQ_QWEN_3_8_27B_VISION');
  assert.equal(design.status, 'CONNECTED_GUARDED');
  assert.equal(food.adapter, 'RECIPE_ANALYZER_VISUAL_DIRECTOR_GROQ');
  assert.equal(food.status, 'CONNECTED_GUARDED');
  assert.equal(design.secret, 'GROQ_API_KEY');
  assert.equal(food.secret, 'GROQ_API_KEY');
});

test('Engineering is interactive and Visual Production cannot start a batch', () => {
  assert.equal(getRole('engineering').status, 'INTERACTIVE_ONLY');
  assert.equal(getRole('visual').status, 'MANUAL_AUTHORIZATION_REQUIRED');
  assert.equal(getRole('visual').activation, 'CEO_ASSET_APPROVAL_AND_QUOTA_CHECK');
});

test('QA is always after owner and independent; Prompt Architect is conditional', () => {
  const plain = connectionPlan('Design');
  assert.deepEqual(plain.stages.map(x => x.roleId), ['director', 'design', 'qa', 'director']);
  const specialized = connectionPlan('Food', true);
  assert.deepEqual(specialized.stages.map(x => x.roleId),
    ['director', 'prompt_architect', 'food', 'qa', 'director']);
  assert.equal(specialized.autonomousExecution, false);
  assert.equal(specialized.paidServicesAllowed, false);
  assert.equal(specialized.finalAuthority, 'CEO');
});

test('Returned registry values cannot mutate canonical mapping', () => {
  const role = getRole('design');
  role.status = 'AUTONOMOUS';
  role.adapter = 'UNTRUSTED';
  assert.equal(getRole('design').status, 'CONNECTED_GUARDED');
  assert.equal(getRole('design').adapter, 'GROQ_QWEN_3_8_27B_VISION');
});
