'use strict';
const PROFILE=require('./food-portrait-office-profile.json');
const CATALOG=require('./food-portrait-skill-catalog.json').skills;
const nonblank=x=>typeof x==='string'&&x.trim();

function eligible(skill){
 return skill&&nonblank(skill.id)&&nonblank(skill.version)&&nonblank(skill.roleId)&&
  Array.isArray(skill.capabilities)&&skill.capabilities.length>0&&
  Array.isArray(skill.requires)&&Array.isArray(skill.conflictsWith)&&
  skill.qaVerified===true&&skill.securityReviewed===true&&skill.extraCostEUR===0;
}
function compileFoodPortraitSkillPlan({taskType,producerId,technicalReviewerId,visualReviewerId,
 inputHashesVerified=false,quotaVerified=false}={}){
 if(taskType!==PROFILE.taskType)return {status:'BLOCKED',reason:'UNKNOWN_TASK_TYPE',assignments:[]};
 if(!nonblank(producerId)||!nonblank(technicalReviewerId)||!nonblank(visualReviewerId))
  return {status:'BLOCKED',reason:'ACTOR_IDENTITY_REQUIRED',assignments:[]};
 if(new Set([producerId,technicalReviewerId,visualReviewerId]).size!==3)
  return {status:'BLOCKED',reason:'PRODUCER_REVIEWER_NOT_INDEPENDENT',assignments:[]};
 if(inputHashesVerified!==true)return {status:'BLOCKED',reason:'INPUT_OR_OUTPUT_HASH_MISSING',assignments:[]};
 if(quotaVerified!==true)return {status:'BLOCKED',reason:'BUDGET_OR_QUOTA_UNVERIFIED',assignments:[]};
 const pool=CATALOG.filter(eligible),selected=[];
 const uncovered=new Set(PROFILE.requiredCapabilities);
 while(uncovered.size){
  const ranked=pool.filter(s=>!selected.includes(s)).map(s=>({s,
   cover:s.capabilities.filter(c=>uncovered.has(c)).length})).filter(x=>x.cover)
   .sort((a,b)=>b.cover-a.cover||a.s.id.localeCompare(b.s.id));
  if(!ranked.length)return {status:'BLOCKED',reason:'MISSING_REQUIRED_CAPABILITY',missing:[...uncovered].sort(),assignments:[]};
  selected.push(ranked[0].s);for(const c of ranked[0].s.capabilities)uncovered.delete(c);
 }
 if(selected.length>PROFILE.maxSkills)return {status:'BLOCKED',reason:'SKILL_LIMIT_EXCEEDED',assignments:[]};
 const ids=new Set(selected.map(s=>s.id));
 for(const s of selected)for(const dep of s.requires)if(!ids.has(dep))
  return {status:'BLOCKED',reason:'SKILL_DEPENDENCY_UNSATISFIED',skillId:s.id,dependency:dep,assignments:[]};
 const ordered=[],pending=new Map(selected.map(s=>[s.id,s]));
 while(pending.size){
  const ready=[...pending.values()].filter(s=>s.requires.every(d=>ordered.some(x=>x.id===d)))
   .sort((a,b)=>PROFILE.phases.findIndex(p=>p.id===a.phase)-PROFILE.phases.findIndex(p=>p.id===b.phase)||a.id.localeCompare(b.id));
  if(!ready.length)return {status:'BLOCKED',reason:'SKILL_DEPENDENCY_CYCLE',assignments:[]};
  for(const s of ready){ordered.push(s);pending.delete(s.id);}
 }
 const actorFor=s=>s.roleId==='VISUAL_PRODUCTION'?producerId:
  s.lane==='VISUAL_CULINARY'?visualReviewerId:s.roleId==='QA'?technicalReviewerId:s.roleId;
 const assignments=ordered.map((s,index)=>({order:index+1,skillId:s.id,version:s.version,
  roleId:s.roleId,subrole:s.subrole||null,lane:s.lane||null,actorId:actorFor(s),
  phase:s.phase,covers:s.capabilities.slice(),requires:s.requires.slice(),reason:'REQUIRED_CAPABILITY_PROFILE'}));
 return {schema:'mealup-food-portrait-skill-plan-v1',status:'READY_OFFLINE',taskType,
  profileVersion:PROFILE.version,budgetEUR:0,maxSkills:PROFILE.maxSkills,
  selectedSkillCount:assignments.length,assignments,missing:[],automaticExecution:false,
  automaticFreeze:false,requiresIndependentQA:true};
}
module.exports={compileFoodPortraitSkillPlan,PROFILE,CATALOG};
