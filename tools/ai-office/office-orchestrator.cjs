'use strict';

/**
 * Minimal connection layer: selective router -> registered owner -> QA -> CEO.
 * It creates verifiable plans and handoff envelopes only. Provider execution,
 * file writes, deploys, purchases and FROZEN changes remain outside this layer.
 */
const { createRouter } = require('./router.cjs');
const { connectionPlan, getRole } = require('./agent-registry.cjs');
const PROTOCOL = 'MEALUP_OFFICE_CONNECTION_V0_1';
const copy = (value) => JSON.parse(JSON.stringify(value));

function createOfficeOrchestrator() {
  const router = createRouter();
  const plans = new Map();

  function intake(input) {
    const task = router.intake(input);
    const plan = connectionPlan(task.owner, input.promptSpecializationRequired === true);
    const record = { task, plan, status: 'CONNECTED_PLAN_READY' };
    plans.set(task.id, record);
    return copy(record);
  }

  function handoff(taskId) {
    const record = plans.get(taskId);
    if (!record) throw new Error('UNKNOWN_OFFICE_PLAN');
    const task = router.snapshot(taskId);
    const ownerStage = record.plan.stages.find(x => x.roleId === record.plan.ownerRole);
    return {
      protocol: PROTOCOL,
      id: `${task.id}:director-to-${record.plan.ownerRole}:1`,
      from: 'AI Office Director',
      to: ownerStage.label,
      taskId: task.id,
      owner: task.owner,
      adapter: ownerStage.adapter,
      adapterStatus: ownerStage.status,
      versions: {
        constitution: task.constitutionVersion,
        office: task.officeVersion,
        brief: task.activeBriefVersion,
        baseline: task.baselineId,
      },
      payload: {
        request: task.request,
        scope: task.scope,
        authorization: 'PROPOSAL_ONLY',
        writeScope: 'NONE',
        budgetEUR: 0,
      },
      execution: 'NOT_STARTED',
      nextGate: getRole('qa').label,
      finalAuthority: 'CEO',
    };
  }

  function requestAction(taskId, action) {
    return router.requestAction(taskId, action);
  }

  function report(taskId) {
    const record = plans.get(taskId);
    if (!record) throw new Error('UNKNOWN_OFFICE_PLAN');
    return { ...router.report(taskId), connectionPlan: copy(record.plan),
      executionStatus: 'NO_PROVIDER_OR_WRITE_EXECUTED' };
  }

  return Object.freeze({ intake, handoff, requestAction, report });
}

module.exports = { createOfficeOrchestrator, PROTOCOL };
