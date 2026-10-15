'use strict';
// Real execution of two pre-approved READ-ONLY internal skills. No AI inference.
const path=require('node:path');
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const {selectSkills}=require('./dynamic-skill-selector.cjs');
const catalog=require('./live-skill-catalog.json').catalog;
const root=path.resolve(__dirname,'../..');
const OUTPUT='/tmp/mealup-office-operational-pilot.json';
const LAB='experiment/recipe-visual-agents';
const SCRIPTS=Object.freeze({
  MEALUP_ENGINEERING_JS_AUDIT:'tools/ai-office/skills/lab-javascript-audit.cjs',
  MEALUP_QA_REGRESSION_GATE:'tools/ai-office/skills/lab-independent-qa.cjs'
});
function runTask(roleId,capability,skillId){
  if(process.env.MEALUP_LAB_EXECUTE!=='YES'||process.env.GITHUB_REF_NAME!==LAB)
    return {roleId,status:'BLOCKED_LAB_EXECUTION_GATES'};
  const task={id:'MEALUP_LAB_'+roleId,agentId:'LAB_'+roleId,
    roleId,scope:'LAB_READ_ONLY',frozenContextVerified:true,
    capabilities:[capability]};
  const assignment={assignedBy:'DIRECTOR',authorized:true,
    reference:'CEO_20261015_LAB_READONLY_PILOT',
    taskId:task.id,agentId:task.agentId,roleId:task.roleId,scope:task.scope};
  const selection=selectSkills(task,assignment,catalog);
  if(selection.status!=='READY_OFFLINE'||
     selection.selected.length!==1||selection.selected[0]!==skillId)
    return {roleId,status:'BLOCKED_SKILL_GATE',selected:selection.selected};
  const target=SCRIPTS[skillId];
  if(!target||catalog.find(s=>s.id===skillId)?.internalRunner!==target)
    return {roleId,status:'BLOCKED_UNTRUSTED_RUNNER'};
  const start=Date.now();
  const run=spawnSync(process.execPath,[path.resolve(root,target)],{
    cwd:root,timeout:100000,maxBuffer:200000,encoding:'utf8',
    env:{PATH:process.env.PATH||'',CI:'true',GITHUB_REF_NAME:LAB}
  });
  let evidence=null;
  try{evidence=JSON.parse(run.stdout?.trim()||'');}catch(_){}
  return {roleId,skillId,status:run.status===0&&evidence?.status==='PASS'?
    'ACTUAL_INTERNAL_SKILL_PASS':'EXECUTION_OR_QA_FAILED',
    elapsedMs:Date.now()-start,evidence,
    noExternalModelCalls:true,readOnlyScope:'LAB_READ_ONLY'};
}
function main(){
  if(process.env.MEALUP_LAB_EXECUTE!=='YES'||
     process.env.GITHUB_REF_NAME!==LAB)
    throw Error('EXPLICIT_LAB_EXECUTION_GATES_REQUIRED');
  const report={schema:'MEALUP_AI_OFFICE_REAL_SKILL_PILOT_V1',
    branch:LAB,mode:'REAL_INTERNAL_TOOLS_NOT_LIVE_LLM_AGENTS',
    scoutRole:'NOT_INVOKED_DIRECT_CEO_CHANNEL_ONLY',
    director:'LAB_ONLY_SCOPED_ASSIGNMENT',
    executions:[],newAccounts:0,externalAIRequests:0,
    additionalBillingEUR:0,protectedFilesWritten:0,deploys:0};
  try {
    report.executions.push(runTask('ENGINEERING','JS_SYNTAX_AUDIT',
      'MEALUP_ENGINEERING_JS_AUDIT'));
    if(report.executions[0].status==='ACTUAL_INTERNAL_SKILL_PASS')
      report.executions.push(runTask('QA','OFFICE_REGRESSION_QA',
        'MEALUP_QA_REGRESSION_GATE'));
  }finally{
    report.status=report.executions.length===2&&
      report.executions.every(r=>r.status==='ACTUAL_INTERNAL_SKILL_PASS')?
      'INTERNAL_TOOL_PIPELINE_PASS_NO_AUTONOMOUS_AI_CLAIM':'BLOCKED';
    report.humanReviewRequired=true;
    fs.writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({status:report.status,
      roles:report.executions.map(x=>({role:x.roleId,status:x.status,
        tests:x.evidence?.tests,checked:x.evidence?.filesExamined})),
      externalAIRequests:0,protectedFilesWritten:0}));
  }
  if(report.status==='BLOCKED')process.exitCode=1;
}
if(require.main===module)main();
module.exports={runTask,main};
