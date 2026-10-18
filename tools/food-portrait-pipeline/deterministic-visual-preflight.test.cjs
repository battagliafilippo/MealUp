'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {preflight}=require('./deterministic-visual-preflight.cjs');
const root=path.resolve(__dirname,'../..');
test('a07 deterministic engine fails closed on the two proven canonical asset blockers',()=>{
 const r=preflight({root,vesselId:'VESSEL_PLATE',recipeId:'a07',kcal:270,
  expectedRecipeAssetSha256:'0277d9faf985ff415afb80f6de74a272743c6a9f939995ea7419839cb6cab299'});
 assert.equal(r.status,'BLOCKED');assert.equal(r.generationAllowed,false);
 assert.ok(r.blockers.includes('VESSEL_BODY_MISSING'));
 assert.ok(r.blockers.includes('GAUGE_SHELL_SHA_MISMATCH'));
 assert.ok(r.blockers.includes('GAUGE_LEGACY_CALIBRATION_NOT_FOOD_PORTRAIT_FROZEN'));
 assert.ok(Math.abs(r.evidence.foodPortraitGauge.angleDegrees-(-27.6))<1e-9);
 assert.equal(r.evidence.recipeAsset.sha256,'0277d9faf985ff415afb80f6de74a272743c6a9f939995ea7419839cb6cab299');
});
test('wrong recipe asset expectation adds an independent blocker',()=>{
 const r=preflight({root,vesselId:'VESSEL_PLATE',recipeId:'a07',kcal:270,expectedRecipeAssetSha256:'bad'});
 assert.ok(r.blockers.includes('FROZEN_RECIPE_ASSET_SHA_MISMATCH'));
});
