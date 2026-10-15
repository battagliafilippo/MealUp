'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { STATES,classify,assessBenchmark,getCurrentReport } = require('./scout-evaluator.cjs');
const good = { id:'A',role:'Design Director',vision:true,inferenceProvider:'Free demo',
  freeApiAccess:'VERIFIED_BY_REAL_CALLS',status:'CANDIDATE_UNDER_TEST',modelId:'model-a',
  freeQuotaPolicy:{kind:'RECURRING_FREE_QUOTA',reset:'DAILY',source:'https://example.com/free-quota'}  };
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

test('new Gemma 4 is a candidate but not connected',()=>{
  const r=getCurrentReport().candidates.find(x=>x.id==='GEMMA4_26B_A4B_CLOUDFLARE');
  assert.equal(r.state,STATES.ACCOUNT_NOT_CONNECTED);assert.equal(r.approved,false);
});
test('new Meta Llama vision requires explicit license review',()=>{
  const r=getCurrentReport().candidates.find(x=>x.id==='LLAMA3_2_11B_VISION_CLOUDFLARE');
  assert.equal(r.state,STATES.LICENSE_APPROVAL_REQUIRED);assert.equal(r.approved,false);
});
test('missing API evidence cannot crash Scout or authorize provider calls',()=>{
  const r=classify({...good,freeApiAccess:undefined,status:'NO_STATUS'});
  assert.equal(r.state,STATES.FREE_COMPUTE_UNVERIFIED);assert.equal(r.approved,false);
});

test('one-time promotional credits are never eligible even after successful calls',()=>{
  const candidate={...good,freeQuotaPolicy:{kind:'ONE_TIME_CREDITS',reset:null,source:'https://example.com/trial'}};
  const r=classify(candidate);
  assert.equal(r.state,STATES.NON_RENEWING_FREE_OFFER);
  assert.equal(r.approved,false);
  assert.ok(assessBenchmark(candidate,other,benchmark).blockers.includes('LEFT_NOT_ELIGIBLE'));
});
test('paid after free trial is not a renewable free service',()=>{
  const r=classify({...good,freeQuotaPolicy:{kind:'PAID_AFTER_TRIAL'}});
  assert.equal(r.state,STATES.NON_RENEWING_FREE_OFFER);
});
test('free model needs documented renewal window and source',()=>{
  for(const freeQuotaPolicy of [
    undefined,
    {kind:'UNKNOWN'},
    {kind:'RECURRING_FREE_QUOTA',reset:null,source:'https://example.com'},
    {kind:'RECURRING_FREE_QUOTA',reset:'MONTHLY',source:null}
  ]){
    const r=classify({...good,freeQuotaPolicy});
    assert.equal(r.state,STATES.RENEWAL_UNVERIFIED);
    assert.equal(r.approved,false);
  }
});
test('self hosted open model needs REAL preexisting free compute',()=>{
  const q={kind:'SELF_HOSTED_PERPETUAL_VERIFIED',source:'https://example.com/compute'};
  const noCompute=classify({...good,freeQuotaPolicy:q,freeComputeVerified:false});
  assert.equal(noCompute.state,STATES.RENEWAL_UNVERIFIED);
  const yesCompute=classify({...good,freeQuotaPolicy:q,freeComputeVerified:true});
  assert.equal(yesCompute.state,STATES.CANDIDATE_FOR_CONTROLLED_PROBE);
  assert.equal(yesCompute.approved,false);
});
test('registered Groq and Cloudflare offers are recurring but NOT auto approved',()=>{
  const r=getCurrentReport();
  assert.equal(r.renewableQuotaRequired,true);
  assert.equal(r.temporaryCreditsEligible,false);
  const q=r.candidates.find(x=>x.id==='QWEN3_8_27B_GROQ');
  const cf=r.candidates.find(x=>x.id==='GEMMA4_26B_A4B_CLOUDFLARE');
  assert.equal(q.state,STATES.CONNECTED_UNDER_QA);
  assert.equal(cf.state,STATES.ACCOUNT_NOT_CONNECTED);
});

test('existing ChatGPT subscription can qualify without buying an API only when entitlement is verified',()=>{
  const subscription={...good,freeApiAccess:'NOT_SEPARATE_API',
    freeQuotaPolicy:{kind:'EXISTING_SUBSCRIPTION_ENTITLEMENT_VERIFIED',
      reset:'PLAN_PERIOD',source:'https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan'},
    subscriptionPlanAlreadyHeld:true,noNewBillingVerified:true,
    usesSeparatelyBilledApi:false,entitlementAccessVerified:true};
  const eligible=classify(subscription);
  assert.equal(eligible.state,STATES.CANDIDATE_FOR_CONTROLLED_PROBE);
  assert.equal(eligible.automaticApiAccessAssumed,false);
  assert.equal(eligible.approved,false);
  for(const testVariant of [
    {...subscription,entitlementAccessVerified:false},
    {...subscription,usesSeparatelyBilledApi:true},
    {...subscription,subscriptionPlanAlreadyHeld:false},
    {...subscription,noNewBillingVerified:false}
  ]){
    assert.equal(classify(testVariant).state,STATES.RENEWAL_UNVERIFIED);
  }
});
