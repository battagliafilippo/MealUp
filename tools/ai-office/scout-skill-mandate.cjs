'use strict';

/**
 * MealUp skill-mandate contract (LAB, proposal/dry-run only).
 * Scout DRAFTS the specialist's role-specific skill mandate.
 * CEO APPROVES recruitment and this mandate. Director ASSIGNS the mandate.
 * The hired agent chooses relevant skills per task, and independent QA checks
 * performance. No provider calls, network, skill installation or writes.
 */
const {plan,evaluateCandidateSkillFit}=require('./scout-skill-router.cjs');
const CONTRACT='MEALUP_SPECIALIST_SKILL_MANDATE_V1';
const ROLE_IDS=['DESIGN','ENGINEERING','FOOD','VISUAL_PRODUCTION',
  'PROMPT_ARCHITECT','QA','DIRECTOR','SCOUT'];

function requiredName(value,label) {
  if(typeof value!=='string'||!value.trim()||value.length>180)
    throw Error('INVALID_'+label);
  return value.trim();
}
function draftProfessionalMandate({
  roleId,candidateId,skillProofs=[],economicsVerified=false,
  licenseAndSecurityApproved=false
}={}) {
  requiredName(candidateId,'CANDIDATE_ID');
  if(!ROLE_IDS.includes(roleId))throw Error('UNKNOWN_ROLE');
  const p=plan({roleId,stage:'BENCHMARK'});
  const skillFit=evaluateCandidateSkillFit({
    roleId,candidateId,skillProofs,economicsVerified,licenseAndSecurityApproved
  });
  const approvedForReview=skillFit.skillEvidenceGateReady;
  const requirements=p.candidateSkillRequirements;
  return {
    schema:CONTRACT,
    version:'1.0',
    roleId,candidateId,
    issuedBy:'TALENT_SCOUT_LEAD',
    intendedFor:'DIRECTOR_AFTER_CEO_APPROVAL',
    reportTo:'CEO',
    status:approvedForReview?
      'PROPOSED_TO_CEO_PENDING_EVIDENCE_AUDIT_AND_APPROVAL':
      'RECRUITMENT_BLOCKED',
    reason:approvedForReview?
      'EVIDENCE_DECLARED_NOT_YET_INDEPENDENTLY_VERIFIED':
      'ROLE_SKILL_EVIDENCE_COST_OR_SECURITY_GATE_NOT_SATISFIED',
    recruitmentPrerequisites:skillFit,
    specialistSkillPack:requirements.map(req=>({
      skillId:req.skillId,
      requiredProfessionalCompetence:req.competence,
      activation:'ONLY_WHEN_TASK_REQUIRES_COMPETENCE',
      evidenceStatus:skillFit.missing.includes(req.skillId)?'MISSING':
        skillFit.unverified.includes(req.skillId)?'UNVERIFIED':
        'DECLARED_REQUIRES_INDEPENDENT_REVIEW',
      roleSpecific:true,
      noExternalSkillInstallationWithoutApproval:true
    })),
    dynamicRules:{
      defaultActivateAll:false,
      selectOnlySkillsMatchingTask:true,
      skipUnneededSkills:true,
      checkActiveFrozenAndTaskScope:true,
      requestAdditionalSkillViaScoutThenCEO:true,
      independentQAForActualOutputs:true,
      budgetAdditionalEUR:0,
      noAutomaticPaidFallback:true,
      noProductionChangesWithoutCEO:true
    },
    approval:{
      scoutCanAssignAgent:false,
      ceoMandateApprovalRequired:true,
      directorAssignsAfterApproval:true,
      ceoApproved:false,
      directorActivated:false
    },
    note:'Advisory mandate: skill proof references must be independently inspected. This cannot create or activate an agent.'
  };
}

/** Preflight an *external* approval/assignment record without activating anything. */
function inspectDirectorHandoff({mandate,approvalRecord,task}={}) {
  const failed=[];
  if(!mandate||mandate.schema!==CONTRACT||!ROLE_IDS.includes(mandate.roleId)||
     mandate.status!=='PROPOSED_TO_CEO_PENDING_EVIDENCE_AUDIT_AND_APPROVAL')
    failed.push('VALIDATED_SCOUT_PROPOSAL_REQUIRED');
  if(!approvalRecord ||
     approvalRecord.ceoApproved!==true ||
     approvalRecord.independentEvidenceAudited!==true ||
     approvalRecord.approvedRoleId!==mandate?.roleId ||
     approvalRecord.approvedCandidateId!==mandate?.candidateId ||
     approvalRecord.mandateVersion!==mandate?.version ||
     typeof approvalRecord.authorizationReference!=='string' ||
     !approvalRecord.authorizationReference.trim())
    failed.push('MATCHING_CEO_APPROVAL_AND_INDEPENDENT_EVIDENCE_REQUIRED');
  if(!task||task.roleId!==mandate?.roleId||task.candidateId!==mandate?.candidateId||
     task.contextFrozenVersionValidated!==true ||
     !Array.isArray(task.requiredCompetences) ||
     task.requiredCompetences.length<1)
    failed.push('SCOPED_TASK_AND_FROZEN_CONTEXT_REQUIRED');
  const selected=failed.length?[]:mandate.specialistSkillPack.filter(
    item=>task.requiredCompetences.includes(item.skillId)
  );
  if(!failed.length && selected.length!==task.requiredCompetences.length)
    failed.push('UNAPPROVED_OR_MISSING_SKILL_IN_TASK');
  if(!failed.length && selected.some(x=>x.evidenceStatus!=='DECLARED_REQUIRES_INDEPENDENT_REVIEW'))
    failed.push('SKILL_EVIDENCE_NOT_DECLARED');
  return {
    status:failed.length?'BLOCKED':'DRY_RUN_DIRECTOR_ASSIGNMENT_READY',
    blockingReasons:failed,
    selectedSkillIds:failed.length?[]:selected.map(x=>x.skillId),
    skippedIrrelevantSkills:mandate?.specialistSkillPack?.length-(failed.length?0:selected.length)??null,
    noAgentActivation:true,
    noSkillInstallation:true,
    noExternalProviderCalls:true,
    humanApprovalRecordRequiresIndependentVerification:true,
    note:'This only checks input fields. CEO approval authenticity and QA source must still be verified outside this function.'
  };
}
module.exports={CONTRACT,ROLE_IDS,draftProfessionalMandate,inspectDirectorHandoff};
