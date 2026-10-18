'use strict';
// Private-host prototype: exact original v1.9 -> bounded Director -> real offline
// Engineering audit -> independent offline QA -> metadata-only CEO checkpoint.
// NOT an LLM agent executor, hosted vault, credential manager, or app deployment.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync,execFileSync}=require('node:child_process');
const {prepare}=require('./director-secure-preflight.cjs');
const {storeAt}=require('./director-private-ledger.cjs');
const {mailboxAt}=require('./director-private-mailbox.cjs');
const {assertPrivateFile}=require('./private-file-security.cjs');
const ROOT=path.resolve(__dirname,'../..');
const BRANCH='experiment/recipe-visual-agents';
const SCRIPTS=Object.freeze({
 engineering:'tools/ai-office/skills/lab-javascript-audit.cjs',
 qa:'tools/ai-office/skills/lab-independent-qa.cjs'
});
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{3,85}$/.test(x);
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
function safeResult(status,rest={}){return {status,autonomousAIAgents:false,externalAIRequests:0,
 appFilesWritten:0,productionDeploys:0,extraCostEUR:0,...rest};}
function baseline(){
 try {
  const x=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8',timeout:4000}).trim();
  return /^[a-f0-9]{40}$/.test(x)?x:null;
 } catch(_){return null;}
}
function cleanCheckout(){
 const run=spawnSync('git',['status','--porcelain','--untracked-files=all'],{
  cwd:ROOT,encoding:'utf8',timeout:4000,maxBuffer:128*1024});
 return !run.error&&run.status===0&&run.stdout.trim()==='';
}
function taskFor(sha){
 const taskId='LAB_SAFE_'+sha.slice(0,16);
 return {taskId,roleId:'ENGINEERING',agentId:'LAB_ENGINEERING',constitutionVersion:'1.9',
  scope:'LAB_READ_ONLY',frozenContextVerified:true,
  requiredCapabilities:['JS_SYNTAX_AUDIT'],
  goal:'Read-only audit of AI Office JavaScript code, followed by independent regression QA',
  activeBriefVersion:'AI_OFFICE_LAB_20261018_B1',baselineId:sha,
  risk:'LOW',must:['No production or tester writes','No paid inference','Read-only laboratory only'],
  invariants:['Original v1.9 verified before every handoff','QA independent','Scout CEO-only'],
  frozen:['MealUp Master and Constitution v1.9'],
  doNotTouch:['main','tester','PWA','Food Portrait','FROZEN'],
  acceptance:['Engineering syntax PASS','Independent JS regression QA PASS','Private checkpoint'],
  writeScope:[],knownUnknowns:['Not an autonomous LLM office or cross-host secret vault'],
  tags:['existing_code','delegated'],steps:[
   {id:'LAB_S1',objective:'Run fixed read-only internal Engineering syntax check',
    scope:'tools/ai-office',preconditions:'Verified private original + task packet',
    expectedOutput:'Auditor JSON',verification:'No syntax failures',
    doneWhen:'status PASS',dependsOn:[],status:'OPEN'},
   {id:'LAB_S2',objective:'Run independent QA test suite',
    scope:'tools/ai-office',preconditions:'LAB_S1 result checkpointed',
    expectedOutput:'QA JSON',verification:'Exit code zero; passed equals tests',
    doneWhen:'status PASS with zero failed tests',dependsOn:['LAB_S1'],status:'OPEN'}
  ]};
}
function callPinnedScript(which){
 const rel=SCRIPTS[which];
 if(!rel)throw Error('UNTRUSTED_ROLE_RUNNER');
 const full=path.resolve(ROOT,rel);
 if(!full.startsWith(ROOT+path.sep)||!fs.statSync(full).isFile())
   throw Error('UNSAFE_OR_MISSING_RUNNER');
 const run=spawnSync(process.execPath,[full],{cwd:ROOT,encoding:'utf8',
  timeout:which==='qa'?120000:30000,maxBuffer:256*1024,
  env:{PATH:process.env.PATH||'',CI:'true',GITHUB_REF_NAME:BRANCH}});
 let value;
 try{value=JSON.parse((run.stdout||'').trim());}catch(_){value=null;}
 const ok=!run.error&&run.status===0&&value?.status==='PASS'&&
  value.apiCalls===0&&value.appFilesModified===0&&
  (which!=='qa'||(value.failed===0&&value.passed===value.tests));
 return {ok,evidenceRef:run.stdout?'sha256:'+digest(run.stdout):null,
  status:ok?'PASS':'FAIL',checked:which==='qa'?value?.tests:value?.filesExamined};
}
function runPrivateOffice({sourcePath,privateDirectory,expectedBaseline}={}){
 if(process.env.MEALUP_LAB_EXECUTE!=='YES'||process.env.GITHUB_REF_NAME!==BRANCH)
  return safeResult('BLOCKED_EXPLICIT_LAB_EXECUTION_GATES');
 const sha=baseline();
 if(!sha||sha!==expectedBaseline)return safeResult('BLOCKED_STALE_BRANCH_OR_BASELINE');
 if(!id(expectedBaseline?.slice(0,16)))return safeResult('BLOCKED_INVALID_BASELINE');
 if(!cleanCheckout())return safeResult('BLOCKED_DIRTY_OR_INACCESSIBLE_LAB_CHECKOUT');
 try {
  assertPrivateFile(sourcePath);
 }catch(_){return safeResult('BLOCKED_CANONICAL_SOURCE_NOT_AVAILABLE');}
 let journal,mailbox;
 try{journal=storeAt(privateDirectory);mailbox=mailboxAt(privateDirectory);}
 catch(_){return safeResult('BLOCKED_PRIVATE_HOST_STORAGE');}
 const task=taskFor(sha),assignment={assignedBy:'DIRECTOR',authorized:true,
  reference:'CEO_APPROVED_ZERO_COST_LAB_TEST_ONLY',taskId:task.taskId,
  roleId:'ENGINEERING',agentId:task.agentId,scope:task.scope};
 const preflight=prepare({task,assignment,sourcePath,privateDirectory,attemptId:'A1_'+sha.slice(0,16)});
 if(preflight.status!=='DIRECTOR_PREFLIGHT_CHECKPOINTED_NOT_DISPATCHED')
   return safeResult(preflight.status,{nextStep:'REVIEW_PRIVATE_SOURCE_PREFLIGHT'});
 const handoffId='LAB_HANDOFF_'+sha.slice(0,16);
 const offer={id:'OFFER_'+handoffId,taskId:task.taskId,kind:'OFFER',actor:'DIRECTOR',
  record:{handoffId,toRole:'ENGINEERING',scope:'LAB_READ_ONLY',
   briefVersion:task.activeBriefVersion,baselineId:sha,taskPacketSha:preflight.taskPacketSha}};
 const events=journal.read().events,find=(type)=>events.find(e=>e.taskId===task.taskId&&e.type===type);
 try {
  mailbox.append(offer); // Must match exact v1.9 source-derived packet hash.
  let msg=mailbox.read().items.find(e=>e.taskId===task.taskId&&e.kind==='SPECIALIST_RESULT');
  let reusedEngineering=!!msg;
  if(!msg){
   const work=callPinnedScript('engineering');
   if(!cleanCheckout())return safeResult('BLOCKED_REPOSITORY_CHANGED_DURING_ENGINEERING');
   mailbox.append({id:'ENGINEERING_'+handoffId,taskId:task.taskId,
    kind:'SPECIALIST_RESULT',actor:'ENGINEERING',
    record:{handoffId,evidenceRef:work.evidenceRef||'ENGINEERING_FAILED_NO_STDOUT',
     resultStatus:work.status}});
   if(!work.ok)return safeResult('ENGINEERING_QA_BLOCKED',{nextStep:'RECONCILE_ENGINEERING_FAILURE'});
   msg=mailbox.read().items.find(e=>e.taskId===task.taskId&&e.kind==='SPECIALIST_RESULT');
  }
  if(msg.record.resultStatus!=='PASS')return safeResult('ENGINEERING_FAILED_PREVIOUSLY');
  journal.append({id:'STEP_'+handoffId,taskId:task.taskId,type:'STEP_CHECKPOINT',
   actor:'DIRECTOR',record:{stepId:'LAB_S1',evidenceRef:msg.record.evidenceRef,
    taskPacketSha:preflight.taskPacketSha}});
  let receipt=mailbox.read().items.find(e=>e.taskId===task.taskId&&e.kind==='QA_RECEIPT');
  let reusedQA=!!receipt;
  if(!receipt){
   const qa=callPinnedScript('qa');
   if(!cleanCheckout())return safeResult('BLOCKED_REPOSITORY_CHANGED_DURING_QA');
   mailbox.append({id:'QA_'+handoffId,taskId:task.taskId,kind:'QA_RECEIPT',actor:'QA',
    record:{handoffId,evidenceRef:qa.evidenceRef||'QA_FAILED_NO_STDOUT',resultStatus:qa.status}});
   if(!qa.ok)return safeResult('INDEPENDENT_QA_BLOCKED',{nextStep:'RECONCILE_QA_FAILURE'});
   receipt=mailbox.read().items.find(e=>e.taskId===task.taskId&&e.kind==='QA_RECEIPT');
  }
  if(receipt.record.resultStatus!=='PASS')return safeResult('INDEPENDENT_QA_PREVIOUS_FAILURE');
  journal.append({id:'STEP_QA_'+handoffId,taskId:task.taskId,type:'STEP_CHECKPOINT',
   actor:'DIRECTOR',record:{stepId:'LAB_S2',evidenceRef:receipt.record.evidenceRef,
    taskPacketSha:preflight.taskPacketSha}});
  journal.append({id:'QA_REPORT_'+handoffId,taskId:task.taskId,type:'QA_REPORTED',
   actor:'QA',record:{resultStatus:'PASS',evidenceRef:receipt.record.evidenceRef,
    taskPacketSha:preflight.taskPacketSha}});
  journal.append({id:'CEO_'+handoffId,taskId:task.taskId,type:'RETURN_TO_CEO',
   actor:'DIRECTOR',record:{resultStatus:'PASS',taskPacketSha:preflight.taskPacketSha,
    nextStepId:'AIOS-02.2'}});
  return safeResult('PRIVATE_ORIGINAL_LAB_CHAIN_PASS_NOT_AUTONOMOUS_AI',{
   taskId:task.taskId,preflight:'VERIFIED_REAL_ORIGINAL',
   taskPacketSha:preflight.taskPacketSha,activeRuleCount:preflight.activeRuleCount,
   selectedSkills:preflight.selectedSkills,engineering:'PASS',qa:'PASS',
   reusedEngineering,reusedQA,persistedEvents:journal.read().events.length,
   persistedMessages:mailbox.read().items.length,
   nextStep:'PRIVATE_RUNTIME_AND_AGENT_IDENTITY_APPROVAL'});
 } catch(_){
  return safeResult('BLOCKED_PRIVATE_CHAIN_STATE_OR_RUNNER_ERROR',
   {nextStep:'MANUAL_PRIVATE_JOURNAL_REVIEW'});
 }
}
if(require.main===module){
 const value=runPrivateOffice({
  sourcePath:process.env.MEALUP_PRIVATE_CONSTITUTION_PATH,
  privateDirectory:process.env.MEALUP_PRIVATE_WORKDIR,
  expectedBaseline:process.env.MEALUP_LAB_EXPECTED_SHA});
 console.log(JSON.stringify(value));
 if(value.status!=='PRIVATE_ORIGINAL_LAB_CHAIN_PASS_NOT_AUTONOMOUS_AI')process.exitCode=1;
}
module.exports={runPrivateOffice,taskFor,baseline,cleanCheckout};
