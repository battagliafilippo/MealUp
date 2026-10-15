'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
test('Design benchmark deterministic QA blocks multi-view hallucinations, background errors and fake app changes', () => {
  const script=path.join(__dirname,'design-benchmark.cjs');
  const r=spawnSync(process.execPath,[script,'--self-test'],{encoding:'utf8',timeout:5000});
  assert.equal(r.status,0,r.stderr||r.stdout);
  assert.match(r.stdout,/PASS: deterministic QA unit tests/);
});
