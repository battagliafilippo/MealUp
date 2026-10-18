'use strict';
// Private local event journal; not a model executor or online inbox.
// No rule text, credentials, production mutations, or repository storage.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {assertPrivateDirectory,assertPrivateFile,verifyCreatedPrivateFile}=require('./private-file-security.cjs');
const ROOT=path.resolve(__dirname,'../..');
const SCHEMA='MEALUP_DIRECTOR_PRIVATE_LEDGER_V1';
const VERIFIED_CONSTITUTION_SHA='51043574d188c085de51282e50f8784d8f5cf779300891dee0fe8014414470eb';
const TYPES=new Set(['INTAKE_BLOCKED','RULE_PREFLIGHT_READY','STEP_CHECKPOINT','QA_REPORTED','RETURN_TO_CEO']);
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const copy=x=>JSON.parse(JSON.stringify(x));
function storeAt(folder){
 if(typeof folder!=='string'||!path.isAbsolute(folder))throw Error('PRIVATE_ABSOLUTE_DIR_REQUIRED');
 let real;
 try{real=assertPrivateDirectory(folder);}catch(_){throw Error('UNSAFE_PRIVATE_STORAGE');}
 const dest=path.join(real,'director-events.v1.json');
 function read(){
  if(!fs.existsSync(dest))return {schema:SCHEMA,events:[],head:'GENESIS'};
  try{assertPrivateFile(dest);}catch(_){throw Error('UNSAFE_LEDGER_FILE');}
  const d=JSON.parse(fs.readFileSync(dest,'utf8'));
  if(d.schema!==SCHEMA||!Array.isArray(d.events))throw Error('LEDGER_FORMAT');
  let hash='GENESIS';
  const seen=new Set();
  for(let i=0;i<d.events.length;i++){
   const e=d.events[i];
   if(e.prev!==hash||e.seq!==i+1||seen.has(e.id)||
      digest({seq:e.seq,id:e.id,taskId:e.taskId,type:e.type,
              actor:e.actor,record:e.record,prev:e.prev})!==e.hash)
       throw Error('LEDGER_HISTORY_TAMPER_OR_DUPLICATE');
   seen.add(e.id);hash=e.hash;
  }
  if(hash!==d.head)throw Error('LEDGER_HEAD_MISMATCH');
  return d;
 }
 function append(event){
  const keys=['id','taskId','type','actor','record'];
  if(!event||keys.some(k=>!(k in event))||
     !['string'].includes(typeof event.id)||event.id.length<3||
     typeof event.taskId!=='string'||event.taskId.length<3||
     !TYPES.has(event.type)||typeof event.actor!=='string'||
     !['DIRECTOR','QA','CEO'].includes(event.actor)||
     !event.record||typeof event.record!=='object'||
     Array.isArray(event.record))throw Error('INVALID_DIRECTOR_EVENT');
  const safe=copy(event.record);
  const allowed=new Set(['sourceVerified','reasonCode','goal','scope','baselineId',
   'briefVersion','roleId','skillIds','checkpointId','stepId','evidenceRef',
   'resultStatus','nextStepId','constitutionSha','taskPacketSha']);
  if(Object.keys(safe).some(k=>!allowed.has(k))||
     JSON.stringify(safe).length>4500)throw Error('UNSAFE_EVENT_FIELDS');
  if(event.type==='RULE_PREFLIGHT_READY'&&
     (event.actor!=='DIRECTOR'||safe.sourceVerified!==true||
      safe.constitutionSha!==VERIFIED_CONSTITUTION_SHA))
     throw Error('UNVERIFIED_CONSTITUTION_INTAKE');
  if(event.type==='STEP_CHECKPOINT'&&
     (typeof safe.stepId!=='string'||typeof safe.evidenceRef!=='string'||
      !safe.evidenceRef.trim()))throw Error('STEP_REQUIRES_EVIDENCE');
  if(event.type==='QA_REPORTED'&&event.actor!=='QA')throw Error('INDEPENDENT_QA_REQUIRED');
  const lock=path.join(real,'.director-events.lock');
  let fd;
  try{fd=fs.openSync(lock,fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY,0o600);verifyCreatedPrivateFile(lock);}
  catch(_){throw Error('PRIVATE_STORE_BUSY');}
  try{
   const d=read();
   const previous=d.events.find(x=>x.id===event.id);
   if(previous){
    const incoming={seq:previous.seq,id:event.id,taskId:event.taskId,
       type:event.type,actor:event.actor,record:safe,prev:previous.prev};
    if(digest(incoming)!==previous.hash)throw Error('CONFLICTING_EVENT_REPLAY');
    return {status:'IDEMPOTENT_REPLAY',seq:previous.seq,head:d.head};
   }
   const hasPrevious=(type)=>d.events.some(e=>e.taskId===event.taskId&&e.type===type);
   if(event.type==='STEP_CHECKPOINT'&&!hasPrevious('RULE_PREFLIGHT_READY'))
     throw Error('CHECKPOINT_REQUIRES_VERIFIED_PREFLIGHT');
   if(event.type==='QA_REPORTED'&&!hasPrevious('STEP_CHECKPOINT'))
     throw Error('QA_REQUIRES_RECORDED_STEP');
   if(event.type==='RETURN_TO_CEO'&&
     (event.actor!=='DIRECTOR'||!hasPrevious('QA_REPORTED')))
     throw Error('CEO_REPORT_REQUIRES_INDEPENDENT_QA');
   const row={seq:d.events.length+1,id:event.id,taskId:event.taskId,
     type:event.type,actor:event.actor,record:safe,prev:d.head};
   row.hash=digest(row);d.events.push(row);d.head=row.hash;
   const tmp=path.join(real,'.director-'+crypto.randomBytes(8).toString('hex')+'.tmp');
   try{
    const f=fs.openSync(tmp,fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY,0o600);
    verifyCreatedPrivateFile(tmp);
    try{fs.writeSync(f,JSON.stringify(d)+'\n');fs.fsyncSync(f);}finally{fs.closeSync(f);}
    fs.renameSync(tmp,dest);verifyCreatedPrivateFile(dest);
   }finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
   return {status:'APPENDED',seq:row.seq,head:d.head};
  }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
 }
 return Object.freeze({read,append,location:'PRIVATE_LOCAL_ONLY'});
}
module.exports={storeAt,SCHEMA};
