'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {auditLedger,compareVersions}=require('./masterplan-audit.cjs');
const baseline=require('./masterplan-ledger.json');
const copy=x=>JSON.parse(JSON.stringify(x));
const validate=doc=>auditLedger(doc);
test('canonical office ledger is structurally valid',()=>{
 const r=validate(baseline);
 assert.deepEqual(r.errors,[]);
 assert.equal(r.summary.phases,5);
 assert.equal(r.summary.components>=10,true);
 assert.equal(r.summary.steps>=14,true);
});
test('protected Constitution is private, frozen and unchanged',()=>{
 assert.equal(baseline.constitution.version,'1.9');
 assert.equal(baseline.constitution.publicCopyAllowed,false);
 assert.equal(baseline.constitution.sourceTextEmbedded,false);
 assert.equal(baseline.contract.budgetAdditionalEUR,0);
});
test('Scouting remains independent and Director cannot promote agents',()=>{
 assert.equal(baseline.contract.scoutReporting,'CEO_ONLY');
 assert.equal(baseline.contract.ceoFinalAuthority,true);
 assert.ok(baseline.invariants.includes('NO_AUTOMATIC_AGENT_RECRUITMENT'));
});
test('every step keeps objective, preconditions, proof and exit conditions',()=>{
 for(const p of baseline.phases)for(const s of p.steps){
  assert.match(s.id,/^AIOS-0[1-5]\.\d+$/);
  assert.ok(s.objective);
  assert.ok(s.preconditions);
  assert.ok(s.expectedOutput);
  assert.ok(s.verification);
  assert.ok(s.doneWhen);
 }
});
test('all VERIFIED steps must carry evidence',()=>{
 const x=copy(baseline);
 x.phases[0].steps[0].evidence=[];
 assert.ok(validate(x).errors.some(e=>e.startsWith('VERIFIED_STEP_WITHOUT_EVIDENCE')));
});
test('blocked steps must have a real blocking reason',()=>{
 const x=copy(baseline);
 x.phases[1].steps[0].status='BLOCKED';
 x.phases[1].steps[0].blockingReasons=[];
 assert.ok(validate(x).errors.some(e=>e.startsWith('BLOCKED_STEP_WITHOUT_REASON')));
});
test('every dependency ID must be resolvable',()=>{
 const x=copy(baseline);
 x.phases[4].steps[0].dependsOn=['DOES_NOT_EXIST'];
 assert.ok(validate(x).errors.some(e=>e.startsWith('UNKNOWN_STEP_DEPENDENCY')));
});
test('dependencies cannot be cyclic',()=>{
 const x=copy(baseline);
 x.phases[0].steps[0].dependsOn=['AIOS-01.2'];
 assert.ok(validate(x).errors.some(e=>e.startsWith('STEP_DEPENDENCY_CYCLE')));
});
test('approved decisions require provenance and are immutable in transition',()=>{
 const x=copy(baseline);
 x.decisions[0].source='MISSING';
 assert.ok(validate(x).errors.some(e=>e.startsWith('DECISION_SOURCE_NOT_FOUND')));
 const next=copy(baseline);
 next.decisions[0].decision='A new unapproved decision';
 assert.ok(compareVersions(baseline,next).errors.some(e=>e.startsWith('APPROVED_DECISION_CHANGED')));
});
test('no previously recorded step can silently vanish',()=>{
 const next=copy(baseline);
 next.phases[2].steps.pop();
 assert.ok(compareVersions(baseline,next).errors.some(e=>e.startsWith('SILENT_LOST_STEP')));
});
test('a moved step requires a target ID and written explanation',()=>{
 const next=copy(baseline);
 const old=next.phases[4].steps.pop();
 next.recovery.stepReconciliations=[{oldId:old.id,newId:'AIOS-05.1',reason:'Combined after scope analysis'}];
 assert.equal(compareVersions(baseline,next).status,'PASS');
 next.recovery.stepReconciliations=[];
 assert.equal(compareVersions(baseline,next).status,'FAIL');
});
test('no previous sources, components, blockers or decisions can be deleted silently',()=>{
 for(const field of ['canonicalSources','components','knownUnknowns','decisions']){
  const x=copy(baseline);
  x[field].pop();
  assert.ok(compareVersions(baseline,x).errors.some(e=>e.startsWith('SILENT_DELETION:'+field)));
 }
});
test('completed step cannot be silently reopened',()=>{
 const x=copy(baseline);
 x.phases[0].steps[0].status='OPEN';
 assert.ok(compareVersions(baseline,x).errors.some(e=>e.startsWith('VERIFIED_STEP_REGRESSION')));
});
test('unknown facts must be tracked to a real work step',()=>{
 const x=copy(baseline);
 x.knownUnknowns[0].relatedStep='OTHER';
 assert.ok(validate(x).errors.some(e=>e.startsWith('UNTRACKED_UNKNOWN')));
});
test('unsafe scope, budget or missing guard fails audit',()=>{
 const x=copy(baseline);
 x.branch='main';x.contract.budgetAdditionalEUR=1;
 x.invariants=x.invariants.filter(i=>i!=='NO_MAIN_WRITES');
 const errs=validate(x).errors;
 assert.ok(errs.includes('LAB_SCOPE_ONLY'));
 assert.ok(errs.includes('CEO_SCOUT_ZERO_BUDGET_CONTRACT'));
 assert.ok(errs.includes('MISSING_INVARIANT:NO_MAIN_WRITES'));
});
