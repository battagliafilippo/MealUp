'use strict';
const crypto = require('node:crypto');
const {buildPacket} = require('./fast-job-packet.cjs');

const PROMPT_BYTE_CEILING = 4096;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function compilePrompt(packet) {
  const ingredients = packet.recipeFacts.ingredients.map((item) => `${item.name} ${item.quantity}${item.unit ? ' ' + item.unit : ''}`).join('; ');
  const preparation = packet.recipeFacts.steps.join(' ');
  const prompt = [
    'Create exactly one square 1:1 MealUp Food Portrait candidate.',
    `Canonical owner model set ${packet.ownerModelSet.version} (${packet.ownerModelSet.manifestSha256}); style envelope ${packet.ownerModelSet.envelopeSha256}.`,
    `Match the single supplied role-selected visual reference ${packet.visualReference.id} (${packet.visualReference.sha256}; roles ${packet.visualReference.roles.join(', ')}) and the FROZEN ${packet.vessel.vesselId} vessel contract (${packet.reference.sha256}).`,
    `Recipe: ${packet.recipeFacts.title}. Ingredients: ${ingredients}. Prepared form: ${preparation}`,
    `Show one complete integrated recipe in ${packet.vessel.vesselId}; ${packet.promptDelta.rule}.`,
    'Render the food as rounded, simplified MealUp Toys 3D forms with smooth soft-gloss materials, clean color blocks and controlled low-frequency texture. The full five-model owner set is the QA envelope and r4 is the maximum-realism boundary, not a target; do not average references or drift toward photography.',
    'Avoid photographic micro-texture: no dominant meat fibers, pores, rough wrinkles, grain, noisy specular detail, hard naturalistic crust or hyper-real food surface.',
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
