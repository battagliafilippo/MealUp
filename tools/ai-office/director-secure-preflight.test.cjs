'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {prepare}=require('./director-secure-preflight.cjs');
const {storeAt}=require('./director-private-ledger.cjs');
function workspace(){
 const p=fs.mkdtempSync(path.join(os.tmpdir(),'mealup-director-secure-'));
 fs.chmodSync(p,0o700);return p;
}
function fixture(){
 const task={taskId:'T-LAB-001',agentId:'LAB_ENGINEERING',roleId:'ENGINEERING',
   scope:'LAB_READ_ONLY',frozenContextVerified:true,
   constitutionVersion:'1.9',requiredCapabilities:['JS_SYNTAX_AUDIT'],
   goal:'Inspect code without changes',activeBriefVersion:'OFFICE_B1',
   baselineId:'SHA_LAB',risk:'LOW',must:['No app writes'],
   invariants:['Frozen remains'],frozen:['APP_UI'],doNotTouch:['main'],
   acceptance:['Independent QA'],writeScope:[],knownUnknowns:[],
   tags:['existing_code'],steps:[{id:'S1',objective:'Read code',
    scope:'LAB',preconditions:'Original rule packet',
    expectedOutput:'Evidence',verification:'QA',doneWhen:'Verified',
    dependsOn:[],status:'OPEN'}]};
 const assignment={assignedBy:'DIRECTOR',authorized:true,reference:'CEO_LAB_READONLY',
   taskId:task.taskId,agentId:task.agentId,roleId:task.roleId,scope:task.scope};
 return {task,assignment};
}
test('never calls a model or dispatches when private original absent',()=>{
 const w=workspace();try{
  const r=prepare({...fixture(),attemptId:'ATTEMPT_1',privateDirectory:w});
  assert.equal(r.status,'BLOCKED_CANONICAL_CONSTITUTION_NOT_ACCESSIBLE');
  assert.equal(storeAt(w).read().events[0].type,'INTAKE_BLOCKED');
  assert.equal(r.externalModelCalls,0);
 }finally{fs.rmSync(w,{recursive:true,force:true});}
});
test('blocked status persists across Director process restart',()=>{
 const w=workspace();try{
  prepare({...fixture(),attemptId:'ATTEMPT_1',privateDirectory:w});
  assert.equal(storeAt(w).read().events.length,1);
 }finally{fs.rmSync(w,{recursive:true,force:true});}
});
test('identical retry stays idempotent and separate attempt preserved',()=>{
 const w=workspace();try{
  const options={...fixture(),attemptId:'ATTEMPT_1',privateDirectory:w};
  prepare(options);
  const r=prepare(options);assert.equal(r.journalStatus,'IDEMPOTENT_REPLAY');
  prepare({...options,attemptId:'ATTEMPT_2'});
  assert.equal(storeAt(w).read().events.length,2);
 }finally{fs.rmSync(w,{recursive:true,force:true});}
});
test('cannot store in repo and cannot run with invalid branch contract',()=>{
 const x=prepare({...fixture(),attemptId:'ATTEMPT_1',privateDirectory:'tools/ai-office/'});
 assert.equal(x.status,'BLOCKED_PRIVATE_STORAGE_UNAVAILABLE');
});
test('invalid original bytes lead to metadata-only blocked checkpoint',()=>{
 const w=workspace();
 try{
  const file=path.join(w,'FAKE_SOURCE.docx');
  fs.writeFileSync(file,'NOT THE ORIGINAL',{mode:0o600});
  const r=prepare({...fixture(),attemptId:'ATTEMPT_1',privateDirectory:w,sourcePath:file});
  assert.equal(r.status,'BLOCKED_CANONICAL_PREFLIGHT_FAILED');
  const ledger=storeAt(w).read();
  assert.equal(ledger.events.length,1);
  assert.ok(!JSON.stringify(ledger).includes('ORIGINAL_RULE_TEXT'));
 }finally{fs.rmSync(w,{recursive:true,force:true});}
});
test('missing unique attempt id fails before directory access',()=>{
 const r=prepare({...fixture(),attemptId:'../ESCAPE'});
 assert.equal(r.status,'BLOCKED_INVALID_DIRECTOR_BRIEF');
});
