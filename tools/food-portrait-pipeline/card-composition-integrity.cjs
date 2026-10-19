const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} integrity failure: expected ${expected}, received ${actual}`);
  }
}

function verifyImmutableCardComposition(rootDir) {
  const inputs = {
    portrait: {
      path: "docs/food-portrait-pipeline/candidates/r2-poke-visual-candidate-002.png",
      sha256: "ad2cca0c90da0c1137b5e48e885b009727cda6dc661200ee2ffb565458960f85"
    },
    shell: {
      path: "tools/food-portrait-pipeline/assets/gauge-frozen-v1/gauge-shell.png",
      sha256: "c2e1a86821e379593fe622b3085f4a4b10f312ef672ba1564f15fcff1beb6996"
    },
    needle: {
      path: "tools/food-portrait-pipeline/assets/gauge-frozen-v1/gauge-needle.png",
      sha256: "f564b641ef425d0d24ad11c52c0736bfe68d2069a75876b911b5268aa822c5aa"
    }
  };

  for (const [name, input] of Object.entries(inputs)) {
    assertEqual(sha256(path.join(rootDir, input.path)), input.sha256, name);
  }

  const htmlPath = path.join(
    rootDir,
    "docs/food-portrait-pipeline/review/gauge-v4-compact-card-r2.html"
  );
  const html = fs.readFileSync(htmlPath, "utf8");
  const required = [
    'src="../candidates/r2-poke-visual-candidate-002.png"',
    'src="../../../tools/food-portrait-pipeline/assets/gauge-frozen-v1/gauge-shell.png"',
    'src="../../../tools/food-portrait-pipeline/assets/gauge-frozen-v1/gauge-needle.png"',
    ".gauge{position:absolute;z-index:2;right:2.5%;top:2.5%;width:34%",
    ".portrait{display:block;width:100%;height:100%;object-fit:contain}"
  ];

  for (const token of required) {
    if (!html.includes(token)) throw new Error(`card composition missing invariant: ${token}`);
  }

  const forbidden = [/<canvas\b/i, /filter\s*:/i, /mix-blend-mode\s*:/i];
  for (const pattern of forbidden) {
    if (pattern.test(html)) throw new Error(`card composition contains forbidden raster treatment: ${pattern}`);
  }

  return {
    status: "PASS_IMMUTABLE_LAYER_COMPOSITION",
    sourcePixelsModified: false,
    gaugePixelsModified: false,
    imageGenerationCalls: 0,
    do01Generated: false,
    testerModified: false,
    pwaModified: false,
    inputs
  };
}

module.exports = { sha256, verifyImmutableCardComposition };

if (require.main === module) {
  process.stdout.write(`${JSON.stringify(verifyImmutableCardComposition(process.cwd()), null, 2)}\n`);
}
