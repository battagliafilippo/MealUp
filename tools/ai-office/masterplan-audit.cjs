'use strict';
// Audit and transition gate for the public, non-secret MealUp AI Office ledger.
// This validates consistency; it does not verify external evidence or activate agents.
const fs=require('node:fs');
const path=require('node:path');
const ALLOWED_LIFECYCLE=new Set(['ACTIVE','FROZEN','SUPERSEDED','PROPOSED','NOT_APPLICABLE']);
const ALLOWED_VERIFICATION=new Set(['VERIFIED','PARTIALLY_VERIFIED','UNVERIFIED','BLOCKED']);
const ALLOWED_STEP=new Set(['OPEN','VERIFIED','PARTIALLY_VERIFIED','BLOCKED','FAILED','SUPERSEDED']);
const valid=x=>typeof x==='string'&&x.trim().length>0;
function auditLedger(d){
 const errors=[];
 if(!d||d.schema!=='MEALUP_AI_OFFICE_MASTERPLAN_V1')errors.push('SCHEMA_MISMATCH');
 if(d?.canonicalScope!=='AI_OFFICE_LAB_ONLY'||d?.branch!=='experiment/recipe-visual-agents')
   errors.push('LAB_SCOPE_ONLY');
 if(d?.constitution?.version!=='1.9'||d.constitution.lifecycle!=='FROZEN'||
   d.constitution.publicCopyAllowed!==false||d.constitution.sourceTextEmbedded!==false)
   errors.push('CONSTITUTION_PRIVACY_AND_VERSION');
 if(d?.contract?.budgetAdditionalEUR!==0||
    d?.contract?.scoutReporting!=='CEO_ONLY'||d?.contract?.ceoFinalAuthority!==true)
    errors.push('CEO_SCOUT_ZERO_BUDGET_CONTRACT');
 const required=['NO_MAIN_WRITES','NO_TESTER_OR_PUBLIC_PWA_WRITES',
   'NO_FROZEN_CHANGES','ZERO_ADDITIONAL_EUR',
   'NO_AUTOMATIC_AGENT_RECRUITMENT','REVIEW_AND_PRESERVE_ALL_OPEN_STEPS'];
 for(const item of required)if(!d?.invariants?.includes(item))errors.push('MISSING_INVARIANT:'+item);
 const unique=(items,where)=>{
   const found=new Set();
   for(const item of items||[]){
     if(!valid(item?.id))errors.push('MISSING_ID:'+where);
     else if(found.has(item.id))errors.push('DUPLICATE_ID:'+where+':'+item.id);
     found.add(item.id);
   }
   return found;
 };
 const sources=unique(d?.canonicalSources,'source');
 const decisions=unique(d?.decisions,'decision');
 const components=unique(d?.components,'component');
 const unknowns=unique(d?.knownUnknowns,'unknown');
 for(const source of d?.canonicalSources||[]){
   if(!valid(source.path)||!valid(source.status))errors.push('INVALID_SOURCE:'+source.id);
 }
 for(const dec of d?.decisions||[]){
   if(!['CEO','DIRECTOR','QA'].includes(dec.authority)||!valid(dec.decision))
     errors.push('INVALID_DECISION:'+dec.id);
   if(!sources.has(dec.source)&&dec.source!=='THIS_MANDATE')
     errors.push('DECISION_SOURCE_NOT_FOUND:'+dec.id);
 }
 for(const c of d?.components||[]){
   if(!ALLOWED_LIFECYCLE.has(c.lifecycle)||!ALLOWED_VERIFICATION.has(c.verification)||
     !Array.isArray(c.sources)||!Array.isArray(c.evidence)||
     !Array.isArray(c.missing))errors.push('INVALID_COMPONENT:'+c.id);
   if(c.verification==='VERIFIED' && c.evidence.length===0)
     errors.push('COMPONENT_VERIFIED_WITHOUT_EVIDENCE:'+c.id);
 }
 const phases=unique(d?.phases,'phase');
 const allSteps=(d?.phases||[]).flatMap(p=>p.steps||[]);
 const stepIds=unique(allSteps,'step');
 for(const phase of d?.phases||[]){
   if(!Array.isArray(phase.steps)||!ALLOWED_STEP.has(phase.status))
     errors.push('INVALID_PHASE:'+phase.id);
 }
 for(const step of allSteps){
   if(!ALLOWED_STEP.has(step.status)||!Array.isArray(step.dependsOn)||
     !Array.isArray(step.evidence)||!Array.isArray(step.blockingReasons)||
     ['objective','scope','preconditions','expectedOutput','verification','doneWhen']
       .some(key=>!valid(step[key])))errors.push('INVALID_STEP:'+step.id);
   if(step.status==='VERIFIED'&&step.evidence.length===0)
     errors.push('VERIFIED_STEP_WITHOUT_EVIDENCE:'+step.id);
   if(step.status==='BLOCKED'&&step.blockingReasons.length===0)
     errors.push('BLOCKED_STEP_WITHOUT_REASON:'+step.id);
   for(const dep of step.dependsOn||[]){
     if(!stepIds.has(dep)||dep===step.id)errors.push('UNKNOWN_STEP_DEPENDENCY:'+step.id);
   }
 }
 // Dependency graph must be acyclic; stable IDs are long-lived.
 const byId=new Map(allSteps.map(x=>[x.id,x]));
 const visiting=new Set(),visited=new Set();
 function visit(id){
   if(visiting.has(id)){errors.push('STEP_DEPENDENCY_CYCLE:'+id);return;}
   if(visited.has(id))return;
   visiting.add(id);
   for(const parent of byId.get(id)?.dependsOn||[])if(byId.has(parent))visit(parent);
   visiting.delete(id);visited.add(id);
 }
 for(const id of stepIds)visit(id);
 for(const unk of d?.knownUnknowns||[]){
   if(!stepIds.has(unk.relatedStep)||!valid(unk.resolution)||!valid(unk.fact))
      errors.push('UNTRACKED_UNKNOWN:'+unk.id);
 }
 if(!stepIds.has(d?.recovery?.nextStepId)||!phases.has(d?.recovery?.currentPhase))
   errors.push('INVALID_RECOVERY_POINTER');
 if(!valid(d?.recovery?.lastVerifiedBaseline)||
    d?.recovery?.noInFlightProviderCalls!==true)errors.push('RECOVERY_BASELINE_OR_INFLIGHT');
 return {status:errors.length?'FAIL':'PASS',errors,
   summary:{sources:sources.size,decisions:decisions.size,components:components.size,
     phases:phases.size,steps:stepIds.size,unknowns:unknowns.size},
   note:'Schema and dependency checks only; original evidence and real agent capabilities require independent verification.'};
}
function compareVersions(previous,current){
 const errors=[];
 if(previous?.schema!==current?.schema)errors.push('SCHEMA_CHANGED');
 if(previous?.constitution?.version!==current?.constitution?.version)
    errors.push('CANONICAL_CONSTITUTION_CHANGED');
 for(const collection of ['decisions','knownUnknowns','canonicalSources','components']){
   const nextIds=new Set((current?.[collection]||[]).map(x=>x.id));
   for(const old of previous?.[collection]||[])
     if(!nextIds.has(old.id))errors.push('SILENT_DELETION:'+collection+':'+old.id);
 }
 const oldSteps=(previous?.phases||[]).flatMap(x=>x.steps||[]);
 const newSteps=new Map((current?.phases||[]).flatMap(x=>x.steps||[]).map(x=>[x.id,x]));
 const records=current?.recovery?.stepReconciliations||[];
 for(const old of oldSteps){
   if(newSteps.has(old.id)){
     if(old.status==='VERIFIED'&&newSteps.get(old.id).status!=='VERIFIED')
       errors.push('VERIFIED_STEP_REGRESSION:'+old.id);
   } else {
     const change=records.find(r=>r.oldId===old.id);
     if(!change||!newSteps.has(change.newId)||!valid(change.reason))
       errors.push('SILENT_LOST_STEP:'+old.id);
   }
 }
 const nextDecisions=new Map((current?.decisions||[]).map(x=>[x.id,x]));
 for(const old of previous?.decisions||[]){
   const updated=nextDecisions.get(old.id);
   if(updated&&old.status==='APPROVED'&&
     (updated.decision!==old.decision||updated.status!==old.status))
       errors.push('APPROVED_DECISION_CHANGED:'+old.id);
 }
 return {status:errors.length?'FAIL':'PASS',errors};
}
if(require.main===module){
 const current=JSON.parse(fs.readFileSync(path.join(__dirname,'masterplan-ledger.json'),'utf8'));
 const validation=auditLedger(current);
 if(process.argv[2]==='--compare'&&process.argv[3]){
   const previous=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
   validation.transition=compareVersions(previous,current);
 }
 console.log(JSON.stringify(validation));
 if(validation.status!=='PASS'||validation.transition?.status==='FAIL')process.exitCode=1;
}
module.exports={auditLedger,compareVersions};
