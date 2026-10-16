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
    `Match only the supplied FROZEN ${packet.vessel.vesselId} reference (${packet.reference.sha256}) in style, physical vessel language, gauge housing, camera, lighting, crop and proportions.`,
    `Recipe: ${packet.recipeFacts.title}. Ingredients: ${ingredients}. Prepared form: ${preparation}`,
    `Show one complete integrated recipe in ${packet.vessel.vesselId}; ${packet.promptDelta.rule}.`,
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
