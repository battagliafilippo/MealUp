'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {performance} = require('node:perf_hooks');
const {buildPacket, canonicalJson} = require('./fast-job-packet.cjs');
const {compilePrompt} = require('./fast-prompt-compiler.cjs');
const {extract} = require('./catalog-recipe-source.cjs');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (file) => fs.readFileSync(file, 'utf8');
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const estimatedTokens = (value) => Math.ceil([...value].length / 4);

function runBenchmark(root = process.cwd(), iterations = 25) {
  const resolvedRoot = path.resolve(root);
  const pilot = JSON.parse(read(path.join(resolvedRoot, 'docs/food-portrait-pipeline/optimization/fast-same-gates-pilot-v1.json')));
  const automationPath = path.join(os.homedir(), '.codex', 'automations', 'mealup-food-portrait-office', 'automation.toml');
  const baselineStatic = [
    read(automationPath),
    read(path.join(resolvedRoot, '.agents/skills/mealup-food-portrait-background/SKILL.md')),
    read(path.join(resolvedRoot, 'docs/food-portrait-pipeline/checkpoints/catalog-autonomy-state-v1.json')),
    read(path.join(resolvedRoot, 'docs/food-portrait-pipeline/catalog-production-authorization-v1.json')),
    read(path.join(resolvedRoot, 'docs/food-portrait-pipeline/food-portrait-style-frozen-v1.json'))
  ].join('\n');
  const fastStatic = read(path.join(resolvedRoot, '.agents/skills/mealup-food-portrait-fast-same-gates/SKILL.md'));
  const rows = [];
  for (const selected of pilot.cohort) {
    const packet = buildPacket({root: resolvedRoot, recipeId: selected.recipeId});
    const prompt = compilePrompt(packet);
    const replayPacket = buildPacket({root: resolvedRoot, recipeId: selected.recipeId});
    const replayPrompt = compilePrompt(replayPacket);
    if (packet.packetSha256 !== replayPacket.packetSha256 || prompt.sha256 !== replayPrompt.sha256) throw new Error('NON_DETERMINISTIC:' + selected.recipeId);
    const facts = extract(path.join(resolvedRoot, 'index.html'), path.join(resolvedRoot, 'G8/composition-matrix.json'), selected.recipeId);
    const baselineContext = baselineStatic + '\n' + JSON.stringify(facts);
    const fastContext = fastStatic + '\n' + canonicalJson(packet) + '\n' + prompt.text;
    const baselineTimes = [];
    const fastTimes = [];
    for (let index = 0; index < iterations; index += 1) {
      let started = performance.now();
      sha256(baselineStatic + '\n' + JSON.stringify(extract(path.join(resolvedRoot, 'index.html'), path.join(resolvedRoot, 'G8/composition-matrix.json'), selected.recipeId)));
      baselineTimes.push(performance.now() - started);
      started = performance.now();
      const timedPacket = buildPacket({root: resolvedRoot, recipeId: selected.recipeId});
      compilePrompt(timedPacket);
      fastTimes.push(performance.now() - started);
    }
    const baselineBytes = Buffer.byteLength(baselineContext);
    const fastBytes = Buffer.byteLength(fastContext);
    rows.push({
      recipeId: selected.recipeId,
      vesselId: selected.vesselId,
      packetBytes: packet.packetBytes,
      packetSha256: packet.packetSha256,
      promptBytes: prompt.bytes,
      promptSha256: prompt.sha256,
      baselineProxyBytes: baselineBytes,
      fastContextBytes: fastBytes,
      contextByteSavingPercent: Number(((1 - fastBytes / baselineBytes) * 100).toFixed(2)),
      baselineEstimatedTokens: estimatedTokens(baselineContext),
      fastEstimatedTokens: estimatedTokens(fastContext),
      estimatedTokenSavingPercent: Number(((1 - estimatedTokens(fastContext) / estimatedTokens(baselineContext)) * 100).toFixed(2)),
      baselineCompilerMedianMs: Number(median(baselineTimes).toFixed(3)),
      fastCompilerMedianMs: Number(median(fastTimes).toFixed(3))
    });
  }
  const byteSavings = rows.map((row) => row.contextByteSavingPercent);
  const tokenSavings = rows.map((row) => row.estimatedTokenSavingPercent);
  return {
    schema: 'mealup-food-portrait-fast-synthetic-benchmark-v1',
    status: 'SYNTHETIC_PASS_NOT_PRODUCTION_GO',
    cohortSize: rows.length,
    iterationsPerRecipe: iterations,
    imageCalls: 0,
    networkCalls: 0,
    measurementBoundary: {
      baseline: 'Exact UTF-8 bytes of current automation TOML, background skill, full catalog state, production authorization, FROZEN style contract and recipe facts.',
      fast: 'Exact UTF-8 bytes of FAST skill, immutable job packet and compiled prompt.',
      tokenMethod: 'ESTIMATE_ONLY: ceil(Unicode code points / 4); not provider-reported token usage.',
      timingMethod: 'LOCAL_COMPILER_ONLY: median wall time over repeated local compilation; not end-to-end generation time.'
    },
    aggregate: {
      medianContextByteSavingPercent: Number(median(byteSavings).toFixed(2)),
      minimumContextByteSavingPercent: Number(Math.min(...byteSavings).toFixed(2)),
      medianEstimatedTokenSavingPercent: Number(median(tokenSavings).toFixed(2)),
      minimumEstimatedTokenSavingPercent: Number(Math.min(...tokenSavings).toFixed(2)),
      actualProviderTokens: 'UNVERIFIED',
      endToEndMedianWallClock: 'UNVERIFIED',
      visualNonInferiority: 'UNVERIFIED_NO_IMAGES_GENERATED'
    },
    rows
  };
}

function main(argv) {
  const value = (name) => { const index = argv.indexOf(name); return index < 0 ? null : argv[index + 1]; };
  const output = value('--output');
  const result = runBenchmark(process.cwd(), Number(value('--iterations') || 25));
  const serialized = JSON.stringify(result, null, 2) + '\n';
  if (output) fs.writeFileSync(path.resolve(output), serialized, {flag: 'wx'});
  else process.stdout.write(serialized);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error('FAIL fast synthetic benchmark:', error.message); process.exitCode = 1; }
}
module.exports = {estimatedTokens, runBenchmark};
