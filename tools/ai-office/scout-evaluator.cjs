'use strict';

/**
 * MealUp Talent Scout — independent eligibility & evidence gate (read only).
 * No provider calls, network, installation, billing, commits, CEO approvals,
 * app imports, model selection authority or benchmark fabrication.
 * Consumes the canonical candidate registry; does not modify it.
 */
const registry = require('./scout-candidate-register.json');

const STATES = Object.freeze({
  ACCESS_BLOCKED: 'ACCESS_BLOCKED',
  FREE_COMPUTE_UNVERIFIED: 'FREE_COMPUTE_UNVERIFIED',
  RENEWAL_UNVERIFIED: 'RENEWAL_UNVERIFIED',
  NON_RENEWING_FREE_OFFER: 'NON_RENEWING_FREE_OFFER',
  ACCOUNT_NOT_CONNECTED: 'ACCOUNT_NOT_CONNECTED',
  LICENSE_APPROVAL_REQUIRED: 'LICENSE_APPROVAL_REQUIRED',
  CONNECTED_UNDER_QA: 'CONNECTED_UNDER_QA',
  CANDIDATE_FOR_CONTROLLED_PROBE: 'CANDIDATE_FOR_CONTROLLED_PROBE'
});
const BLOCKING = new Set([
  STATES.ACCESS_BLOCKED,
  STATES.FREE_COMPUTE_UNVERIFIED,
  STATES.RENEWAL_UNVERIFIED,
  STATES.NON_RENEWING_FREE_OFFER,
  STATES.ACCOUNT_NOT_CONNECTED,
  STATES.LICENSE_APPROVAL_REQUIRED
]);

function classify(candidate) {
  if (!candidate || typeof candidate !== 'object') throw Error('CANDIDATE_REQUIRED');
  if (!candidate.id || typeof candidate.id !== 'string') throw Error('CANDIDATE_ID_REQUIRED');
  const notes = [];
  if (candidate.vision !== true && candidate.role === 'Design Director')
    return { id: candidate.id, state: STATES.ACCESS_BLOCKED, reason: 'VISION_NOT_PROVEN', approved: false };
  if (candidate.status === 'ACCESS_BLOCKED' ||
      String(candidate.freeApiAccess || '').startsWith('BLOCKED_'))
    return { id: candidate.id, state: STATES.ACCESS_BLOCKED, reason: 'PROVIDER_BLOCKED', approved: false };
  if (candidate.licenseUserAcceptanceRequired === true && candidate.licenseAcceptedByCEO !== true)
    return { id: candidate.id, state: STATES.LICENSE_APPROVAL_REQUIRED, reason: 'LICENSE_REVIEW_BY_CEO', approved: false };
  if (!candidate.inferenceProvider || candidate.freeApiAccess === 'NOT_VERIFIED')
    return { id: candidate.id, state: STATES.FREE_COMPUTE_UNVERIFIED, reason: 'NO_VERIFIED_FREE_PROVIDER', approved: false };
  // CEO mandate 2026-10-15: a temporary trial or promotional credits cannot
  // qualify an agent for ongoing zero-extra-budget use. Require verified renewals.
  const quota = candidate.freeQuotaPolicy;
  if (quota?.kind === 'ONE_TIME_CREDITS' || quota?.kind === 'PAID_AFTER_TRIAL')
    return { id: candidate.id, state: STATES.NON_RENEWING_FREE_OFFER,
      reason: 'TRIAL_OR_PROMOTIONAL_CREDITS_DO_NOT_RENEW', approved: false };
  const recurring = quota?.kind === 'RECURRING_FREE_QUOTA' &&
    typeof quota.reset === 'string' && quota.reset.length > 0 &&
    typeof quota.source === 'string' && /^https:\/\//.test(quota.source);
  const selfHosted = quota?.kind === 'SELF_HOSTED_PERPETUAL_VERIFIED' &&
    candidate.freeComputeVerified === true &&
    typeof quota.source === 'string' && /^https:\/\//.test(quota.source);
  const preexistingSubscription = quota?.kind === 'EXISTING_SUBSCRIPTION_ENTITLEMENT_VERIFIED' &&
    candidate.subscriptionPlanAlreadyHeld === true &&
    candidate.noNewBillingVerified === true &&
    candidate.usesSeparatelyBilledApi === false &&
    candidate.entitlementAccessVerified === true &&
    typeof quota.reset === 'string' && quota.reset.length > 0 &&
    typeof quota.source === 'string' && /^https:\/\//.test(quota.source);
  if (!recurring && !selfHosted && !preexistingSubscription)
    return { id: candidate.id, state: STATES.RENEWAL_UNVERIFIED,
      reason: 'REPEATABLE_FREE_QUOTA_OR_EXISTING_FREE_COMPUTE_NOT_PROVEN', approved: false };
  if (candidate.status === 'HOSTED_FREE_OFFER_VERIFIED_ACCOUNT_NOT_CONNECTED' ||
      String(candidate.freeApiAccess || '').includes('ACCOUNT_ACCESS_NOT_TESTED') ||
      candidate.status === 'ACCOUNT_NOT_CONNECTED')
    return { id: candidate.id, state: STATES.ACCOUNT_NOT_CONNECTED, reason: 'NEEDS_PRIVATE_ACCOUNT_CONNECTION', approved: false };
  if (candidate.status === 'CONNECTED_GUARDED_NOT_QA_APPROVED')
    return { id: candidate.id, state: STATES.CONNECTED_UNDER_QA, reason: 'LIVE_ACCESS_YES_QUALITY_QA_BLOCKED', approved: false };
  if (preexistingSubscription) {
    return { id: candidate.id, state: STATES.CANDIDATE_FOR_CONTROLLED_PROBE,
      reason: 'EXISTING_PAID_PLAN_ENTITLEMENT_VERIFIED_NO_EXTRA_BILLING',
      approved: false, automaticApiAccessAssumed: false };
  }
  if (candidate.freeApiAccess === 'VERIFIED_BY_REAL_CALLS') {
    notes.push('Provider access verified but capability and quality must still pass QA');
    return { id: candidate.id, state: STATES.CANDIDATE_FOR_CONTROLLED_PROBE,
      reason: notes[0], approved: false };
  }
  return { id: candidate.id, state: STATES.FREE_COMPUTE_UNVERIFIED,
    reason: 'PROVIDER_COST_AND_ACCESS_UNPROVEN', approved: false };
}

