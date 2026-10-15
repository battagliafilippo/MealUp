'use strict';

/**
 * Canonical runtime registry for the MealUp AI Office laboratory.
 * A CONNECTED status means that an evidenced adapter/capability is mapped to
 * the office. It never means autonomous execution, approval or paid access.
 */
const CONTRACT = Object.freeze({ constitution: '1.9', office: '1.3', budgetEUR: 0 });
const ROLE_BY_OWNER = Object.freeze({
  Design: 'design',
  Engineering: 'engineering',
  Food: 'food',
  'Visual Production': 'visual',
});

const REGISTRY = Object.freeze({
  director: Object.freeze({
    label: 'AI Office Director',
    adapter: 'CHATGPT_CODEX_INTERACTIVE',
    status: 'INTERACTIVE_ONLY',
    activation: 'CEO_REQUEST',
    writes: false,
    purpose: 'Routing, consolidation and one recommendation to the CEO',
  }),
  design: Object.freeze({
    label: 'Design Director',
    adapter: 'GROQ_QWEN_3_8_27B_VISION',
    status: 'CONNECTED_GUARDED',
    activation: 'EXPLICIT_FREE_TIER_LIVE_OPT_IN',
    secret: 'GROQ_API_KEY',
    writes: false,
    purpose: 'Visual observation and design review; never FROZEN certification',
    evidence: 'https://github.com/battagliafilippo/MealUp/actions/runs/38640342532',
  }),
  engineering: Object.freeze({
    label: 'Engineering Lead',
    adapter: 'CHATGPT_CODEX_INTERACTIVE',
    status: 'INTERACTIVE_ONLY',
    activation: 'CEO_REQUEST',
    writes: 'AUTHORIZED_EXPERIMENT_SCOPE_ONLY',
    purpose: 'Code, architecture, security, performance and regression work',
  }),
  food: Object.freeze({
    label: 'Food Specialist',
    adapter: 'RECIPE_ANALYZER_VISUAL_DIRECTOR_GROQ',
    status: 'CONNECTED_GUARDED',
    activation: 'EXPLICIT_FREE_TIER_LIVE_OPT_IN',
    secret: 'GROQ_API_KEY',
    writes: false,
    purpose: 'Recipe evidence, culinary constraints and canonical vessel planning',
    evidence: 'https://github.com/battagliafilippo/MealUp/actions/runs/38676389973',
  }),
  visual: Object.freeze({
    label: 'Visual Production',
    adapter: 'OPENAI_BUILT_IN_IMAGEGEN_INTERACTIVE',
    status: 'CONNECTED_GUARDED_SINGLE_CANDIDATE',
    activation: 'AUTHORIZED_RECIPE_CYCLE_AND_ZERO_COST_QUOTA_CHECK',
    writes: false,
    purpose: 'Generate exactly one candidate for one authorized recipe cycle; no batch or auto-approval',
  }),
  prompt_architect: Object.freeze({
    label: 'Prompt Architect',
    adapter: 'DIRECTOR_STRUCTURED_PROMPT_PROTOCOL',
    status: 'CONNECTED_CONDITIONAL',
    activation: 'DIRECTOR_DEMONSTRATED_NEED',
    writes: false,
    purpose: 'Translate an approved brief for a target model without executing it',
  }),
  qa: Object.freeze({
    label: 'QA / Verification Gate',
    adapter: 'GITHUB_ACTIONS_AND_DETERMINISTIC_TESTS',
    status: 'CONNECTED_INDEPENDENT',
    activation: 'AFTER_EVIDENCE_EXISTS',
    writes: false,
    purpose: 'Independent PASS/PARTIAL/FAIL/BLOCKED evidence gate',
    evidence: 'https://github.com/battagliafilippo/MealUp/actions/runs/38629252967',
  }),
  talent: Object.freeze({
    label: 'AI Talent & Innovation',
    adapter: 'CHATGPT_SCHEDULED_SCOUTING',
    status: 'EXTERNAL_AUTOMATION_NOT_REPO_EXECUTOR',
    activation: 'WEEKLY_CONDITIONAL_REPORT',
    writes: false,
    purpose: 'Scout candidates and report directly to CEO; never replace automatically',
  }),
});

const copy = (value) => JSON.parse(JSON.stringify(value));
function getRole(roleId) {
  if (!Object.hasOwn(REGISTRY, roleId)) throw new Error('UNKNOWN_OFFICE_ROLE');
  return copy(REGISTRY[roleId]);
}
function roleForOwner(owner) {
  if (!Object.hasOwn(ROLE_BY_OWNER, owner)) throw new Error('UNMAPPED_OWNER');
  return ROLE_BY_OWNER[owner];
}
function connectionPlan(owner, promptSpecializationRequired = false) {
  const ownerRole = roleForOwner(owner);
  const stages = ['director'];
  if (promptSpecializationRequired === true) stages.push('prompt_architect');
  stages.push(ownerRole, 'qa', 'director');
  return {
    contract: copy(CONTRACT),
    ownerRole,
    stages: stages.map(roleId => ({ roleId, ...getRole(roleId) })),
    finalAuthority: 'CEO',
    autonomousExecution: false,
    paidServicesAllowed: false,
  };
}

module.exports = { CONTRACT, REGISTRY, getRole, roleForOwner, connectionPlan };
