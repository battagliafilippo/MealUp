'use strict';
// Private, metadata-only Director snapshots for process restart / device backup.
// This module does NOT mount ChatGPT Library, install a service or authenticate AI agents.
// Snapshot SHA protects against accidental corruption, NOT a malicious archive writer.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {storeAt}=require('./director-private-ledger.cjs');
const {mailboxAt}=require('./director-private-mailbox.cjs');
const {baseline,cleanCheckout}=require('./director-local-readonly.cjs');
const {assertPrivateDirectory,assertPrivateFile,verifyCreatedPrivateFile}=require('./private-file-security.cjs');
const ROOT=path.resolve(__dirname,'../..');
const CANONICAL='51043574d188c085de51282e50f8784d8f5cf779300891dee0fe8014414470eb';
const SCHEMA='MEALUP_DIRECTOR_OFFLINE_RECOVERY_V1';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const slug=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(x);
const revision=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const within=(a,b)=>a===b||a.startsWith(b+path.sep);
function folder(value){
 if(typeof value!=='string'||!path.isAbsolute(value))throw Error('ABSOLUTE_PRIVATE_DIR_REQUIRED');
 return assertPrivateDirectory(value);
}
function locations(workspace,archive){
 const work=folder(workspace),dest=folder(archive);
 if(within(work,dest)||within(dest,work))
   throw Error('ARCHIVE_MUST_BE_SEPARATE_PRIVATE_DIRECTORY');
 return {work,dest};
}
function filePath(archive,snapshotId){return path.join(archive,'director-recovery-'+snapshotId+'.json');}
function envelope(ledger,mailbox,baselineId,snapshotId){
 const payload={schema:SCHEMA,snapshotId,baselineId,sourceSha256:CANONICAL,
   journal:ledger,mailbox,format:'PRIVATE_METADATA_ONLY_NEVER_ORIGINAL_RULE_TEXT'};
 return {payload,sha256:hash(JSON.stringify(payload))};
}
function writeNew(file,body){
 const flags=fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|
   (fs.constants.O_NOFOLLOW||0);
 const fd=fs.openSync(file,flags,0o600);
 try{verifyCreatedPrivateFile(file);fs.writeSync(fd,body);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
function createSnapshot({workingDirectory,archiveDirectory,baselineId,snapshotId}={}){
 if(!revision(baselineId)||!slug(snapshotId))throw Error('INVALID_BASELINE_OR_SNAPSHOT_ID');
 const {work,dest}=locations(workingDirectory,archiveDirectory);
 const ledger=storeAt(work).read(),mail=mailboxAt(work).read();
 const doc=envelope(ledger,mail,baselineId,snapshotId);
 const file=filePath(dest,snapshotId);
 writeNew(file,JSON.stringify(doc)+'\n');
 return {status:'PRIVATE_METADATA_SNAPSHOT_CREATED',snapshotId,baselineId,
   journalEvents:ledger.events.length,mailboxMessages:mail.items.length,
   digest:doc.sha256,sourceCopied:false,modelCalls:0};
}
function readSnapshot({archiveDirectory,baselineId,snapshotId}={}){
 if(!revision(baselineId)||!slug(snapshotId))throw Error('INVALID_BASELINE_OR_SNAPSHOT_ID');
 const dest=folder(archiveDirectory),file=filePath(dest,snapshotId);
 try{assertPrivateFile(file);}catch(_){throw Error('UNSAFE_PRIVATE_SNAPSHOT');}
 const doc=JSON.parse(fs.readFileSync(file,'utf8'));
 const p=doc.payload;
 if(!p||p.schema!==SCHEMA||p.snapshotId!==snapshotId||
    p.baselineId!==baselineId||p.sourceSha256!==CANONICAL||
    p.format!=='PRIVATE_METADATA_ONLY_NEVER_ORIGINAL_RULE_TEXT'||
    doc.sha256!==hash(JSON.stringify(p)))throw Error('CORRUPTED_STALE_OR_FORGED_SNAPSHOT');
 if(!p.journal||!Array.isArray(p.journal.events)||!p.mailbox||
    !Array.isArray(p.mailbox.items))throw Error('INCOMPLETE_PRIVATE_SNAPSHOT');
 return {doc,archive:dest};
}
function sourceVerified(sourcePath){
 if(typeof sourcePath!=='string'||!path.isAbsolute(sourcePath))return false;
 try{
  const real=assertPrivateFile(sourcePath);
  return hash(fs.readFileSync(sourcePath))===CANONICAL;
 }catch(_){return false;}
}
function restoreSnapshot({workingDirectory,archiveDirectory,baselineId,
                         snapshotId,sourcePath,expectedCurrentBaseline}={}){
 // Recovery is always fail-closed; an original must be present ON THIS HOST.
 if(!sourceVerified(sourcePath))throw Error('CANONICAL_PRIVATE_ORIGINAL_REQUIRED');
 if(!revision(expectedCurrentBaseline)||expectedCurrentBaseline!==baselineId||
    baseline()!==baselineId||!cleanCheckout()||
    process.env.GITHUB_REF_NAME!=='experiment/recipe-visual-agents')
   throw Error('CURRENT_BASELINE_MISMATCH_OR_UNSAFE_CHECKOUT');
 const {work}=locations(workingDirectory,archiveDirectory);
 const {doc}=readSnapshot({archiveDirectory,baselineId,snapshotId});
 const journalPath=path.join(work,'director-events.v1.json');
 const mailboxPath=path.join(work,'office-mailbox.v1.json');
 if(fs.existsSync(journalPath)||fs.existsSync(mailboxPath)||
    fs.existsSync(path.join(work,'.director-events.lock'))||
    fs.existsSync(path.join(work,'.office-mailbox.lock')))
   throw Error('REFUSE_TO_OVERWRITE_EXISTING_OR_BUSY_CHECKPOINTS');
 const created=[];
 try{
  writeNew(journalPath,JSON.stringify(doc.payload.journal)+'\n');
  created.push(journalPath);
  writeNew(mailboxPath,JSON.stringify(doc.payload.mailbox)+'\n');
  created.push(mailboxPath);
  const events=storeAt(work).read(),messages=mailboxAt(work).read();
  return {status:'PRIVATE_CHECKPOINTS_RESTORED_NO_AGENT_EXECUTION',
   baselineId,snapshotId,journalEvents:events.events.length,
   mailboxMessages:messages.items.length,originalReverified:true,
   modelsExecuted:0,requiresFreshTaskPreflight:true};
 }catch(err){
  for(const f of created){try{fs.unlinkSync(f);}catch(_){}}
  throw Error('RESTORE_REJECTED_'+(err.code||err.message));
 }
}
module.exports={createSnapshot,readSnapshot,restoreSnapshot,sourceVerified};