function assessBenchmark(left, right, evidence) {
  const blockers = [];
  if (!left || !right || left.id === right.id) blockers.push('TWO_DISTINCT_MODELS_REQUIRED');
  if (!Array.isArray(evidence) || evidence.length < 4) blockers.push('FOUR_MATCHED_CASES_REQUIRED');
  if (left && BLOCKING.has(classify(left).state)) blockers.push('LEFT_NOT_ELIGIBLE');
  if (right && BLOCKING.has(classify(right).state)) blockers.push('RIGHT_NOT_ELIGIBLE');
  if (Array.isArray(evidence)) {
    for (const test of evidence) {
      if (!test || !test.caseId || !test.fixedPromptSha256 || !test.assetSha256 ||
          test.leftModelId !== left?.modelId || test.rightModelId !== right?.modelId)
        blockers.push('UNMATCHED_MODEL_PROMPT_OR_ASSET');
      if (test.independentQa !== 'PASS' || test.humanVisualReview !== 'PASS' ||
          test.leftResponseRecorded !== true || test.rightResponseRecorded !== true)
        blockers.push('INDEPENDENT_QA_AND_HUMAN_REVIEW_REQUIRED');
    }
    if (new Set(evidence.map(x=>x?.caseId)).size !== evidence.length)
      blockers.push('DUPLICATE_CASE');
    if (!evidence.some(x=>/CARD_UI|SCREENSHOT_UI/.test(x?.caseId||'')))
      blockers.push('REAL_UI_SCREENSHOT_REQUIRED');
  }
  return { status: blockers.length === 0 ? 'COMPARABLE_NO_AUTOMATIC_WINNER' : 'BLOCKED',
    blockers: [...new Set(blockers)], winner: null, ceoApproved: false,
    note:'A/B evidence eligibility does not certify a winner or authorize an agent switch.' };
}

function getCurrentReport() {
  const results = registry.candidates.map(classify);
  return {
    schema: 'mealup-talent-scout-audit-v1',
    date: registry.asOf,
    additionalBudgetEUR: registry.budgetAdditionalEUR,
    renewableQuotaRequired: true,
    temporaryCreditsEligible: false,
    runType: 'OFFLINE_ELIGIBILITY_ONLY',
    candidates: results,
    eligibleForAutomaticPromotion: 0,
    agentReplacementsPerformed: 0,
    nextAction: 'CEO approval required for any account connection, model choice or live A/B',
  };
}

if (require.main === module) {
  const report=getCurrentReport();
  if (process.argv.includes('--json')) console.log(JSON.stringify(report,null,2));
  else {
    console.log('SCOUT_OFFLINE_AUDIT Candidates='+report.candidates.length+' BudgetEUR='+report.additionalBudgetEUR);
    for (const c of report.candidates) console.log(c.id+' '+c.state+' '+c.reason);
    console.log('NO_MODEL_WINNER NO_API_CALLS NO_WRITES NO_NEW_BILLING');
  }
}
module.exports = { STATES, BLOCKING, classify, assessBenchmark, getCurrentReport };
