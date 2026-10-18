'use strict';
// Persistent, metadata-only coordination of the MealUp office. No provider calls.
// Actual identity of agents is NOT authenticated by this file-based prototype.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {storeAt}=require('./director-private-ledger.cjs');
const ROLES=new Set(['DESIGN','ENGINEERING','FOOD','VISUAL_PRODUCTION','PROMPT_ARCHITECT','QA']);
const HASH='51043574d188c085de51282e50f8784d8f5cf779300891dee0fe8014414470eb';
const SCHEMA='MEALUP_OFFICE_PRIVATE_MAILBOX_V1';
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const valid=x=>typeof x==='string'&&x.trim().length>0&&x.length<=240;
const copy=x=>JSON.parse(JSON.stringify(x));
function mailboxAt(folder){
 const journal=storeAt(folder);
 const root=fs.realpathSync(folder),file=path.join(root,'office-mailbox.v1.json');
 const lock=path.join(root,'.office-mailbox.lock');
 function read(){
  if(!fs.existsSync(file))return {schema:SCHEMA,items:[],head:'GENESIS'};
  const s=fs.lstatSync(file);
  if(s.isSymbolicLink()||!s.isFile()||(s.mode&0o077)!==0)
   throw Error('UNSAFE_PRIVATE_MAILBOX');
  const db=JSON.parse(fs.readFileSync(file,'utf8'));
  if(db.schema!==SCHEMA||!Array.isArray(db.items))throw Error('INVALID_MAILBOX');
  let last='GENESIS';const ids=new Set();
  for(let i=0;i<db.items.length;i++){
   const e=db.items[i];
   if(e.seq!==i+1||e.prev!==last||ids.has(e.id)||
      e.hash!==digest({seq:e.seq,id:e.id,taskId:e.taskId,
       kind:e.kind,actor:e.actor,record:e.record,prev:e.prev}))
     throw Error('MAILBOX_HISTORY_INTEGRITY_FAILURE');
   last=e.hash;ids.add(e.id);
  }
  if(last!==db.head)throw Error('MAILBOX_HEAD_MISMATCH');
  return db;
 }
 function append(message){
  const m=copy(message);
  if(!valid(m.id)||!valid(m.taskId)||!valid(m.kind)||!valid(m.actor)||
     !m.record||typeof m.record!=='object'||Array.isArray(m.record))
   throw Error('INVALID_OFFICE_MESSAGE');
  const allowed=new Set(['handoffId','toRole','scope','briefVersion','baselineId','taskPacketSha',
       'stepId','evidenceRef','resultStatus','reasonCode']);
  if(Object.keys(m.record).some(k=>!allowed.has(k))||
      JSON.stringify(m.record).length>1600)
   throw Error('UNSAFE_OFFICE_PAYLOAD');
  if(!['OFFER','SPECIALIST_RESULT','QA_RECEIPT'].includes(m.kind))
   throw Error('UNKNOWN_MESSAGE_KIND');
  const fd=(()=>{try{return fs.openSync(lock,fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY,0o600)}
       catch(_){throw Error('MAILBOX_BUSY')}})();
  try{
   const db=read();const prior=db.items.find(e=>e.id===m.id);
   if(prior){
    const re={seq:prior.seq,id:m.id,taskId:m.taskId,kind:m.kind,
      actor:m.actor,record:m.record,prev:prior.prev};
    if(digest(re)!==prior.hash)throw Error('CONFLICTING_MESSAGE_REPLAY');
    return {status:'IDEMPOTENT_REPLAY',seq:prior.seq,head:db.head};
   }
   const rec=m.record;
   if(!valid(rec.handoffId))throw Error('HANDOFF_ID_REQUIRED');
   if(m.kind==='OFFER'){
    if(m.actor!=='DIRECTOR'||!ROLES.has(rec.toRole)||rec.toRole==='QA'||
       rec.scope!=='LAB_READ_ONLY'||!valid(rec.briefVersion)||!valid(rec.baselineId))
     throw Error('UNAUTHORIZED_OR_UNSCOPED_OFFER');
    if(!/^[a-f0-9]{64}$/.test(rec.taskPacketSha||''))
      throw Error('PRIVATE_TASK_PACKET_SHA_REQUIRED');
    const attested=journal.read().events.find(e=>e.taskId===m.taskId&&
       e.type==='RULE_PREFLIGHT_READY'&&e.actor==='DIRECTOR'&&
       e.record.sourceVerified===true&&e.record.constitutionSha===HASH&&
       e.record.roleId===rec.toRole&&e.record.scope===rec.scope&&
       e.record.briefVersion===rec.briefVersion&&e.record.baselineId===rec.baselineId&&
       e.record.taskPacketSha===rec.taskPacketSha);
    if(!attested)throw Error('CONSTITUTION_PREFLIGHT_REQUIRED');
    if(db.items.some(e=>e.taskId===m.taskId&&e.kind==='OFFER'&&e.record.handoffId===rec.handoffId))
      throw Error('HANDOFF_ID_ALREADY_ISSUED');
   }
   if(m.kind==='SPECIALIST_RESULT'){
    const offer=db.items.find(e=>e.taskId===m.taskId&&e.kind==='OFFER'&&
       e.record.handoffId===rec.handoffId);
    if(!offer||m.actor!==offer.record.toRole||!valid(rec.evidenceRef)||
      !['PASS','PARTIAL','FAIL','BLOCKED'].includes(rec.resultStatus))
     throw Error('RESPONSE_WITHOUT_AUTHORIZED_OFFER');
    if(db.items.some(e=>e.taskId===m.taskId&&e.kind==='SPECIALIST_RESULT'&&e.record.handoffId===rec.handoffId))
     throw Error('DUPLICATE_SPECIALIST_RESPONSE');
   }
   if(m.kind==='QA_RECEIPT'){
    const result=db.items.find(e=>e.taskId===m.taskId&&
      e.kind==='SPECIALIST_RESULT'&&e.record.handoffId===rec.handoffId);
    if(m.actor!=='QA'||!result||!valid(rec.evidenceRef)||
       !['PASS','PARTIAL','FAIL','BLOCKED'].includes(rec.resultStatus))
     throw Error('INDEPENDENT_QA_RESPONSE_REQUIRED');
    if(db.items.some(e=>e.taskId===m.taskId&&e.kind==='QA_RECEIPT'&&e.record.handoffId===rec.handoffId))
     throw Error('DUPLICATE_QA_RECEIPT');
   }
   const row={seq:db.items.length+1,id:m.id,taskId:m.taskId,kind:m.kind,
     actor:m.actor,record:m.record,prev:db.head};
   row.hash=digest(row);db.items.push(row);db.head=row.hash;
   const tmp=path.join(root,'.mailbox-'+crypto.randomBytes(10).toString('hex')+'.tmp');
   try{
    const out=fs.openSync(tmp,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL,0o600);
    try{fs.writeSync(out,JSON.stringify(db)+'\n');fs.fsyncSync(out)}finally{fs.closeSync(out)}
    fs.renameSync(tmp,file);
   }finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}
   return {status:'RECORDED_OFFLINE_NOT_DISPATCHED',seq:row.seq,head:db.head};
  }finally{fs.closeSync(fd);fs.unlinkSync(lock)}
 }
 function status(taskId,handoffId){
  const items=read().items.filter(e=>e.taskId===taskId&&e.record.handoffId===handoffId);
  return {taskId,handoffId,offered:items.some(e=>e.kind==='OFFER'),
     specialistResponse:items.find(e=>e.kind==='SPECIALIST_RESULT')?.record.resultStatus||null,
     qaReceipt:items.find(e=>e.kind==='QA_RECEIPT')?.record.resultStatus||null,
     autonomousExecution:false,providerCalls:0};
 }
 return Object.freeze({read,append,status,mode:'PRIVATE_LOCAL_MAILBOX_NO_AGENT_EXECUTION'});
}
module.exports={mailboxAt,ROLES,SCHEMA};
