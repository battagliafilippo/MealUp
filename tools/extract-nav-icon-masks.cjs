const sharp = require('C:/Users/Ramona/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const path = require('path');

const source = 'C:/Users/Ramona/Desktop/MealUp render/bottom .png';
const output = path.join(__dirname, '..', 'assets', 'brand');

async function extract(name, box, keep) {
  const { data, info } = await sharp(source)
    .extract(box)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const alpha = keep(data[i], data[i + 1], data[i + 2]) ? 255 : 0;
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = alpha;
  }

  await sharp(data, { raw: info })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(128, 128, { fit: 'contain' })
    .png()
    .toFile(path.join(output, name));
}

Promise.all([
  extract(
    'nav-recipes-render-mask-v2.png',
    { left: 475, top: 98, width: 110, height: 96 },
    (r, g, b) => r > 210 && g > 55 && g < 175 && b < 75 && r - g > 80,
  ),
  extract(
    'nav-stocks-render-mask-v2.png',
    { left: 955, top: 100, width: 100, height: 95 },
    (r, g, b) => r < 105 && g < 100 && b < 92 && Math.max(r, g, b) - Math.min(r, g, b) < 28,
  ),
]).catch((error) => {
  console.error(error);
  process.exit(1);
});
