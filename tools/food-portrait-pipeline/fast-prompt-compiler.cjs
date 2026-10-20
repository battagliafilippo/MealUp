'use strict';
const crypto = require('node:crypto');
const {buildPacket, canonicalJson} = require('./fast-job-packet.cjs');
const {validateDisplayPlan, validateTextureBudget} = require('./display-role-contract.cjs');

const PROMPT_BYTE_CEILING = 4096;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function compilePrompt(packet) {
  const payload = structuredClone(packet);
  delete payload.packetSha256;
  delete payload.packetBytes;
  if (sha256(canonicalJson(payload)) !== packet.packetSha256) throw new Error('PACKET_SHA_MISMATCH');
  validateDisplayPlan(packet.displayPlan, packet.recipeFacts);
  validateTextureBudget(packet.textureBudget);
  const ingredients = packet.recipeFacts.ingredients.map((item) => `${item.name} ${item.quantity}${item.unit ? ' ' + item.unit : ''}`).join('; ');
  const preparation = packet.recipeFacts.steps.join(' ');
  const roles = packet.displayPlan.roles;
  const list = (values) => values.length ? values.join(', ') : 'none';
  const surfaceRule = roles.SURFACE_BOUND_VISIBLE.length
    ? `Surface-bound finish only: ${list(roles.SURFACE_BOUND_VISIBLE)}; it must remain fully attached to the prepared form, with zero loose residue, bed, pile or dusting on the vessel.`
    : 'No surface-bound finish is authorized; keep the prepared form, vessel base and rim free of loose residue, bed, pile or dusting.';
  const prompt = [
    'Create exactly one square 1:1 FOOD-ONLY MealUp Food Portrait candidate in unmistakable MealUp Toys 3D style, never food photography.',
    `Canonical owner model set ${packet.ownerModelSet.version} (${packet.ownerModelSet.manifestSha256}); style envelope ${packet.ownerModelSet.envelopeSha256}.`,
    `Match only the Toys 3D language of the single role-selected visual reference ${packet.visualReference.id} (${packet.visualReference.sha256}; roles ${packet.visualReference.roles.join(', ')}). Use the FROZEN ${packet.vessel.vesselId} contract (${packet.reference.sha256}) only for food scale and safe-box planning; do not render the vessel.`,
    `Recipe: ${packet.recipeFacts.title}. Ingredients: ${ingredients}. Prepared form: ${preparation}`,
    `Show exactly ${packet.displayPlan.exactCount.count} ${packet.displayPlan.exactCount.unit}: ${packet.displayPlan.subject}. Primary visible ingredients: ${list(roles.PRIMARY_VISIBLE)}.`,
    surfaceRule,
    `Integrated into the prepared form, never separate, scattered or decorative: ${list(roles.INTEGRATED_ONLY)}. Any authorized chunks may be visible only inside or attached to that prepared form, never loose around it. Not visible after preparation: ${list(roles.NOT_VISIBLE_AFTER_PROCESS)}. Keep the vessel base and rim visually clean.`,
    `Forbidden visible forms: ${roles.FORBIDDEN_VISIBLE.join(', ')}. Show one complete integrated prepared-food layer sized for ${packet.vessel.vesselId}; ${packet.promptDelta.rule}.`,
    'STYLE IS A HARD GATE: use chunky rounded sculpted toy forms, visibly simplified ingredient geometry, smooth molded surfaces, broad soft highlights, clean saturated color blocks, gentle ambient shading and premium miniature 3D product-render materials.',
    'The r2 bowl ideal is the center of the target style. The r4 maximum-detail model is an absolute realism ceiling, never a target. If a detail would read as food photography, simplify it into a clean sculpted toy form.',
    'FORBIDDEN PHOTOREALISM: no translucent wet flesh, realistic veins, pores, fibers, powder grain, micro-striation, wrinkles, dense particles, noisy specular reflections, photographic crumbs, naturalistic bruising, irregular skin detail or camera-like depth artifacts.',
    'Output a genuine transparent-background food layer only. Do not render a bowl, plate, mold, tray, glass, cup, background, floor, cast shadow or vessel control; those are deterministic layers added after QA.',
    `Do not draw any gauge. The FROZEN deterministic compositor adds "${packet.gaugeTarget.exactKcalText}" and the needle at ${packet.gaugeTarget.angleDegrees} degrees only after the food-only candidate passes QA.`,
    'No text, numbers, labels, logos, gauge, needle, dial, kcal value or other UI in the candidate raster. No ingredient collage, loose props, unlisted garnish or extra ingredients. Preserve true alpha outside the food; no white or cream matte.',
    'Preserve the original output. Do not approve, freeze, integrate or deploy it.'
  ].join('\n');
  const bytes = Buffer.byteLength(prompt, 'utf8');
  if (bytes > PROMPT_BYTE_CEILING) throw new Error(`PROMPT_TOO_LARGE:${bytes}`);
  return Object.freeze({version: packet.promptVersion, text: prompt, bytes, sha256: sha256(prompt)});
}

function main(argv) {
  const index = argv.indexOf('--recipe-id');
  if (index < 0 || !argv[index + 1]) throw new Error('RECIPE_ID_REQUIRED');
  const result = compilePrompt(buildPacket({recipeId: argv[index + 1]}));
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error('FAIL fast prompt compiler:', error.message); process.exitCode = 1; }
}
module.exports = {PROMPT_BYTE_CEILING, compilePrompt};
