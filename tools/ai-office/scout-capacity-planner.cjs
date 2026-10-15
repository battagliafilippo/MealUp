'use strict';

/**
 * MealUp zero-extra-cost capacity & handoff planner.
 * Offline only: cannot invoke agents, persist usage, purchase tokens, change
 * active roles, use a network, or resume future jobs automatically.
 * Scout forecasts; only an explicitly authorized Director runtime may execute
 * an approved provider/model pool after independent QA.
 */
const policy = require('./scout-capacity-policy.json');
const findModel = id => policy.modelCosts.find(x => x.id === id);
const findPool = id => policy.budgetPools.find(x => x.id === id);
const REQUIRED = x => typeof x === 'string' && x.trim().length > 0;
function assertWholePositive(n,field) {
  if(!Number.isSafeInteger(n) || n < 1) throw Error('INVALID_'+field);
}
function assertWholeNonnegative(n,field) {
  if(!Number.isSafeInteger(n) || n < 0) throw Error('INVALID_'+field);
}
function expectedTextCost(modelId, inputTokens, outputTokens) {
  assertWholePositive(inputTokens, 'INPUT_TOKENS');
  assertWholePositive(outputTokens, 'OUTPUT_TOKENS');
  const model = findModel(modelId);
  if (!model) throw Error('UNKNOWN_MODEL');
  const pool = findPool(model.budgetPoolId);
  if (!pool) throw Error('UNKNOWN_QUOTA_POOL');
  if (model.billingUnit === 'NEURONS') {
    return { unit: 'NEURONS', perTask:
      (inputTokens * model.neuronsPerMillionInput +
        outputTokens * model.neuronsPerMillionOutput)/1000000,
      providerPoolId: pool.id,
      textOnly: true };
  }
  if (model.billingUnit === 'GROQ_REQUEST_AND_INPUT_OUTPUT_TOKENS') {
    return { unit: 'TOKENS_AND_REQUESTS', perTask: inputTokens+outputTokens,
      providerPoolId: pool.id, textOnly: true };
  }
  throw Error('UNSUPPORTED_BILLING_UNIT');
}
/**
 * Model's upper-bound per-day estimate, assuming no other users or models
 * consumed the pool. Actual task availability may be lower.
 */
function estimateTextDailyCapacity(modelId, inputTokens, outputTokens, options = {}) {
  const reserve = options.headroomFraction ?? policy.defaultHeadroomFraction;
  if (typeof reserve !== 'number' || reserve < 0 || reserve >= 1)
    throw Error('INVALID_HEADROOM');
  const cost = expectedTextCost(modelId, inputTokens, outputTokens);
  const pool = findPool(cost.providerPoolId);
  const available = 1-reserve;
  let dailyUpperBound;
  let theoreticalPerMinute = null;
  if (cost.unit === 'NEURONS') {
    dailyUpperBound = Math.floor(pool.caps.neuronsPerDay * available / cost.perTask);
  } else {
    dailyUpperBound = Math.min(
      Math.floor(pool.caps.tokensPerDay * available / cost.perTask),
      Math.floor(pool.caps.requestsPerDay * available)
    );
    theoreticalPerMinute = Math.min(
      Math.floor(pool.caps.tokensPerMinute / cost.perTask),
      pool.caps.requestsPerMinute
    );
  }
  return {
    modelId, poolId:pool.id, costPerTask:cost.perTask, costUnit:cost.unit,
    dailyUpperBound, theoreticalPerMinute, reservedFraction:reserve,
    basedOn:'PUBLISHED_FREE_PLAN_LIMITS_TEXT_ONLY',
    visionReady:false,
    actualAccountRemainingUnknown:!pool.verifiedByLiveAccess ||
      pool.accountSpecificLimitsUnverified===true,
    caution:'This assumes 0 image cost, no competing traffic and 0 extra context. NOT a forecast of vision jobs.'
  };
}
/**
 * Real vision-work forecasting must use measured task costs (including images)
 * and current provider quota, not optimistic text-only formula.
 */
