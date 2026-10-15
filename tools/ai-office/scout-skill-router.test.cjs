'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const lib=require('./scout-skill-router.cjs');
test('five valid portable repo skills and eight role profiles',()=>{
  const x=lib.validateSkillLibrary();
  assert.deepEqual({skills:x.skillCount,roles:x.roleCount,cases:x.testCaseCount},
    {skills:5,roles:8,cases:32});
  assert.equal(x.autoInstallations,0);
});
test('scout starts with only Scout skill for simple discovery',()=>{
  const x=lib.plan({roleId:'DESIGN'});
  assert.deepEqual(x.skills.map(s=>s.name),['mealup-talent-scout']);
  assert.equal(x.ceoDecisionRequired,true);
});
test('recurring quota skill only loaded after eligibility is needed',()=>{
  const x=lib.plan({roleId:'FOOD',stage:lib.states.ELIGIBILITY});
  assert.ok(x.skills.some(s=>s.name==='mealup-recurring-cost-auditor'));
  assert.ok(!x.skills.some(s=>s.name==='mealup-agent-benchmark'));
});
test('model A/B invokes benchmark expertise but does not rank without evidence',()=>{
  const x=lib.plan({roleId:'DESIGN',stage:lib.states.BENCHMARK});
  assert.ok(x.skills.some(s=>s.name==='mealup-agent-benchmark'));
  assert.equal(x.noAutomaticAgentSwitch,true);
});
test('third-party GitHub code requires security audit skill',()=>{
  const x=lib.plan({roleId:'ENGINEERING',externalGitHubCode:true});
  assert.ok(x.skills.some(s=>s.name==='mealup-agent-security'));
});
test('brief to CEO includes recommendation synthesis and capacity audit',()=>{
  const x=lib.plan({roleId:'DIRECTOR',stage:lib.states.CEO_BRIEF});
  assert.ok(x.skills.some(s=>s.name==='mealup-ceo-selection-brief'));
  assert.ok(x.skills.some(s=>s.name==='mealup-recurring-cost-auditor'));
  assert.equal(x.reportTo,'CEO');
});
test('unknown role or stage fail closed',()=>{
  assert.throws(()=>lib.plan({roleId:'UNKNOWN'}),/UNKNOWN_ROLE/);
  assert.throws(()=>lib.plan({roleId:'DESIGN',stage:'DEPLOY'}),/UNKNOWN_STAGE/);
});
test('untrusted skill names cannot be dynamically loaded',()=>{
  assert.throws(()=>lib.readSkillMetadata('../../../../../evil'),/UNKNOWN_OR_UNTRUSTED_SKILL/);
});
test('Design remains without winner until independently benchmarked',()=>{
  const x=lib.screenExistingRole('DESIGN');
  assert.equal(x.noWinnerYet,true);
  assert.ok(x.candidates.some(c=>c.evidenceState==='CONNECTED_UNDER_QA'));
  assert.ok(x.candidates.some(c=>c.evidenceState==='ACCOUNT_NOT_CONNECTED'));
  assert.equal(x.candidates.every(c=>c.promoted===false),true);
});
test('existing independent QA blocks comparison without real test evidence',()=>{
  const r=lib.checkIndependentEvidence({
    left:{id:'a'},right:{id:'b'},cases:[]});
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.winner,null);
});
test('each non-Design role has separate evidence cases and no automatic model promotion',()=>{
  for(const roleId of ['ENGINEERING','FOOD','VISUAL_PRODUCTION','PROMPT_ARCHITECT','QA','DIRECTOR','SCOUT']){
    const x=lib.plan({roleId});
    assert.equal(x.budgetAdditionalEUR,0);
    assert.ok(x.testsToPrepare.length>=4);
    assert.ok(x.testsToPrepare.some(c=>c.includes('NEGATIVE')));
    assert.equal(x.proactiveLiveProviderCalls,false);
  }
});

