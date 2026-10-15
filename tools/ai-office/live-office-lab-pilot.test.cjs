'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {selectSkills}=require('./dynamic-skill-selector.cjs');
const {runTask,main}=require('./live-office-lab-pilot.cjs');
const catalog=require('./live-skill-catalog.json').catalog;
const branch='experiment/recipe-visual-agents';
function prepare(role,capability){
 const task={id:'READONLY',agentId:'LAB_'+role,roleId:role,
   scope:'LAB_READ_ONLY',frozenContextVerified:true,capabilities:[capability]};
 const assignment={assignedBy:'DIRECTOR',authorized:true,reference:'READONLY_CEO_SCOPE',
   taskId:task.id,agentId:task.agentId,roleId:role,scope:task.scope};
 return {task,assignment};
}
test('two operational skills exist and are fixed read-only scripts',()=>{
 assert.equal(catalog.length,2);
 for(const s of catalog){
  assert.equal(s.extraCostEUR,0);
  assert.equal(s.kind,'INTERNAL');
  assert.equal(s.scopes[0],'LAB_READ_ONLY');
  assert.equal(s.needsNewPrivileges,false);
  assert.equal(s.changesFrozen,false);
  assert.equal(fs.existsSync(s.internalRunner),true);
 }
});
test('Engineering chooses its concrete audit Skill within scope',()=>{
 const {task,assignment}=prepare('ENGINEERING','JS_SYNTAX_AUDIT');
 const s=selectSkills(task,assignment,catalog);
 assert.equal(s.status,'READY_OFFLINE');
 assert.deepEqual(s.selected,['MEALUP_ENGINEERING_JS_AUDIT']);
});
test('QA chooses independent regression Skill, not Engineering Skill',()=>{
 const {task,assignment}=prepare('QA','OFFICE_REGRESSION_QA');
 const s=selectSkills(task,assignment,catalog);
 assert.deepEqual(s.selected,['MEALUP_QA_REGRESSION_GATE']);
});
test('cross-role misuse is not allowed',()=>{
 const {task,assignment}=prepare('DESIGN','JS_SYNTAX_AUDIT');
 assert.equal(selectSkills(task,assignment,catalog).status,'NEEDS_REVIEW');
});
test('every execution entrypoint rejects absent lab gate',()=>{
 const saved=process.env.MEALUP_LAB_EXECUTE;
 delete process.env.MEALUP_LAB_EXECUTE;
 try{
  assert.equal(runTask('ENGINEERING','JS_SYNTAX_AUDIT',
    'MEALUP_ENGINEERING_JS_AUDIT').status,'BLOCKED_LAB_EXECUTION_GATES');
  assert.throws(()=>main(),/EXPLICIT_LAB_EXECUTION_GATES_REQUIRED/);
 }finally{if(saved===undefined)delete process.env.MEALUP_LAB_EXECUTE;
 else process.env.MEALUP_LAB_EXECUTE=saved;}
});
test('unknown skill never maps to executable code',()=>{
 const {task,assignment}=prepare('ENGINEERING','ARBITRARY_COMMAND');
 assert.equal(selectSkills(task,assignment,catalog).status,'NEEDS_REVIEW');
});
test('catalog never exposes production scope or paid fallback',()=>{
 assert.ok(catalog.every(s=>s.quotaKind==='VERIFIED_PREEXISTING_FREE_COMPUTE'));
 assert.ok(catalog.every(s=>s.scopes.every(sc=>sc!=='PRODUCTION')));
});
