const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { sha256 } = require("./card-composition-integrity.cjs");

test("r1 candidate composes one unchanged frozen gauge over one food-only portrait", () => {
  const root = process.cwd();
  const expected = {
    approvedSource: [
      "docs/food-portrait-pipeline/candidates/r1-carpaccio-plate-approved-001.webp",
      "7be03065e37431a37dc97798cb4c2a2d8660080c30d193f4061ad2808dfc78c0"
    ],
    candidate: [
      "docs/food-portrait-pipeline/candidates/r1-carpaccio-food-only-candidate-001.png",
      "de278c29fdc648a6cb6628d9b76283b4c54c6725ee966eef0cca343b4ecd962f"
    ],
    shell: [
      "tools/food-portrait-pipeline/assets/gauge-frozen-v1/gauge-shell.png",
      "c2e1a86821e379593fe622b3085f4a4b10f312ef672ba1564f15fcff1beb6996"
    ],
    needle: [
      "tools/food-portrait-pipeline/assets/gauge-frozen-v1/gauge-needle.png",
      "f564b641ef425d0d24ad11c52c0736bfe68d2069a75876b911b5268aa822c5aa"
    ]
  };

  for (const [label, [relativePath, digest]] of Object.entries(expected)) {
    assert.equal(sha256(path.join(root, relativePath)), digest, `${label} hash drift`);
  }

  const html = fs.readFileSync(
    path.join(root, "docs/food-portrait-pipeline/review/gauge-v4-compact-card-r1-food-only.html"),
    "utf8"
  );
  assert.match(html, /r1-carpaccio-food-only-candidate-001\.png/);
  assert.match(html, /gauge-shell\.png/);
  assert.match(html, /gauge-needle\.png/);
  assert.match(html, /rotate\(-14\.4deg\)/);
  assert.match(html, />380<small>kcal<\/small>/);
  assert.match(html, /right:2\.5%;top:2\.5%;width:34%/);
  assert.doesNotMatch(html, /<canvas\b|filter\s*:|mix-blend-mode\s*:/i);
});
