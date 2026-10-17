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
    'Create exactly one square 1:1 MealUp Food Portrait candidate.',
    `Canonical owner model set ${packet.ownerModelSet.version} (${packet.ownerModelSet.manifestSha256}); style envelope ${packet.ownerModelSet.envelopeSha256}.`,
    `Match the single supplied role-selected visual reference ${packet.visualReference.id} (${packet.visualReference.sha256}; roles ${packet.visualReference.roles.join(', ')}) and the FROZEN ${packet.vessel.vesselId} vessel contract (${packet.reference.sha256}).`,
    `Recipe: ${packet.recipeFacts.title}. Ingredients: ${ingredients}. Prepared form: ${preparation}`,
    `Show exactly ${packet.displayPlan.exactCount.count} ${packet.displayPlan.exactCount.unit}: ${packet.displayPlan.subject}. Primary visible ingredients: ${list(roles.PRIMARY_VISIBLE)}.`,
    surfaceRule,
    `Integrated into the prepared form, never separate, scattered or decorative: ${list(roles.INTEGRATED_ONLY)}. Any authorized chunks may be visible only inside or attached to that prepared form, never loose around it. Not visible after preparation: ${list(roles.NOT_VISIBLE_AFTER_PROCESS)}. Keep the vessel base and rim visually clean.`,
    `Forbidden visible forms: ${roles.FORBIDDEN_VISIBLE.join(', ')}. Show one complete integrated recipe in ${packet.vessel.vesselId}; ${packet.promptDelta.rule}.`,
    'Render large rounded simplified MealUp Toys 3D forms with smooth continuous soft-gloss surfaces, broad controlled highlights, clean color blocks and low-frequency texture only. The full five-model owner set is the QA envelope and r4 is the maximum-realism boundary, not a target; do not average references or drift toward photography.',
    'Avoid photographic micro-texture: no pores, fibers, powder grain, micro-striation, wrinkles, dense individual particles, noisy speculars, photographic crumbs or hard naturalistic crust.',
    `The physical gauge must show exactly "${packet.gaugeTarget.exactKcalText}" once, with the needle at ${packet.gaugeTarget.angleDegrees} degrees in the ${packet.gaugeTarget.zone} zone.`,
    'No other text, numbers, labels, logos or UI. No ingredient collage, loose props, unlisted garnish or extra ingredients.',
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