function forecastJob(modelId, job, telemetry) {
  if (!job || !Number.isSafeInteger(job.steps)||job.steps<1)
    throw Error('INVALID_JOB_STEPS');
  if (!job.isVision) {
    const estimate = estimateTextDailyCapacity(modelId,job.inputTokens,job.outputTokens);
    return { status:'TEXT_ESTIMATE_ONLY', jobSteps:job.steps, ...estimate,
      workFitsOneFullFreeDayTextOnly:estimate.dailyUpperBound>=job.steps };
  }
  const model=findModel(modelId);
  if(!model) throw Error('UNKNOWN_MODEL');
  if (!telemetry || !Number.isFinite(telemetry.p95TotalQuotaUnits) ||
      telemetry.p95TotalQuotaUnits<=0 || telemetry.providerPoolId!==model.budgetPoolId ||
      telemetry.modelId!==modelId || telemetry.validatedVisionInputs!==true ||
      !Number.isFinite(telemetry.remainingPoolQuota) || telemetry.remainingPoolQuota<0 ||
      !Number.isInteger(telemetry.sampleCount) || telemetry.sampleCount<3)
    return { status:'VISION_CAPACITY_UNVERIFIED', jobSteps:job.steps,
      modelId, poolId:model.budgetPoolId,
      reason:'P95_IMAGE_INCLUSIVE_USAGE_AND_LIVE_REMAINING_QUOTA_REQUIRED' };
  const quotaPool=findPool(model.budgetPoolId);
  const allowedUnits = Math.floor(telemetry.remainingPoolQuota * (1-policy.defaultHeadroomFraction));
  const estimatedRemainingJobs = Math.floor(allowedUnits/telemetry.p95TotalQuotaUnits);
  const readiness=telemetry.frozenInputVersionVerified===true &&
    telemetry.designQaApproved===true &&
    telemetry.apiAccessVerified===true &&
    telemetry.ceoPoolAuthorization===true;
  if (!readiness) return {
    status:'QUALITY_OR_CEO_APPROVAL_REQUIRED', jobSteps:job.steps,modelId,
    estimatedRemainingJobs, poolId:model.budgetPoolId, actualQuotaUnit:
      quotaPool.caps.neuronsPerDay!==undefined?'NEURONS':'TOKENS',
    reason:'TELEMETRY_DOES_NOT_AUTHORIZE_AUTONOMOUS_AGENTS'
  };
  return {
    status:estimatedRemainingJobs>=job.steps?'MEASURED_CAPACITY_SUFFICIENT':'NEED_ADDITIONAL_CAPACITY_OR_RESET',
    jobSteps:job.steps, estimatedRemainingJobs, modelId, poolId:model.budgetPoolId,
    assumedP95QuotaUnitsPerJob:telemetry.p95TotalQuotaUnits,
    note:'Estimates remaining work only; real execution checks after each response.'
  };
}
/**
 * Safe offline dry-run of Director dispatch. Only pool members explicitly
 * authorized by the CEO AND passed QA may be selected. Shared provider quota
 * can block two distinct models at once. No operational switch is performed.
 */
function selectApprovedBackup({task,pool,candidates,budgets,blockedQuotaPoolIds=[]}) {
  if (!task || !REQUIRED(task.role) || !REQUIRED(task.capability) ||
      !REQUIRED(task.approvalScope) || task.contextSnapshotValidated!==true)
    return {status:'BLOCKED',reason:'INCOMPLETE_VERIFIED_TASK_HANDOFF'};
  if (!pool || pool.ceoApproved!==true ||
      pool.scope!==task.approvalScope ||
      !Array.isArray(pool.allowedModelIds) || !pool.allowedCapabilities?.includes(task.capability))
    return {status:'BLOCKED',reason:'CEO_APPROVED_POOL_REQUIRED'};
  const eligible = (Array.isArray(candidates)?candidates:[])
    .filter(x=>pool.allowedModelIds.includes(x.id) &&
      x.role===task.role &&
      x.qualityQaApproved===true && x.providerConnected===true &&
      x.licenseApproved===true && x.capabilities?.includes(task.capability) &&
      x.contextContractCompatible===true &&
      REQUIRED(x.poolId) &&
      !blockedQuotaPoolIds.includes(x.poolId))
    .sort((a,b)=>(a.rank||100)-(b.rank||100));
  if (eligible.length===0)
    return {status:'BLOCKED',reason:'NO_QA_APPROVED_CONNECTED_MODEL_WITH_MATCHING_SCOPE'};
  const wait=[];
  for (const item of eligible) {
    const b=budgets?.[item.poolId];
    if(!b || !Number.isFinite(b.remaining) || !Number.isFinite(item.p95QuotaUnitsPerJob) ||
        item.p95QuotaUnitsPerJob<=0) continue;
    if (b.unit!==item.budgetUnit || !b.liveMeteringVerified) continue;
    const safeQuota=Math.floor(b.remaining*(1-policy.defaultHeadroomFraction));
    if(safeQuota>=item.p95QuotaUnitsPerJob &&
       b.providerNotRateLimited!==false)
      return {status:'DRY_RUN_ELIGIBLE',modelId:item.id,poolId:item.poolId,
        reason:'MODEL_ALREADY_QA_AND_CEO_APPROVED;QUOTA_HEADROOM_AVAILABLE',
        execute:false, agentSwitchPerformed:false};
    if(REQUIRED(b.resetAtUtc)) wait.push(b.resetAtUtc);
  }
  return wait.length?{status:'WAIT_FOR_QUOTA_RESET',nextKnownResetUtc:wait.sort()[0],
      execute:false,agentSwitchPerformed:false}:
    {status:'BLOCKED',reason:'NO_VERIFIED_AVAILABLE_FREE_QUOTA',
      execute:false,agentSwitchPerformed:false};
}
function reportTypicalTextCase() {
  return policy.modelCosts.map(x=>estimateTextDailyCapacity(x.id,3000,1200,
    {headroomFraction:0}));
}
if(require.main===module) {
  console.log(JSON.stringify({schema:policy.schema,liveCalls:0,modelReplacements:0,
    sample:'3K input + 1.2K output, text only, no reservations/no other usage',
    illustrativeDailyUpperBounds:reportTypicalTextCase()},null,2));
}
module.exports={policy,expectedTextCost,estimateTextDailyCapacity,forecastJob,
  selectApprovedBackup,reportTypicalTextCase};
