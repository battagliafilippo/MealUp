'use strict';
/** Guarded ImageGen bridge for one Food Portrait candidate per persisted cycle. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {gaugeState}=require('./gauge-mapping.cjs');
const assert=(c,m)=>{if(!c)throw Error(m)};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function atomicJson(target,value){
 fs.mkdirSync(path.dirname(target),{recursive:true});
 const tmp=target+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 fs.renameSync(tmp,target);
}
function calibrateV10({manifestPath,assetPath,checkpointPath,producer='OPENAI_BUILT_IN_IMAGEGEN',reviewer='INDEPENDENT_VISUAL_QA'}){
 assert(producer!==reviewer,'QA_MUST_BE_INDEPENDENT_FROM_PRODUCER');
 assert(!fs.existsSync(checkpointPath),'ACTIVE_OR_COMPLETED_CYCLE_ALREADY_EXISTS');
 const m=read(manifestPath);
 assert(m?.recipe?.id==='v10','CALIBRATION_RECIPE_MUST_BE_V10_DO01_FORBIDDEN');
 assert(m.generation?.mode==='BUILT_IN_IMAGEGEN'&&m.generation.imagesRequested===1&&m.generation.imagesGenerated===1,
  'IMAGEGEN_SINGLE_CANDIDATE_RECEIPT_REQUIRED');
 assert(m.acceptance?.automaticAcceptanceAllowed===false,'AUTO_ACCEPT_FORBIDDEN');
 const bytes=fs.readFileSync(assetPath),actual=sha(bytes);
 assert(actual===m.approvedAsset?.sha256,'CALIBRATION_ASSET_HASH_MISMATCH');
 const gauge=gaugeState(m.recipe.kcal);
 assert(gauge.angleDegrees===m.gauge.expectedAngleDegrees&&gauge.zone===m.gauge.zone,
  'FROZEN_GAUGE_MAPPING_MISMATCH');
 assert(m.visualQa?.reviewAuthority&&/Independent/i.test(m.visualQa.reviewAuthority),
  'INDEPENDENT_VISUAL_QA_EVIDENCE_REQUIRED');
 assert(m.technicalQa?.status==='PASS'&&m.visualQa?.status==='PASS_CANDIDATE_ONLY',
  'CALIBRATION_QA_NOT_PASS');
 const checkpoint={schema:'mealup-food-portrait-visual-cycle-v1',cycleId:'FPP-CAL-V10-001',
  recipeId:'v10',mode:'CALIBRATION_REPLAY_NO_GENERATION',providerAdapter:'OPENAI_BUILT_IN_IMAGEGEN_INTERACTIVE',
  candidateLimit:1,candidatesRecorded:1,imagesGeneratedThisRun:0,do01Generated:false,budgetEUR:0,
  producer,reviewer,asset:{path:assetPath,sha256:actual,bytes:bytes.length},
  gauge:{kcal:m.recipe.kcal,angleDegrees:gauge.angleDegrees,zone:gauge.zone,bakedInRequired:false,
   compositorRequired:true,imageGenerationScope:'FOOD_ONLY_NO_GAUGE_NO_TEXT'},
  gates:{technicalQa:'PASS',independentVisualQa:'PASS_CANDIDATE_ONLY',ownerApproval:true,
   automaticAcceptance:false,automaticFreeze:false,integration:false,deployment:false},
  state:'CALIBRATION_VERIFIED_AWAITING_SEPARATE_FREEZE_DECISION'};
 atomicJson(checkpointPath,checkpoint);
 return checkpoint;
}
function selfTest(){
 const strict=require('node:assert/strict');
 const os=require('node:os'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'mealup-fpp-cycle-'));
 const asset=Buffer.from('v10-calibration'); const assetPath=path.join(dir,'v10.webp');fs.writeFileSync(assetPath,asset);
 const manifest={recipe:{id:'v10',kcal:95},gauge:{expectedAngleDegrees:-48.6,zone:'GREEN'},
  generation:{mode:'BUILT_IN_IMAGEGEN',imagesRequested:1,imagesGenerated:1},
  approvedAsset:{sha256:sha(asset)},technicalQa:{status:'PASS'},
  visualQa:{status:'PASS_CANDIDATE_ONLY',reviewAuthority:'Independent visual QA'},
  acceptance:{ownerApproved:true,automaticAcceptanceAllowed:false}};
 const manifestPath=path.join(dir,'manifest.json');fs.writeFileSync(manifestPath,JSON.stringify(manifest));
 const checkpointPath=path.join(dir,'checkpoint.json');
 const result=calibrateV10({manifestPath,assetPath,checkpointPath});
 assert(result.imagesGeneratedThisRun===0&&result.candidateLimit===1&&fs.existsSync(checkpointPath),'CHECKPOINT_NOT_PERSISTED');
 strict.throws(()=>calibrateV10({manifestPath,assetPath,checkpointPath}),/ACTIVE_OR_COMPLETED/);
 const do01={...manifest,recipe:{id:'do01',kcal:150}};const do01Path=path.join(dir,'do01.json');fs.writeFileSync(do01Path,JSON.stringify(do01));
 strict.throws(()=>calibrateV10({manifestPath:do01Path,assetPath,checkpointPath:path.join(dir,'do01-checkpoint.json')}),/DO01_FORBIDDEN/);
 strict.throws(()=>calibrateV10({manifestPath,assetPath,checkpointPath:path.join(dir,'same-reviewer.json'),producer:'SAME',reviewer:'SAME'}),/QA_MUST_BE_INDEPENDENT/);
 console.log('PASS Visual Production cycle: ImageGen receipt, one candidate, persistent checkpoint, independent QA, do01 blocked');
}
function main(argv){
 if(argv.includes('--self-test'))return selfTest();
 const v=n=>{const i=argv.indexOf(n);return i<0?null:argv[i+1]};
 for(const n of ['--manifest','--asset','--checkpoint'])assert(v(n),'REQUIRED '+n);
 const result=calibrateV10({manifestPath:path.resolve(v('--manifest')),assetPath:path.resolve(v('--asset')),
  checkpointPath:path.resolve(v('--checkpoint'))});
 console.log(JSON.stringify(result,null,2));
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){console.error('FAIL visual production cycle:',e.stack||e);process.exitCode=1;}}
module.exports={calibrateV10,selfTest};
