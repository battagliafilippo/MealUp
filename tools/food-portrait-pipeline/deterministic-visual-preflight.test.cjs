'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {preflight}=require('./deterministic-visual-preflight.cjs');
const root=path.resolve(__dirname,'../..');
test('a07 uses the approved deterministic post-compositor gauge contract',()=>{
 const r=preflight({root,vesselId:'VESSEL_PLATE',recipeId:'a07',kcal:270,
  expectedRecipeAssetSha256:'0277d9faf985ff415afb80f6de74a272743c6a9f939995ea7419839cb6cab299'});
 assert.equal(r.status,'READY');assert.equal(r.generationAllowed,true);
 assert.deepEqual(r.blockers,[]);
 assert.equal(r.evidence.body.sha256,r.evidence.expectedBodySha256);
 assert.deepEqual(r.evidence.gaugeContract,{
  schema:'mealup-food-portrait-style-frozen-v1',status:'FROZEN',rendering:'DETERMINISTIC_POST_COMPOSITOR'});
 assert.equal(r.evidence.gaugeLayer.imageGenerationScope,'FOOD_ONLY_NO_GAUGE_NO_TEXT');
 assert.ok(Math.abs(r.evidence.foodPortraitGauge.angleDegrees-(-27.6))<1e-9);
 assert.equal(r.evidence.recipeAsset.sha256,'0277d9faf985ff415afb80f6de74a272743c6a9f939995ea7419839cb6cab299');
});
test('wrong recipe asset expectation adds an independent blocker',()=>{
 const r=preflight({root,vesselId:'VESSEL_PLATE',recipeId:'a07',kcal:270,expectedRecipeAssetSha256:'bad'});
 assert.ok(r.blockers.includes('FROZEN_RECIPE_ASSET_SHA_MISMATCH'));
});

test('r3 resolves its bowl manifest and treats the provenance-only body as a warning',()=>{
 const r=preflight({root,vesselId:'VESSEL_BOWL',recipeId:'r3',kcal:320,
  expectedRecipeAssetSha256:'64b23af744baa469be91dfec6ffda39dc6b2f054dddc61a8f1bae6f81ea91cd2'});
 assert.equal(r.status,'READY');
 assert.equal(r.generationAllowed,true);
 assert.deepEqual(r.blockers,[]);
 assert.deepEqual(r.warnings,['VESSEL_BODY_PROVENANCE_PREVIEW_MISSING']);
 assert.equal(r.evidence.body.runtimeRequired,false);
 assert.equal(r.evidence.recipeManifestPath,'docs/food-portrait-pipeline/r3-bowl-frozen-v1.json');
 assert.equal(r.evidence.recipeAsset.sha256,'64b23af744baa469be91dfec6ffda39dc6b2f054dddc61a8f1bae6f81ea91cd2');
 assert.ok(Math.abs(r.evidence.foodPortraitGauge.angleDegrees-(-21.6))<1e-9);
});
