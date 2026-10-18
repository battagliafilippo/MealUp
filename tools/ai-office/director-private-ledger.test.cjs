'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {storeAt}=require('./director-private-ledger.cjs');
function privateDir(){
 const p=fs.mkdtempSync(path.join(os.tmpdir(),'mealup-private-journal-'));
 fs.chmodSync(p,0o700);return p;
}
const event=(id='EV-001',type='INTAKE_BLOCKED',actor='DIRECTOR',
 record={reasonCode:'SOURCE_NOT_AVAILABLE'})=>
 ({id,taskId:'T-001',type,actor,record});
test('starts empty and persists across separate store instances',()=>{
 const p=privateDir();
 try{
  const s=storeAt(p);assert.equal(s.read().events.length,0);
  s.append(event());
  assert.equal(storeAt(p).read().events.length,1);
  assert.equal(storeAt(p).read().events[0].record.reasonCode,'SOURCE_NOT_AVAILABLE');
 }finally{fs.rmSync(p,{recursive:true,force:true});}
});
test('replayed idempotent event never duplicates itself',()=>{
 const p=privateDir();
 try{
  const s=storeAt(p);const a=s.append(event());
  assert.equal(a.status,'APPENDED');
  const b=s.append(event());assert.equal(b.status,'IDEMPOTENT_REPLAY');
  assert.equal(s.read().events.length,1);
 }finally{fs.rmSync(p,{recursive:true,force:true});}
});
test('conflicting replay with matching ID is blocked',()=>{
 const p=privateDir();
 try{
  const s=storeAt(p);s.append(event());
  assert.throws(()=>s.append(event('EV-001','INTAKE_BLOCKED','DIRECTOR',
    {reasonCode:'A_DIFFERENT_REASON'})),/CONFLICTING_EVENT_REPLAY/);
 }finally{fs.rmSync(p,{recursive:true,force:true});}
});
test('all events retain hash linkage and duplicate IDs cannot disappear',()=>{
 const p=privateDir();
 try{
  const s=storeAt(p);s.append(event());s.append(event('EV-002'));
  assert.equal(s.read().events[1].prev,s.read().events[0].hash);
  const file=path.join(p,'director-events.v1.json');
  const obj=JSON.parse(fs.readFileSync(file,'utf8'));
  obj.events[0].record.reasonCode='CHANGED';
  fs.writeFileSync(file,JSON.stringify(obj));
  assert.throws(()=>s.read(),/LEDGER_HISTORY_TAMPER_OR_DUPLICATE/);
 }finally{fs.rmSync(p,{recursive:true,force:true});}
});
test('denies any workspace under public repo',()=>{
 assert.throws(()=>storeAt(path.resolve(__dirname,'../..')),/UNSAFE_PRIVATE_STORAGE/);
});
test('denies world-readable and relative directories',()=>{
 const p=privateDir();
 try{
  fs.chmodSync(p,0o755);assert.throws(()=>storeAt(p),/UNSAFE_PRIVATE_STORAGE/);
  assert.throws(()=>storeAt('relative-path'),/PRIVATE_ABSOLUTE_DIR_REQUIRED/);
 }finally{fs.rmSync(p,{recursive:true,force:true});}
});
test('denies symlink aliases to otherwise private folder',()=>{
 const p=privateDir(),alias=p+'-link';
 try{
  fs.symlinkSync(p,alias);
  assert.throws(()=>storeAt(alias),/UNSAFE_PRIVATE_STORAGE/);
 }finally{fs.unlinkSync(alias);fs.rmSync(p,{recursive:true,force:true});}
});
test('rejects the Constitution rule body and unknown fields',()=>{
 const p=privateDir();
 try{
  const s=storeAt(p);
  assert.throws(()=>s.append(event('EV-SECRET','INTAKE_BLOCKED','DIRECTOR',
    {exactOriginalText:'NEVER_STORE_RULE_TEXT'})),/UNSAFE_EVENT_FIELDS/);
  assert.equal(s.read().events.length,0);
 }finally{fs.rmSync(p,{recursive:true,force:true});}
});
test('verified rule packets must supply 64-character source hash',()=>{
 const p=privateDir();
 try{
  const s=storeAt(p);
  assert.throws(()=>s.append(event('EV-BAD','RULE_PREFLIGHT_READY','DIRECTOR',
    {sourceVerified:true,constitutionSha:'fake'})),/UNVERIFIED_CONSTITUTION_INTAKE/);
  s.append(event('EV-GOOD','RULE_PREFLIGHT_READY','DIRECTOR',
    {sourceVerified:true,constitutionSha:'51043574d188c085de51282e50f8784d8f5cf779300891dee0fe8014414470eb'}));
  assert.equal(s.read().events.length,1);
 }finally{fs.rmSync(p,{recursive:true,force:true});}
});
test('step completion requires traceable evidence; QA is independent',()=>{
 const p=privateDir();
 try{
  const s=storeAt(p);
  assert.throws(()=>s.append(event('EV-STEP','STEP_CHECKPOINT','DIRECTOR',
    {stepId:'S1'})),/STEP_REQUIRES_EVIDENCE/);
  assert.throws(()=>s.append(event('EV-QA','QA_REPORTED','DIRECTOR',
    {resultStatus:'PASS'})),/INDEPENDENT_QA_REQUIRED/);
  assert.throws(()=>s.append(event('EV-STEP','STEP_CHECKPOINT','DIRECTOR',
    {stepId:'S1',evidenceRef:'CI-RUN-123'})),/CHECKPOINT_REQUIRES_VERIFIED_PREFLIGHT/);
  s.append(event('EV-RULES','RULE_PREFLIGHT_READY','DIRECTOR',
    {sourceVerified:true,constitutionSha:'51043574d188c085de51282e50f8784d8f5cf779300891dee0fe8014414470eb'}));
  s.append(event('EV-STEP','STEP_CHECKPOINT','DIRECTOR',
    {stepId:'S1',evidenceRef:'CI-RUN-123'}));
  s.append(event('EV-QA','QA_REPORTED','QA',
    {resultStatus:'PARTIAL',evidenceRef:'AUDIT-456'}));
  assert.equal(s.read().events.length,3);
 }finally{fs.rmSync(p,{recursive:true,force:true});}
});
test('an active lock refuses concurrent journal writes without modifying history',()=>{
 const p=privateDir();
 try{
  const s=storeAt(p);fs.writeFileSync(path.join(p,'.director-events.lock'),'LOCKED');
  assert.throws(()=>s.append(event()),/PRIVATE_STORE_BUSY/);
  assert.equal(s.read().events.length,0);
 }finally{fs.rmSync(p,{recursive:true,force:true});}
});
