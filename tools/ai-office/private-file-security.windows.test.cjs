'use strict';
// Synthetic Windows-only integration: no canonical Constitution and no secrets.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {assertPrivateDirectory,assertPrivateFile}=require('./private-file-security.cjs');
const {storeAt}=require('./director-private-ledger.cjs');
const {createSnapshot,readSnapshot,sourceVerified}=require('./director-host-recovery.cjs');
const tool=path.join(__dirname,'windows-private-host.ps1');
const windows=test.skip.bind(test);
function ps(args){
 const r=spawnSync('pwsh.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',tool,...args],
  {encoding:'utf8',timeout:20000,windowsHide:true});
 if(r.error||r.status!==0)throw Error('SYNTHETIC_WINDOWS_SETUP_FAILED');
 return JSON.parse(r.stdout.trim());
}
if(process.platform!=='win32'){
 test('native NTFS integration is exercised only on a Windows runner',{skip:true},()=>{});
}else{
 const base=path.join(process.env.LOCALAPPDATA,'MealUp-Node-ACL-Test-'+crypto.randomUUID().replaceAll('-',''));
 const root=path.join(base,'AI-Office-Private'),state=path.join(root,'state');
 const archive=path.join(root,'archive'),original=path.join(root,'original');
 test.before(()=>{ps(['-Action','Provision','-Root',root]);});
 test.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 test('native bootstrap provisions a Node-consumable private host',()=>{
  const value=ps(['-Action','Verify','-Root',root]);
  assert.equal(value.status,'ACL_VERIFIED');
  assert.equal(assertPrivateDirectory(state),fs.realpathSync(state));
  assert.equal(assertPrivateDirectory(archive),fs.realpathSync(archive));
 });
 test('Node verifies a synthetic private file through native NTFS ACLs',()=>{
  const fake=path.join(original,'SYNTHETIC-NOT-CONSTITUTION.txt');
  fs.writeFileSync(fake,'synthetic only');
  assert.equal(assertPrivateFile(fake),fs.realpathSync(fake));
  assert.equal(sourceVerified(fake),false);
 });
 test('Python accepts native ACL gate before rejecting synthetic source hash',()=>{
  const fake=path.join(original,'SYNTHETIC-NOT-CONSTITUTION.txt');
  if(!fs.existsSync(fake))fs.writeFileSync(fake,'synthetic only');
  const python=process.env.MEALUP_PYTHON_EXECUTABLE||'python';
  const run=spawnSync(python,[path.join(__dirname,'constitution-task-packet.py'),
   '--canonical-docx',fake,'--verify-source-only'],{encoding:'utf8',timeout:20000});
  assert.equal(run.status,2);
  assert.match(run.stderr,/BLOCKED_CANONICAL_VERSION_OR_SHA_MISMATCH/);
  assert.doesNotMatch(run.stderr,/WINDOWS_NATIVE_ACL|PRIVATE_PATH_NOT_MANAGED/);
 });
 test('journal and snapshot writes are ACL-verified without private source data',()=>{
  storeAt(state).append({id:'SYNTHETIC_INTAKE',taskId:'SYNTHETIC_TASK',
   type:'INTAKE_BLOCKED',actor:'DIRECTOR',record:{reasonCode:'SYNTHETIC_ONLY'}});
  const baselineId='a'.repeat(40),snapshotId='synthetic-windows-01';
  const made=createSnapshot({workingDirectory:state,archiveDirectory:archive,baselineId,snapshotId});
  assert.equal(made.status,'PRIVATE_METADATA_SNAPSHOT_CREATED');
  assert.equal(readSnapshot({archiveDirectory:archive,baselineId,snapshotId}).doc.payload.journal.events.length,1);
 });
 test('Node refuses non-managed Windows directories without a fallback',()=>{
  assert.throws(()=>assertPrivateDirectory(root),/WINDOWS_PRIVATE_PATH_MUST_USE_MANAGED_DIRECTORY/);
 });
}
