const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { sha256 } = require("./card-composition-integrity.cjs");

test("owner freeze locks the exact r1 food-only bytes and separate gauge", () => {
  const root = process.cwd();
  const manifest = JSON.parse(fs.readFileSync(
    path.join(root, "docs/food-portrait-pipeline/r1-food-only-frozen-v1.json"),
    "utf8"
  ));

  assert.equal(manifest.status, "FROZEN_OWNER_APPROVED");
  assert.equal(manifest.asset.foodOnly, true);
  assert.equal(sha256(path.join(root, manifest.asset.path)), manifest.asset.sha256);
  assert.equal(
    sha256(path.join(root, "tools/food-portrait-pipeline/assets/gauge-frozen-v1/gauge-shell.png")),
    manifest.frozenComposition.gaugeShellSha256
  );
  assert.equal(
    sha256(path.join(root, "tools/food-portrait-pipeline/assets/gauge-frozen-v1/gauge-needle.png")),
    manifest.frozenComposition.gaugeNeedleSha256
  );
  assert.equal(manifest.frozenComposition.needleAngleDegrees, -14.4);
  assert.equal(manifest.frozenComposition.exactValue, "380 kcal");
  assert.ok(manifest.notAuthorized.includes("tester or PWA integration"));
  assert.ok(manifest.notAuthorized.includes("generation of do01"));
});
