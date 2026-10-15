'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {expectedTextCost,estimateTextDailyCapacity,forecastJob,
  selectApprovedBackup,reportTypicalTextCase} = require('./scout-capacity-planner.cjs');
const groq='QWEN3_8_27B_GROQ';
const gemma='GEMMA4_26B_A4B_CLOUDFLARE';
const mistral='MISTRAL_SMALL_3_1_24B_CLOUDFLARE';
const sample={inputTokens:3000,outputTokens:1200};
const permittedPool={ceoApproved:true,scope:'SIMULATED_DESIGN_SCOPE',
  allowedModelIds:[groq,gemma,mistral],allowedCapabilities:['VISION_DESIGN']};
const task={role:'Design Director',capability:'VISION_DESIGN',
  approvalScope:'SIMULATED_DESIGN_SCOPE',contextSnapshotValidated:true};
const base=id=>({
  id,role:'Design Director',qualityQaApproved:true,providerConnected:true,
  licenseApproved:true,capabilities:['VISION_DESIGN'],
  contextContractCompatible:true,rank:id===groq?1:2,
  poolId:id===groq?'GROQ_FREE_QWEN_3_8':'CLOUDFLARE_WORKERS_AI_FREE',
  p95QuotaUnitsPerJob:id===groq?4200:100,budgetUnit:id===groq?'TOKENS':'NEURONS'
});
const all=[base(groq),base(gemma),base(mistral)];
const budgets={
  GROQ_FREE_QWEN_3_8:{unit:'TOKENS',remaining:10000,liveMeteringVerified:true,
    providerNotRateLimited:true,resetAtUtc:'2026-10-16T00:00:00Z'},
  CLOUDFLARE_WORKERS_AI_FREE:{unit:'NEURONS',remaining:1000,liveMeteringVerified:true,
    providerNotRateLimited:true,resetAtUtc:'2026-10-16T00:00:00Z'}
};
const candidateInput=(overrides={})=>({task,pool:permittedPool,
  candidates:all,budgets,...overrides});

