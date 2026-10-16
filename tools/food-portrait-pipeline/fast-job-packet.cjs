'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { extract } = require('./catalog-recipe-source.cjs');
const { gaugeState } = require('./gauge-mapping.cjs');
const {verifyCanonicalModelSet, selectVisualReference} = require('./canonical-model-gate.cjs');

const PACKET_SCHEMA = 'mealup-food-portrait-fast-job-packet-v1';
const PROMPT_VERSION = 'FPP_FAST_PROMPT_V1';
const GATE_VERSION = 'FPP_FROZEN_GATES_V1';
const MAX_PACKET_BYTES = 4096;
const fail = (message) => { throw new Error(message); };
const sha256Buffer = (value) => crypto.createHash('sha256').update(value).digest('hex');
const sha256File = (file) => sha256Buffer(fs.readFileSync(file));
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function buildPacket(options) {
  const root = path.resolve(options.root || process.cwd());
  const pilotPath = path.resolve(root, options.pilot || 'docs/food-portrait-pipeline/optimization/fast-same-gates-pilot-v1.json');
  const statePath = path.resolve(root, options.state || 'docs/food-portrait-pipeline/checkpoints/catalog-autonomy-state-v1.json');
  const stylePath = path.resolve(root, options.style || 'docs/food-portrait-pipeline/food-portrait-style-frozen-v1.json');
  const indexPath = path.resolve(root, options.index || 'index.html');
  const matrixPath = path.resolve(root, options.matrix || 'G8/composition-matrix.json');
  const pilot = readJson(pilotPath);
  const state = readJson(statePath);
  const style = readJson(stylePath);
  const modelSet = verifyCanonicalModelSet(root);
  const recipeId = options.recipeId;
  if (!recipeId) fail('RECIPE_ID_REQUIRED');
  if (!['DESIGNED_AWAITING_OWNER_APPROVAL_TO_EXECUTE', 'ACTIVE_OWNER_AUTHORIZED_SERIAL_EXECUTION'].includes(pilot.status)) fail('PILOT_DESIGN_STATUS_INVALID');
  const selected = pilot.cohort.find((entry) => entry.recipeId === recipeId);
  if (!selected) fail('RECIPE_NOT_IN_PILOT:' + recipeId);
  const queued = state.queue.find((entry) => entry.recipeId === recipeId);
  if (!queued || queued.state !== 'PENDING') fail('RECIPE_NOT_PENDING:' + recipeId);
  const facts = extract(indexPath, matrixPath, recipeId);
  if (facts.sourceHash !== selected.sourceHash) fail('SOURCE_HASH_MISMATCH:' + recipeId);
  if (facts.vesselId !== selected.vesselId || facts.kcal !== selected.kcal || facts.title !== selected.title) fail('PILOT_FACT_MISMATCH:' + recipeId);
  const frozen = style.canonicalVesselReferences?.[facts.vesselId];
  if (!frozen || frozen.status !== 'FROZEN') fail('FROZEN_REFERENCE_MISSING:' + facts.vesselId);
  const referencePath = path.resolve(root, frozen.source);
  if (!fs.existsSync(referencePath) || sha256File(referencePath) !== frozen.sha256) fail('REFERENCE_HASH_MISMATCH:' + facts.vesselId);
  if (queued.reference.asset !== frozen.source || queued.reference.sha256 !== frozen.sha256) fail('QUEUE_REFERENCE_MISMATCH:' + recipeId);
  const gauge = gaugeState(facts.kcal);
  const visualReference = selectVisualReference(modelSet, facts, frozen);
  const visualReferencePath = path.resolve(root, visualReference.asset);
  if (!fs.existsSync(visualReferencePath) || sha256File(visualReferencePath) !== visualReference.sha256) fail('VISUAL_REFERENCE_HASH_MISMATCH:' + recipeId);
  const payload = {
    schema: PACKET_SCHEMA,
    gateVersion: GATE_VERSION,
    promptVersion: PROMPT_VERSION,
    recipeFacts: {
      recipeId: facts.recipeId,
      title: facts.title,
      kcal: facts.kcal,
      ingredients: facts.ingredients,
      steps: facts.steps,
      sourceHash: facts.sourceHash
    },
    vessel: {
      vesselId: facts.vesselId,
      compositionId: facts.compositionId
    },
    reference: {
      recipeId: frozen.recipeId,
      path: frozen.source,
      sha256: frozen.sha256
    },
    ownerModelSet: {
      version: modelSet.manifest.version,
      manifestPath: modelSet.manifestPath,
      manifestSha256: modelSet.manifestSha256,
      envelopePath: modelSet.envelopePath,
      envelopeSha256: modelSet.envelopeSha256
    },
    visualReference: {
      id: visualReference.id,
      recipeId: visualReference.recipeId,
      path: visualReference.asset,
      sha256: visualReference.sha256,
      roles: visualReference.roles
    },
    gaugeTarget: {
      exactKcalText: `${facts.kcal} kcal`,
      angleDegrees: gauge.angleDegrees,
      zone: gauge.zone,
      saturatedHigh: gauge.saturatedHigh
    },
    promptDelta: {
      subject: facts.title,
      rule: facts.vesselId === 'VESSEL_FREE' ? 'PREPARED_OBJECT_IS_SUBJECT_NO_SERVING_VESSEL' : 'ONE_COMPLETE_INTEGRATED_RECIPE',
      forbidden: ['EXTRA_TEXT', 'EXTRA_UI', 'INGREDIENT_COLLAGE', 'UNLISTED_GARNISH']
    },
    constraints: {
      maximumImages: 1,
      maximumRecipes: 1,
      aspectRatio: '1:1',
      physicalGaugeRequired: true,
      exactKcalRequired: true,
      noOtherTextOrUi: true,
      noExtraIngredientsOrProps: true
    },
    gates: {
      technicalQaRequired: true,
      independentVisualQaRequired: true,
      ownerReviewRequired: true,
      automaticRetry: false,
      automaticAcceptance: false,
      automaticFreeze: false,
      integration: false,
      deployment: false,
      budgetEUR: 0
    }
  };
  const canonicalPayload = canonicalJson(payload);
  const packet = {...payload, packetSha256: sha256Buffer(canonicalPayload)};
  const serialized = canonicalJson(packet);
  const bytes = Buffer.byteLength(serialized);
  if (bytes > MAX_PACKET_BYTES) fail(`PACKET_TOO_LARGE:${bytes}`);
  return Object.freeze({...packet, packetBytes: bytes});
}

function main(argv) {
  const value = (name) => { const index = argv.indexOf(name); return index < 0 ? null : argv[index + 1]; };
  const packet = buildPacket({recipeId: value('--recipe-id')});
  process.stdout.write(canonicalJson(packet) + '\n');
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error('FAIL fast job packet:', error.message); process.exitCode = 1; }
}
module.exports = {PACKET_SCHEMA, PROMPT_VERSION, GATE_VERSION, MAX_PACKET_BYTES, canonicalJson, buildPacket};
