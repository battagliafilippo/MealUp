'use strict';
/** Food Portrait Queue Recovery v1. Offline only, no generation or approval operations.
 * --queue <production-queue.v1.json> --checkpoint <output/checkpoint.v1.json>
 * --self-test
 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const SCHEMA='food-portrait-recovery-v1';
const ACCEPTED_PREPRODUCTION_STATES=new Set(['WAITING_REFERENCE','PAUSED_ERROR','QUARANTINED']);
const SHA=/^[a-f0-9]{64}$/;
const fail=message=>{throw Error(message);};
const check=(yes,message)=>{if(!yes)fail(message);};
const key=(x)=>x.recipeId+':'+x.specRevision;
function validateQueue(queue){
 check(queue?.schema==='mealup-portrait-queue-v1'&&Array.isArray(queue.tasks),'INVALID_QUEUE_SCHEMA');
 const ids=new Set(),fingerprints=new Set();
 for(const t of queue.tasks){
  check(t&&typeof t.recipeId==='string'&&!ids.has(t.recipeId),'DUPLICATE_QUEUE_RECIPE_ID');
  check(SHA.test(t.specRevision||'')&&SHA.test(t.jobFingerprint||''),'INVALID_JOB_FINGERPRINT');
  check(t.status==='WAITING_REFERENCE'&&t.imagePath===null&&t.imageSHA256===null&&
    t.visualQA===null&&t.approval===null,'PREMATURE_IMAGE_JOB');
  ids.add(t.recipeId);
  check(!fingerprints.has(t.jobFingerprint),'DUPLICATE_PRODUCTION_FINGERPRINT');
  fingerprints.add(t.jobFingerprint);
 }
 check(queue.tasks.length===queue.total,'QUEUE_TOTAL_MISMATCH');
}
function merge(queue,checkpoint){
 validateQueue(queue);
 const prev=checkpoint||{schema:SCHEMA,records:{},revisions:{},history:[]};
 check(prev.schema===SCHEMA&&!Array.isArray(prev.records)&&
  prev.records&&typeof prev.records==='object'&&
  Array.isArray(prev.history),'INVALID_CHECKPOINT');
 const records={},events=[],resumed=[],invalidated=[],fresh=[];
 for(const t of queue.tasks){
  const p=prev.records[t.recipeId];
  if(p){
    check(typeof p.specRevision==='string'&&typeof p.jobFingerprint==='string',
      'DAMAGED_CHECKPOINT_RECORD');
    check(ACCEPTED_PREPRODUCTION_STATES.has(p.state),'UNAUTHORIZED_CHECKPOINT_STATE');
    check(p.imagePath==null&&p.imageSHA256==null&&p.approval==null,
      'UNVERIFIED_IMAGE_IN_CHECKPOINT');
  }
  if(p&&p.specRevision===t.specRevision&&p.jobFingerprint===t.jobFingerprint){
    records[t.recipeId]={
      recipeId:t.recipeId,specRevision:t.specRevision,jobFingerprint:t.jobFingerprint,
      state:p.state,attempts:Number.isSafeInteger(p.attempts)&&p.attempts>=0?p.attempts:0,
      lastError:typeof p.lastError==='string'?p.lastError:null,
      imagePath:null,imageSHA256:null,approval:null
    };
    resumed.push(t.recipeId);
  }else{
    records[t.recipeId]={
      recipeId:t.recipeId,specRevision:t.specRevision,jobFingerprint:t.jobFingerprint,
      state:'WAITING_REFERENCE',attempts:0,lastError:null,
      imagePath:null,imageSHA256:null,approval:null
    };
    if(p){invalidated.push(t.recipeId);
      events.push({recipeId:t.recipeId,kind:'SUPERSEDED_CHECKPOINT',
        previousRevision:p.specRevision,newRevision:t.specRevision});
    }else fresh.push(t.recipeId);
  }
 }
 const vanished=Object.keys(prev.records).filter(id=>!Object.prototype.hasOwnProperty.call(records,id));
 // Hard-fail rather than erasing data from a shrunk recipe catalog.
 check(vanished.length===0,'CATALOG_SHRINK_REQUIRES_MANUAL_RECONCILIATION:'+vanished.join(','));
 const history=(prev.history||[]).concat(events);
 return {schema:SCHEMA,records,revisions:{...prev.revisions},
   history,summary:{total:queue.tasks.length,resumed:resumed.length,new:fresh.length,
     invalidated:invalidated.length,vanished:0,readyToGenerate:0,
     automaticApprovalAllowed:false}};
}
function requireSafePath(filepath){
 const dest=path.resolve(filepath);
 const tmp=path.resolve(os.tmpdir());
 check(dest.startsWith(tmp+path.sep)&&dest!==tmp,'UNSAFE_CHECKPOINT_PATH');
 return dest;
}
function save(filepath,state){
 const dest=requireSafePath(filepath);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 const tmp=dest+'.tmp';
 fs.writeFileSync(tmp,JSON.stringify(state,null,2)+'\n',{flag:'w'});
 fs.renameSync(tmp,dest);
 return dest;
}
function selfTest(){
 const make=(id,ch)=>({recipeId:id,specRevision:ch.repeat(64),
  jobFingerprint:(ch==='a'?'b':'c').repeat(64),
  status:'WAITING_REFERENCE',imagePath:null,imageSHA256:null,visualQA:null,approval:null});
 const q={schema:'mealup-portrait-queue-v1',total:2,tasks:[make('r1','a'),make('r2','a')]};
 // fingerprints must be unique; replace with per-id valid value
 q.tasks[1].jobFingerprint='d'.repeat(64);
 const a=merge(q);
 check(a.summary.new===2&&a.summary.readyToGenerate===0,'SELFTEST_FRESH');
 const b=merge(q,a);
 check(b.summary.resumed===2&&JSON.stringify(b.records)===JSON.stringify(a.records),
   'SELFTEST_RECOVERY_DETERMINISM');
 q.tasks[0].specRevision='c'.repeat(64);q.tasks[0].jobFingerprint='e'.repeat(64);
 const c=merge(q,b);
 check(c.summary.invalidated===1&&c.summary.resumed===1&&c.records.r1.attempts===0,
   'SELFTEST_INVALIDATE_ONE');
 const corrupted=JSON.parse(JSON.stringify(c));
 corrupted.records.r1.state='APPROVED';
 let rejected=false;try{merge(q,corrupted);}catch(e){rejected=e.message==='UNAUTHORIZED_CHECKPOINT_STATE';}
 check(rejected,'SELFTEST_PREMATURE_APPROVAL_DENIED');
 const shrink={...q,total:1,tasks:q.tasks.slice(0,1)};
 rejected=false;try{merge(shrink,c);}catch(e){rejected=e.message.startsWith('CATALOG_SHRINK_');}
 check(rejected,'SELFTEST_NO_SILENT_DATA_LOSS');
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'mealup-recovery-'));
 try{
   const p=save(path.join(scratch,'checkpoint.json'),c);
   check(JSON.stringify(JSON.parse(fs.readFileSync(p)))===JSON.stringify(c),'SELFTEST_ATOMIC_PERSIST');
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 console.log('PASS queue recovery: deterministic resume, changed-revision invalidation, no data loss, atomic write');
}
function main(argv){
 if(argv.includes('--self-test'))return selfTest();
 const arg=n=>{const i=argv.indexOf(n);return i<0?null:argv[i+1];};
 check(arg('--queue')&&arg('--checkpoint'),'USAGE: --queue <json> --checkpoint </tmp/path>');
 const location=requireSafePath(arg('--checkpoint'));
 const queue=JSON.parse(fs.readFileSync(path.resolve(arg('--queue')),'utf8'));
 const previous=fs.existsSync(location)?JSON.parse(fs.readFileSync(location,'utf8')):null;
 const result=merge(queue,previous);
 save(location,result);
 console.log(JSON.stringify(result.summary,null,2));
}
if(require.main===module){try{main(process.argv.slice(2));}
 catch(e){console.error('FAIL portrait recovery:',e.stack||e);process.exitCode=1;}}
module.exports={merge,save,selfTest};
