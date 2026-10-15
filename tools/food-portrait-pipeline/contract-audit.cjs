'use strict';

/**
 * MealUp Food Portrait Pipeline - baseline contract audit.
 * Read-only against existing FROZEN sources. Does not generate or approve images.
 * node tools/food-portrait-pipeline/contract-audit.cjs --self-test
 * node tools/food-portrait-pipeline/contract-audit.cjs --out /tmp/mealup-food-portrait-contract.json
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '../..');
const MATRIX_PATH = 'G8/composition-matrix.json';
const MANIFEST_PATH = 'assets/family-fo/manifest.json';
const VERSION = 'food-portrait-contract-audit-v1';
const MIN_HISTORICAL_IDS = 454;
const VALID_VESSELS = new Set([
  'VESSEL_BAKING_DISH', 'VESSEL_BOWL', 'VESSEL_BREAD_SURFACE',
  'VESSEL_CUP', 'VESSEL_DESSERT_MOLD', 'VESSEL_FREE', 'VESSEL_GLASS',
  'VESSEL_JAR', 'VESSEL_OVEN_TRAY', 'VESSEL_PAN',
  'VESSEL_PIZZA_SURFACE', 'VESSEL_PLATE', 'VESSEL_PLATTER',
  'VESSEL_POT', 'VESSEL_RAMEKIN',
]);

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function audit(matrix, manifest, sources = {}) {
  const errors = [];
  const issue = (code, detail) => errors.push({ code, detail });
  const rows = Array.isArray(matrix?.rows) ? matrix.rows : [];
  const mapping = manifest?.recipe_mapping && typeof manifest.recipe_mapping === 'object'
    && !Array.isArray(manifest.recipe_mapping) ? manifest.recipe_mapping : {};
  const families = manifest?.families && typeof manifest.families === 'object'
    && !Array.isArray(manifest.families) ? manifest.families : {};
  const rowIds = rows.map(r => String(r?.recipe_id ?? ''));
  const mapIds = Object.keys(mapping);
  const rowSet = new Set(rowIds);
  const counts = {};
  const compositionIds = new Set();

  if (rows.length < MIN_HISTORICAL_IDS) issue('HISTORICAL_CATALOG_SHRINK', rows.length);
  if (rowSet.size !== rows.length || rowSet.has(''))
    issue('MISSING_OR_DUPLICATE_RECIPE_ID', { rows: rows.length, unique: rowSet.size });
  if (mapIds.length !== rows.length || mapIds.some(id => !rowSet.has(id))
      || rowIds.some(id => !Object.hasOwn(mapping, id)))
    issue('MATRIX_MANIFEST_ID_MISMATCH', { matrix: rows.length, manifest: mapIds.length });
  if (matrix?.recipe_count !== rows.length)
    issue('MATRIX_RECIPE_COUNT_MISMATCH', { declared: matrix?.recipe_count, actual: rows.length });
  if (Object.keys(families).length === 0) issue('EMPTY_FAMILY_REGISTRY', null);
  if (manifest?.no_vessels !== true || manifest?.no_compositions !== true)
    issue('FAMILY_FO_SEPARATION_CONTRACT_CHANGED', null);

  for (const [id, family] of Object.entries(mapping)) {
    if (!Object.hasOwn(families, family))
      issue('UNKNOWN_FAMILY', { recipeId: id, family });
  }
  for (const row of rows) {
    const id = String(row?.recipe_id ?? '');
    const vessel = row?.vessel_id;
    if (!row?.composition_id || compositionIds.has(row.composition_id))
      issue('MISSING_OR_DUPLICATE_COMPOSITION_ID', { recipeId: id });
    else compositionIds.add(row.composition_id);
    if (!VALID_VESSELS.has(vessel))
      issue('UNKNOWN_VESSEL_ID', { recipeId: id, vesselId: vessel ?? null });
    if (!row?.canonical_recipe || !row?.primary?.master_id)
      issue('INCOMPLETE_COMPOSITION_FACTS', { recipeId: id });
    if (vessel) counts[vessel] = (counts[vessel] || 0) + 1;
  }

  return {
    schema: VERSION,
    status: errors.length === 0 ? 'PASS_CONTRACT_ONLY' : 'FAIL',
    baselineSources: sources,
    catalog: { matrixRows: rows.length, manifestMappings: mapIds.length, uniqueRecipeIds: rowSet.size,
      families: Object.keys(families).length, vesselDistribution: Object.fromEntries(
        Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) },
    scope: {
      dataIntegrityChecked: true, runtimeCatalogParityChecked: false,
      recipeSemanticsChecked: false, goldenMastersVerified: false,
      imagePixelsInspected: false, imageQualityVerified: false,
      imagesGenerated: 0, imagesApproved: 0,
      automaticImageAcceptanceAllowed: false,
    },
    errors,
  };
}

function verifyFixtures() {
  const families = { PASTA: { path: 'placeholder' } };
  const fixture = {
    matrix: { recipe_count: 454, rows: Array.from({ length: 454 }, (_, i) => ({
      recipe_id: 'r' + i, composition_id: 'COMP_r' + i, canonical_recipe: 'Demo ' + i,
      vessel_id: i === 0 ? 'VESSEL_FREE' : 'VESSEL_PLATE',
      primary: { master_id: 'PASTA' },
    })) },
    manifest: { recipe_mapping: Object.fromEntries(
      Array.from({ length: 454 }, (_, i) => ['r' + i, 'PASTA'])),
      families, no_vessels: true, no_compositions: true },
  };
  const assert = (ok, code) => { if (!ok) throw Error('SELFTEST_' + code); };
  const baseline = audit(fixture.matrix, fixture.manifest);
  assert(baseline.status === 'PASS_CONTRACT_ONLY', 'VALID_FIXTURE');
  assert(baseline.scope.imagesApproved === 0 && !baseline.scope.automaticImageAcceptanceAllowed,
    'NO_PREMATURE_IMAGE_APPROVAL');
  fixture.matrix.rows[1].recipe_id = 'r0';
  assert(audit(fixture.matrix, fixture.manifest).errors.some(e =>
    e.code === 'MISSING_OR_DUPLICATE_RECIPE_ID'), 'DUPLICATE_ID_GATE');
  fixture.matrix.rows[1].recipe_id = 'r1';
  fixture.matrix.rows[1].vessel_id = 'VESSEL_FAKE';
  assert(audit(fixture.matrix, fixture.manifest).errors.some(e =>
    e.code === 'UNKNOWN_VESSEL_ID'), 'VESSEL_GATE');
  fixture.matrix.rows[1].vessel_id = 'VESSEL_PLATE';
  fixture.manifest.recipe_mapping.r1 = 'UNKNOWN';
  assert(audit(fixture.matrix, fixture.manifest).errors.some(e =>
    e.code === 'UNKNOWN_FAMILY'), 'FAMILY_GATE');
  fixture.manifest.recipe_mapping.r1 = 'PASTA';
  fixture.matrix.rows.push({
    recipe_id: 'r454', composition_id: 'COMP_r454', canonical_recipe: 'Future recipe',
    vessel_id: 'VESSEL_BOWL', primary: { master_id: 'PASTA' },
  });
  fixture.matrix.recipe_count++;
  fixture.manifest.recipe_mapping.r454 = 'PASTA';
  assert(audit(fixture.matrix, fixture.manifest).status === 'PASS_CONTRACT_ONLY', 'FUTURE_GROWTH');
  console.log('PASS contract-audit self-test: baseline, duplication, vessel, family, safe growth, no approval');
}

function saveReport(file, report) {
  const target = path.resolve(file);
  const inTmp = target.startsWith(path.resolve(os.tmpdir()) + path.sep);
  const inLab = target.startsWith(path.join(ROOT, 'tools/food-portrait-pipeline/output') + path.sep);
  if (!inTmp && !inLab) throw Error('UNSAFE_REPORT_PATH');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = target + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(report, null, 2) + '\n', { flag: 'w' });
  fs.renameSync(temp, target);
}

function main(args) {
  if (args.includes('--self-test')) return verifyFixtures();
  const rawMatrix = fs.readFileSync(path.join(ROOT, MATRIX_PATH));
  const rawManifest = fs.readFileSync(path.join(ROOT, MANIFEST_PATH));
  const report = audit(JSON.parse(rawMatrix), JSON.parse(rawManifest), {
    [MATRIX_PATH]: sha256(rawMatrix),
    [MANIFEST_PATH]: sha256(rawManifest),
  });
  const index = args.indexOf('--out');
  if (index !== -1) {
    if (!args[index + 1]) throw Error('MISSING_OUTPUT_ARGUMENT');
    saveReport(args[index + 1], report);
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error('FAIL contract-audit:', error.stack || error); process.exitCode = 1; }
}
module.exports = { audit, verifyFixtures, saveReport };
