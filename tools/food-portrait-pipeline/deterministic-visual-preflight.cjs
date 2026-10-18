'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {gaugeState}=require('./gauge-mapping.cjs');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

function preflight({root,vesselId,recipeId,kcal,expectedRecipeAssetSha256}){
 const blockers=[],evidence={};
 const geometryPath=path.join(root,'G5','vessel-geometry.json');
 const contractPath=path.join(root,'G7_Completed','gauge-contract.json');
 const recipePath=path.join(root,'docs','food-portrait-pipeline',`${recipeId}-plate-frozen-v1.json`);
 if(!fs.existsSync(geometryPath))blockers.push('VESSEL_GEOMETRY_MISSING');
 else {
  const geometry=read(geometryPath).vessels?.find?.(x=>x.vessel_id===vesselId);
  if(!geometry)blockers.push('VESSEL_GEOMETRY_UNREGISTERED');
  else evidence.geometryStatus=geometry.status;
 }
 const vesselDir=path.join(root,'G5','vessels',vesselId);
 for(const [name,file] of [['body','source-view.png'],['foodClip','food-clip.png'],['frontOccluder','front-occluder.png']]){
  const p=path.join(vesselDir,file);
  if(!fs.existsSync(p))blockers.push(`VESSEL_${name.toUpperCase()}_MISSING`);
  else evidence[name]={path:path.relative(root,p).replaceAll('\\','/'),sha256:sha(p)};
 }
 if(!fs.existsSync(contractPath))blockers.push('GAUGE_CONTRACT_MISSING');
 else {
  const contract=read(contractPath),shell=path.join(root,'G7_Completed',contract.assets.shell.path);
  if(!fs.existsSync(shell))blockers.push('GAUGE_SHELL_MISSING');
  else {
   const actual=sha(shell);evidence.gaugeShell={expected:contract.assets.shell.sha256,actual};
   if(actual!==contract.assets.shell.sha256)blockers.push('GAUGE_SHELL_SHA_MISMATCH');
  }
  if(contract.calibration?.range?.[1]!==1000||contract.calibration?.angles?.[0]!==-60||contract.calibration?.angles?.[1]!==60)
   blockers.push('GAUGE_LEGACY_CALIBRATION_NOT_FOOD_PORTRAIT_FROZEN');
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
