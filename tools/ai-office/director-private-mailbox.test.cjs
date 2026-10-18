'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {mailboxAt}=require('./director-private-mailbox.cjs');
const {storeAt}=require('./director-private-ledger.cjs');
const SHA='51043574d188c085de51282e50f8784d8f5cf779300891dee0fe8014414470eb';
const privateDir=()=>{const p=fs.mkdtempSync(path.join(os.tmpdir(),'mealup-office-mail-'));fs.chmodSync(p,0o700);return p};
const offer=()=>({id:'MSG-1',taskId:'T-1',kind:'OFFER',actor:'DIRECTOR',
 record:{handoffId:'H-1',toRole:'ENGINEERING',scope:'LAB_READ_ONLY',briefVersion:'B-1',baselineId:'SHA-1'}});
const result=()=>({id:'MSG-2',taskId:'T-1',kind:'SPECIALIST_RESULT',actor:'ENGINEERING',
 record:{handoffId:'H-1',evidenceRef:'CI-READ-ONLY-1',resultStatus:'PARTIAL'}});
const qa=()=>({id:'MSG-3',taskId:'T-1',kind:'QA_RECEIPT',actor:'QA',
 record:{handoffId:'H-1',evidenceRef:'QA-1',resultStatus:'PARTIAL'}});
