'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createSnapshot,readSnapshot,restoreSnapshot,sourceVerified}=require('./director-host-recovery.cjs');
const {storeAt}=require('./director-private-ledger.cjs');
const SHA='a'.repeat(40);
function fixture(){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'mealup-safe-host-recovery-'));
 fs.chmodSync(base,0o700);
 const work=path.join(base,'state'),archive=path.join(base,'archive');
 fs.mkdirSync(work,{mode:0o700});fs.mkdirSync(archive,{mode:0o700});
 return {base,work,archive};
}
const opts=f=>({workingDirectory:f.work,archiveDirectory:f.archive,baselineId:SHA,snapshotId:'CHECKPOINT_01'});
function cleanup(f){fs.rmSync(f.base,{recursive:true,force:true})}
test('metadata snapshot preserves private checkpoint history, no external source copy',()=>{
 const f=fixture();try{
  storeAt(f.work).append({id:'EV-ONE',taskId:'TASK_01',type:'INTAKE_BLOCKED',
   actor:'DIRECTOR',record:{reasonCode:'AWAIT_ORIGINAL_PRIVATE_SOURCE'}});
  const r=createSnapshot(opts(f));
  assert.equal(r.status,'PRIVATE_METADATA_SNAPSHOT_CREATED');
  assert.equal(r.journalEvents,1);assert.equal(r.mailboxMessages,0);
  assert.equal(r.sourceCopied,false);assert.equal(r.modelCalls,0);
  const s=readSnapshot(opts(f));
  assert.equal(s.doc.payload.journal.events.length,1);
  assert.equal(s.doc.payload.mailbox.items.length,0);
  assert.equal(s.doc.payload.sourceSha256.length,64);
  assert.equal(s.doc.sha256,r.digest);
  assert.ok(!JSON.stringify(s.doc).includes('exactOriginalText'));
  const name=path.join(f.archive,'director-recovery-CHECKPOINT_01.json');
  assert.equal(fs.statSync(name).mode&0o077,0);
 }finally{cleanup(f)}
});
test('a checkpoint cannot overwrite another snapshot with the same ID',()=>{
 const f=fixture();try{
  createSnapshot(opts(f));
  assert.throws(()=>createSnapshot(opts(f)),/EEXIST/);
  assert.equal(readSnapshot(opts(f)).doc.payload.journal.events.length,0);
 }finally{cleanup(f)}
});
test('private snapshot rejects manual edits and stale baselines',()=>{
 const f=fixture();try{
  createSnapshot(opts(f));
  const file=path.join(f.archive,'director-recovery-CHECKPOINT_01.json');
  let s=JSON.parse(fs.readFileSync(file,'utf8'));
  s.payload.baselineId='f'.repeat(40);
  fs.writeFileSync(file,JSON.stringify(s));
  assert.throws(()=>readSnapshot(opts(f)),/CORRUPTED_STALE_OR_FORGED_SNAPSHOT/);
  assert.throws(()=>readSnapshot({...opts(f),baselineId:'z'.repeat(40)}),/INVALID_BASELINE_OR_SNAPSHOT_ID/);
 }finally{cleanup(f)}
});
test('host refuses public directories, nested archive and symlinked backup',()=>{
 const f=fixture();try{
  const nested=path.join(f.work,'archive');fs.mkdirSync(nested,{mode:0o700});
  assert.throws(()=>createSnapshot({...opts(f),archiveDirectory:nested}),
    /ARCHIVE_MUST_BE_SEPARATE_PRIVATE_DIRECTORY/);
  fs.chmodSync(f.archive,0o755);
  assert.throws(()=>createSnapshot(opts(f)),/UNSAFE_PRIVATE_DIRECTORY/);
  fs.chmodSync(f.archive,0o700);
  const alias=path.join(f.base,'alias');fs.symlinkSync(f.archive,alias);
  assert.throws(()=>createSnapshot({...opts(f),archiveDirectory:alias}),/UNSAFE_PRIVATE_DIRECTORY/);
  fs.unlinkSync(alias);
 }finally{cleanup(f)}
});
test('archive rejects invalid identifiers and never creates unsafe paths',()=>{
 const f=fixture();try{
  for(const value of ['../break','', 'a/b','..','x'.repeat(90)]){
   assert.throws(()=>createSnapshot({...opts(f),snapshotId:value}),/INVALID_BASELINE_OR_SNAPSHOT_ID/);
  }
  assert.equal(fs.readdirSync(f.archive).length,0);
 }finally{cleanup(f)}
});
test('restore refuses absent or guessed canonical source and preserves empty target',()=>{
 const f=fixture();try{
  createSnapshot(opts(f));
  assert.equal(sourceVerified(path.join(f.base,'NOT_THERE.docx')),false);
  const source=path.join(f.base,'dummy.docx');fs.writeFileSync(source,'FAKE',{mode:0o600});
  assert.equal(sourceVerified(source),false);
  assert.throws(()=>restoreSnapshot({...opts(f),sourcePath:source,
     expectedCurrentBaseline:SHA}),/CANONICAL_PRIVATE_ORIGINAL_REQUIRED/);
  assert.deepEqual(fs.readdirSync(f.work),[]);
 }finally{cleanup(f)}
});
test('a world-readable or symlinked source is never treated as verified',()=>{
 const f=fixture();try{
  const source=path.join(f.base,'fake.docx');
  fs.writeFileSync(source,'FAKE',{mode:0o644});
  assert.equal(sourceVerified(source),false);
  fs.chmodSync(source,0o600);
  const alias=path.join(f.base,'alias.docx');fs.symlinkSync(source,alias);
  assert.equal(sourceVerified(alias),false);
 }finally{cleanup(f)}
});
test('snapshot is verified without relying on a running model or remote API',()=>{
 const f=fixture();try{
  const v=createSnapshot(opts(f));
  assert.equal(v.modelCalls,0);
  assert.equal(readSnapshot(opts(f)).doc.payload.baselineId,SHA);
  assert.equal(fs.readdirSync(f.work).length,0);
 }finally{cleanup(f)}
});
