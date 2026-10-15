'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const lib=require('./scout-skill-mandate.cjs');
const roles=lib.ROLE_IDS;
const fakeEvidence=(roleId)=>{
 const {plan}=require('./scout-skill-router.cjs');
 return plan({roleId}).candidateSkillRequirements.map(x=>({
  skillId:x.skillId,candidateId:'candidate-X',mode:'BUILT_IN_TESTED',
  testEvidenceRef:'https://github.com/battagliafilippo/MealUp/actions/runs/12345',
  independentQa:'PASS',roleTaskBenchmarked:true,conformanceToFrozenVerified:true
 }));
};
const validDraft=(roleId)=>lib.draftProfessionalMandate({
 roleId,candidateId:'candidate-X',skillProofs:fakeEvidence(roleId),
 economicsVerified:true,licenseAndSecurityApproved:true
});
const approval=(draft)=>({
 ceoApproved:true,independentEvidenceAudited:true,
 approvedRoleId:draft.roleId,approvedCandidateId:draft.candidateId,
 mandateVersion:draft.version,authorizationReference:'CEO_APPROVAL_EXTERNAL_RECORD_001'
});
const task=(draft,skills)=>({
 roleId:draft.roleId,candidateId:draft.candidateId,
 contextFrozenVersionValidated:true,requiredCompetences:skills
});
test('all eight candidate roles receive a separate professional skill mandate',()=>{
 for(const roleId of roles){
  const d=validDraft(roleId);
  assert.equal(d.specialistSkillPack.length,3);
  assert.equal(d.issuedBy,'TALENT_SCOUT_LEAD');
  assert.equal(d.intendedFor,'DIRECTOR_AFTER_CEO_APPROVAL');
  assert.equal(d.approval.ceoApproved,false);
  assert.equal(d.approval.directorActivated,false);
 }
});
test('Scout skill selection is separate from specialist skill assignment',()=>{
 const d=validDraft('FOOD');
 assert.deepEqual(d.specialistSkillPack.map(x=>x.skillId),[
  'mealup-recipe-fact-check','mealup-nutrition-units',
  'mealup-food-catalog-integrity'
 ]);
 assert.equal(d.dynamicRules.selectOnlySkillsMatchingTask,true);
 assert.equal(d.dynamicRules.defaultActivateAll,false);
});
test('no candidate can be proposed without approved skill evidence, recurring cost and security',()=>{
 for(const roleId of roles){
  const d=lib.draftProfessionalMandate({roleId,candidateId:'candidate-X',
   skillProofs:[],economicsVerified:true,licenseAndSecurityApproved:true});
  assert.equal(d.status,'RECRUITMENT_BLOCKED');
 }
});
test('a proposed professional skill mandate is NEVER already assigned',()=>{
 for(const roleId of roles){
  const d=validDraft(roleId);
  assert.equal(d.status,'PROPOSED_TO_CEO_PENDING_EVIDENCE_AUDIT_AND_APPROVAL');
  assert.equal(d.approval.scoutCanAssignAgent,false);
  assert.equal(d.approval.ceoMandateApprovalRequired,true);
  assert.equal(d.approval.directorAssignsAfterApproval,true);
 }
});
test('Director cannot claim authorization based solely on Scout proposal',()=>{
 const d=validDraft('DESIGN');
 const r=lib.inspectDirectorHandoff({
  mandate:d,task:task(d,[d.specialistSkillPack[0].skillId])
 });
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.blockingReasons.includes('MATCHING_CEO_APPROVAL_AND_INDEPENDENT_EVIDENCE_REQUIRED'));
});
test('even a CEO approval record with mismatched candidate/role/version must not work',()=>{
 const d=validDraft('ENGINEERING');
 for(const bad of [
  {approvedCandidateId:'other'}, {approvedRoleId:'FOOD'},
  {mandateVersion:'999'}, {independentEvidenceAudited:false},
  {authorizationReference:''}
 ]){
  const r=lib.inspectDirectorHandoff({mandate:d,
   approvalRecord:{...approval(d),...bad},
   task:task(d,[d.specialistSkillPack[0].skillId])});
  assert.equal(r.status,'BLOCKED');
 }
});
test('approved request selects only the professional skill relevant to task',()=>{
 const d=validDraft('DESIGN');
 const skill=d.specialistSkillPack[1].skillId;
 const r=lib.inspectDirectorHandoff({
  mandate:d,approvalRecord:approval(d),task:task(d,[skill])
 });
 assert.equal(r.status,'DRY_RUN_DIRECTOR_ASSIGNMENT_READY');
 assert.deepEqual(r.selectedSkillIds,[skill]);
 assert.equal(r.skippedIrrelevantSkills,2);
 assert.equal(r.noAgentActivation,true);
});
test('only known professional skills may be included in a task',()=>{
 const d=validDraft('QA');
 const r=lib.inspectDirectorHandoff({mandate:d,approvalRecord:approval(d),
  task:task(d,['unknown-skill'])});
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.blockingReasons.includes('UNAPPROVED_OR_MISSING_SKILL_IN_TASK'));
});
test('FROZEN context must be validated at handoff',()=>{
 const d=validDraft('VISUAL_PRODUCTION');
 const x=task(d,[d.specialistSkillPack[0].skillId]);
 x.contextFrozenVersionValidated=false;
 assert.equal(lib.inspectDirectorHandoff({
  mandate:d,approvalRecord:approval(d),task:x
 }).status,'BLOCKED');
});
test('even after preflight no skill installation, provider call or agent activation is performed',()=>{
 const d=validDraft('SCOUT');
 const r=lib.inspectDirectorHandoff({
  mandate:d,approvalRecord:approval(d),
  task:task(d,[d.specialistSkillPack[0].skillId])
 });
 assert.equal(r.noAgentActivation,true);
 assert.equal(r.noSkillInstallation,true);
 assert.equal(r.noExternalProviderCalls,true);
 assert.equal(r.humanApprovalRecordRequiresIndependentVerification,true);
});
