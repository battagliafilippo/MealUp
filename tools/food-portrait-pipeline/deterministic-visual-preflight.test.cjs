'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {preflight}=require('./deterministic-visual-preflight.cjs');
const root=path.resolve(__dirname,'../..');
test('dynamic gauge candidate leaves only owner approval closed',()=>{
 const r=preflight({root,vesselId:'VESSEL_PLATE',recipeId:'a07',kcal:270,
  expectedRecipeAssetSha256:'0277d9faf985ff415afb80f6de74a272743c6a9f939995ea7419839cb6cab299'});
 assert.equal(r.status,'BLOCKED');assert.equal(r.generationAllowed,false);
 assert.deepEqual(r.blockers,['GAUGE_DYNAMIC_LAYER_OWNER_APPROVAL_PENDING']);
 assert.equal(r.evidence.body.sha256,r.evidence.expectedBodySha256);
 assert.equal(r.evidence.gaugeCanonicalMaster.actual,r.evidence.gaugeCanonicalMaster.expected);
 assert.equal(r.evidence.gaugeShell.actual,r.evidence.gaugeShell.expected);
 assert.equal(r.evidence.gaugeNeedle.actual,r.evidence.gaugeNeedle.expected);
 assert.deepEqual(r.evidence.gaugeContract,{
  schema:'mealup-food-portrait-deterministic-gauge-v1',status:'DYNAMIC_COMPONENT_CANDIDATE_V3_QA_PASS'});
 assert.ok(Math.abs(r.evidence.foodPortraitGauge.angleDegrees-(-27.6))<1e-9);
 assert.equal(r.evidence.recipeAsset.sha256,'0277d9faf985ff415afb80f6de74a272743c6a9f939995ea7419839cb6cab299');
});
test('wrong recipe asset expectation adds an independent blocker',()=>{
 const r=preflight({root,vesselId:'VESSEL_PLATE',recipeId:'a07',kcal:270,expectedRecipeAssetSha256:'bad'});
 assert.ok(r.blockers.includes('FROZEN_RECIPE_ASSET_SHA_MISMATCH'));
});