function preflight(p){
 storeAt(p).append({id:'GATE-1',taskId:'T-1',type:'RULE_PREFLIGHT_READY',actor:'DIRECTOR',
  record:{sourceVerified:true,constitutionSha:SHA,roleId:'ENGINEERING',
  scope:'LAB_READ_ONLY',briefVersion:'B-1',baselineId:'SHA-1'}});
}
test('no Director offer without recorded constitution preflight',()=>{
 const p=privateDir();try{
  assert.throws(()=>mailboxAt(p).append(offer()),/CONSTITUTION_PREFLIGHT_REQUIRED/);
  assert.equal(mailboxAt(p).read().items.length,0);
 }finally{fs.rmSync(p,{recursive:true,force:true})}
});
test('preflight-bound scoped offer survives process restart',()=>{
 const p=privateDir();try{preflight(p);
  assert.equal(mailboxAt(p).append(offer()).status,'RECORDED_OFFLINE_NOT_DISPATCHED');
  assert.equal(mailboxAt(p).status('T-1','H-1').offered,true);
  assert.equal(mailboxAt(p).status('T-1','H-1').autonomousExecution,false);
 }finally{fs.rmSync(p,{recursive:true,force:true})}
});
test('specialist result and independent QA receipt in causal order',()=>{
 const p=privateDir();try{preflight(p);const m=mailboxAt(p);
  assert.throws(()=>m.append(result()),/RESPONSE_WITHOUT_AUTHORIZED_OFFER/);
  assert.throws(()=>m.append(qa()),/INDEPENDENT_QA_RESPONSE_REQUIRED/);
  m.append(offer());m.append(result());m.append(qa());
  const status=mailboxAt(p).status('T-1','H-1');
  assert.equal(status.specialistResponse,'PARTIAL');
  assert.equal(status.qaReceipt,'PARTIAL');
  assert.equal(status.providerCalls,0);
  assert.equal(mailboxAt(p).read().items.length,3);
 }finally{fs.rmSync(p,{recursive:true,force:true})}
});
test('exact idempotent replay and conflicting message ID blocked',()=>{
 const p=privateDir();try{preflight(p);const m=mailboxAt(p);m.append(offer());
  assert.equal(m.append(offer()).status,'IDEMPOTENT_REPLAY');
  const conflict=offer();conflict.record.baselineId='OTHER';
  assert.throws(()=>m.append(conflict),/CONFLICTING_MESSAGE_REPLAY/);
  assert.equal(m.read().items.length,1);
 }finally{fs.rmSync(p,{recursive:true,force:true})}
});
test('one offered handoff ID cannot have two separate offers',()=>{
 const p=privateDir();try{preflight(p);const m=mailboxAt(p);m.append(offer());
  const second=offer();second.id='MSG-X';
  assert.throws(()=>m.append(second),/HANDOFF_ID_ALREADY_ISSUED/);
 }finally{fs.rmSync(p,{recursive:true,force:true})}
});
test('rejects unauthorized role Scout, direct QA and production scope',()=>{
 const p=privateDir();try{preflight(p);const m=mailboxAt(p);
  for(const toRole of ['SCOUT','QA']){
   const msg=offer();msg.record.toRole=toRole;
   assert.throws(()=>m.append(msg),/UNAUTHORIZED_OR_UNSCOPED_OFFER/);
  }
  const msg=offer();msg.record.scope='MAIN_WRITE';
  assert.throws(()=>m.append(msg),/UNAUTHORIZED_OR_UNSCOPED_OFFER/);
 }finally{fs.rmSync(p,{recursive:true,force:true})}
});
test('rejects stale brief, baseline and role mismatch with source preflight',()=>{
 const p=privateDir();try{preflight(p);const m=mailboxAt(p);
  for(const [key,value] of [['briefVersion','OTHER'],['baselineId','OTHER'],['toRole','DESIGN']]){
   const msg=offer();msg.record[key]=value;
   assert.throws(()=>m.append(msg),/CONSTITUTION_PREFLIGHT_REQUIRED/);
  }
 }finally{fs.rmSync(p,{recursive:true,force:true})}
});
test('rejects pretend specialist result or QA from wrong role',()=>{
 const p=privateDir();try{preflight(p);const m=mailboxAt(p);m.append(offer());
  const fake=result();fake.actor='DESIGN';
  assert.throws(()=>m.append(fake),/RESPONSE_WITHOUT_AUTHORIZED_OFFER/);
  m.append(result());
  const fakeQA=qa();fakeQA.actor='DIRECTOR';
  assert.throws(()=>m.append(fakeQA),/INDEPENDENT_QA_RESPONSE_REQUIRED/);
 }finally{fs.rmSync(p,{recursive:true,force:true})}
});
test('cannot duplicate result or QA with another message identifier',()=>{
 const p=privateDir();try{preflight(p);const m=mailboxAt(p);
  m.append(offer());m.append(result());const dup=result();dup.id='MSG-4';
  assert.throws(()=>m.append(dup),/DUPLICATE_SPECIALIST_RESPONSE/);
  m.append(qa());const q=qa();q.id='MSG-5';
  assert.throws(()=>m.append(q),/DUPLICATE_QA_RECEIPT/);
 }finally{fs.rmSync(p,{recursive:true,force:true})}
});
test('no private rule passages, prompt bodies or credentials in mailbox',()=>{
 const p=privateDir();try{preflight(p);const m=mailboxAt(p);
  const untrusted=offer();untrusted.record.exactOriginalText='SECRET';
  assert.throws(()=>m.append(untrusted),/UNSAFE_OFFICE_PAYLOAD/);
  const untrusted2=offer();untrusted2.record.apiKey='SECRET';
  assert.throws(()=>m.append(untrusted2),/UNSAFE_OFFICE_PAYLOAD/);
  assert.equal(m.read().items.length,0);
 }finally{fs.rmSync(p,{recursive:true,force:true})}
});
test('tampering with persisted communication is detected',()=>{
 const p=privateDir();try{preflight(p);const m=mailboxAt(p);m.append(offer());
  const file=path.join(p,'office-mailbox.v1.json');
  const doc=JSON.parse(fs.readFileSync(file,'utf8'));
  doc.items[0].record.scope='MAIN_WRITE';
  fs.writeFileSync(file,JSON.stringify(doc));
  assert.throws(()=>mailboxAt(p).read(),/MAILBOX_HISTORY_INTEGRITY_FAILURE/);
 }finally{fs.rmSync(p,{recursive:true,force:true})}
});
test('locks block concurrent writes, private directory required',()=>{
 const p=privateDir();try{preflight(p);
  fs.writeFileSync(path.join(p,'.office-mailbox.lock'),'busy');
  assert.throws(()=>mailboxAt(p).append(offer()),/MAILBOX_BUSY/);
  assert.equal(mailboxAt(p).read().items.length,0);
  assert.throws(()=>mailboxAt(path.resolve(__dirname,'../..')),/UNSAFE_PRIVATE_STORAGE/);
 }finally{fs.rmSync(p,{recursive:true,force:true})}
});