const evidenceFor=(roleId,candidateId='candidate-a',mode='BUILT_IN_TESTED')=>{
  const r=lib.plan({roleId});
  return r.candidateSkillRequirements.map(skill=>({
    skillId:skill.skillId,candidateId,mode,
    testEvidenceRef:'https://github.com/battagliafilippo/MealUp/actions/runs/12345',
    independentQa:'PASS',roleTaskBenchmarked:true,
    conformanceToFrozenVerified:true,
    externalSkillProvenanceReviewed:true,externalSkillLicenseReviewed:true,
    externalSkillSecurityApproved:true
  }));
};
test('every role has candidate-specific professional skill criteria',()=>{
  for(const id of ['DESIGN','ENGINEERING','FOOD','VISUAL_PRODUCTION','PROMPT_ARCHITECT','QA','DIRECTOR','SCOUT']){
    const p=lib.plan({roleId:id});
    assert.ok(p.candidateSkillRequirements.length>=3);
    assert.equal(p.candidateSkillRequirements.every(x=>x.verification.includes('INDEPENDENT_QA')),true);
  }
});
test('every agent candidate remains blocked without its required skills evidence',()=>{
  for(const id of ['DESIGN','ENGINEERING','FOOD','VISUAL_PRODUCTION','PROMPT_ARCHITECT','QA','DIRECTOR','SCOUT']){
    const r=lib.evaluateCandidateSkillFit({roleId:id,candidateId:'candidate-a',
      economicsVerified:true,licenseAndSecurityApproved:true});
    assert.equal(r.status,'RECRUITMENT_BLOCKED');
    assert.ok(r.missing.length>=3);
    assert.equal(r.candidateRecruited,false);
  }
});
test('quality, cost or security gaps block a candidate for every department',()=>{
  for(const id of ['DESIGN','ENGINEERING','FOOD','VISUAL_PRODUCTION','PROMPT_ARCHITECT','QA','DIRECTOR','SCOUT']){
    const q=evidenceFor(id);
    const incomplete=q.slice(0,-1);
    assert.equal(lib.evaluateCandidateSkillFit({roleId:id,candidateId:'candidate-a',
      skillProofs:incomplete,economicsVerified:true,licenseAndSecurityApproved:true}).status,'RECRUITMENT_BLOCKED');
    assert.equal(lib.evaluateCandidateSkillFit({roleId:id,candidateId:'candidate-a',
      skillProofs:q,economicsVerified:false,licenseAndSecurityApproved:true}).status,'RECRUITMENT_BLOCKED');
    assert.equal(lib.evaluateCandidateSkillFit({roleId:id,candidateId:'candidate-a',
      skillProofs:q,economicsVerified:true,licenseAndSecurityApproved:false}).status,'RECRUITMENT_BLOCKED');
  }
});
test('mismatched model evidence and incomplete QA never count',()=>{
  const q=evidenceFor('DESIGN');
  q[0].candidateId='DIFFERENT';
  q[1].independentQa='FAIL';
  const r=lib.evaluateCandidateSkillFit({roleId:'DESIGN',candidateId:'candidate-a',
    skillProofs:q,economicsVerified:true,licenseAndSecurityApproved:true});
  assert.equal(r.status,'RECRUITMENT_BLOCKED');
  assert.ok(r.unverified.length>=2);
});
test('third-party skills need supply-chain review even when model is competent',()=>{
  const q=evidenceFor('ENGINEERING','candidate-a','EXTERNAL_SKILL_AUDITED');
  q[0].externalSkillSecurityApproved=false;
  const r=lib.evaluateCandidateSkillFit({roleId:'ENGINEERING',candidateId:'candidate-a',
    skillProofs:q,economicsVerified:true,licenseAndSecurityApproved:true});
  assert.equal(r.status,'RECRUITMENT_BLOCKED');
  assert.ok(r.unverified.includes(q[0].skillId));
});
test('declared perfect evidence never automatically recruits even a qualified agent',()=>{
  for(const id of ['DESIGN','ENGINEERING','FOOD','VISUAL_PRODUCTION','PROMPT_ARCHITECT','QA','DIRECTOR','SCOUT']){
    const r=lib.evaluateCandidateSkillFit({roleId:id,candidateId:'candidate-a',
      skillProofs:evidenceFor(id),economicsVerified:true,licenseAndSecurityApproved:true});
    assert.equal(r.status,'SKILL_EVIDENCE_DECLARED_REQUIRES_INDEPENDENT_VERIFICATION');
    assert.equal(r.skillEvidenceGateReady,true);
    assert.equal(r.candidateRecruited,false);
    assert.equal(r.ceoApproved,false);
    assert.equal(r.evidenceMustBeIndependentlyAudited,true);
  }
});
test('a named external Skill is not a guarantee of agent competency',()=>{
  const q=evidenceFor('FOOD');
  q[0].testEvidenceRef='a SKILL.md without performance evidence';
  const r=lib.evaluateCandidateSkillFit({roleId:'FOOD',candidateId:'candidate-a',
    skillProofs:q,economicsVerified:true,licenseAndSecurityApproved:true});
  assert.equal(r.status,'RECRUITMENT_BLOCKED');
});
