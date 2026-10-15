'use strict';
// Offline dry-run: specialists choose task-specific, already-approved skills.
const roles=['DESIGN','ENGINEERING','FOOD','VISUAL_PRODUCTION','PROMPT_ARCHITECT','QA','DIRECTOR','SCOUT'];
const quotaKinds=['RECURRING_FREE_QUOTA','EXISTING_SUBSCRIPTION_ENTITLEMENT','VERIFIED_PREEXISTING_FREE_COMPUTE'];
const nonblank=s=>typeof s==='string'&&s.trim().length>0;
function selectSkills(task,assignment,skills) {
  const manager=task?.roleId==='SCOUT'?'CEO':'DIRECTOR';
  if(!task||!roles.includes(task.roleId)||!nonblank(task.id)||
     !nonblank(task.agentId)||!nonblank(task.scope)||
     !Array.isArray(task.capabilities)||task.capabilities.length>20||
     task.capabilities.some(x=>!nonblank(x))||task.frozenContextVerified!==true||
     !assignment||assignment.authorized!==true||
     !nonblank(assignment.reference)||
     assignment.roleId!==task.roleId||assignment.taskId!==task.id||
     assignment.agentId!==task.agentId||assignment.scope!==task.scope||
     assignment.assignedBy!==manager||
     !Array.isArray(skills)||
     (task.isSubagent===true && (!nonblank(task.parentAgentId)||
       assignment.parentAgentId!==task.parentAgentId||
       assignment.subagentApproved!==true)))
     return {status:'BLOCKED',selected:[],missing:[],simulatedOnly:true};
  const selected=[],missing=[];
  for(const capability of new Set(task.capabilities)) {
    const eligible=skills.filter(s=>s&&nonblank(s.id)&&
      Array.isArray(s.roles)&&Array.isArray(s.scopes)&&
      Array.isArray(s.capabilities)&&s.capabilities.includes(capability)&&
      s.roles?.includes(task.roleId)&&s.scopes?.includes(task.scope)&&
      s.approved===true&&s.qaVerified===true&&s.securityReviewed===true&&
      nonblank(s.approvalRef)&&nonblank(s.version)&&
      quotaKinds.includes(s.quotaKind)&&s.extraCostEUR===0&&
      s.quotaVerified===true&&s.needsNewPrivileges!==true&&
      s.changesFrozen!==true&&(s.kind!=='EXTERNAL'||s.externalAuditPassed===true)&&
      Number.isFinite(s.qaScore)&&s.qaScore>=0&&s.qaScore<=100)
      .sort((a,b)=>b.qaScore-a.qaScore||a.id.localeCompare(b.id));
    if(eligible.length)selected.push(eligible[0].id); else missing.push(capability);
  }
  return {status:missing.length?'NEEDS_REVIEW':'READY_OFFLINE',
    roleId:task.roleId,selectionBy:manager==='CEO'?'SCOUT':'SPECIALIST',
    selected:[...new Set(selected)],missing,simulatedOnly:true,
    newSkillProcess:'QA and Director review; Scout researches vendors if needed; CEO for new privileges or scope',
    requireQaOnOutputs:true,realInvocations:0,installs:0,deploys:0};
}
module.exports={selectSkills,roles};
