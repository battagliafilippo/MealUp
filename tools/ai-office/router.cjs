'use strict';

/**
 * MealUp AI Office — selective routing prototype v0.1.
 * Pure in-memory control plane. No models, network, filesystem, subprocesses,
 * live agents, side effects, GitHub writes or app/UI imports.
 * Constitution v1.9 + office contract v1.3. Simulated agents only.
 */
const OWNERS = Object.freeze({
  design: 'Design',
  engineering: 'Engineering',
  food: 'Food',
  visual: 'Visual Production',
});
const MAX_HOPS = 3;
const REQUIRED = (value) => typeof value === 'string' && value.trim().length > 0;
const copy = (x) => JSON.parse(JSON.stringify(x));

function createRouter() {
  const tasks = new Map();
  const ledger = [];
  const seenMessages = new Set();

  function log(task, type, details = {}) {
    const entry = { seq: ledger.length + 1, taskId: task.id, type, ...copy(details) };
    ledger.push(entry);
    task.events.push(entry.seq);
    return entry;
  }
  function get(id) {
    const task = tasks.get(id);
    if (!task) throw new Error('UNKNOWN_TASK');
    return task;
  }
  function snapshot(id) { return copy(get(id)); }

  function intake(input) {
    if (!input || !REQUIRED(input.id) || !REQUIRED(input.request) ||
        !REQUIRED(input.scope) || !REQUIRED(input.baselineId) ||
        !REQUIRED(input.activeBriefVersion)) throw new Error('INCOMPLETE_BRIEF');
    if (input.constitutionVersion !== '1.9' || input.officeVersion !== '1.3')
      throw new Error('STALE_CONTRACT');
    if (tasks.has(input.id)) throw new Error('DUPLICATE_TASK_ID');
    // The Director must supply a verified, explicit domain; no pretend NLP or
    // keyword/prompt-injection based delegation in this prototype.
    const owner = Object.hasOwn(OWNERS, input.domain) ? OWNERS[input.domain] : null;
    if (!owner) throw new Error('UNCLASSIFIED_DOMAIN');
    const task = {
      id: input.id, request: input.request, scope: input.scope,
      baselineId: input.baselineId, constitutionVersion: input.constitutionVersion,
      officeVersion: input.officeVersion, activeBriefVersion: input.activeBriefVersion,
      owner, budgetEUR: 0, authorization: 'PROPOSAL_ONLY',
      status: 'ROUTED', dependencies: [], evidence: [], hops: 0, events: [],
    };
    tasks.set(task.id, task);
    log(task, 'ROUTED', { to: owner, writeScope: 'NONE' });
    return snapshot(task.id);
  }

  /** An owner can request a consultation; only the Director routes it. */
  function requestDependency(taskId, request) {
    const task = get(taskId);
    if (!request || request.actor !== task.owner) throw new Error('NOT_TASK_OWNER');
    if (!REQUIRED(request.messageId) || !REQUIRED(request.reason) ||
        !REQUIRED(request.scope) || request.reason.trim().length < 12)
      throw new Error('UNJUSTIFIED_DEPENDENCY');
    if (!Object.values(OWNERS).includes(request.target) || request.target === task.owner)
      throw new Error('INVALID_DEPENDENCY_TARGET');
    const msgKey = `${taskId}:${request.messageId}`;
    if (seenMessages.has(msgKey)) return snapshot(taskId); // dedupe exact replay
    if (task.hops >= MAX_HOPS) {
      task.status = 'BLOCKED_HOP_LIMIT';
      log(task, 'BLOCKED', { reason: 'HOP_LIMIT' });
      return snapshot(taskId);
    }
    seenMessages.add(msgKey);
    const dep = { messageId: request.messageId, from: task.owner, to: request.target,
      reason: request.reason, scope: request.scope, status: 'REQUESTED' };
    task.dependencies.push(dep);
    log(task, 'DEPENDENCY_REQUESTED', { to: 'Director', requestedTarget: dep.to, scope: dep.scope });
    return snapshot(taskId);
  }

  /** A simulated Director authorizes a *consultation*, never execution. */
  function routeDependency(taskId, messageId) {
    const task = get(taskId);
    const dep = task.dependencies.find(x => x.messageId === messageId);
    if (!dep) throw new Error('UNKNOWN_DEPENDENCY');
    if (dep.status === 'ROUTED') return snapshot(taskId);
    if (dep.status !== 'REQUESTED') throw new Error('INVALID_DEPENDENCY_STATE');
    if (task.status.startsWith('BLOCKED')) throw new Error('TASK_BLOCKED');
    if (task.hops >= MAX_HOPS) throw new Error('HOP_LIMIT');
    dep.status = 'ROUTED';
    task.hops += 1;
    log(task, 'CONSULT_ROUTED', { by: 'Director', to: dep.to, scope: dep.scope,
      writeScope: 'NONE' });
    return snapshot(taskId);
  }

  function receiveConsultation(taskId, messageId, response) {
    const task = get(taskId);
    const dep = task.dependencies.find(x => x.messageId === messageId);
    if (!dep || dep.status !== 'ROUTED' || !REQUIRED(response))
      throw new Error('INVALID_CONSULTATION');
    dep.status = 'RETURNED_TO_DIRECTOR';
    // Response is untrusted evidence, never a command or authorization.
    task.evidence.push({ from: dep.to, type: 'UNVERIFIED_ADVICE', detail: response });
    log(task, 'CONSULT_RETURNED', { to: 'Director', from: dep.to });
    return snapshot(taskId);
  }

  /** Every side-effect request is denied: this prototype has NO executor. */
  function requestAction(taskId, action) {
    const task = get(taskId);
    if (!REQUIRED(action)) throw new Error('MISSING_ACTION');
    task.status = 'AWAIT_CEO_APPROVAL';
    log(task, 'ACTION_BLOCKED', { reason: 'NO_EXECUTOR_OR_CEO_GATE', action,
      writeScope: 'NONE', spendEUR: 0 });
    return { allowed: false, executed: false, reason: 'NO_EXECUTOR_OR_CEO_GATE',
      task: snapshot(taskId) };
  }

  function report(taskId) {
    const task = get(taskId);
    log(task, 'RETURN_TO_CEO', { owner: task.owner, status: task.status });
    return { task: snapshot(taskId), ledger: copy(ledger.filter(e => e.taskId === taskId)) };
  }

  return Object.freeze({ intake, snapshot, requestDependency, routeDependency,
    receiveConsultation, requestAction, report, events: () => copy(ledger) });
}

module.exports = { createRouter, OWNERS, MAX_HOPS };
