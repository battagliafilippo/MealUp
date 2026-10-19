'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {preflight}=require('./deterministic-visual-preflight.cjs');
const root=path.resolve(__dirname,'../..');
test('a07 uses the existing frozen Food Portrait raster gauge contract',()=>{
 const r=preflight({root,vesselId:'VESSEL_PLATE',recipeId:'a07',kcal:270,
  expectedRecipeAssetSha256:'0277d9faf985ff415afb80f6de74a272743c6a9f939995ea7419839cb6cab299'});
 assert.equal(r.status,'READY');assert.equal(r.generationAllowed,true);
 assert.deepEqual(r.blockers,[]);
 assert.equal(r.evidence.body.sha256,r.evidence.expectedBodySha256);
 assert.deepEqual(r.evidence.gaugeContract,{
  schema:'mealup-food-portrait-style-frozen-v1',status:'FROZEN',rendering:'FOOD_PORTRAIT_RASTER'});
 assert.ok(Math.abs(r.evidence.foodPortraitGauge.angleDegrees-(-27.6))<1e-9);
 assert.equal(r.evidence.recipeAsset.sha256,'0277d9faf985ff415afb80f6de74a272743c6a9f939995ea7419839cb6cab299');
});
test('wrong recipe asset expectation adds an independent blocker',()=>{
 const r=preflight({root,vesselId:'VESSEL_PLATE',recipeId:'a07',kcal:270,expectedRecipeAssetSha256:'bad'});
 assert.ok(r.blockers.includes('FROZEN_RECIPE_ASSET_SHA_MISMATCH'));
});
