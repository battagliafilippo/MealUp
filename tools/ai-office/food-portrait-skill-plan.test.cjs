'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {compileFoodPortraitSkillPlan,PROFILE}=require('./food-portrait-skill-plan.cjs');
const hash='a'.repeat(64);
const good=()=>({taskType:PROFILE.taskType,producerId:'imagegen',technicalReviewerId:'qa-tech',
 visualReviewerId:'qa-visual',inputHashesVerified:true,quotaVerified:true,recipeId:'r3',
 vesselId:'VESSEL_BOWL',candidateLimit:1,automaticRetry:false,budgetEUR:0,
 gaugeContractVerified:true,vesselTemplate:{vesselId:'VESSEL_BOWL',verified:true,immutable:true,
 sourceBoardSha256:hash,bodySha256:hash,foodClipSha256:hash,frontOccluderSha256:hash}});

test('selects exactly the seven non-overlapping skills in causal order',()=>{
 const p=compileFoodPortraitSkillPlan(good());
 assert.equal(p.status,'READY_OFFLINE');
 assert.equal(p.selectedSkillCount,7);
 assert.deepEqual(p.assignments.map(x=>x.skillId),[
  'MEALUP_SOURCE_FACTS_DISPLAY_ROLES',
  'MEALUP_REFERENCE_PROMPT_COMPILER',
  'MEALUP_FOOD_ONLY_IMAGEGEN',
  'MEALUP_EARLY_STYLE_QA',
  'MEALUP_DETERMINISTIC_VESSEL_GAUGE_COMPOSITOR',
  'MEALUP_FINAL_INDEPENDENT_QA',
  'MEALUP_CHECKPOINT_AUDIT'
 ]);
 assert.deepEqual(new Set(p.assignments.flatMap(x=>x.covers)),new Set(PROFILE.requiredCapabilities));
 assert.equal(p.assignments.some(x=>x.skillId.includes('CORRECTION_LIBRARY')),false);
 assert.equal(p.assignments.some(x=>x.skillId.includes('PRELOT')),false);
});

test('assigns all and only the role-specific skills',()=>{
 const p=compileFoodPortraitSkillPlan(good());
 assert.deepEqual(p.roleSkills,{
  FOOD:['MEALUP_SOURCE_FACTS_DISPLAY_ROLES'],
  PROMPT_ARCHITECT:['MEALUP_REFERENCE_PROMPT_COMPILER'],
  VISUAL_PRODUCTION:['MEALUP_FOOD_ONLY_IMAGEGEN'],
  QA:['MEALUP_EARLY_STYLE_QA','MEALUP_FINAL_INDEPENDENT_QA'],
  ENGINEERING:['MEALUP_DETERMINISTIC_VESSEL_GAUGE_COMPOSITOR'],
  DIRECTOR:['MEALUP_CHECKPOINT_AUDIT']
 });
});

test('early independent style QA gates both deterministic compositors',()=>{
 const p=compileFoodPortraitSkillPlan(good());
 const early=p.assignments.find(x=>x.skillId==='MEALUP_EARLY_STYLE_QA');
 const compose=p.assignments.find(x=>x.skillId==='MEALUP_DETERMINISTIC_VESSEL_GAUGE_COMPOSITOR');
 assert.ok(early.order<compose.order);
 assert.deepEqual(compose.requires,['MEALUP_EARLY_STYLE_QA']);
 assert.deepEqual(compose.requiresGate,['EARLY_STYLE_QA_PASS']);
 assert.deepEqual(compose.covers,['DETERMINISTIC_VESSEL_COMPOSITION','FROZEN_GAUGE_RENDERING']);
});

test('food-only generation is transparent and separate from vessel and gauge tools',()=>{
 const p=compileFoodPortraitSkillPlan(good());
 const visual=p.assignments.find(x=>x.roleId==='VISUAL_PRODUCTION');
 const compose=p.assignments.find(x=>x.roleId==='ENGINEERING');
 assert.deepEqual(visual.toolBindings,['imagegen:transparent_background=true']);
 assert.ok(compose.toolBindings.includes('deterministic-gauge-compositor.cjs'));
 assert.equal(visual.toolBindings.some(x=>/gauge|vessel/.test(x)),false);
});

test('independent QA lanes are separate from the producer and each other',()=>{
 const p=compileFoodPortraitSkillPlan(good());
 const qa=p.assignments.filter(x=>x.roleId==='QA');
 assert.equal(qa.length,2);
 assert.ok(qa.every(x=>x.actorId!=='imagegen'));
 assert.deepEqual(qa.map(x=>x.actorId),['qa-visual','qa-tech']);
});

test('identity, hashes and zero-budget quota evidence fail closed',()=>{
 const same=good();same.visualReviewerId=same.producerId;
 assert.equal(compileFoodPortraitSkillPlan(same).reason,'PRODUCER_REVIEWER_NOT_INDEPENDENT');
 const hashes=good();hashes.inputHashesVerified=false;
 assert.equal(compileFoodPortraitSkillPlan(hashes).reason,'INPUT_OR_OUTPUT_HASH_MISSING');
 const quota=good();quota.quotaVerified=false;
 assert.equal(compileFoodPortraitSkillPlan(quota).reason,'BUDGET_OR_QUOTA_UNVERIFIED');
});

test('vessel, gauge, candidate count, budget and do01 fail closed',()=>{
 const noVessel=good();delete noVessel.vesselTemplate;
 assert.equal(compileFoodPortraitSkillPlan(noVessel).reason,'VERIFIED_VESSEL_TEMPLATE_REQUIRED');
 const badGauge=good();badGauge.gaugeContractVerified=false;
 assert.equal(compileFoodPortraitSkillPlan(badGauge).reason,'FROZEN_GAUGE_UNVERIFIED');
 const retry=good();retry.automaticRetry=true;
 assert.equal(compileFoodPortraitSkillPlan(retry).reason,'ONE_CANDIDATE_NO_RETRY_REQUIRED');
 const paid=good();paid.budgetEUR=1;
 assert.equal(compileFoodPortraitSkillPlan(paid).reason,'BUDGET_OR_QUOTA_UNVERIFIED');
 const forbidden=good();forbidden.recipeId='do01';
 assert.equal(compileFoodPortraitSkillPlan(forbidden).reason,'DO01_FORBIDDEN');
});

test('protected targets and non-automatic authority remain explicit',()=>{
 const p=compileFoodPortraitSkillPlan(good());
 assert.deepEqual(p.protectedTargets,['do01','main','official tester','PWA','FROZEN assets']);
 assert.equal(p.automaticExecution,false);
 assert.equal(p.automaticRetry,false);
 assert.equal(p.automaticFreeze,false);
 assert.equal(p.candidateLimit,1);
 assert.equal(p.earlyQaBeforeComposition,true);
 assert.equal(p.finalQaAfterComposition,true);
});
