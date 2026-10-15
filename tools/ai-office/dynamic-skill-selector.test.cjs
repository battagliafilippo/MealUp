'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {roles,selectSkills}=require('./dynamic-skill-selector.cjs');
function fixture(roleId) {
 const task={id:'T1',agentId:'agent-A',roleId,scope:'LAB',
   frozenContextVerified:true,capabilities:['CODE','IOS_ACCESSIBILITY']};
 const assignment={authorized:true,reference:'APPROVED_SCOPE_1',
   assignedBy:roleId==='SCOUT'?'CEO':'DIRECTOR',
   taskId:'T1',agentId:'agent-A',roleId,scope:'LAB'};
 const skill=(id,capabilities,qaScore=90)=>({
   id,capabilities,roles:[roleId],scopes:['LAB'],kind:'INTERNAL',
   approved:true,qaVerified:true,securityReviewed:true,
   approvalRef:'AUDIT_001',version:'1.0',quotaKind:'RECURRING_FREE_QUOTA',
   extraCostEUR:0,quotaVerified:true,needsNewPrivileges:false,
   changesFrozen:false,qaScore
 });
 return {task,assignment,skill};
}
test('all eight roles can select approved skills as necessary',()=>{
 for(const roleId of roles){
  const x=fixture(roleId);
  const result=selectSkills(x.task,x.assignment,[x.skill('S1',['CODE']),
    x.skill('S2',['IOS_ACCESSIBILITY'])]);
  assert.equal(result.status,'READY_OFFLINE');
  assert.deepEqual(result.selected,['S1','S2']);
  assert.equal(result.realInvocations,0);
 }
});
test('skills discovered after hiring can be used within approved scope',()=>{
 const x=fixture('ENGINEERING');
 const result=selectSkills(x.task,x.assignment,[
  x.skill('INITIAL',['CODE']),x.skill('NEW_IOS_SKILL',['IOS_ACCESSIBILITY'])]);
 assert.equal(result.status,'READY_OFFLINE');
 assert.ok(result.selected.includes('NEW_IOS_SKILL'));
});
test('the best independently scored suitable skill wins for a capability',()=>{
 const x=fixture('DESIGN');
 x.task.capabilities=['CODE'];
 const r=selectSkills(x.task,x.assignment,[
  x.skill('WEAKER',['CODE'],60),x.skill('STRONGER',['CODE'],95)]);
 assert.deepEqual(r.selected,['STRONGER']);
});
test('no approved skill means request review, not silent installation',()=>{
 const x=fixture('FOOD');
 const r=selectSkills(x.task,x.assignment,[]);
 assert.equal(r.status,'NEEDS_REVIEW');
 assert.deepEqual(r.missing,['CODE','IOS_ACCESSIBILITY']);
 assert.equal(r.installs,0);
});
test('Scout is directed by CEO rather than Director',()=>{
 const x=fixture('SCOUT');
 x.assignment.assignedBy='DIRECTOR';
 assert.equal(selectSkills(x.task,x.assignment,[]).status,'BLOCKED');
});
test('specialists require Director scoped handoff',()=>{
 const x=fixture('QA');x.assignment.assignedBy='CEO';
 assert.equal(selectSkills(x.task,x.assignment,[]).status,'BLOCKED');
});
