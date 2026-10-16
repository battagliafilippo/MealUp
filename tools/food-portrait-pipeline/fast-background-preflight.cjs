'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {verifyCanonicalModelSet} = require('./canonical-model-gate.cjs');

function inspect(root = process.cwd()) {
  const state = JSON.parse(fs.readFileSync(path.resolve(root, 'docs/food-portrait-pipeline/checkpoints/fast-same-gates-runtime-state-v1.json'), 'utf8'));
  verifyCanonicalModelSet(root);
  if (state.status !== 'ACTIVE_READY' || state.activeRecipeId !== null) return {decision: 'BLOCKED', reason: 'FAST_STATE_NOT_READY', status: state.status};
  const pending = state.queue.find((entry) => entry.state === 'PENDING');
  if (!pending) return {decision: 'NOOP_TERMINAL', reason: 'FAST_QUEUE_COMPLETE'};
  return {decision: 'READY', recipeId: pending.recipeId, qaPassCount: state.qaPassCount, ownerReviewAt: state.ownerReviewAt, modelSetVersion: state.modelSetVersion};
}

if (require.main === module) {
  try { console.log(JSON.stringify(inspect(), null, 2)); } catch (error) { console.error('FAIL fast background preflight:', error.message); process.exitCode = 1; }
}
module.exports = {inspect};
