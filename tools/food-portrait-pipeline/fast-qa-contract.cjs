'use strict';

const REQUIRED_VERDICTS = Object.freeze(['CONTENT_COUNT', 'ATTACHMENT_GARNISH', 'STYLE_MICROTEXTURE', 'VESSEL_CROP', 'GAUGE_TEXT']);

function buildQaContract(packet) {
  return Object.freeze({
    schema: 'mealup-food-portrait-fast-qa-contract-v1',
    packetSha256: packet.packetSha256,
    canonicalModelSetSha256: packet.ownerModelSet.manifestSha256,
    visualReferenceSha256: packet.visualReference.sha256,
    sourceHash: packet.recipeFacts.sourceHash,
    requiredViews: ['CARD_360_SQUARE', 'ORIGINAL_1_TO_1'],
    requiredVerdicts: [...REQUIRED_VERDICTS],
    passValue: 'PASS',
    overallPassValue: 'PASS_CANDIDATE_ONLY',
    producerReviewerMustDiffer: true,
    stopOnFirstFail: true
  });
}

function validateQaReport(contract, report) {
  if (contract?.schema !== 'mealup-food-portrait-fast-qa-contract-v1') throw new Error('QA_CONTRACT_INVALID');
  if (!report || report.packetSha256 !== contract.packetSha256) throw new Error('QA_PACKET_SHA_MISMATCH');
  if (report.canonicalModelSetSha256 !== contract.canonicalModelSetSha256 || report.visualReferenceSha256 !== contract.visualReferenceSha256) throw new Error('QA_REFERENCE_SHA_MISMATCH');
  if (!report.producer || !report.reviewer || report.producer === report.reviewer) throw new Error('QA_REVIEWER_NOT_INDEPENDENT');
  for (const view of contract.requiredViews) if (!report.views?.includes(view)) throw new Error('QA_VIEW_MISSING:' + view);
  for (const verdict of contract.requiredVerdicts) if (report.verdicts?.[verdict] !== contract.passValue) throw new Error('QA_VERDICT_FAIL:' + verdict);
  if (report.overall !== contract.overallPassValue) throw new Error('QA_OVERALL_INVALID');
  return true;
}

module.exports = {REQUIRED_VERDICTS, buildQaContract, validateQaReport};
