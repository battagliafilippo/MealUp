'use strict';

const REQUIRED = Object.freeze([
  'STYLE_TOYS_3D',
  'PHOTOREALISM_REJECTION',
  'ALPHA_BACKGROUND',
  'GAUGE_ABSENCE',
  'VESSEL_ABSENCE'
]);

function evaluateEarlyStyleGate({producer, reviewer, verdicts}) {
  if (!producer || !reviewer || producer === reviewer) throw new Error('EARLY_STYLE_REVIEWER_NOT_INDEPENDENT');
  for (const key of REQUIRED) {
    if (verdicts?.[key] !== 'PASS') return Object.freeze({
      status: 'FAIL_CANDIDATE_ONLY',
      failedVerdict: key,
      compositionAllowed: false,
      automaticRetry: false
    });
  }
  return Object.freeze({
    status: 'PASS_EARLY_STYLE',
    failedVerdict: null,
    compositionAllowed: true,
    automaticRetry: false
  });
}

module.exports = {REQUIRED, evaluateEarlyStyleGate};
