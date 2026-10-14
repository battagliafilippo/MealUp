'use strict';

/**
 * MealUp AI Office: first Director -> Design -> Director structured-message pilot.
 * 100% simulated: no AI model, subprocess, network, filesystem, write permissions,
 * background worker, QA certification or production app integration.
 * Constitution v1.9; office contract v1.3; zero additional EUR.
 */
const { createRouter } = require('./router.cjs');
const PROTOCOL = 'MEALUP_OFFICE_HANDOFF_V0_1';
const copy = (x) => JSON.parse(JSON.stringify(x));

function createDirectorDesignSimulation() {
  const router = createRouter();
  const envelopes = new Map();
  const received = new Set();

  function assign(brief) {
    if (!brief || brief.domain !== 'design') throw new Error('DESIGN_ONLY_PILOT');
    // Router is the source of truth for version lock, baseline, scope and owner.
    const task = router.intake(brief);
    if (task.owner !== 'Design' || task.authorization !== 'PROPOSAL_ONLY')
      throw new Error('UNSAFE_ROUTING');
    const envelope = {
      protocol: PROTOCOL,
      id: `${task.id}:director-to-design:1`,
      conversation: task.id,
      inReplyTo: null,
      from: 'Director',
      to: 'Design',
      act: 'request',
      taskId: task.id,
      versions: {
        constitution: task.constitutionVersion,
        office: task.officeVersion,
        brief: task.activeBriefVersion,
        baseline: task.baselineId,
      },
      payload: {
        intent: task.request,
        scope: task.scope,
        writeScope: 'NONE',
        budgetEUR: 0,
        authorization: 'PROPOSAL_ONLY',
        frozenChangesAllowed: false,
      },
      requiresReply: true,
      execution: 'MOCK_ONLY',
    };
    envelopes.set(task.id, envelope);
    return copy(envelope);
  }

  function ensureExactRequest(request) {
    if (!request || typeof request.taskId !== 'string')
      throw new Error('INVALID_HANDOFF');
    const stored = envelopes.get(request.taskId);
    if (!stored || JSON.stringify(request) !== JSON.stringify(stored))
      throw new Error('INVALID_HANDOFF');
    return stored;
  }

  /** Fixed mock response, not an AI design opinion. */
  function simulateDesign(request) {
    const envelope = ensureExactRequest(request);
    return {
      protocol: PROTOCOL,
      id: `${envelope.taskId}:design-to-director:1`,
      conversation: envelope.conversation,
      inReplyTo: envelope.id,
      from: 'Design',
      to: 'Director',
      act: 'inform',
      taskId: envelope.taskId,
      versions: copy(envelope.versions),
      payload: {
        status: 'MOCK_ACK_ONLY',
        note: 'Simulated receipt only. No design recommendation was generated or verified.',
        otherDepartmentsActivated: [],
        filesModified: [],
        qaStatus: 'NOT_RUN',
        authorization: 'PROPOSAL_ONLY',
        budgetEUR: 0,
      },
      execution: 'MOCK_ONLY',
    };
  }

  function receive(reply) {
    if (!reply || typeof reply.taskId !== 'string') throw new Error('INVALID_REPLY');
    const request = envelopes.get(reply.taskId);
    if (!request) throw new Error('UNKNOWN_HANDOFF');
    if (received.has(reply.taskId)) throw new Error('REPLAYED_REPLY');
    const expected = simulateDesign(copy(request));
    if (JSON.stringify(reply) !== JSON.stringify(expected)) throw new Error('FORGED_REPLY');
    received.add(reply.taskId);
    const report = router.report(reply.taskId);
    return {
      from: 'Director', to: 'CEO', taskId: reply.taskId,
      status: 'MOCK_HANDOFF_COMPLETE',
      owner: report.task.owner,
      authorization: report.task.authorization,
      evidence: 'SIMULATED_DESIGN_ACK_ONLY',
      qaStatus: 'NOT_RUN',
      otherDepartmentsActivated: [],
      costEUR: 0,
      decision: 'NO_IMPLEMENTATION_AUTHORIZED',
      messages: [copy(request), copy(reply)],
      routerEvents: report.ledger,
    };
  }

  return Object.freeze({ assign, simulateDesign, receive });
}

module.exports = { createDirectorDesignSimulation, PROTOCOL };
