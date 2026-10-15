'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { STATES,classify,assessBenchmark,getCurrentReport } = require('./scout-evaluator.cjs');
const good = { id:'A',role:'Design Director',vision:true,inferenceProvider:'Free demo',
  freeApiAccess:'VERIFIED_BY_REAL_CALLS',status:'CANDIDATE_UNDER_TEST',modelId:'model-a' };
const other = {...good,id:'B',modelId:'model-b'};
const benchmark = ['FO_PASTA','FO_PESCE','FO_VERDURA','CARD_UI_HOME'].map(caseId=>({
  caseId, assetSha256:'example-fixed-sha',fixedPromptSha256:'example-prompt',
  leftModelId:'model-a',rightModelId:'model-b',
  independentQa:'PASS',humanVisualReview:'PASS',
  leftResponseRecorded:true,rightResponseRecorded:true
}));
test('registered Qwen stays under guarded QA',()=>{
  const r=getCurrentReport().candidates.find(x=>x.id==='QWEN3_8_27B_GROQ');
  assert.equal(r.state,STATES.CONNECTED_UNDER_QA);assert.equal(r.approved,false);
});
test('registered Mistral stays blocked until account is connected',()=>{
  const r=getCurrentReport().candidates.find(x=>x.id==='MISTRAL_SMALL_3_1_24B_CLOUDFLARE');
  assert.equal(r.state,STATES.ACCOUNT_NOT_CONNECTED);
});
test('discovered weights cannot masquerade as free callable API',()=>{
  const r=classify({...good,inferenceProvider:null,freeApiAccess:'NOT_VERIFIED'});
  assert.equal(r.state,STATES.FREE_COMPUTE_UNVERIFIED);
});
test('Gemini 403 remains blocked',()=>{
  const r=getCurrentReport().candidates.find(x=>x.id==='GEMINI3_8_FLASH_GOOGLE');
  assert.equal(r.state,STATES.ACCESS_BLOCKED);
});
test('licensed Meta model cannot bypass CEO license consent',()=>{
  const r=classify({...good,id:'LLAMA_META',licenseUserAcceptanceRequired:true});
  assert.equal(r.state,STATES.LICENSE_APPROVAL_REQUIRED);
});
test('vision requirement blocks text-only model proposed for Design',()=>{
  assert.equal(classify({...good,vision:false}).state,STATES.ACCESS_BLOCKED);
});
test('scout audit is permanently advisory, cannot promote a model',()=>{
  const r=getCurrentReport();assert.equal(r.eligibleForAutomaticPromotion,0);
  assert.equal(r.agentReplacementsPerformed,0);assert.equal(r.additionalBudgetEUR,0);
});
test('identical model is not a model A/B',()=>{
  assert.equal(assessBenchmark(good,good,benchmark).status,'BLOCKED');
});
test('no mock or incomplete benchmark passes',()=>{
  assert.equal(assessBenchmark(good,other,[]).status,'BLOCKED');
  assert.equal(assessBenchmark(good,other,benchmark.slice(0,2)).status,'BLOCKED');
});
test('mismatched prompts or images prevent fair A/B',()=>{
  const changed=benchmark.map(x=>({...x}));
  changed[1].rightModelId='OTHER';
  assert.ok(assessBenchmark(good,other,changed).blockers.includes('UNMATCHED_MODEL_PROMPT_OR_ASSET'));
});
test('missing independent QA or visual review blocks',()=>{
  const changed=benchmark.map(x=>({...x}));
  changed[0].independentQa='PARTIAL_HUMAN_REVIEW';
  assert.ok(assessBenchmark(good,other,changed).blockers.includes('INDEPENDENT_QA_AND_HUMAN_REVIEW_REQUIRED'));
});
test('real UI screenshot is necessary for Design agent promotion benchmark',()=>{
  const changed=benchmark.map((x,i)=>({...x,caseId:'FO_CASE_'+i}));
  assert.ok(assessBenchmark(good,other,changed).blockers.includes('REAL_UI_SCREENSHOT_REQUIRED'));
});
test('duplicate cases cannot pad evaluation',()=>{
  const changed=benchmark.map(x=>({...x}));changed[1].caseId=changed[0].caseId;
  assert.ok(assessBenchmark(good,other,changed).blockers.includes('DUPLICATE_CASE'));
});
test('even eligible benchmark never auto selects winner or approves replacement',()=>{
  const r=assessBenchmark(good,other,benchmark);
  assert.equal(r.status,'COMPARABLE_NO_AUTOMATIC_WINNER');
  assert.equal(r.winner,null);assert.equal(r.ceoApproved,false);
});
