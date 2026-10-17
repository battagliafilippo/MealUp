'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {buildPacket, canonicalJson, MAX_PACKET_BYTES} = require('./fast-job-packet.cjs');
const {runDryRun} = require('./fast-rollback-harness.cjs');
const {verifyCanonicalModelSet, selectVisualReference} = require('./canonical-model-gate.cjs');
const {inspect: inspectFastBackground} = require('./fast-background-preflight.cjs');
const {TEXTURE_BUDGET, buildDisplayPlan, validateDisplayPlan} = require('./display-role-contract.cjs');
const {buildQaContract, validateQaReport} = require('./fast-qa-contract.cjs');
const {compilePrompt} = require('./fast-prompt-compiler.cjs');

const root = path.resolve(__dirname, '..', '..');

test('packet is deterministic, compact and source/reference locked', () => {
  const first = buildPacket({root, recipeId: 'a10'});
  const second = buildPacket({root, recipeId: 'a10'});
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.match(first.packetSha256, /^[a-f0-9]{64}$/);
  assert.ok(first.packetBytes <= MAX_PACKET_BYTES);
  assert.equal(first.recipeFacts.kcal, 380);
  assert.equal(first.gaugeTarget.exactKcalText, '380 kcal');
  assert.equal(first.reference.sha256, '7be03065e37431a37dc97798cb4c2a2d8660080c30d193f4061ad2808dfc78c0');
  assert.equal('queue' in first, false);
  assert.equal('history' in first, false);
  assert.equal(first.constraints.maximumImages, 1);
  assert.equal(first.gates.independentVisualQaRequired, true);
  assert.equal(first.gates.automaticAcceptance, false);
  assert.equal(first.gates.budgetEUR, 0);
  assert.equal(validateDisplayPlan(first.displayPlan, first.recipeFacts), true);
  assert.deepEqual(first.textureBudget, TEXTURE_BUDGET);
});

test('different recipe facts produce a different packet hash', () => {
  const plate = buildPacket({root, recipeId: 'a10'});
  const bowl = buildPacket({root, recipeId: 'p09'});
  assert.notEqual(plate.packetSha256, bowl.packetSha256);
  assert.notEqual(plate.reference.sha256, bowl.reference.sha256);
});

test('all ten preregistered packets remain below the hard byte ceiling', () => {
  const pilot = JSON.parse(fs.readFileSync(path.join(root, 'docs/food-portrait-pipeline/optimization/fast-same-gates-pilot-v1.json'), 'utf8'));
  const sizes = pilot.cohort.map(({recipeId}) => buildPacket({root, recipeId}).packetBytes);
  assert.equal(sizes.length, 10);
  assert.ok(Math.max(...sizes) <= MAX_PACKET_BYTES);
});

test('packet compiler fails closed on missing or mismatched reference', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mealup-fast-packet-'));
  const pilotPath = path.join(temporaryRoot, 'pilot.json');
  const statePath = path.join(temporaryRoot, 'state.json');
  const pilot = JSON.parse(fs.readFileSync(path.join(root, 'docs/food-portrait-pipeline/optimization/fast-same-gates-pilot-v1.json'), 'utf8'));
  const state = JSON.parse(fs.readFileSync(path.join(root, 'docs/food-portrait-pipeline/checkpoints/catalog-autonomy-state-v1.json'), 'utf8'));
  state.queue.find((entry) => entry.recipeId === 'a10').reference.sha256 = '0'.repeat(64);
  fs.writeFileSync(pilotPath, JSON.stringify(pilot));
  fs.writeFileSync(statePath, JSON.stringify(state));
  assert.throws(() => buildPacket({root, recipeId: 'a10', pilot: pilotPath, state: statePath}), /QUEUE_REFERENCE_MISMATCH/);
  fs.rmSync(temporaryRoot, {recursive: true, force: true});
});

test('non-pilot and non-pending recipes cannot get a packet', () => {
  assert.throws(() => buildPacket({root, recipeId: 'r7'}), /RECIPE_NOT_IN_PILOT/);
  assert.throws(() => buildPacket({root}), /RECIPE_ID_REQUIRED/);
});

test('rollback dry-run restores baseline bytes and never touches protected files', () => {
  const result = runDryRun(root);
  assert.equal(result.verdict, 'PASS');
  assert.equal(result.mode, 'TEMP_FIXTURE_ONLY');
  assert.equal(result.baselineRestoredByteIdentical, true);
  assert.equal(result.rollbackReplayIdempotent, true);
  assert.equal(result.baselinePreflightIdentical, true);
  assert.equal(result.activeCycleStillBlocked, true);
  assert.equal(result.protectedFilesUnchanged, true);
  assert.equal(result.frozenAssetCount, 6);
});