test('theoretical text-only quota example matches provider documentation: 47,166,64',()=>{
  const estimates=reportTypicalTextCase();
  assert.deepEqual(estimates.map(x=>x.dailyUpperBound),[47,166,64]);
  for(const item of estimates) {
    assert.equal(item.visionReady,false);
    assert.equal(item.basedOn,'PUBLISHED_FREE_PLAN_LIMITS_TEXT_ONLY');
  }
});
test('Cloudflare Gemma and Mistral belong to a single shared provider allowance',()=>{
  const a=expectedTextCost(gemma,...Object.values(sample));
  const b=expectedTextCost(mistral,...Object.values(sample));
  assert.equal(a.providerPoolId,b.providerPoolId);
  assert.equal(a.providerPoolId,'CLOUDFLARE_WORKERS_AI_FREE');
  assert.ok(a.perTask<b.perTask);
});
test('reserve lowers planning estimate without claiming measured vision cost',()=>{
  const a=estimateTextDailyCapacity(groq,3000,1200);
  const b=estimateTextDailyCapacity(gemma,3000,1200);
  assert.equal(a.dailyUpperBound,40);
  assert.equal(b.dailyUpperBound,141);
  assert.equal(a.visionReady,false);
});
test('forecast rejects missing/mismatched image-inclusive metering',()=>{
  const job={steps:30,isVision:true};
  const result=forecastJob(gemma,job,null);
  assert.equal(result.status,'VISION_CAPACITY_UNVERIFIED');
  assert.equal(forecastJob(gemma,job,{modelId:gemma,providerPoolId:'WRONG',
    p95TotalQuotaUnits:80,remainingPoolQuota:1000,validatedVisionInputs:true,
    sampleCount:3}).status,'VISION_CAPACITY_UNVERIFIED');
});
test('adequate measured budget cannot bypass CEO and quality approval',()=>{
  const report=forecastJob(gemma,{steps:8,isVision:true},{
    modelId:gemma,providerPoolId:'CLOUDFLARE_WORKERS_AI_FREE',
    p95TotalQuotaUnits:90,remainingPoolQuota:1000,validatedVisionInputs:true,sampleCount:5,
    frozenInputVersionVerified:true,designQaApproved:false,
    apiAccessVerified:true,ceoPoolAuthorization:false
  });
  assert.equal(report.estimatedRemainingJobs,9);
  assert.equal(report.status,'QUALITY_OR_CEO_APPROVAL_REQUIRED');
});
test('text-only forecast reports illustrative duration not guaranteed uninterrupted availability',()=>{
  const report=forecastJob(groq,{steps:60,isVision:false,...sample});
  assert.equal(report.status,'TEXT_ESTIMATE_ONLY');
  assert.equal(report.workFitsOneFullFreeDayTextOnly,false);
});
test('unapproved pool cannot route, even when agents have positive mock quotas',()=>{
  const r=selectApprovedBackup(candidateInput({
    pool:{...permittedPool,ceoApproved:false}
  }));
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.reason,'CEO_APPROVED_POOL_REQUIRED');
});
test('handoff snapshot must be validated before any dry-run routing',()=>{
  const r=selectApprovedBackup(candidateInput({task:{...task,contextSnapshotValidated:false}}));
  assert.equal(r.reason,'INCOMPLETE_VERIFIED_TASK_HANDOFF');
});
test('QA failure or unconnected provider excludes model',()=>{
  const r=selectApprovedBackup(candidateInput({candidates:all.map(x=>({
    ...x,qualityQaApproved:false}))}));
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.reason,'NO_QA_APPROVED_CONNECTED_MODEL_WITH_MATCHING_SCOPE');
});
test('selects higher-priority eligible provider while quota is sufficient',()=>{
  const r=selectApprovedBackup(candidateInput());
  assert.equal(r.status,'DRY_RUN_ELIGIBLE');
  assert.equal(r.modelId,groq);
  assert.equal(r.execute,false);
  assert.equal(r.agentSwitchPerformed,false);
});
test('when Groq is exhausted, can dry-run independent Cloudflare provider',()=>{
  const r=selectApprovedBackup(candidateInput({
    budgets:{...budgets,GROQ_FREE_QWEN_3_8:{...budgets.GROQ_FREE_QWEN_3_8,
      remaining:0,providerNotRateLimited:false}}
  }));
  assert.equal(r.status,'DRY_RUN_ELIGIBLE');
  assert.equal(r.modelId,gemma);
  assert.equal(r.poolId,'CLOUDFLARE_WORKERS_AI_FREE');
});
test('no false fresh quota from switching Gemma to Mistral on same Cloudflare account',()=>{
  const r=selectApprovedBackup(candidateInput({
    candidates:[base(gemma),base(mistral)],
    pool:{...permittedPool,allowedModelIds:[gemma,mistral]},
    budgets:{CLOUDFLARE_WORKERS_AI_FREE:{...budgets.CLOUDFLARE_WORKERS_AI_FREE,
      remaining:0}}
  }));
  assert.equal(r.status,'WAIT_FOR_QUOTA_RESET');
  assert.equal(r.execute,false);
});
test('blocked shared pool cannot be bypassed by alternate model in same pool',()=>{
  const r=selectApprovedBackup(candidateInput({
    blockedQuotaPoolIds:['CLOUDFLARE_WORKERS_AI_FREE','GROQ_FREE_QWEN_3_8']
  }));
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.agentSwitchPerformed,false);
});
test('no metering data means no fabricated capacity availability',()=>{
  const r=selectApprovedBackup(candidateInput({budgets:{}}));
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.reason,'NO_VERIFIED_AVAILABLE_FREE_QUOTA');
});
test('unknown account and invalid token profile do not imply free capacity',()=>{
  assert.throws(()=>expectedTextCost('NOT_REGISTERED',3000,1200),/UNKNOWN_MODEL/);
  assert.throws(()=>estimateTextDailyCapacity(gemma,-1,1200),/INVALID_INPUT_TOKENS/);
});
