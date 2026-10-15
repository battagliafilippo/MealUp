'use strict';
/* Staging catalog for MealUp Food Portraits. NO PWA writes, NO family-FO substitution,
 * NO imaginary assets, NO self-attested approvals. Produces a comprehensive safe index.
 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createHash}=require('node:crypto');
const SHA=/^[a-f0-9]{64}$/;
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const assert=(c,msg)=>{if(!c)throw Error(msg)};
function compile(specs,queue){
 assert(specs?.schema==='mealup-food-portrait-spec-v1'&&Array.isArray(specs.recipes),'SPEC_SCHEMA_INVALID');
 assert(queue?.schema==='mealup-portrait-queue-v1'&&Array.isArray(queue.tasks),'QUEUE_SCHEMA_INVALID');
 assert(specs.total===queue.total&&specs.recipes.length===queue.tasks.length,'SOURCE_PARITY_FAILED');
 const taskById=new Map(queue.tasks.map(t=>[t.recipeId,t]));
 assert(taskById.size===queue.tasks.length,'DUPLICATE_QUEUE_ID');
 const seen=new Set(),entries=[];
 for(const spec of specs.recipes){
  const id=spec.recipeId,t=taskById.get(id);
  assert(typeof id==='string'&&!seen.has(id)&&t,'MISSING_OR_DUPLICATE_RECIPE');
  seen.add(id);
  assert(SHA.test(spec.specRevision)&&spec.specRevision===t.specRevision,'STALE_QUEUE_REVISION:'+id);
  assert(spec.production?.vesselId===spec.source?.vesselId,'VESSEL_MAPPING_CHANGED:'+id);
  assert(spec.production?.vesselRequired===(spec.source?.vesselId!=='VESSEL_FREE'),
   'VESSEL_FREE_POLICY_CHANGED:'+id);
  assert(spec.acceptanceState==='BLOCKED_REFERENCE'&&spec.imageStatus==='NOT_GENERATED'&&
    !spec.production.goldenMasterId&&!spec.production.imageSource&&
    !spec.production.autoApprovalAllowed&&t.status==='WAITING_REFERENCE'&&
    t.imagePath===null&&t.approval===null,'UNAUTHORIZED_ASSET_PROMOTION:'+id);
  entries.push({recipeId:id,specRevision:spec.specRevision,
   vesselId:spec.source.vesselId,requiredVessel:spec.production.vesselRequired,
   sourceFamilyId:spec.source.familyId,
   portraitAsset:null,portraitSHA256:null,assetVersion:null,
   qaResult:'NOT_PERFORMED',releaseState:'UNAVAILABLE',
   fallback:{kind:'NEUTRAL_PLACEHOLDER_ONLY',path:null,
    doNotReplaceWithFamilyFoodObject:true}});
 }
 entries.sort((a,b)=>a.recipeId.localeCompare(b.recipeId,'en',{numeric:true}));
 const vesselCounts={};for(const x of entries)vesselCounts[x.vesselId]=(vesselCounts[x.vesselId]||0)+1;
 const groupedExceptions=[
  {id:'NO_VERIFIED_FOOD_PORTRAIT_GOLDEN_MASTER',scope:'GLOBAL_GOLDEN_REFERENCE',
   affectedRecipeCount:entries.length,disposition:'HOLD_NO_AUTOMATED_GENERATION',
   requiresUserDecisionNow:false,nextAction:'VERIFY_APPROVED_SOURCE_FILES_AND_IMAGES'},
  {id:'VESSEL_BOARD_FROZEN_SHA_MISMATCH',scope:'HISTORICAL_VESSEL_SOURCE',
   affectedRecipeCount:entries.filter(e=>e.requiredVessel).length,
   disposition:'BLOCK_VISUAL_SOURCE_PROMOTION',
   requiresUserDecisionNow:false,nextAction:'RECOVER_OR_AUTHENTICATE_EXACT_FROZEN_REFERENCE'}
 ];
 return {catalog:{schema:'mealup-portrait-integration-staging-v1',
    state:'STAGING_ONLY_NOT_PWA_RELEASE',
    total:entries.length,sourceFingerprint:hash(entries.map(x=>[x.recipeId,x.specRevision])),
    entries},
  exceptionQueue:{schema:'mealup-portrait-exceptions-v1',
    groupedIssues:groupedExceptions,perRecipeReviewQueue:[],
    releaseApprovalRequired:true,autoAcceptanceEnabled:false},
  report:{catalog:entries.length,available:0,missing:entries.length,
    vesselDistribution:vesselCounts,productionEnabled:false,
    realImageQACompleted:false,pwaIntegrationAuthorized:false}};
}
function output(bundle,directory){
 const dest=path.resolve(directory),tmp=path.resolve(os.tmpdir());
 assert(dest.startsWith(tmp+path.sep),'UNSAFE_STAGING_OUTPUT');
 fs.mkdirSync(dest,{recursive:true});
 for(const [name,obj] of [['staging-catalog.v1.json',bundle.catalog],
  ['exception-review.v1.json',bundle.exceptionQueue],
  ['staging-coverage.v1.json',bundle.report]]){
  fs.writeFileSync(path.join(dest,name+'.tmp'),JSON.stringify(obj,null,2)+'\n');
  fs.renameSync(path.join(dest,name+'.tmp'),path.join(dest,name));
 }
}
function selfTest(){
 const s={schema:'mealup-food-portrait-spec-v1',total:1,recipes:[{
  recipeId:'r1',specRevision:'a'.repeat(64),source:{vesselId:'VESSEL_FREE',familyId:'PASTA'},
  production:{vesselId:'VESSEL_FREE',vesselRequired:false,
   goldenMasterId:null,imageSource:null,autoApprovalAllowed:false},
  acceptanceState:'BLOCKED_REFERENCE',imageStatus:'NOT_GENERATED'
 }]};
 const q={schema:'mealup-portrait-queue-v1',total:1,tasks:[{
  recipeId:'r1',specRevision:'a'.repeat(64),status:'WAITING_REFERENCE',imagePath:null,approval:null
 }]};
 const a=compile(s,q);
 assert(a.catalog.entries[0].portraitAsset===null&&a.report.available===0,'SELFTEST_NO_GHOST_ASSET');
 assert(a.catalog.entries[0].fallback.doNotReplaceWithFamilyFoodObject,'SELFTEST_NO_FAMILY_FALLBACK');
 assert(a.exceptionQueue.groupedIssues[1].affectedRecipeCount===0,'SELFTEST_VESSEL_FREE');
 q.tasks[0].approval='YES';
 let denied=false;try{compile(s,q);}catch(e){denied=/UNAUTHORIZED_ASSET_PROMOTION/.test(e.message);}
 assert(denied,'SELFTEST_NO_UNVERIFIED_APPROVAL');
 console.log('PASS staging catalog self-test: no ghost assets, separate neutral fallback, grouped exceptions');
}
function main(argv){
 if(argv.includes('--self-test'))return selfTest();
 const arg=n=>{const i=argv.indexOf(n);return i<0?null:argv[i+1];};
 assert(arg('--specs')&&arg('--queue')&&arg('--out'),'USAGE --specs --queue --out');
 const read=p=>JSON.parse(fs.readFileSync(path.resolve(p),'utf8'));
 const bundle=compile(read(arg('--specs')),read(arg('--queue')));
 output(bundle,arg('--out'));
 console.log('PASS staging catalog:',bundle.report.catalog,'mapped,',
  bundle.report.available,'available,',bundle.exceptionQueue.groupedIssues.length,
  'grouped exceptions, PWA untouched');
}
if(require.main===module){try{main(process.argv.slice(2));}
 catch(e){console.error('FAIL staging catalog:',e.stack||e);process.exitCode=1;}}
module.exports={compile,output,selfTest};
