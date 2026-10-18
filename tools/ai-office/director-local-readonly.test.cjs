'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {runPrivateOffice,taskFor,baseline}=require('./director-local-readonly.cjs');
const {storeAt}=require('./director-private-ledger.cjs');
const privateDir=()=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'mealup-source-host-'));fs.chmodSync(d,0o700);return d;};
function labEnv(fn){
 const before={MEALUP_LAB_EXECUTE:process.env.MEALUP_LAB_EXECUTE,
    GITHUB_REF_NAME:process.env.GITHUB_REF_NAME};
 try{process.env.MEALUP_LAB_EXECUTE='YES';process.env.GITHUB_REF_NAME='experiment/recipe-visual-agents';return fn();}
 finally{for(const [key,val] of Object.entries(before))if(val===undefined)delete process.env[key];else process.env[key]=val;}
}
test('only bounded internal Engineering and QA objectives are permitted',()=>{
 const task=taskFor('f'.repeat(40));
 assert.equal(task.constitutionVersion,'1.9');
 assert.equal(task.scope,'LAB_READ_ONLY');
 assert.equal(task.writeScope.length,0);
 assert.deepEqual(task.requiredCapabilities,['JS_SYNTAX_AUDIT']);
 assert.equal(task.steps.length,2);
 assert.equal(task.steps[1].dependsOn[0],task.steps[0].id);
 assert.ok(task.doNotTouch.includes('main'));
 assert.ok(task.doNotTouch.includes('Food Portrait'));
});
test('without explicit branch and execution consent no work is possible',()=>{
 const p=privateDir();try{
  const before=process.env.MEALUP_LAB_EXECUTE;delete process.env.MEALUP_LAB_EXECUTE;
  try{
   const r=runPrivateOffice({privateDirectory:p,sourcePath:'/missing'});
   assert.equal(r.status,'BLOCKED_EXPLICIT_LAB_EXECUTION_GATES');
   assert.equal(r.externalAIRequests,0);
  }finally{if(before===undefined)delete process.env.MEALUP_LAB_EXECUTE;else process.env.MEALUP_LAB_EXECUTE=before;}
  assert.deepEqual(fs.readdirSync(p),[]);
 }finally{fs.rmSync(p,{recursive:true,force:true});}
});
test('missing exact original never runs Engineering or QA',()=>{
 const p=privateDir();try{labEnv(()=>{
  const r=runPrivateOffice({privateDirectory:p,sourcePath:path.join(p,'ABSENT.docx'),expectedBaseline:baseline()});
  assert.equal(r.status,'BLOCKED_CANONICAL_SOURCE_NOT_AVAILABLE');
  assert.equal(r.autonomousAIAgents,false);
  assert.equal(r.appFilesWritten,0);
  assert.equal(r.productionDeploys,0);
  assert.deepEqual(fs.readdirSync(p),[]);
 });}finally{fs.rmSync(p,{recursive:true,force:true});}
});
test('world-readable or symlinked original is blocked before preflight',()=>{
 const p=privateDir();try{labEnv(()=>{
  const doc=path.join(p,'notprivate.docx');
  fs.writeFileSync(doc,'FAKE',{mode:0o644});
  assert.equal(runPrivateOffice({privateDirectory:p,sourcePath:doc,expectedBaseline:baseline()}).status,'BLOCKED_PRIVATE_SOURCE_PERMISSIONS');
  fs.chmodSync(doc,0o600);const alias=path.join(p,'link.docx');fs.symlinkSync(doc,alias);
  assert.equal(runPrivateOffice({privateDirectory:p,sourcePath:alias,expectedBaseline:baseline()}).status,'BLOCKED_PRIVATE_SOURCE_PERMISSIONS');
 });}finally{fs.rmSync(p,{recursive:true,force:true});}
});
test('incorrect source bytes block and preserve only private metadata',()=>{
 const p=privateDir();try{labEnv(()=>{
  const doc=path.join(p,'notcanonical.docx');fs.writeFileSync(doc,'NOT THE ORIGINAL',{mode:0o600});
  const r=runPrivateOffice({privateDirectory:p,sourcePath:doc,expectedBaseline:baseline()});
  assert.equal(r.status,'BLOCKED_CANONICAL_PREFLIGHT_FAILED');
  assert.equal(r.autonomousAIAgents,false);assert.equal(r.externalAIRequests,0);
  const events=storeAt(p).read().events;
  assert.equal(events.length,1);assert.equal(events[0].type,'INTAKE_BLOCKED');
  assert.equal(fs.readdirSync(p).some(x=>x==='office-mailbox.v1.json'),false);
  assert.ok(!JSON.stringify(events).includes('NOT THE ORIGINAL'));
 });}finally{fs.rmSync(p,{recursive:true,force:true});}
});
test('incorrect baseline cannot start even with source present',()=>{
 const p=privateDir();try{labEnv(()=>{
  const file=path.join(p,'dummy.docx');fs.writeFileSync(file,'fake',{mode:0o600});
  const r=runPrivateOffice({privateDirectory:p,sourcePath:file,expectedBaseline:'0'.repeat(40)});
  assert.equal(r.status,'BLOCKED_STALE_BRANCH_OR_BASELINE');
 });}finally{fs.rmSync(p,{recursive:true,force:true});}
});
test('refuses broad or world-readable persistence directory',()=>{
 const p=privateDir();try{labEnv(()=>{
  const doc=path.join(p,'fake.docx');fs.writeFileSync(doc,'FAKE',{mode:0o600});
  fs.chmodSync(p,0o755);
  const r=runPrivateOffice({privateDirectory:p,sourcePath:doc,expectedBaseline:baseline()});
  assert.equal(r.status,'BLOCKED_PRIVATE_HOST_STORAGE');
 });}finally{fs.rmSync(p,{recursive:true,force:true});}
});
test('fail-closed runner cannot convert a dummy document to a PASS',()=>{
 const p=privateDir();try{labEnv(()=>{
  const doc=path.join(p,'dummy.docx');fs.writeFileSync(doc,'INVALID',{mode:0o600});
  for(let n=0;n<2;n++){
   const r=runPrivateOffice({privateDirectory:p,sourcePath:doc,expectedBaseline:baseline()});
   assert.equal(r.status,'BLOCKED_CANONICAL_PREFLIGHT_FAILED');
  }
  assert.equal(storeAt(p).read().events.length,1);
 });}finally{fs.rmSync(p,{recursive:true,force:true});}
});
