'use strict';
/** MealUp Portrait Spec + Queue v1: read-only input, no image production, fail-closed.
 * node tools/food-portrait-pipeline/portrait-contract.cjs --self-test
 * node tools/food-portrait-pipeline/portrait-contract.cjs --input <M3 briefs> --out /tmp/mealup-portrait-lab
 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..');
const SCHEMA='mealup-food-portrait-spec-v1';
const QUEUE_SCHEMA='mealup-portrait-queue-v1';
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const assert=(yes,msg)=>{if(!yes)throw Error(msg);};
const keySort=(a,b)=>a.localeCompare(b,'en',{numeric:true});
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);

function compile(input,matrix,manifest,registry){
  assert(input?.schema==='mealup-visual-director-v1','M3_SCHEMA_INVALID');
  assert(Array.isArray(input.recipes)&&Array.isArray(matrix?.rows),'INPUT_ARRAY_REQUIRED');
  assert(registry?.schema==='mealup-food-portrait-golden-registry-v1','GOLDEN_REGISTRY_INVALID');
  assert(Array.isArray(registry.masters)&&Array.isArray(registry.sourceCandidates),'GOLDEN_REGISTRY_MALFORMED');
  // Until a source verifier exists, no registry entry can self-assert approval.
  assert(registry.masters.length===0,'VERIFIED_SOURCE_VALIDATOR_REQUIRED_BEFORE_ENABLING_MASTERS');
  const mapping=manifest?.recipe_mapping, families=manifest?.families;
  assert(mapping&&families&&typeof mapping==='object','FAMILY_MANIFEST_INVALID');
  assert(manifest.no_vessels===true && manifest.no_compositions===true,'FO_FAMILY_CONTRACT_CHANGED');
  const rows=matrix.rows, m=new Map();
  for(const row of rows){
    assert(typeof row.recipe_id==='string'&&!m.has(row.recipe_id),'MATRIX_DUPLICATE_ID');
    m.set(row.recipe_id,row);
  }
  const briefs=input.recipes;
  assert(rows.length>=454&&briefs.length===rows.length&&
    Object.keys(mapping).length===rows.length,'CATALOG_COUNT_OR_UPSTREAM_454_LIMIT');
  const ids=new Set(), specs=[];
  for(const b of briefs){
    assert(typeof b.recipeId==='string'&&b.recipeId&&!ids.has(b.recipeId),'M3_DUPLICATE_OR_EMPTY_RECIPE_ID');
    ids.add(b.recipeId);
    const canonical=m.get(b.recipeId);
    assert(canonical&&has(mapping,b.recipeId),'RECIPE_SOURCE_ID_MISMATCH');
    assert(has(families,mapping[b.recipeId])&&b.familyId===mapping[b.recipeId],
      'FAMILY_ID_MISMATCH:'+b.recipeId);
    assert(b.vessel?.id===canonical.vessel_id &&
      b.planningRequest?.inputFacts?.vesselId===canonical.vessel_id,
      'VESSEL_ID_MISMATCH:'+b.recipeId);
    assert(b.compositionId===canonical.composition_id,'COMPOSITION_MISMATCH:'+b.recipeId);
    assert(typeof b.visualRevision==='string'&&typeof b.sourceHash==='string'&&
      typeof b.directorRevision==='string','MISSING_SOURCE_HASH');
    assert(Array.isArray(b.primaryIngredients)&&Array.isArray(b.steps)&&
      b.primaryIngredients.every((x,i)=>x.position===i&&typeof x.name==='string'&&x.name),
      'RECIPE_INGREDIENTS_INVALID:'+b.recipeId);
    assert(Number.isFinite(b.kcal)&&b.kcal>=0,'RECIPE_KCAL_INVALID:'+b.recipeId);
    assert(b.approvalStatus==='NOT_REVIEWED'&&b.imageStatus==='PENDING'&&
      b.safeToGenerate===false&&b.imageUrl===null,'PREMATURE_UPSTREAM_APPROVAL:'+b.recipeId);
    assert(b.interpretation&&Array.isArray(b.interpretation.verifiedPlacements)&&
      b.interpretation.verifiedPlacements.length===0,'UNVERIFIED_PLACEMENT_MASQUERADE');
    const source={
      recipeId:b.recipeId,title:b.title,kcal:b.kcal,familyId:b.familyId,
      compositionId:b.compositionId,vesselId:b.vessel.id,
      sourceHash:b.sourceHash,visualRevision:b.visualRevision,directorRevision:b.directorRevision,
      ingredients:b.primaryIngredients.map(x=>({
        position:x.position,name:x.name,quantity:x.quantity??null,unit:x.unit??null,
        placement:'UNKNOWN_UNTIL_CULINARY_QA'
      })),
      preparationSteps:b.steps.slice(),
      evidences:{plating:b.evidence?.explicitPlating??[],
        physicalForms:b.evidence?.ingredientForms??[],
        cooking:b.evidence?.cooking??[]}
    };
    const revision=hash({schema:SCHEMA,source,referenceRegistryFingerprint:hash(registry)});
    specs.push({
      schema:SCHEMA,recipeId:b.recipeId,specRevision:revision,
      source,
      production:{goal:'ONE_COMPLETE_DISH_NOT_A_COLLAGE',
        foodPortraitDistinctFromFamilyFO:true,
        vesselId:b.vessel.id,
        vesselRequired:b.vessel.id!=='VESSEL_FREE',
        vesselReferenceVerified:false,
        goldenMasterId:null,
        confirmedGoldenMasterSha256:null,
        culinaryInterpretation:'NOT_YET_INDEPENDENTLY_VERIFIED',
        imageSource:null,
        outputFormat:'WEBP_OR_LOSSLESS_INTERMEDIATE',
        outputTarget:'STAGING_ONLY',
        QAStatus:'NOT_REVIEWED',
        autoApprovalAllowed:false},
      uncertainty:{plating:b.interpretation?.state??'UNKNOWN',
        unsolvedVisualPlacements:true,
        knownUnknowns:[
          'APPROVED_FOOD_PORTRAIT_GOLDEN_MASTER',
          'VERIFIED_FROZEN_VESSEL_SOURCE',
          'INDEPENDENT_CULINARY_AND_VISUAL_QA'
        ]},
      acceptanceState:'BLOCKED_REFERENCE',
      imageStatus:'NOT_GENERATED'
    });
  }
  assert(ids.size===rows.length&&[...m.keys()].every(id=>ids.has(id)),'INCOMPLETE_ID_COVERAGE');
  specs.sort((a,b)=>keySort(a.recipeId,b.recipeId));
  const tasks=specs.map(s=>({
    taskId:s.recipeId+':'+s.specRevision.slice(0,20),
    recipeId:s.recipeId,specRevision:s.specRevision,
    jobFingerprint:hash({specRevision:s.specRevision,generator:'UNASSIGNED',target:'FOOD_PORTRAIT'}),
    groupKey:s.source.vesselId+'/'+s.source.familyId,
    status:'WAITING_REFERENCE',attempts:0,
    nextAction:'VERIFY_GOLDEN_MASTER_AND_CULINARY_DIRECTION',
    generator:null,imagePath:null,
    imageSHA256:null,visualQA:null,approval:null
  }));
  const report={
    schema:'mealup-food-portrait-coverage-v1',catalog:specs.length,
    uniqueIds:ids.size,queued:tasks.length,
    groups:new Set(tasks.map(t=>t.groupKey)).size,
    referenceBlocked:tasks.filter(t=>t.status==='WAITING_REFERENCE').length,
    readyToGenerate:0,imagesGenerated:0,imagesAccepted:0,
    imagesIntegratedInPWA:0,
    sourceRegistryVersion:registry.schema,autoAcceptEnabled:false,
    historicalMinimumMet:specs.length>=454,
    upstreamSupportsNewRecipesWithoutM2M3Update:false,
    result:'PASS_PREPRODUCTION_ONLY'
  };
  return {specs:{schema:SCHEMA,total:specs.length,recipes:specs},
    queue:{schema:QUEUE_SCHEMA,total:tasks.length,tasks},report};
}

function confinedDir(raw){
  const p=path.resolve(raw),root=path.join(ROOT,'tools/food-portrait-pipeline/output');
  assert((p.startsWith(path.resolve(os.tmpdir())+path.sep)||
    p.startsWith(root+path.sep))&&p!==path.resolve(os.tmpdir()),'UNSAFE_OUTPUT_DIRECTORY');
  return p;
}
function writeAtomic(file,body){
  const p=file+'.tmp';
  fs.writeFileSync(p,JSON.stringify(body,null,2)+'\n',{flag:'w'});
  fs.renameSync(p,file);
}
function stage(bundle,destination){
  const out=confinedDir(destination);
  fs.mkdirSync(out,{recursive:true});
  const data=[
    ['portrait-specifications.v1.json',bundle.specs],
    ['production-queue.v1.json',bundle.queue],
    ['coverage-report.v1.json',bundle.report]
  ];
  for(const [name,body] of data)writeAtomic(path.join(out,name),body);
  return {out,files:data.map(x=>x[0])};
}
function selfTest(){
  const sample=(id,vessel='VESSEL_PLATE')=>({
    recipeId:id,title:'Demo '+id,kcal:320,familyId:'PASTA',compositionId:'COMP_'+id,
    vessel:{id:vessel},sourceHash:'sha-'+id,visualRevision:'v1',directorRevision:'d1',
    primaryIngredients:[{position:0,name:'pasta',quantity:100,unit:'g'}],
    steps:['Cuoci e servi'],evidence:{explicitPlating:[],ingredientForms:[],cooking:[]},
    planningRequest:{inputFacts:{vesselId:vessel}},
    interpretation:{state:'INFERENCE_REQUIRED',verifiedPlacements:[]},
    approvalStatus:'NOT_REVIEWED',imageStatus:'PENDING',safeToGenerate:false,imageUrl:null
  });
  const r=Array.from({length:454},(_,i)=>sample('t'+i,i===0?'VESSEL_FREE':'VESSEL_PLATE'));
  const mat={rows:r.map(b=>({recipe_id:b.recipeId,composition_id:b.compositionId,vessel_id:b.vessel.id}))};
  const man={recipe_mapping:Object.fromEntries(r.map(b=>[b.recipeId,'PASTA'])),
    families:{PASTA:{}},no_vessels:true,no_compositions:true};
  const reg={schema:'mealup-food-portrait-golden-registry-v1',masters:[],sourceCandidates:[]};
  const run=()=>compile({schema:'mealup-visual-director-v1',recipes:r},mat,man,reg);
  const mustFail=(f,word)=>{let fail=false;try{f();}catch(e){fail=String(e.message).includes(word);}
    assert(fail,'SELFTEST_MISSED_'+word);};
  const ok=run();
  assert(ok.report.uniqueIds===454&&ok.report.referenceBlocked===454&&
    ok.specs.recipes[0].production.vesselRequired===false,'SELFTEST_454_AND_VESSEL_FREE');
  assert(ok.specs.recipes.every(s=>!s.production.autoApprovalAllowed&&
    !s.production.goldenMasterId),'SELFTEST_NO_APPROVAL');
  assert(JSON.stringify(ok)===JSON.stringify(run()),'SELFTEST_REPRODUCIBILITY');
  r[1].vessel.id='VESSEL_BOWL';
  mustFail(run,'VESSEL_ID_MISMATCH');r[1].vessel.id='VESSEL_PLATE';
  r[1].primaryIngredients.push({position:1,name:''});
  mustFail(run,'RECIPE_INGREDIENTS_INVALID');r[1].primaryIngredients.pop();
  r[1].kcal=-1;
  mustFail(run,'RECIPE_KCAL_INVALID');r[1].kcal=320;
  r[1].approvalStatus='APPROVED';
  mustFail(run,'PREMATURE_UPSTREAM_APPROVAL');r[1].approvalStatus='NOT_REVIEWED';
  reg.masters.push({id:'fake',status:'APPROVED'});
  mustFail(run,'VERIFIED_SOURCE_VALIDATOR_REQUIRED');reg.masters.pop();
  const future=sample('future454','VESSEL_BOWL');
  r.push(future);
  mat.rows.push({recipe_id:future.recipeId,composition_id:future.compositionId,
    vessel_id:future.vessel.id});man.recipe_mapping[future.recipeId]='PASTA';
  assert(run().report.catalog===455,'SELFTEST_FUTURE_GROWTH_CORE');
  console.log('PASS portrait spec self-test: 454 IDs, future growth, vessel gates, unknown placement, no auto-approval');
}
function main(argv){
  if(argv.includes('--self-test'))return selfTest();
  const arg=name=>{const i=argv.indexOf(name);return i<0?null:argv[i+1];};
  assert(arg('--input')&&arg('--out'),'REQUIRED_INPUT_AND_OUTPUT');
  const load=f=>JSON.parse(fs.readFileSync(f,'utf8'));
  const bundle=compile(load(path.resolve(arg('--input'))),
    load(path.join(ROOT,'G8/composition-matrix.json')),
    load(path.join(ROOT,'assets/family-fo/manifest.json')),
    load(path.join(ROOT,'tools/food-portrait-pipeline/golden-registry.v1.json')));
  const loc=stage(bundle,arg('--out'));
  console.log('PASS preproduction:',bundle.report.catalog,'specs,',bundle.report.queued,
    'checkpoint-safe queue entries, 0 generated/approved; files:',loc.out);
}
if(require.main===module){try{main(process.argv.slice(2));}
  catch(e){console.error('FAIL portrait-contract:',e.stack||e);process.exitCode=1;}}
module.exports={compile,stage,selfTest,confinedDir};
