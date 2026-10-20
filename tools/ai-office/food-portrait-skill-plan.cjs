'use strict';
const PROFILE=require('./food-portrait-office-profile.json');
const REGISTRY=require('./food-portrait-skill-catalog.json');
const CATALOG=REGISTRY.skills;
const COMMON=REGISTRY.commonEligibility;
const nonblank=x=>typeof x==='string'&&x.trim().length>0;

function eligible(skill){
 return skill&&nonblank(skill.id)&&nonblank(skill.version)&&nonblank(skill.roleId)&&
  PROFILE.phases.includes(skill.phase)&&Array.isArray(skill.capabilities)&&skill.capabilities.length>0&&
  Array.isArray(skill.requires)&&Array.isArray(skill.toolBindings)&&skill.toolBindings.length>0&&
  COMMON.qaVerified===true&&COMMON.securityReviewed===true&&COMMON.extraCostEUR===0&&
  COMMON.needsNewPrivileges===false&&COMMON.changesFrozen===false;
}

const SHA256=/^[a-f0-9]{64}$/i;
function validVesselTemplate(template,vesselId){
 return template&&template.vesselId===vesselId&&template.verified===true&&template.immutable===true&&
  ['sourceBoardSha256','bodySha256','foodClipSha256','frontOccluderSha256']
   .every(key=>SHA256.test(template[key]||''));
}
function compileFoodPortraitSkillPlan({taskType,producerId,technicalReviewerId,visualReviewerId,
 inputHashesVerified=false,quotaVerified=false,recipeId,vesselId,vesselTemplate,
 gaugeContractVerified=false,candidateLimit,automaticRetry,budgetEUR}={}){
 if(taskType!==PROFILE.taskType)return {status:'BLOCKED',reason:'UNKNOWN_TASK_TYPE',assignments:[]};
 if(!nonblank(producerId)||!nonblank(technicalReviewerId)||!nonblank(visualReviewerId))
  return {status:'BLOCKED',reason:'ACTOR_IDENTITY_REQUIRED',assignments:[]};
 if(new Set([producerId,technicalReviewerId,visualReviewerId]).size!==3)
  return {status:'BLOCKED',reason:'PRODUCER_REVIEWER_NOT_INDEPENDENT',assignments:[]};
 if(!nonblank(recipeId)||!nonblank(vesselId))
  return {status:'BLOCKED',reason:'RECIPE_AND_VESSEL_REQUIRED',assignments:[]};
 if(recipeId==='do01')return {status:'BLOCKED',reason:'DO01_FORBIDDEN',assignments:[]};
 if(candidateLimit!==1||automaticRetry!==false)
  return {status:'BLOCKED',reason:'ONE_CANDIDATE_NO_RETRY_REQUIRED',assignments:[]};
 if(budgetEUR!==0||quotaVerified!==true)
  return {status:'BLOCKED',reason:'BUDGET_OR_QUOTA_UNVERIFIED',assignments:[]};
 if(inputHashesVerified!==true)
  return {status:'BLOCKED',reason:'INPUT_OR_OUTPUT_HASH_MISSING',assignments:[]};
 if(gaugeContractVerified!==true)
  return {status:'BLOCKED',reason:'FROZEN_GAUGE_UNVERIFIED',assignments:[]};
 if(!validVesselTemplate(vesselTemplate,vesselId))
  return {status:'BLOCKED',reason:'VERIFIED_VESSEL_TEMPLATE_REQUIRED',assignments:[]};

 const pool=CATALOG.filter(eligible),selected=[];
 const uncovered=new Set(PROFILE.requiredCapabilities);
 while(uncovered.size){
  const ranked=pool.filter(s=>!selected.includes(s)).map(s=>({s,
   cover:s.capabilities.filter(c=>uncovered.has(c)).length})).filter(x=>x.cover)
   .sort((a,b)=>b.cover-a.cover||a.s.id.localeCompare(b.s.id));
  if(!ranked.length)return {status:'BLOCKED',reason:'MISSING_REQUIRED_CAPABILITY',
   missing:[...uncovered].sort(),assignments:[]};
  selected.push(ranked[0].s);for(const c of ranked[0].s.capabilities)uncovered.delete(c);
 }
 if(selected.length>PROFILE.maxSkills)
  return {status:'BLOCKED',reason:'SKILL_LIMIT_EXCEEDED',assignments:[]};

 const ids=new Set(selected.map(s=>s.id));
 for(const s of selected)for(const dep of s.requires)if(!ids.has(dep))
  return {status:'BLOCKED',reason:'SKILL_DEPENDENCY_UNSATISFIED',skillId:s.id,
   dependency:dep,assignments:[]};
 const ordered=[],pending=new Map(selected.map(s=>[s.id,s]));
 while(pending.size){
  const ready=[...pending.values()].filter(s=>s.requires.every(d=>ordered.some(x=>x.id===d)))
   .sort((a,b)=>PROFILE.phases.indexOf(a.phase)-PROFILE.phases.indexOf(b.phase)||a.id.localeCompare(b.id));
  if(!ready.length)return {status:'BLOCKED',reason:'SKILL_DEPENDENCY_CYCLE',assignments:[]};
  for(const s of ready){ordered.push(s);pending.delete(s.id);}
 }
 const actorFor=s=>s.roleId==='VISUAL_PRODUCTION'?producerId:
  s.lane==='EARLY_STYLE'?visualReviewerId:s.roleId==='QA'?technicalReviewerId:s.roleId;
 const assignments=ordered.map((s,index)=>({order:index+1,skillId:s.id,version:s.version,
  roleId:s.roleId,subrole:s.subrole||null,lane:s.lane||null,actorId:actorFor(s),
  phase:s.phase,covers:s.capabilities.slice(),requires:s.requires.slice(),
  requiresGate:(s.requiresGate||[]).slice(),toolBindings:s.toolBindings.slice(),
  workflowSkill:REGISTRY.workflowSkill,reason:'MINIMAL_REQUIRED_CAPABILITY_COVER'}));
 const roleSkills=Object.fromEntries([...new Set(assignments.map(x=>x.roleId))].map(roleId=>[
  roleId,assignments.filter(x=>x.roleId===roleId).map(x=>x.skillId)]));
 return {schema:'mealup-food-portrait-skill-plan-v2',status:'READY_OFFLINE',taskType,
  profileVersion:PROFILE.version,catalogVersion:REGISTRY.version,budgetEUR:0,
  selectedSkillCount:assignments.length,assignments,roleSkills,missing:[],
  protectedTargets:PROFILE.protectedTargets.slice(),candidateLimit:1,
  earlyQaBeforeComposition:true,finalQaAfterComposition:true,
  automaticExecution:false,automaticRetry:false,automaticFreeze:false,
  requiresIndependentQA:true};
}
module.exports={compileFoodPortraitSkillPlan,PROFILE,CATALOG};
