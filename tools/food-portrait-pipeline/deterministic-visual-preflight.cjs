'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {gaugeState}=require('./gauge-mapping.cjs');
const {gaugeLayer}=require('./deterministic-gauge-compositor.cjs');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

function preflight({root,vesselId,recipeId,kcal,expectedRecipeAssetSha256}){
 const blockers=[],evidence={};
 const geometryPath=path.join(root,'G5','vessel-geometry.json');
 const stylePath=path.join(root,'docs','food-portrait-pipeline','food-portrait-style-frozen-v1.json');
 const recipePath=path.join(root,'docs','food-portrait-pipeline',`${recipeId}-plate-frozen-v1.json`);
 if(!fs.existsSync(geometryPath))blockers.push('VESSEL_GEOMETRY_MISSING');
 else {
  const geometry=read(geometryPath).vessels?.find?.(x=>x.vessel_id===vesselId);
  if(!geometry)blockers.push('VESSEL_GEOMETRY_UNREGISTERED');
  else {evidence.geometryStatus=geometry.status;evidence.expectedBodySha256=geometry.body_sha256;}
 }
 const vesselDir=path.join(root,'G5','vessels',vesselId);
 for(const [name,file] of [['body','source-view.png'],['foodClip','food-clip.png'],['frontOccluder','front-occluder.png']]){
  const p=path.join(vesselDir,file);
  if(!fs.existsSync(p))blockers.push(`VESSEL_${name.toUpperCase()}_MISSING`);
  else {
   evidence[name]={path:path.relative(root,p).replaceAll('\\','/'),sha256:sha(p)};
   if(name==='body'&&evidence.expectedBodySha256&&evidence[name].sha256!==evidence.expectedBodySha256)
    blockers.push('VESSEL_BODY_SHA_MISMATCH');
  }
 }
 if(!fs.existsSync(stylePath))blockers.push('FOOD_PORTRAIT_STYLE_CONTRACT_MISSING');
 else {
  const style=read(stylePath);const gauge=style.gaugeBehavior;
  evidence.gaugeContract={schema:style.schema,status:style.status,rendering:'DETERMINISTIC_POST_COMPOSITOR'};
  if(style.schema!=='mealup-food-portrait-style-frozen-v1'||style.status!=='FROZEN'||
    gauge?.minimumKcal!==0||gauge?.maximumKcal!==1000||
    gauge?.minimumAngleDegrees!==-60||gauge?.maximumAngleDegrees!==60||
    style.separationRule?.gaugeVisibleInCandidateRaster!==false||
    style.separationRule?.gaugeAddedByDeterministicCompositor!==true)
   blockers.push('GAUGE_NONCANONICAL_FOOD_PORTRAIT_CALIBRATION');
  else {
   try{evidence.gaugeLayer=gaugeLayer({root,kcal,animate:true})}
   catch(e){blockers.push(e.message)}
  }
 }
 const state=gaugeState(kcal);evidence.foodPortraitGauge=state;
 if(!fs.existsSync(recipePath))blockers.push('FROZEN_RECIPE_MANIFEST_MISSING');
 else {
  const manifest=read(recipePath);evidence.recipeAsset=manifest.asset;
  if(manifest.recipeId!==recipeId||manifest.kcal!==kcal||manifest.vesselId!==vesselId)
   blockers.push('FROZEN_RECIPE_FACT_MISMATCH');
  if(expectedRecipeAssetSha256&&manifest.asset?.sha256!==expectedRecipeAssetSha256)
   blockers.push('FROZEN_RECIPE_ASSET_SHA_MISMATCH');
 }
 return {schema:'mealup-deterministic-visual-preflight-v1',recipeId,vesselId,
  status:blockers.length?'BLOCKED':'READY',blockers:[...new Set(blockers)].sort(),evidence,
  generationAllowed:blockers.length===0,automaticFreeze:false,budgetEUR:0};
}
if(require.main===module){
 const root=path.resolve(process.argv[2]||'.');
 const report=preflight({root,vesselId:'VESSEL_PLATE',recipeId:'a07',kcal:270,
  expectedRecipeAssetSha256:'0277d9faf985ff415afb80f6de74a272743c6a9f939995ea7419839cb6cab299'});
 console.log(JSON.stringify(report,null,2));if(report.status!=='READY')process.exitCode=2;
}
module.exports={preflight};
