'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {compileFoodPortraitSkillPlan,PROFILE}=require('./food-portrait-skill-plan.cjs');
const good=()=>({taskType:PROFILE.taskType,producerId:'imagegen',technicalReviewerId:'qa-tech',
 visualReviewerId:'qa-food',inputHashesVerified:true,quotaVerified:true});
test('food portrait task selects the minimal complete ordered skill pack',()=>{
 const p=compileFoodPortraitSkillPlan(good());
 assert.equal(p.status,'READY_OFFLINE');
 assert.equal(p.selectedSkillCount,9);
 assert.equal(new Set(p.assignments.flatMap(x=>x.covers)).size,10);
 assert.ok(p.assignments.findIndex(x=>x.skillId==='MEALUP_FOOD_ONLY_IMAGEGEN')<
   p.assignments.findIndex(x=>x.skillId==='MEALUP_VESSEL_TEMPLATE_COMPOSITOR'));
 assert.ok(p.assignments.findIndex(x=>x.skillId==='MEALUP_FOOD_LAYER_TECHNICAL_QA')<
   p.assignments.findIndex(x=>x.skillId==='MEALUP_VERIFIED_CORRECTION_LIBRARY'));
});
test('producer and both QA lanes must be different actors',()=>{
 const x=good();x.visualReviewerId=x.producerId;
 assert.equal(compileFoodPortraitSkillPlan(x).reason,'PRODUCER_REVIEWER_NOT_INDEPENDENT');
});
test('missing hashes or quota evidence blocks before assignment',()=>{
 const a=good();a.inputHashesVerified=false;
 assert.equal(compileFoodPortraitSkillPlan(a).reason,'INPUT_OR_OUTPUT_HASH_MISSING');
 const b=good();b.quotaVerified=false;
 assert.equal(compileFoodPortraitSkillPlan(b).reason,'BUDGET_OR_QUOTA_UNVERIFIED');
});
