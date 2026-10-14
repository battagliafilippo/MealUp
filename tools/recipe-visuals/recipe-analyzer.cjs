'use strict';

/**
 * MealUp Recipe Analyzer — M2 v1 (offline, no image generation, no API keys).
 *
 * Node-only build tool. Reads MealUp's actual booted catalog in the SAME
 * isolated jsdom harness used for app tests; never accesses users' devices.
 * No changes to the PWA, protected functions, FROZEN designs or deployments.
 *
 * node tools/recipe-visuals/recipe-analyzer.cjs --self-test
 * node tools/recipe-visuals/recipe-analyzer.cjs --out /tmp/mealup-recipe-analysis
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '../..');
const { app } = require('../../test/suite.js'); // tested, fresh localStorage/jsdom
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/family-fo/manifest.json'), 'utf8'));
const MATRIX = JSON.parse(fs.readFileSync(path.join(ROOT, 'G8/composition-matrix.json'), 'utf8'));
const ANALYZER_VERSION = 'recipe-analyzer-v1';

// Only extract evidence explicitly present in the actual preparation steps.
// Do NOT infer that ingredient N is "on top of" ingredient N+1.
const RE_PLATING = /\b(disponi|disponete|adagia|adagiate|foder[ae]|impiatta|impiattate|servi|servite|guarnisci|guarnite|cospargi|cospargete|distribuisci|distribuite|metti nel piatto|versa nel piatto|spolvera|spolverate|decora|decorate|ammucchia|sistema|sistemate|componi|componete)\b/i;
const RE_FORM = /\b(fett[ae]|fettine|scaglie|cubetti|dadini|rondelle|spicchi|filetti|sbriciolat[aoie]|grattugiat[aoie]|tritat[aoie]|striscioline|julienne|crema|emulsione|inter[ao]|rotol[ao]|tagliat[aoie])\b/i;
const RE_COOK = /\b(cuoc[ie]|cuocere|rosola|rosolate|salt[aie]|friggi|friggete|inforna|infornate|boll[iie]|lessa|lessate|griglia|grigliate|tosta|tostate|soffriggi|soffriggete|stufa|stufate|caramell[aio])\b/i;

function sha(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}
function normalizeIngredients(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((v, position) => ({
    position,
    name: String(v && v.n != null ? v.n : '').trim(),
    quantity: v && Object.hasOwn(v, 'q') ? v.q : null,
    unit: v && v.u != null ? String(v.u) : '',
    // Do not suppress condiments or garnish: all recipe ingredients preserved.
    placement: 'NOT_YET_DETERMINED',
  }));
}
function evidence(steps, regex) {
  return steps
    .map((text, stepIndex) => ({ stepIndex, text }))
    .filter(({ text }) => regex.test(text));
}
function analyzeRecipe(recipe, familyMapping) {
  if (!recipe || !recipe.id || !String(recipe.id).trim()) {
    throw new Error('RECIPE_ID_REQUIRED');
  }
  const id = String(recipe.id);
  const title = String(recipe.title ?? '').trim();
  const ingredients = normalizeIngredients(recipe.ing);
  const steps = Array.isArray(recipe.steps)
    ? recipe.steps.map(v => String(v ?? '').trim())
    : [];
  const core = { id, title, portata: recipe.portata ?? null, ingredients, steps, description: recipe.desc ?? null };
  const plating = evidence(steps, RE_PLATING);
  const form = evidence(steps, RE_FORM);
  const cooking = evidence(steps, RE_COOK);
  const flags = [];
  if (!title) flags.push('MISSING_TITLE');
  if (!ingredients.length || ingredients.some(v => !v.name)) flags.push('MISSING_INGREDIENTS');
  if (!steps.length || steps.some(s => !s)) flags.push('MISSING_STEPS');
  if (!plating.length) flags.push('MISSING_EXPLICIT_PLATING_EVIDENCE');
  if (!familyMapping[id]) flags.push('UNMAPPED_FAMILY');

  return {
    recipeId: id,
    visualRevision: sha(core).slice(0, 16),
    recipeSourceHash: sha(core),
    analyzerVersion: ANALYZER_VERSION,
    familyId: familyMapping[id] ?? null,
    title,
    portata: core.portata,
    description: core.description,
    ingredients,
    steps, // raw evidence; not a synthesized prompt
    evidence: { plating, physicalForm: form, cooking },
    reviewFlags: flags,
    analysisStatus: flags.length ? 'NEEDS_VISUAL_DIRECTION' : 'FACTS_EXTRACTED',
    imageStatus: 'PENDING',
    imageUrl: null,
    qaApproved: false,
    // Future image stage must use an actual AI reasoning/generation provider
    // and must never claim the plating has been understood from order alone.
  };
}
function validateCatalog(recipes, specs) {
  const expected = MATRIX.rows.map(r => String(r.recipe_id));
  const fromManifest = Object.keys(MANIFEST.recipe_mapping || {});
  const fromApp = recipes.map(r => String(r.id));
  const fromSpecs = specs.map(r => r.recipeId);
  const uniqueness = arr => new Set(arr).size === arr.length;
  const sameIds = (a, b) => a.length === b.length && a.every(v => new Set(b).has(v));
  const failures = [];
  if (!uniqueness(expected)) failures.push('MATRIX_DUPLICATE_ID');
  if (!uniqueness(fromManifest)) failures.push('MANIFEST_DUPLICATE_ID');
  if (!uniqueness(fromApp)) failures.push('APP_DUPLICATE_ID');
  if (!uniqueness(fromSpecs)) failures.push('SPEC_DUPLICATE_ID');
  if (expected.length !== 454) failures.push('HISTORICAL_CATALOG_NOT_454');
  if (!sameIds(expected, fromManifest)) failures.push('MATRIX_MANIFEST_ID_MISMATCH');
  if (!sameIds(expected, fromApp)) failures.push('MATRIX_APP_ID_MISMATCH');
  if (!sameIds(fromApp, fromSpecs)) failures.push('APP_SPEC_ID_MISMATCH');
  if (specs.some(s => !s.recipeSourceHash || !s.visualRevision)) failures.push('INCOMPLETE_HASHES');
  if (specs.some(s => !s.ingredients.every(i => i.name))) failures.push('UNNAMED_INGREDIENT');
  if (specs.some(s => s.qaApproved || s.imageUrl !== null || s.imageStatus !== 'PENDING'))
    failures.push('PREMATURE_IMAGE_APPROVAL');
  return failures;
}
function runSelfTest() {
  const f = { r1: 'CARNE' };
  const example = {
    id: 'r1', title: 'Bresaola con rucola',
    ing: [{ n: 'bresaola', q: 80, u: 'g' }, { n: 'rucola', q: 20, u: 'g' }],
    steps: ['Fodera il piatto con le fette di bresaola.', 'Ammucchia la rucola al centro.'],
    desc: 'Piatto freddo', portata: 'antipasto',
  };
  const a = analyzeRecipe(example, f);
  if (a.ingredients.length !== 2 || a.steps.length !== 2 || a.evidence.plating.length !== 2 ||
      a.evidence.physicalForm.length !== 1 || a.imageStatus !== 'PENDING' ||
      a.ingredients.some(x => x.placement !== 'NOT_YET_DETERMINED')) throw new Error('SELFTEST_EVIDENCE');
  if (analyzeRecipe(example, f).visualRevision !== a.visualRevision) throw new Error('SELFTEST_STABILITY');
  const changed = { ...example, steps: [...example.steps, 'Cospargi con grana.'] };
  if (analyzeRecipe(changed, f).visualRevision === a.visualRevision) throw new Error('SELFTEST_REVISION');
  const incomplete = analyzeRecipe({ id: 'x1', title: 'Senza istruzioni', ing: [], steps: [] }, f);
  if (!incomplete.reviewFlags.includes('MISSING_EXPLICIT_PLATING_EVIDENCE') ||
      !incomplete.reviewFlags.includes('UNMAPPED_FAMILY') ||
      incomplete.analysisStatus !== 'NEEDS_VISUAL_DIRECTION') throw new Error('SELFTEST_REVIEW_GATE');
  console.log('PASS M2 Analyzer self-test: evidence, no inferred placement, stable revisions, review gates');
}
async function main() {
  if (process.argv.includes('--self-test')) return runSelfTest();
  const outIndex = process.argv.indexOf('--out');
  const outDir = outIndex < 0
    ? path.join(ROOT, 'tools/recipe-visuals/output')
    : path.resolve(process.argv[outIndex + 1] || '');
  if (!outDir || outDir === '/' || outDir === ROOT) throw new Error('UNSAFE_OUTPUT_DIRECTORY');

  const testApp = await app(); // fresh jsdom state; no personal device data
  let recipes;
  try {
    const state = testApp.stato();
    recipes = state.recipes;
    if (!Array.isArray(recipes)) throw new Error('APP_CATALOG_NOT_ARRAY');
  } finally {
    testApp.dom.window.close();
  }
  const specs = recipes.map(r => analyzeRecipe(r, MANIFEST.recipe_mapping || {}))
    .sort((a, b) => a.recipeId.localeCompare(b.recipeId, 'en', { numeric: true }));
  const failures = validateCatalog(recipes, specs);
  const report = {
    analyzerVersion: ANALYZER_VERSION,
    result: failures.length ? 'FAIL' : 'PASS',
    expectedCatalogSize: 454,
    appRecipes: recipes.length,
    specs: specs.length,
    uniqueIds: new Set(specs.map(s => s.recipeId)).size,
    familyMapped: specs.filter(s => !!s.familyId).length,
    extractedWithExplicitPlatingEvidence: specs.filter(s => s.evidence.plating.length > 0).length,
    requiringVisualDirection: specs.filter(s => s.analysisStatus === 'NEEDS_VISUAL_DIRECTION').length,
    neverGeneratedImages: specs.every(s => s.imageStatus === 'PENDING' && s.imageUrl === null),
    failures,
    // Stable deterministic run: no timestamps or account information.
  };
  if (failures.length) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return; // fail closed; do not publish incomplete catalog
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'recipe-specs.v1.json'), JSON.stringify({
    schema: ANALYZER_VERSION,
    total: specs.length,
    recipes: specs,
  }, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outDir, 'analysis-report.v1.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log('PASS M2 Recipe Analyzer: ' + report.specs + '/' + report.expectedCatalogSize +
    ' real recipes, ' + report.uniqueIds + ' unique IDs, ' + report.familyMapped +
    ' mapped families, 0 lost, 0 images generated');
  console.log('Plating evidence present: ' + report.extractedWithExplicitPlatingEvidence +
    ' | Needs visual direction: ' + report.requiringVisualDirection);
  console.log('Output: ' + outDir);
}
if (require.main === module) main().catch(e => { console.error('FAIL M2 Recipe Analyzer:', e.stack || e); process.exitCode = 1; });
module.exports = { analyzeRecipe, validateCatalog, runSelfTest };
