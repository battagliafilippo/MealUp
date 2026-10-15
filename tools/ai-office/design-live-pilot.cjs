'use strict';

/** First real guarded office assignment: Director -> Design/Qwen -> QA -> CEO. */
const fs = require('node:fs');
const path = require('node:path');
const { createOfficeOrchestrator } = require('./office-orchestrator.cjs');

const MODEL = 'qwen/qwen3.8-27b';
const TASK_ID = 'OFFICE-DESIGN-PILOT-001';
const SYSTEM = [
  'Sei il Design Director candidato dell ufficio MealUp.',
  'Analizza soltanto cio che e visibile nell immagine e separa osservazioni da ipotesi.',
  'Non dichiarare conformita ai FROZEN, approvazioni, implementazioni o modifiche eseguite.',
  'Non attivare altri reparti. Non proporre spese. Rispondi solo con JSON valido.'
].join(' ');

function assert(condition, message) { if (!condition) throw new Error(message); }
function cleanArray(value) {
  return Array.isArray(value) && value.every(x => typeof x === 'string' && x.trim()) ? value : null;
}
function validateCandidate(candidate) {
  const issues = [];
  if (!candidate || typeof candidate !== 'object') return ['INVALID_JSON_OBJECT'];
  if (!cleanArray(candidate.visibleObservations)) issues.push('VISIBLE_OBSERVATIONS_REQUIRED');
  if (typeof candidate.foodFamily !== 'string' || !candidate.foodFamily.trim())
    issues.push('FOOD_FAMILY_REQUIRED');
  if (!cleanArray(candidate.risksToVerify)) issues.push('RISKS_TO_VERIFY_REQUIRED');
  if (typeof candidate.recommendedMobileTest !== 'string' || !candidate.recommendedMobileTest.trim())
    issues.push('MOBILE_TEST_REQUIRED');
  if (!Array.isArray(candidate.assumptions)) issues.push('ASSUMPTIONS_ARRAY_REQUIRED');
  if (candidate.approvalClaim !== false) issues.push('APPROVAL_CLAIM_FORBIDDEN');
  if (candidate.decision !== 'PROPOSAL_ONLY') issues.push('DECISION_MUST_BE_PROPOSAL_ONLY');
  if (!Array.isArray(candidate.filesModified) || candidate.filesModified.length !== 0)
    issues.push('FILES_MODIFIED_FORBIDDEN');
  if (!Array.isArray(candidate.otherDepartmentsActivated) || candidate.otherDepartmentsActivated.length !== 0)
    issues.push('CROSS_DEPARTMENT_ACTIVATION_FORBIDDEN');
  return [...new Set(issues)];
}

function buildOfficePlan() {
  const office = createOfficeOrchestrator();
  office.intake({ id: TASK_ID, domain: 'design',
    request: 'Valuta il Food Object Pasta su una card mobile MealUp senza cambiare il design',
    scope: 'Osservazione visiva e proposta di un solo test mobile; nessuna scrittura',
    baselineId: 'experiment/recipe-visual-agents@5156d42',
    constitutionVersion: '1.9', officeVersion: '1.3', activeBriefVersion: 'office-v1.3',
    promptSpecializationRequired: false });
  const handoff = office.handoff(TASK_ID);
  assert(handoff.owner === 'Design', 'WRONG_OWNER');
  assert(handoff.adapter === 'GROQ_QWEN_3_8_27B_VISION', 'WRONG_ADAPTER');
  assert(handoff.payload.writeScope === 'NONE', 'WRITE_SCOPE_NOT_NONE');
  assert(handoff.payload.budgetEUR === 0, 'NONZERO_BUDGET');
  return { office, handoff };
}

async function callQwen(key, image) {
  const schema = {
    visibleObservations: ['stringa basata solo sui pixel visibili'],
    foodFamily: 'stringa', risksToVerify: ['rischio da verificare, non difetto dichiarato'],
    recommendedMobileTest: 'un solo test concreto su card mobile', assumptions: [],
    approvalClaim: false, decision: 'PROPOSAL_ONLY', filesModified: [],
    otherDepartmentsActivated: []
  };
  const body = { model: MODEL, reasoning_effort: 'none', temperature: 0.1,
    max_completion_tokens: 520, stream: false, response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: [
        { type: 'text', text: 'Incarico reale controllato. Analizza questo Food Object Pasta per una card mobile. Non inventare misure, regole o vessel. Compila esattamente questo schema JSON: ' + JSON.stringify(schema) },
        { type: 'image_url', image_url: { url: 'data:image/webp;base64,' + image.toString('base64') } }
      ] }
    ] };
  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(25000)
    });
  } catch (_error) { throw new Error('NETWORK_OR_TIMEOUT_NO_RETRY'); }
  let result = {};
  try { result = await response.json(); } catch (_) { throw new Error('INVALID_PROVIDER_JSON'); }
  if (!response.ok) {
    const safe = typeof result?.error?.code === 'string' ? result.error.code.replace(/[^a-zA-Z0-9_-]/g, '') : 'UNKNOWN';
    throw new Error(`PROVIDER_HTTP_${response.status}_${safe}`);
  }
  const raw = result?.choices?.[0]?.message?.content;
  assert(typeof raw === 'string' && raw.trim(), 'EMPTY_PROVIDER_OUTPUT');
  let candidate;
  try { candidate = JSON.parse(raw); } catch (_) { throw new Error('CANDIDATE_NOT_JSON'); }
  return { candidate, usageTotalTokens: Number.isInteger(result?.usage?.total_tokens) ? result.usage.total_tokens : null };
}

