'use strict';
const roles=['DESIGN','ENGINEERING','FOOD','VISUAL_PRODUCTION','PROMPT_ARCHITECT','QA','DIRECTOR','SCOUT'];
function selectSkills(task,assignment,skills) {
  if (!task || !roles.includes(task.roleId)) return {status:'BLOCKED'};
  if (!assignment || !assignment.authorized || assignment.roleId!==task.roleId ||
      assignment.taskId!==task.id) return {status:'BLOCKED'};
  if ((task.roleId==='SCOUT'?'CEO':'DIRECTOR')!==assignment.assignedBy) return {status:'BLOCKED'};
  const selected=[];
  const missing=[];
  for(const capability of task.capabilities || []) {
    const skill=(skills||[]).find(s=>s.capabilities?.includes(capability)&&
      s.roles?.includes(task.roleId)&&s.approved===true&&s.qaVerified===true);
    if(skill) selected.push(skill.id); else missing.push(capability);
  }
  return {status:missing.length?'NEEDS_REVIEW':'READY_OFFLINE',selected:[...new Set(selected)],
    missing,simulatedOnly:true};
}
module.exports={selectSkills,roles};
