const assert = require("node:assert/strict");
const test = require("node:test");
const { verifyImmutableCardComposition } = require("./card-composition-integrity.cjs");

test("compact card composes the frozen portrait and gauge without pixel mutation", () => {
  const result = verifyImmutableCardComposition(process.cwd());
  assert.equal(result.status, "PASS_IMMUTABLE_LAYER_COMPOSITION");
  assert.equal(result.sourcePixelsModified, false);
  assert.equal(result.gaugePixelsModified, false);
  assert.equal(result.imageGenerationCalls, 0);
  assert.equal(result.do01Generated, false);
  assert.equal(result.testerModified, false);
  assert.equal(result.pwaModified, false);
});