async function run(argv = process.argv.slice(2)) {
  if (argv.includes('--self-test')) return selfTest();
  const flag = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  assert(argv.includes('--live'), 'LIVE_FLAG_REQUIRED');
  assert(process.env.MEALUP_FREE_ONLY === 'YES', 'FREE_ONLY_GATE_REQUIRED');
  assert(typeof process.env.GROQ_API_KEY === 'string' && process.env.GROQ_API_KEY.length > 20,
    'GROQ_SECRET_REQUIRED');
  const assetPath = path.resolve(flag('--asset') || '');
  const outPath = path.resolve(flag('--out') || '');
  assert(assetPath.endsWith(path.join('assets', 'family-fo', 'pasta.webp')), 'FIXED_TEST_ASSET_REQUIRED');
  assert(outPath && outPath !== '/' && !outPath.includes(path.sep + '.git' + path.sep), 'SAFE_OUTPUT_REQUIRED');
  const image = fs.readFileSync(assetPath);
  assert(image.length >= 1000 && image.length <= 250000, 'ASSET_SIZE_BLOCKED');
  const { office, handoff } = buildOfficePlan();
  const provider = await callQwen(process.env.GROQ_API_KEY, image);
  const issues = validateCandidate(provider.candidate);
  const report = {
    schema: 'mealup-office-design-pilot-v1', taskId: TASK_ID,
    pipeline: ['AI Office Director', 'Design Director', 'QA / Verification Gate', 'CEO'],
    handoff, model: MODEL, provider: 'GROQ_FREE_GUARDED', apiCalls: 1, retries: 0,
    additionalCostEUR: 0, candidate: provider.candidate,
    qa: { status: issues.length ? 'BLOCKED' : 'PARTIAL_HUMAN_REVIEW', issues,
      approved: false, reason: issues.length ? 'STRUCTURAL_GUARD_FAILED' : 'VISUAL_HUMAN_REVIEW_REQUIRED' },
    filesModified: [], imagesGenerated: 0, deploys: 0, usageTotalTokens: provider.usageTotalTokens,
    officeReport: office.report(TASK_ID), finalAuthority: 'CEO'
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`OFFICE_PILOT=${report.qa.status} API_CALLS=1 RETRIES=0 IMAGES=0 DEPLOYS=0`);
  return report;
}

function selfTest() {
  const good = { visibleObservations: ['Pasta secca in composizione 3D'], foodFamily: 'Pasta',
    risksToVerify: ['Leggibilita da verificare su card piccola'],
    recommendedMobileTest: 'Confronto a dimensione reale su iPhone', assumptions: [],
    approvalClaim: false, decision: 'PROPOSAL_ONLY', filesModified: [], otherDepartmentsActivated: [] };
  assert(validateCandidate(good).length === 0, 'VALID_CANDIDATE_REJECTED');
  assert(validateCandidate({ ...good, approvalClaim: true }).includes('APPROVAL_CLAIM_FORBIDDEN'),
    'FAKE_APPROVAL_NOT_BLOCKED');
  assert(validateCandidate({ ...good, filesModified: ['index.html'] }).includes('FILES_MODIFIED_FORBIDDEN'),
    'FAKE_WRITE_NOT_BLOCKED');
  assert(validateCandidate({ ...good, otherDepartmentsActivated: ['Engineering'] })
    .includes('CROSS_DEPARTMENT_ACTIVATION_FORBIDDEN'), 'CROSS_DEPARTMENT_NOT_BLOCKED');
  const plan = buildOfficePlan();
  assert(plan.handoff.execution === 'NOT_STARTED', 'HANDOFF_EXECUTED_DURING_TEST');
  console.log('PASS office live pilot self-test: routing, adapter, zero budget and QA gates');
}

if (require.main === module) run().catch(error => {
  console.error('OFFICE_PILOT_ERROR=' + String(error.message).replace(/[^a-zA-Z0-9_-]/g, '_'));
  process.exitCode = 1;
});
module.exports = { validateCandidate, buildOfficePlan, callQwen, run, selfTest };