test('owner style envelope locks the three approved reference roles and hashes', () => {
  const envelope = JSON.parse(fs.readFileSync(path.join(root, 'docs/food-portrait-pipeline/food-portrait-owner-style-envelope-v1.json'), 'utf8'));
  assert.deepEqual(envelope.references.map((entry) => entry.role), ['IDEAL_CENTER_PLATE', 'IDEAL_CENTER_BOWL', 'MAXIMUM_REALISM_BOUNDARY_NOT_TARGET']);
  for (const reference of envelope.references) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, reference.asset))).digest('hex');
    assert.equal(actual, reference.sha256, reference.recipeId);
  }
  assert.match(envelope.qaRule, /perceptual grain or style drift/);
});

test('owner canonical model set locks all five models and fails closed on manifest drift', () => {
  const locked = verifyCanonicalModelSet(root);
  assert.equal(locked.manifest.references.length, 5);
  assert.deepEqual(locked.manifest.references.map((entry) => entry.recipeId), ['r1', 'a10', 'a18', 'r2', 'r4']);
  assert.throws(() => verifyCanonicalModelSet(root, {expectedManifestSha256: '0'.repeat(64)}), /CANONICAL_MODEL_MANIFEST_SHA_MISMATCH/);
  assert.throws(() => verifyCanonicalModelSet(root, {expectedEnvelopeSha256: '0'.repeat(64)}), /OWNER_STYLE_ENVELOPE_SHA_MISMATCH/);
});

test('fast path selects exactly one role-relevant visual reference', () => {
  const locked = verifyCanonicalModelSet(root);
  const plate = buildPacket({root, recipeId: 'a10'});
  const bowl = buildPacket({root, recipeId: 'p09'});
  assert.equal(plate.visualReference.id, 'a10-plate-sculpted');
  assert.equal(bowl.visualReference.id, 'r2-bowl-ideal');
  assert.equal(Array.isArray(plate.visualReference), false);
  assert.equal(selectVisualReference(locked, {vesselId: 'VESSEL_PLATE', title: 'Caprese', ingredients: []}, {}).id, 'r1-plate-ideal');
});

test('background preflight selects the first pending guarded-pilot recipe', () => {
  const state = JSON.parse(fs.readFileSync(path.join(root, 'docs/food-portrait-pipeline/checkpoints/fast-same-gates-runtime-state-v1.json'), 'utf8'));
  if (state.status !== 'ACTIVE_READY') {
    assert.deepEqual(inspectFastBackground(root), {decision: 'BLOCKED', reason: 'FAST_STATE_NOT_READY', status: state.status});
    return;
  }
  const expected = state.queue.find((entry) => entry.state === 'PENDING');
  assert.deepEqual(inspectFastBackground(root), {decision: 'READY', recipeId: expected.recipeId, qaPassCount: state.qaPassCount, ownerReviewAt: state.ownerReviewAt, modelSetVersion: state.modelSetVersion});
});

test('do04 display plan binds cocoa to the three balls and forbids a loose bed', () => {
  const packet = buildPacket({root, recipeId: 'do04'});
  assert.equal(packet.displayPlan.exactCount.count, 3);
  assert.deepEqual(packet.displayPlan.roles.SURFACE_BOUND_VISIBLE, ['cacao amaro']);
  assert.deepEqual(packet.displayPlan.roles.INTEGRATED_ONLY.sort(), ['datteri', 'mandorle'].sort());
  assert.ok(packet.displayPlan.roles.FORBIDDEN_VISIBLE.includes('LOOSE_BED'));
  const compiled = compilePrompt(packet);
  assert.match(compiled.text, /zero loose residue, bed, pile or dusting/);
  assert.match(compiled.text, /Avoid photographic micro-texture: no pores, fibers, powder grain/);
});

test('display plan is total and rejects missing or duplicated classifications', () => {
  const facts = {title: 'Test', ingredients: [{name: 'cacao'}, {name: 'mandorle'}], steps: ['Frulla le mandorle. Rivesti col cacao.']};
  const plan = buildDisplayPlan(facts);
  assert.equal(validateDisplayPlan(plan, facts), true);
  const broken = structuredClone(plan);
  broken.roles.PRIMARY_VISIBLE.push('cacao');
  assert.throws(() => validateDisplayPlan(broken, facts), /DISPLAY_ROLE_NOT_TOTAL_OR_DISJOINT/);
});

