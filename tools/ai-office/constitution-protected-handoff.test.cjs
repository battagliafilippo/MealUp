'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createProtectedHandoff}=require('./constitution-protected-handoff.cjs');
function fixture(){
 const task={taskId:'TEMP_LAB',agentId:'LAB_ENGINEERING',roleId:'ENGINEERING',
   scope:'LAB_READ_ONLY',frozenContextVerified:true,
   requiredCapabilities:['JS_SYNTAX_AUDIT'],
   goal:'Inspect repository code, no changes',
   activeBriefVersion:'LAB_B1',baselineId:'LAB_SNAPSHOT',
   risk:'LOW',must:['No production writes'],invariants:['Frozen intact'],
   frozen:['MealUp UI'],doNotTouch:['main'],acceptance:['Pass QA'],
   writeScope:[],knownUnknowns:[],tags:['existing_code'],
   steps:[{id:'S1',objective:'Audit source',scope:'LAB',preconditions:'Verified packet',
     expectedOutput:'Report',verification:'CI pass',doneWhen:'No errors',
     dependsOn:[],status:'OPEN'}]};
 const assignment={assignedBy:'DIRECTOR',authorized:true,
   reference:'CEO_LAB_READONLY',taskId:'TEMP_LAB',agentId:'LAB_ENGINEERING',
   roleId:'ENGINEERING',scope:'LAB_READ_ONLY'};
 return {task,assignment};
}
test('protected Constitution absent: task is blocked, no agent executed',()=>{
 const {task,assignment}=fixture();
 const x=createProtectedHandoff({task,assignment,sourcePath:'/tmp/absent-constitution-original.docx'});
 assert.equal(x.status,'BLOCKED_CANONICAL_CONSTITUTION_NOT_ACCESSIBLE');
 assert.equal(x.executesAgent,false);
 assert.equal(x.apiCalls,0);
});
test('public-repository file cannot serve as canonical private source',()=>{
 const {task,assignment}=fixture();
 const x=createProtectedHandoff({task,assignment,
   sourcePath:'tools/ai-office/constitution-task-packet.py'});
 assert.equal(x.status,'BLOCKED_PRIVATE_SOURCE_IN_PUBLIC_REPOSITORY');
});
test('unverified source bytes cannot create apparently verified handoff',()=>{
 const {task,assignment}=fixture();
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mealup-constitution-negative-'));
 const file=path.join(dir,'INVALID_SOURCE.docx');
 try{
  fs.writeFileSync(file,'NOT THE CANONICAL DOCX',{mode:0o600});
  const x=createProtectedHandoff({task,assignment,sourcePath:file});
  assert.equal(x.status,'BLOCKED_CANONICAL_PREFLIGHT_FAILED');
  assert.equal(x.executesAgent,false);
  assert.equal(x.apiCalls,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('no director assignment or unapproved skill can bypass the scope gate',()=>{
 const {task,assignment}=fixture();
 task.requiredCapabilities=['INSTALL_UNREVIEWED_TOOL'];
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mealup-preflight-skill-'));
 const file=path.join(temp,'INVALID_DOC.docx');
 try{
  fs.writeFileSync(file,'INVALID',{mode:0o600});
  const x=createProtectedHandoff({task,assignment,sourcePath:file});
  assert.equal(x.status,'BLOCKED_SKILL_SELECTION');
  assert.equal(x.executesAgent,false);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
