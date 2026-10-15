'use strict';
// Exactly one Groq Free call with dynamically selected internal Design skills.
// Candidate remains NOT APPROVED, no file writes except /tmp report.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {selectSkills}=require('./dynamic-skill-selector.cjs');
const catalog=require('./live-model-skill-catalog.json').skills;
const ROOT=path.resolve(__dirname,'../..');
const LAB='experiment/recipe-visual-agents';
const ALLOWED=new Map([
 ['MEALUP_DESIGN_STATIC_OBSERVATION','.agents/skills/mealup-design-observe-static-fo/SKILL.md'],
 ['MEALUP_DESIGN_OVERCLAIM_GUARD','.agents/skills/mealup-design-no-overclaim/SKILL.md']
]);
function buildAssignment(){
 const task={id:'DESIGN_CANDIDATE_SKILLS_001',agentId:'QWEN3_8_CANDIDATE',
   roleId:'DESIGN',scope:'LAB_READ_ONLY',frozenContextVerified:true,
   capabilities:['FO_VISUAL_OBSERVATION','CLAIM_BOUNDARIES']};
 const assignment={assignedBy:'DIRECTOR',authorized:true,reference:'CEO_20261015_READ_ONLY_SKILLS_PILOT',
   taskId:task.id,agentId:task.agentId,roleId:task.roleId,scope:task.scope};
 const chosen=selectSkills(task,assignment,catalog);
 if(chosen.status!=='READY_OFFLINE'||chosen.selected.length!==2)
   throw Error('DYNAMIC_SKILL_SELECTION_BLOCKED');
 const contents=chosen.selected.map(id=>{
   const p=ALLOWED.get(id);
   if(!p||catalog.find(x=>x.id===id)?.path!==p)throw Error('UNTRUSTED_SKILL_PATH');
   const value=fs.readFileSync(path.join(ROOT,p),'utf8');
   if(value.length<100||value.length>3000)throw Error('SKILL_SIZE_UNEXPECTED');
   return {id,path:p,sha256:crypto.createHash('sha256').update(value).digest('hex'),
     instructions:value.replace(/^---[\s\S]*?---\s*/,'')};
 });
 return {task,chosen,contents};
}
function structuralReview(candidate){
 const errors=[];
 if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))
   return {status:'FAIL',errors:['NON_OBJECT']};
 if(candidate.family!=='PASTA')errors.push('FAMILY_MISMATCH');
 if(!Array.isArray(candidate.visibleObservations)||candidate.visibleObservations.length<1||
    candidate.visibleObservations.length>4)errors.push('OBSERVATIONS_INVALID');
 const words=(candidate.visibleObservations||[]).join(' ');
 if(/\b(?:frame|fotogramm[ai]|crop|inquadratur[ae])\b|(?:sfondo bianco|white background)/i.test(words))
   errors.push('UNSEEN_FRAMES_OR_BACKGROUND');
 if(candidate.claimedFrozenCompliance!==false)errors.push('FROZEN_APPROVAL_CLAIM');
 if(!Array.isArray(candidate.filesModified)||candidate.filesModified.length!==0)
   errors.push('WRITE_CLAIM');
 if(!Array.isArray(candidate.otherDepartmentsActivated)||candidate.otherDepartmentsActivated.length!==0)
   errors.push('OTHER_AGENT_CLAIM');
 if(!Array.isArray(candidate.uncertainties))errors.push('UNCERTAINTY_MISSING');
 if(typeof candidate.suggestedMobileCheck!=='string'||candidate.suggestedMobileCheck.length<12)
   errors.push('MOBILE_TEST_MISSING');
 return {status:errors.length?'BLOCKED':'HUMAN_VISUAL_QA_REQUIRED',errors};
}
module.exports={buildAssignment,structuralReview};
