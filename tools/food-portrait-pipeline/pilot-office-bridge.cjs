'use strict';
/**
 * MealUp Food Portrait Pilot -> AI Office 1.3 read-only bridge.
 * Compiles modular prompts A-E from actual M2/M3 source-traced specifications;
 * creates guarded role handoffs but NEVER calls providers, changes office files,
 * approves imagery, or interprets prompt injection as executable instructions.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const {createOfficeOrchestrator}=require('../ai-office/office-orchestrator.cjs');
const {getRole}=require('../ai-office/agent-registry.cjs');
const ROOT=path.resolve(__dirname,'../..');
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const assert=(yes,why)=>{if(!yes)throw Error(why)};
const clone=x=>JSON.parse(JSON.stringify(x));
const allowed=new Set(['VESSEL_BOWL','VESSEL_PLATE','VESSEL_RAMEKIN','VESSEL_DESSERT_MOLD',
  'VESSEL_BAKING_DISH','VESSEL_FREE','VESSEL_CUP','VESSEL_PIZZA_SURFACE']);

function build(portraits,selection,style){
 assert(portraits?.schema==='mealup-food-portrait-spec-v1'&&Array.isArray(portraits.recipes),
   'PORTRAIT_SPECS_INVALID');
 assert(selection?.schema==='mealup-food-portrait-pilot-selection-v1'&&
   Array.isArray(selection.selected)&&selection.selected.length>=1&&
   selection.selected.length<=8,'PILOT_SELECTION_INVALID');
 assert(style?.schema==='mealup-food-portrait-style-reference-v1'&&style.source?.sha256,
   'STYLE_REFERENCE_METADATA_MISSING');
 assert(style.refId===selection.control.ownerStyleReferenceId,'STYLE_VERSION_MISMATCH');
 assert(style.limits?.notAPortraitGoldenMaster===true&&
   style.limits?.sourceNotInRepo===true,'UNAUTHORIZED_STYLE_MASTER_PROMOTION');
 assert(selection.control.batchGenerationForbidden===true&&
   selection.control.automaticAcceptanceEnabled===false,'PRODUCTION_POLICY_INVALID');
 const byId=new Map(portraits.recipes.map(s=>[s.recipeId,s]));
 assert(byId.size===portraits.recipes.length,'DUPLICATE_INPUT_RECIPE_IDS');
 const office=createOfficeOrchestrator(),handoffs=[],packs=[],rejections=[],ids=new Set();
 for(const sel of selection.selected){
   assert(!ids.has(sel.recipeId)&&typeof sel.recipeId==='string','DUPLICATE_PILOT_ID');
   ids.add(sel.recipeId);
   const s=byId.get(sel.recipeId);
   assert(s&&s.source&&s.production,'PILOT_RECIPE_NOT_FOUND:'+sel.recipeId);
   assert(Number.isFinite(s.source.kcal)&&s.source.kcal>=0,'PILOT_KCAL_MISSING:'+sel.recipeId);
   assert(s.source.vesselId===sel.expectedVesselId&&
     s.production.vesselId===s.source.vesselId&&allowed.has(s.source.vesselId),
     'PILOT_VESSEL_DISAGREEMENT:'+sel.recipeId);
   assert(s.production.autoApprovalAllowed===false&&s.production.goldenMasterId===null&&
     s.imageStatus==='NOT_GENERATED','UPSTREAM_IMAGE_APPROVAL_DETECTED');
   const facts={
     recipeId:s.recipeId,title:s.source.title,kcal:s.source.kcal,familyId:s.source.familyId,
     vesselId:s.source.vesselId,
     compositionId:s.source.compositionId,
     sourceHash:s.source.sourceHash,specRevision:s.specRevision,
     ingredients:clone(s.source.ingredients),preparationSteps:clone(s.source.preparationSteps),
     evidences:clone(s.source.evidences),uncertainty:clone(s.uncertainty)
   };
   const text=facts.preparationSteps.join(' ').toLocaleLowerCase('it');
   const ingredients=facts.ingredients.map(x=>x.name.toLocaleLowerCase('it')).join(' ');
   const flags=[];
   if(/\bvino\b/.test(text)&&!/\bvino\b/.test(ingredients))
     flags.push({code:'STEP_MENTIONS_WINE_NOT_IN_INGREDIENTS',confidence:'TEXT_ONLY',resolution:'FOOD_SPECIALIST_REVIEW'});
   if(facts.vesselId==='VESSEL_FREE'&&/\bbicchier[ei]\b/.test(text))
     flags.push({code:'VESSEL_FREE_STEP_MENTIONS_GLASS',confidence:'TEXT_ONLY',resolution:'DO_NOT_CHANGE_VESSEL_UNTIL_APPROVED'});
   if(facts.uncertainty?.plating!=='EXPLICIT_EVIDENCE_TO_VALIDATE')
     flags.push({code:'PLATING_NOT_EXPLICITLY_VALIDATED',confidence:'SOURCE_REPORTED',resolution:'FOOD_SPECIALIST_REVIEW'});

   const blocks={
     A_STYLE_CORE:{
       sourceStyleId:style.refId,sourceSha256:style.source.sha256,
       visualDirection:'MealUp Toys 3D premium, smooth rounded shapes, cream/orange brand materials, glossy but non-photographic recognizable food, controlled soft lighting and mobile-first composition',
       fixedMUST:['One visually unified prepared dish','Consistent materials and camera perspective',
         'No additional props, clutter, random text or stock photography'],
       sourceAvailability:'PRIVATE_REFERENCE_REQUIRES_EXPLICIT_MOUNT_FOR_PIXEL_COMPARISON'
     },
     B_VESSEL_COMPOSITION_CORE:{
       vesselId:facts.vesselId,canonicalRecipeCompositionId:facts.compositionId,
       vesselRequired:facts.vesselId!=='VESSEL_FREE',
       mandatory:['Use exact canonical vessel ID; never swap type','No independent disconnected ingredient collage',
         'Do not fabricate missing vessel geometry'],
       activeGate:'HISTORICAL_FROZEN_BOARD_SHA_MISMATCH_BLOCKS_CANONICAL_VESSEL_APPROVAL',
       gaugeProductionContract:['ImageGen produces food and vessel only: no gauge, kcal text, needle or UI pixels',
         'The approved deterministic compositor adds the FROZEN housing, exact recipe kcal and mapped movable needle after food QA']
     },
     C_RECIPE_SPECIFIC:{
       facts,
       mandatory:['Do not invent ingredients','Preserve all ingredient names and source order as facts, not as visual layer order',
         'Cite actual preparation step when asserting placement','Label unverified plating as INFERRED or UNRESOLVED'],
       machineDetectedExceptions:flags
     },
     D_INDEPENDENT_QA:{
       technical:['Actual image decoded','Alpha/crop/edge checks','Resolution and byte budget',
         'Image SHA-256 and immutable candidate provenance'],
       semantic:['Every distinctive ingredient or justified integrated omission',
         'Dish recognizable','Canonical vessel verified or VESSEL_FREE',
         'Consistent 3D materials, proportions, color, lighting, camera',
         'Mobile thumbnail readability','Composited gauge matches exact kcal text, frozen mapping and approved physical housing'],
       reviewState:'NOT_EXECUTED',autoAcceptance:false
     },
     E_OUTPUT:{
       target:'EXPERIMENTAL_CANDIDATE_ONLY',
       aspectRatio:'1:1',
       preferredIntermediate:'PNG_RGBA',
       finalAssetFormat:'WEBP_TRANSPARENT_IF_VALIDATED',
       outputRights:'NO_PWA_DEPLOY_NO_FREEZE_NO_AUTO_PROMOTION',
       targetAssetSha256:null
     }
   };
   for(const [domain,roleDescription] of [
     ['food','Validate culinary ingredients and uncertain preparation; no invented placement'],
     ['design','Compare source style image with actual pixels, verify style only; no vessel authorization'],
     ['visual','Prepare exactly one possible isolated candidate only after reference gate; no unattended batch']
   ]){
     const officeId='FPP-PILOT-'+s.recipeId+'-'+domain.toUpperCase()+'-'+s.specRevision.slice(0,12);
     office.intake({
       id:officeId,domain,
       request:roleDescription,scope:'EXPERIMENT_FOOD_PORTRAIT_'+s.recipeId,
       baselineId:'experiment/food-portrait-pipeline-20261015@'+s.specRevision.slice(0,12),
       constitutionVersion:'1.9',officeVersion:'1.3',
       activeBriefVersion:'food-portrait-pilot-modular-v1',promptSpecializationRequired:true
     });
     const h=office.handoff(officeId);
     assert(h.payload.writeScope==='NONE'&&h.payload.budgetEUR===0&&
       h.execution==='NOT_STARTED','OFFICE_HANDOFF_UNSAFE');
     handoffs.push({
       taskId:officeId,recipeId:s.recipeId,domain,
       registeredAdapter:h.adapter,adapterStatus:h.adapterStatus,
       officeHandoff:clone(h),execution:'NOT_STARTED',
       actualModelCalls:0,
       nextAction:domain==='food'?'REVIEW_SOURCE_FACTS':
         domain==='design'?'MOUNT_STYLE_REFERENCE_AND_REVIEW_PIXELS':
           'WAIT_FOR_VALIDATED_REFERENCE_AND_CULINARY_BRIEF',
       noAutoApproval:true
     });
   }
   packs.push({recipeId:s.recipeId,title:facts.title,sourceRevision:s.specRevision,
     status:'PREPARED_NOT_GENERATED',referenceStatus:'STYLE_CANDIDATE_ONLY',
     blocks,
     flaggedExceptions:flags,
     sourceFactsSha256:digest(facts),
     combinedPromptSHA256:digest(blocks),
     callsToExternalModels:0,
     authorizedForMassProduction:false
   });
   if(flags.length)rejections.push({recipeId:s.recipeId,issues:flags});
 }
 const expectedHandoffs=packs.length*3;
 assert(handoffs.length===expectedHandoffs,'OFFICE_HANDOFF_COVERAGE');
 const report={
   schema:'mealup-food-portrait-office-pilot-report-v1',
   pilotSize:packs.length,officeTasks:handoffs.length,
   roleRegistration:{
     food:getRole('food').status,
     design:getRole('design').status,
     visual:getRole('visual').status,
     qa:getRole('qa').status
   },
   sourceStyleId:style.refId,sourceFileHash:style.source.sha256,
   recipeIds:packs.map(p=>p.recipeId),
   exceptionCases:rejections.length,
   externallyExecutedAgentTasks:0,externalProviderCalls:0,
   realImagesGeneratedHere:0,realImageVisualQACompleted:0,
   readyForAutomaticAcceptance:0,
   pendingReferenceRecovery:true,
   status:'OFFICE_HANDOFFS_PREPARED_HYBRID_PILOT_HELD'
 };
 return {promptPacks:{schema:'mealup-food-portrait-prompt-pack-v1',packCount:packs.length,packs},
   officeAssignments:{schema:'mealup-food-portrait-office-handoffs-v1',handoffs},
   exceptionCases:{schema:'mealup-food-portrait-pilot-review-v1',cases:rejections},
   report};
}

function main(args){
 const input=(name)=>{const n=args.indexOf(name);return n<0?null:args[n+1]};
 if(args.includes('--self-test')){
   const src={schema:'mealup-food-portrait-spec-v1',recipes:[{
     recipeId:'case1',source:{title:'Test',kcal:320,familyId:'PESCE',
       compositionId:'COMP_case1',vesselId:'VESSEL_BOWL',sourceHash:'source',
       ingredients:[{position:0,name:'pesce',quantity:50,unit:'g'}],
       preparationSteps:['Cuoci pesce.'],
       evidences:{plating:[],physicalForms:[],cooking:[]}},
     specRevision:'a'.repeat(64),imageStatus:'NOT_GENERATED',
     production:{vesselId:'VESSEL_BOWL',autoApprovalAllowed:false,goldenMasterId:null},
     uncertainty:{plating:'INFERENCE_REQUIRED'}
   }]};
   const config={schema:'mealup-food-portrait-pilot-selection-v1',
     selected:[{recipeId:'case1',expectedVesselId:'VESSEL_BOWL'}],
     control:{ownerStyleReferenceId:'T1',batchGenerationForbidden:true,automaticAcceptanceEnabled:false}};
   const style={schema:'mealup-food-portrait-style-reference-v1',refId:'T1',
     source:{sha256:'b'.repeat(64)},limits:{notAPortraitGoldenMaster:true,sourceNotInRepo:true}};
   const r=build(src,config,style);
   assert(r.report.officeTasks===3&&r.report.externalProviderCalls===0,'SELFTEST_ROLE_ROUTING');
   assert(r.promptPacks.packs[0].blocks.B_VESSEL_COMPOSITION_CORE.gaugeProductionContract.length===2,
     'SELFTEST_FROZEN_GAUGE_CONTRACT');
   src.recipes[0].production.goldenMasterId='INVENTED';
   let failed=false;try{build(src,config,style)}catch(e){failed=e.message==='UPSTREAM_IMAGE_APPROVAL_DETECTED'};
   assert(failed,'SELFTEST_UNAPPROVED_MASTER');
   console.log('PASS office pilot offline: exact owner roles, source facts, no provider calls, no fabricated master');
   return;
 }
 assert(input('--specs')&&input('--selection')&&input('--style')&&input('--out'),
   'USAGE: --specs --selection --style --out');
 const read=f=>JSON.parse(fs.readFileSync(path.resolve(f),'utf8'));
 const result=build(read(input('--specs')),read(input('--selection')),read(input('--style')));
 const dir=path.resolve(input('--out'));
 const tmp=path.resolve(os.tmpdir());
 assert(dir.startsWith(tmp+path.sep),'UNSAFE_OUTPUT_TARGET');
 fs.mkdirSync(dir,{recursive:true});
 for(const [name,content] of Object.entries(result)){
   fs.writeFileSync(path.join(dir,name+'.json.tmp'),JSON.stringify(content,null,2)+'\n');
   fs.renameSync(path.join(dir,name+'.json.tmp'),path.join(dir,name+'.json'));
 }
 console.log(JSON.stringify(result.report,null,2));
}
if(require.main===module){try{main(process.argv.slice(2))}
 catch(e){console.error('FAIL Food Portrait office bridge:',e.stack||e);process.exitCode=1;}}
module.exports={build};