test('do15 cooked batter resolves to one muffin with every ingredient integrated', () => {
  const packet = buildPacket({root, recipeId: 'do15'});
  assert.equal(packet.displayPlan.preparationMode, 'COOKED_COMPOSITE');
  assert.deepEqual(packet.displayPlan.exactCount, {count: 1, unit: 'MUFFIN'});
  assert.deepEqual(packet.displayPlan.roles.PRIMARY_VISIBLE, []);
  assert.deepEqual(packet.displayPlan.roles.SURFACE_BOUND_VISIBLE, []);
  assert.deepEqual(packet.displayPlan.roles.INTEGRATED_ONLY, [
    'farina', 'zucchero', 'burro', 'uovo', 'latte', 'cioccolato fondente', 'lievito per dolci'
  ]);
  const compiled = compilePrompt(packet);
  assert.match(compiled.text, /Show exactly 1 MUFFIN: Muffin al cioccolato/);
  assert.match(compiled.text, /chunks may be visible only inside or attached to that prepared form, never loose around it/);
});

test('analogous baked composite integrates batter ingredients instead of exposing them', () => {
  const facts = {
    title: 'Torta alle mele',
    ingredients: [{name: 'farina'}, {name: 'uovo'}, {name: 'latte'}, {name: 'mele'}],
    steps: ['Mescola farina, uovo e latte in un impasto.', 'Incorpora le mele e cuoci in forno.']
  };
  const plan = buildDisplayPlan(facts);
  assert.equal(plan.preparationMode, 'COOKED_COMPOSITE');
  assert.deepEqual(plan.exactCount, {count: 1, unit: 'TORTA'});
  assert.deepEqual(plan.roles.PRIMARY_VISIBLE, []);
  assert.deepEqual(plan.roles.INTEGRATED_ONLY, ['farina', 'uovo', 'latte', 'mele']);
});

test('composite prepared form fails closed when transformation steps are incomplete', () => {
  const facts = {
    title: 'Muffin salato',
    ingredients: [{name: 'farina'}, {name: 'uovo'}],
    steps: ['Mescola farina e uovo.']
  };
  assert.throws(() => buildDisplayPlan(facts), /DISPLAY_ROLE_AMBIGUOUS_TRANSFORMED_PREPARATION/);
});

test('prompt compiler fails closed when display or texture contract drifts', () => {
  const packet = structuredClone(buildPacket({root, recipeId: 'do04'}));
  packet.textureBudget.frequency = 'HIGH';
  assert.throws(() => compilePrompt(packet), /PACKET_SHA_MISMATCH/);
  const missingRole = structuredClone(buildPacket({root, recipeId: 'do04'}));
  delete missingRole.displayPlan.roles.SURFACE_BOUND_VISIBLE;
  assert.throws(() => compilePrompt(missingRole), /PACKET_SHA_MISMATCH/);
});

test('QA contract requires five independent PASS verdicts and both views', () => {
  const packet = buildPacket({root, recipeId: 'do04'});
  const contract = buildQaContract(packet);
  assert.deepEqual(contract.requiredVerdicts, ['CONTENT_COUNT', 'ATTACHMENT_GARNISH', 'STYLE_MICROTEXTURE', 'VESSEL_CROP', 'GAUGE_TEXT']);
  const report = {
    packetSha256: packet.packetSha256,
    canonicalModelSetSha256: packet.ownerModelSet.manifestSha256,
    visualReferenceSha256: packet.visualReference.sha256,
    producer: 'VISUAL_PRODUCTION', reviewer: 'INDEPENDENT_VISUAL_QA',
    views: ['CARD_360_SQUARE', 'ORIGINAL_1_TO_1'],
    verdicts: Object.fromEntries(contract.requiredVerdicts.map((key) => [key, 'PASS'])),
    overall: 'PASS_CANDIDATE_ONLY'
  };
  assert.equal(validateQaReport(contract, report), true);
  report.verdicts.STYLE_MICROTEXTURE = 'FAIL';
  assert.throws(() => validateQaReport(contract, report), /QA_VERDICT_FAIL:STYLE_MICROTEXTURE/);
  report.verdicts.STYLE_MICROTEXTURE = 'PASS';
  report.reviewer = report.producer;
  assert.throws(() => validateQaReport(contract, report), /QA_REVIEWER_NOT_INDEPENDENT/);
});
