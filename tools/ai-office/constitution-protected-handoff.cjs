'use strict';
// One protected handoff path: dynamic Skill selection -> exact v1.9 packet.
// It PREPARES a scoped work order; it does not execute an AI agent or QA.
const fs=require('node:fs');
const crypto=require('node:crypto');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {selectSkills}=require('./dynamic-skill-selector.cjs');
const {assertPrivateDirectory,assertPrivateFile,verifyCreatedPrivateFile}=require('./private-file-security.cjs');
const CANDIDATES=require('./live-skill-catalog.json').catalog;
const DESIGN=require('./live-model-skill-catalog.json').skills;
const repoRoot=path.resolve(__dirname,'../..');
function pythonExecutable(){
  const configured=process.env.MEALUP_PYTHON_EXECUTABLE;
  if(process.platform==='win32'&&typeof configured==='string'&&path.isAbsolute(configured)&&
     fs.existsSync(configured)&&fs.statSync(configured).isFile()&&
     !configured.startsWith(repoRoot+path.sep))return configured;
  return process.platform==='win32'?'python':'python3';
}
function createProtectedHandoff({task,assignment,sourcePath,privateDirectory}={}){
  const noAccess={status:'BLOCKED_CANONICAL_CONSTITUTION_NOT_ACCESSIBLE',
    executesAgent:false,apiCalls:0,skillsExecuted:0};
  if(typeof sourcePath!=='string'||!sourcePath.trim()||
     !fs.existsSync(sourcePath)||!fs.statSync(sourcePath).isFile())
    return noAccess;
  const sourceAbsolute=path.resolve(sourcePath);
  if(sourceAbsolute===repoRoot||sourceAbsolute.startsWith(repoRoot+path.sep))
    return {...noAccess,status:'BLOCKED_PRIVATE_SOURCE_IN_PUBLIC_REPOSITORY'};
  let canon;
  try{canon=assertPrivateFile(sourcePath);}catch(_){return noAccess;}
  if(canon.startsWith(repoRoot+path.sep))
    return {...noAccess,status:'BLOCKED_PRIVATE_SOURCE_IN_PUBLIC_REPOSITORY'};
  if(!task||!assignment||
     typeof task.taskId!=='string'||typeof task.roleId!=='string')
    return {status:'BLOCKED_UNSTRUCTURED_TASK',executesAgent:false,apiCalls:0};
  // A stale explicit Constitution version must fail closed, never be silently upgraded.
  if(task.constitutionVersion!==undefined&&task.constitutionVersion!=='1.9')
    return {status:'BLOCKED_STALE_CONSTITUTION',executesAgent:false,apiCalls:0};
  const selection=selectSkills({
    id:task.taskId,agentId:task.agentId,roleId:task.roleId,
    scope:task.scope,frozenContextVerified:task.frozenContextVerified,
    capabilities:task.requiredCapabilities
  },assignment,[...CANDIDATES,...DESIGN]);
  if(selection.status!=='READY_OFFLINE')
    return {status:'BLOCKED_SKILL_SELECTION',selection,
      executesAgent:false,apiCalls:0};
  const safeTask={...task,constitutionVersion:'1.9',
    selectedSkillIds:selection.selected,assignedBy:assignment.assignedBy,
    assignmentRef:assignment.reference,
    assignmentVerified:assignment.authorized===true};
  let output,input,packet;
  if(process.platform==='win32'){
    let state;
    try{state=assertPrivateDirectory(privateDirectory);}catch(_){
      return {...noAccess,status:'BLOCKED_WINDOWS_PRIVATE_HOST_ACL'};
    }
    const original=path.join(path.dirname(state),'original');
    try{output=assertPrivateDirectory(original);}catch(_){
      return {...noAccess,status:'BLOCKED_WINDOWS_PRIVATE_HOST_ACL'};
    }
    const nonce=crypto.randomBytes(12).toString('hex');
    input=path.join(output,'task-input-'+nonce+'.json');
    packet=path.join(output,'handoff-private-'+nonce+'.json');
  }else{
    output=fs.mkdtempSync(path.join(os.tmpdir(),'mealup-constitution-'));
    fs.chmodSync(output,0o700);
    input=path.join(output,'task-input.json');
    packet=path.join(output,'handoff-private.json');
  }
  fs.writeFileSync(input,JSON.stringify(safeTask),{mode:0o600});
  verifyCreatedPrivateFile(input);
  const result=spawnSync(pythonExecutable(),[
    path.join(__dirname,'constitution-task-packet.py'),
    '--canonical-docx',canon,'--task-json',input,'--out',packet
  ],{cwd:repoRoot,encoding:'utf8',timeout:12000,maxBuffer:8192});
  if(result.status!==0)
    return {status:'BLOCKED_CANONICAL_PREFLIGHT_FAILED',
      reason:'Consult secure local preflight without exposing rule text in public logs',
      privateWorkspace:output,executesAgent:false,apiCalls:0};
  try{verifyCreatedPrivateFile(packet);}catch(_){
    return {status:'BLOCKED_PRIVATE_PACKET_ACL',executesAgent:false,apiCalls:0};
  }
  let data;
  try{data=JSON.parse(fs.readFileSync(packet,'utf8'));}catch(_){
    return {status:'BLOCKED_UNREADABLE_PACKET',executesAgent:false,apiCalls:0};
  }
  // Digest binds the private exact-rule packet to all downstream handoffs.
  // A digest is NOT proof of real agent identity or CEO consent.
  const packetSha256=crypto.createHash('sha256').update(fs.readFileSync(packet)).digest('hex');
  return {
    status:'VERIFIED_RULE_PACKET_PREPARED_NOT_EXECUTED',
    taskId:data.taskId,roleId:data.roleId,version:data.canonicalVersion,
    originalSha256:data.canonicalSha256,activeRuleCount:data.activeRuleIds.length,
    handoffRuleCount:data.handoffRuleIds.length,
    selectedSkills:data.selectedSkillIds,nextStep:data.recovery.nextAction,
    stepCount:data.steps.length,privatePacketPath:packet,packetSha256,
    requiresIndependentAuthorizationCheck:true,
    executesAgent:false,apiCalls:0,deploys:0,filesChangedInProject:0
  };
}
module.exports={createProtectedHandoff};
