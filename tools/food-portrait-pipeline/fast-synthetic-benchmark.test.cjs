'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {runBenchmark} = require('./fast-synthetic-benchmark.cjs');

const root = path.resolve(__dirname, '..', '..');

test('synthetic benchmark covers all ten recipes without image or network calls', () => {
  const result = runBenchmark(root, 3);
  assert.equal(result.status, 'SYNTHETIC_PASS_NOT_PRODUCTION_GO');
  assert.equal(result.cohortSize, 10);
  assert.equal(result.rows.length, 10);
  assert.equal(result.imageCalls, 0);
  assert.equal(result.networkCalls, 0);
  assert.equal(result.aggregate.actualProviderTokens, 'UNVERIFIED');
  assert.equal(result.aggregate.visualNonInferiority, 'UNVERIFIED_NO_IMAGES_GENERATED');
});

test('every compact context clears the preregistered forty-percent byte target', () => {
  const result = runBenchmark(root, 3);
  assert.ok(result.aggregate.minimumContextByteSavingPercent >= 40);
  assert.ok(result.rows.every((row) => row.packetBytes <= 4096 && row.promptBytes <= 4096));
  assert.equal(new Set(result.rows.map((row) => row.packetSha256)).size, 10);
  assert.equal(new Set(result.rows.map((row) => row.promptSha256)).size, 10);
});

test('compiled prompts enforce the owner style envelope against photorealistic drift', () => {
  const result = runBenchmark(root, 1);
  assert.equal(result.rows.length, 10);
  const {buildPacket} = require('./fast-job-packet.cjs');
  const {compilePrompt} = require('./fast-prompt-compiler.cjs');
  const text = compilePrompt(buildPacket({root, recipeId: 'a10'})).text;
  assert.match(text, /MealUp Toys 3D/);
  assert.match(text, /FORBIDDEN PHOTOREALISM/);
  assert.match(text, /absolute realism ceiling/);
  assert.match(text, /transparent-background food layer only/);
  assert.match(text, /Do not draw any gauge/);
});
