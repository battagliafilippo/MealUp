'use strict';
// Gated Director: real private v1.9/skill preflight, then metadata-only private journal.
// Does not dispatch models or grant writes; Scout still reports directly to CEO.
const {createProtectedHandoff}=require('./constitution-protected-handoff.cjs');
const {storeAt}=require('./director-private-ledger.cjs');
const nonempty=s=>typeof s==='string'&&s.trim().length>0;
function prepare({task,assignment,sourcePath,privateDirectory,attemptId}={}){
 if(!task||!nonempty(task.taskId)||!assignment||!nonempty(attemptId)||
     !/^[a-zA-Z0-9_-]{3,80}$/.test(attemptId))
   return {status:'BLOCKED_INVALID_DIRECTOR_BRIEF',executed:false};
 let journal;
 try{journal=storeAt(privateDirectory);}catch(_){
   return {status:'BLOCKED_PRIVATE_STORAGE_UNAVAILABLE',executed:false};
 }
 let result;
 try{result=createProtectedHandoff({task,assignment,sourcePath});}
 catch(_){result={status:'BLOCKED_RULE_PREFLIGHT_EXCEPTION'};}
 const ready=result.status==='VERIFIED_RULE_PACKET_PREPARED_NOT_EXECUTED';
 const event={
   id:'GATE-'+task.taskId+'-'+attemptId,taskId:task.taskId,
   type:ready?'RULE_PREFLIGHT_READY':'INTAKE_BLOCKED',actor:'DIRECTOR',
   record:ready?{
     sourceVerified:true,roleId:task.roleId,
     constitutionSha:result.originalSha256,
     taskPacketSha:result.packetSha256,
     skillIds:result.selectedSkills,
     goal:task.goal,scope:task.scope,briefVersion:task.activeBriefVersion,
     baselineId:task.baselineId,nextStepId:result.nextStep
   }:{reasonCode:result.status}
 };
 try{
   const persisted=journal.append(event);
   return {
     status:ready?'DIRECTOR_PREFLIGHT_CHECKPOINTED_NOT_DISPATCHED':result.status,
     journalStatus:persisted.status,
     taskId:task.taskId,attemptId,
     selectedSkills:ready?result.selectedSkills:[],
     taskPacketSha:ready?result.packetSha256:null,
     activeRuleCount:ready?result.activeRuleCount:0,
     nextStep:ready?result.nextStep:null,
     constitutionVerified:ready,
     externalModelCalls:0,autonomousAgentExecution:false,
     agentWrites:0,productionChanges:0,
     note:'No real agent execution; record only; private source required on EVERY new handoff.'
   };
 }catch(_){
   return {status:'BLOCKED_DURABLE_CHECKPOINT_FAILED',executed:false};
 }
}
module.exports={prepare};
