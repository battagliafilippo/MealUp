'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {gaugeState}=require('./gauge-mapping.cjs');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

function gaugeLayer({root,kcal,animate=true}){
 if(!Number.isFinite(kcal)||kcal<0)throw Error('KCAL_MUST_BE_NON_NEGATIVE_NUMBER');
 const contractPath=path.join(root,'tools','food-portrait-pipeline','deterministic-gauge-contract.json');
 const contract=read(contractPath);
 if(contract.status!=='FROZEN_OWNER_APPROVED'||contract.approval?.owner!=='APPROVED'||
   contract.approval?.integration!=='FOOD_PORTRAIT_COMPOSITOR_AUTHORIZED')
  throw Error('GAUGE_NOT_FROZEN_FOR_COMPOSITION');
 const assets={};
 for(const key of ['shell','needle']){
  const spec=contract.assets[key],absolute=path.join(root,spec.path);
  if(!fs.existsSync(absolute)||sha(absolute)!==spec.sha256)throw Error('GAUGE_'+key.toUpperCase()+'_HASH_MISMATCH');
  assets[key]={path:spec.path,sha256:spec.sha256};
 }
 const state=gaugeState(kcal);
 return {
  schema:'mealup-food-portrait-gauge-layer-v1',
  status:'READY',
  assets,
  value:{exactKcal:kcal,text:Math.round(kcal)+' kcal'},
  needle:{angleDegrees:state.angleDegrees,zone:state.zone,pivotPixels:contract.assets.needle.pivotPixels},
  motion:animate?contract.motion:{...contract.motion,durationMs:0,sequence:['TARGET']},
  renderOrder:['FOOD_PORTRAIT','GAUGE_SHELL','GAUGE_NEEDLE','EXACT_KCAL_TEXT'],
  imageGenerationScope:'FOOD_ONLY_NO_GAUGE_NO_TEXT',
  automaticFreeze:false
 };
}
module.exports={gaugeLayer};
