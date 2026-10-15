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
